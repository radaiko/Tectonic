import type { StoredSession } from '../io/DocumentStorage'
import { Button } from '../ui/Button'
import './StartScreen.css'

export interface StartScreenProps {
  readonly onNewDocument: () => void
  readonly onOpenFile: () => void
  /** The document a previous session left behind, if there is a usable one. */
  readonly recovery?: StoredSession | null
  readonly onRestore?: () => void
  readonly onDiscardRecovery?: () => void
  readonly busy?: boolean
  /** Message shown when the last open attempt failed. */
  readonly error?: string | undefined
}

export function StartScreen({
  onNewDocument,
  onOpenFile,
  recovery = null,
  onRestore,
  onDiscardRecovery,
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

        {recovery ? (
          <section className="start__recovery" aria-label="Recovered document">
            <p className="start__recovery-text">
              <strong>{recovery.document.metadata.name}</strong> was still open
              {recovery.dirty ? ' with unsaved changes' : ''}
              {' — last kept '}
              {formatTimestamp(recovery.savedAt)}.
            </p>
            <div className="start__recovery-actions">
              <Button variant="primary" onClick={onRestore} disabled={busy}>
                Restore
              </Button>
              <Button variant="ghost" onClick={onDiscardRecovery} disabled={busy}>
                Discard
              </Button>
            </div>
          </section>
        ) : null}

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

/** The stamp in the reader's own locale, falling back to the raw text. */
function formatTimestamp(iso: string): string {
  const parsed = Date.parse(iso)
  return Number.isNaN(parsed) ? iso : new Date(parsed).toLocaleString()
}
