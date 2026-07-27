import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TectonicDocument } from '../domain/Document'
import type { IKernel } from '../kernel/IKernel'
import { StubKernel } from '../kernel/StubKernel'
import { openFile, saveFile } from '../io/FileService'
import { CommandPalette } from '../ui/CommandPalette'
import type { Command } from '../ui/commands'
import { HelpOverlay } from '../ui/HelpOverlay'
import { EditorView } from './EditorView'
import { StartScreen } from './StartScreen'
import { createStarterDocument } from './starterDocument'

export interface AppShellProps {
  /** Overridable so tests and the future WASM backend can supply their own. */
  readonly kernel?: IKernel
}

export function AppShell({ kernel }: AppShellProps): React.ReactElement {
  const activeKernel = useMemo(() => kernel ?? new StubKernel(), [kernel])
  const [document, setDocument] = useState<TectonicDocument | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [helpOpen, setHelpOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  // Published by the editor while it is mounted; empty on the start screen.
  const [editorCommands, setEditorCommands] = useState<readonly Command[]>([])

  /**
   * Nothing is written to disk on its own, so replacing an open document would
   * throw work away without asking. The start screen has nothing to lose.
   */
  const confirmDiscard = useCallback(
    (): boolean =>
      document === null ||
      window.confirm('Discard the open document? Anything unsaved will be lost.'),
    [document],
  )

  const handleNewDocument = useCallback(async () => {
    if (!confirmDiscard()) return
    setBusy(true)
    setError(undefined)
    try {
      await activeKernel.init()
      setDocument(await createStarterDocument(activeKernel))
    } catch (cause) {
      setError(`Could not create document: ${(cause as Error).message}`)
    } finally {
      setBusy(false)
    }
  }, [activeKernel, confirmDiscard])

  const handleOpenFile = useCallback(async () => {
    if (!confirmDiscard()) return
    setError(undefined)
    try {
      const opened = await openFile()
      // A null result means the picker was dismissed — stay on the start screen.
      if (opened) setDocument(opened)
    } catch (cause) {
      setError(`Could not open file: ${(cause as Error).message}`)
    }
  }, [confirmDiscard])

  // The editor hands back the document with its live sketch folded in; the
  // in-memory copy is deliberately left alone so editing state survives a save.
  const handleSave = useCallback((edited: TectonicDocument) => {
    saveFile(edited)
  }, [])

  const handleClose = useCallback(() => {
    setDocument(null)
  }, [])

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
          document={document}
          onSave={handleSave}
          onClose={handleClose}
          onCommandsChange={setEditorCommands}
        />
      ) : (
        <StartScreen
          onNewDocument={() => void handleNewDocument()}
          onOpenFile={() => void handleOpenFile()}
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
