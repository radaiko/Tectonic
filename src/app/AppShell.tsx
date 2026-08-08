import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TectonicDocument } from '../domain/Document'
import type { IKernel } from '../kernel/IKernel'
import { StubKernel } from '../kernel/StubKernel'
import { openFile, saveFile } from '../io/FileService'
import type { StoredSession } from '../io/DocumentStorage'
import { clearSession, loadSession, saveSession } from '../io/DocumentStorage'
import { CommandPalette } from '../ui/CommandPalette'
import type { Command } from '../ui/commands'
import { HelpOverlay } from '../ui/HelpOverlay'
import { EditorView } from './EditorView'
import { StartScreen } from './StartScreen'
import { createStarterDocument } from './starterDocument'

/** How long editing has to go quiet before the recovery copy is rewritten. */
const AUTOSAVE_DELAY_MS = 500

export interface AppShellProps {
  readonly kernel?: IKernel
}

export function AppShell({ kernel }: AppShellProps): React.ReactElement {
  const activeKernel = useMemo(() => kernel ?? new StubKernel(), [kernel])
  const [document, setDocument] = useState<TectonicDocument | null>(null)
  /**
   * Bumped whenever a *different* document is loaded. Used as the editor's key,
   * which is what lets the editor build its live models once and keep them: the
   * shell never pushes a document back down mid-session.
   */
  const [sessionKey, setSessionKey] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [helpOpen, setHelpOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  // Published by the editor while it is mounted; empty on the start screen.
  const [editorCommands, setEditorCommands] = useState<readonly Command[]>([])
  /** What the start screen can offer back after a reload or a crash. */
  const [recovery, setRecovery] = useState<StoredSession | null>(() => loadSession())

  /**
   * The document as the editor last mirrored it, and whether it had unexported
   * edits. Held in refs because it changes on every stroke: turning that into
   * state would re-render the whole shell for something only the autosave and
   * the close guard ever read.
   */
  const latest = useRef<{ document: TectonicDocument; dirty: boolean } | null>(null)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Writes the pending recovery copy now, cancelling any scheduled write. */
  const flushAutosave = useCallback(() => {
    if (autosaveTimer.current !== null) {
      clearTimeout(autosaveTimer.current)
      autosaveTimer.current = null
    }
    const pending = latest.current
    if (pending) saveSession(pending.document, { dirty: pending.dirty })
  }, [])

  const handleDocumentChange = useCallback(
    (next: TectonicDocument, nextDirty: boolean) => {
      latest.current = { document: next, dirty: nextDirty }
      setDirty(nextDirty)

      // Debounced: a sketch drag calls this on every pointer move, and
      // localStorage writes are synchronous.
      if (autosaveTimer.current !== null) clearTimeout(autosaveTimer.current)
      autosaveTimer.current = setTimeout(() => {
        autosaveTimer.current = null
        saveSession(next, { dirty: nextDirty })
      }, AUTOSAVE_DELAY_MS)
    },
    [],
  )

  useEffect(() => () => {
    if (autosaveTimer.current !== null) clearTimeout(autosaveTimer.current)
  }, [])

  /**
   * Nothing is written to disk on its own, so replacing the open document with
   * unexported edits in it would throw work away. A document with no pending
   * edits — and the start screen — have nothing to lose.
   */
  const confirmDiscard = useCallback(
    (): boolean =>
      document === null ||
      !dirty ||
      window.confirm(
        'This document has changes that have not been saved to a file. Discard them?',
      ),
    [dirty, document],
  )

  /** Takes over from whatever was open, from a new, opened or recovered document. */
  const enterDocument = useCallback(
    (next: TectonicDocument, nextDirty: boolean) => {
      latest.current = { document: next, dirty: nextDirty }
      setDocument(next)
      setDirty(nextDirty)
      setSessionKey((key) => key + 1)
      setRecovery(null)
    },
    [],
  )

  const handleNewDocument = useCallback(async () => {
    if (!confirmDiscard()) return
    setBusy(true)
    setError(undefined)
    try {
      // The kernel is warmed up here rather than on first extrude, so a backend
      // that cannot load is reported before the user has drawn anything.
      await activeKernel.init()
      enterDocument(createStarterDocument(), false)
    } catch (cause) {
      setError(`Could not create document: ${(cause as Error).message}`)
    } finally {
      setBusy(false)
    }
  }, [activeKernel, confirmDiscard, enterDocument])

  const handleOpenFile = useCallback(async () => {
    if (!confirmDiscard()) return
    setError(undefined)
    try {
      const opened = await openFile()
      // A null result means the picker was dismissed — stay on the start screen.
      if (opened) enterDocument(opened, false)
    } catch (cause) {
      setError(`Could not open file: ${(cause as Error).message}`)
    }
  }, [confirmDiscard, enterDocument])

  /** Reopens the copy the last session left behind. */
  const handleRestore = useCallback(() => {
    if (!recovery) return
    if (!confirmDiscard()) return
    setError(undefined)
    enterDocument(recovery.document, recovery.dirty)
  }, [confirmDiscard, enterDocument, recovery])

  const handleDiscardRecovery = useCallback(() => {
    clearSession()
    setRecovery(null)
  }, [])

  // The editor hands back the document with its live sketches folded in; the
  // in-memory copy is deliberately left alone so editing state survives a save.
  const handleSave = useCallback((edited: TectonicDocument) => {
    saveFile(edited)
  }, [])

  /**
   * Returns to the start screen. The recovery copy is deliberately *not*
   * cleared: closing is not the same as being finished with the document, and
   * the start screen offers it straight back.
   */
  const handleClose = useCallback(() => {
    if (!confirmDiscard()) return
    flushAutosave()
    latest.current = null
    setDocument(null)
    setDirty(false)
    setEditorCommands([])
    setRecovery(loadSession())
  }, [confirmDiscard, flushAutosave])

  /**
   * The last line of defence for a closed tab or a reload. Registered only
   * while there is something to lose, so a clean document never triggers the
   * browser's "leave site?" prompt.
   */
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      // localStorage is synchronous, so the copy is safely written even here.
      flushAutosave()
      event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty, flushAutosave])

  /* ------------------------------------------------------------------ */
  /* Commands and global shortcuts                                       */
  /* ------------------------------------------------------------------ */

  const commands = useMemo<readonly Command[]>(
    () => [
      {
        id: 'app:new',
        title: 'New Document',
        category: 'File',
        shortcut: 'Ctrl+N',
        run: () => void handleNewDocument(),
      },
      {
        id: 'app:open',
        title: 'Open File',
        category: 'File',
        shortcut: 'Ctrl+O',
        run: () => void handleOpenFile(),
      },
      ...editorCommands,
      {
        id: 'app:help',
        title: 'Keyboard Shortcuts',
        category: 'Help',
        shortcut: '?',
        run: () => setHelpOpen(true),
      },
    ],
    [editorCommands, handleNewDocument, handleOpenFile],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      // A chord the palette's own search box should still answer to, so it is
      // checked before the typing guard below.
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
        return
      }

      if (event.key === 'F1') {
        event.preventDefault()
        setHelpOpen((open) => !open)
        return
      }

      const target = event.target as HTMLElement | null
      if (target?.tagName === 'INPUT' || target?.tagName === 'SELECT' || target?.isContentEditable) {
        return
      }

      if (event.key === '?') {
        event.preventDefault()
        setHelpOpen((open) => !open)
        return
      }

      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey) return
      const key = event.key.toLowerCase()
      if (key === 'n') {
        event.preventDefault()
        void handleNewDocument()
      } else if (key === 'o') {
        event.preventDefault()
        void handleOpenFile()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleNewDocument, handleOpenFile])

  return (
    <>
      {document ? (
        <EditorView
          key={sessionKey}
          document={document}
          // Read once per session, as the editor mounts: a restored document
          // opens with edits already in it, and the editor owns the flag from
          // there on.
          initiallyUnsaved={dirty}
          onSave={handleSave}
          onClose={handleClose}
          onNewDocument={() => void handleNewDocument()}
          onDocumentChange={handleDocumentChange}
          onCommandsChange={setEditorCommands}
        />
      ) : (
        <StartScreen
          onNewDocument={() => void handleNewDocument()}
          onOpenFile={() => void handleOpenFile()}
          recovery={recovery}
          onRestore={handleRestore}
          onDiscardRecovery={handleDiscardRecovery}
          busy={busy}
          error={error}
        />
      )}

      <CommandPalette
        open={paletteOpen}
        commands={commands}
        onClose={() => setPaletteOpen(false)}
      />
      <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}
