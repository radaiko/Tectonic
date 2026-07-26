import { Button } from '../ui/Button'
import './StartScreen.css'

export interface StartScreenProps {
  readonly onNewDocument: () => void
  readonly onOpenFile: () => void
  readonly busy?: boolean
  /** Message shown when the last open attempt failed. */
  readonly error?: string | undefined
}

export function StartScreen({
  onNewDocument,
  onOpenFile,
  busy = false,
  error,
}: StartScreenProps): React.ReactElement {
  return (
    <main className="start">
      <div className="start__inner">
        <header className="start__brand">
          <h1 className="start__wordmark">Tectonic</h1>
          <p className="start__tagline">Parametric CAD in the browser</p>
        </header>

        <div className="start__actions">
          <Button variant="primary" size="large" onClick={onNewDocument} disabled={busy}>
            <span className="start__action-title">New Document</span>
            <span className="start__action-sub">Start from an empty part studio</span>
          </Button>
          <Button size="large" onClick={onOpenFile} disabled={busy}>
            <span className="start__action-title">Open File</span>
            <span className="start__action-sub">Load an existing .tectonic document</span>
          </Button>
        </div>

        {error ? (
          <p className="start__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  )
}
