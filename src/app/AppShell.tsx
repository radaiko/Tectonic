import { useCallback, useMemo, useState } from 'react'
import type { TectonicDocument } from '../domain/Document'
import type { IKernel } from '../kernel/IKernel'
import { StubKernel } from '../kernel/StubKernel'
import { openFile, saveFile } from '../io/FileService'
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

  const handleNewDocument = useCallback(async () => {
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
  }, [activeKernel])

  const handleOpenFile = useCallback(async () => {
    setError(undefined)
    try {
      const opened = await openFile()
      // A null result means the picker was dismissed — stay on the start screen.
      if (opened) setDocument(opened)
    } catch (cause) {
      setError(`Could not open file: ${(cause as Error).message}`)
    }
  }, [])

  const handleSave = useCallback(() => {
    if (document) saveFile(document)
  }, [document])

  const handleClose = useCallback(() => {
    setDocument(null)
  }, [])

  if (!document) {
    return (
      <StartScreen
        onNewDocument={() => void handleNewDocument()}
        onOpenFile={() => void handleOpenFile()}
        busy={busy}
        error={error}
      />
    )
  }

  return <EditorView document={document} onSave={handleSave} onClose={handleClose} />
}
