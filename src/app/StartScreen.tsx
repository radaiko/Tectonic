import type { StoredSession } from '../io/DocumentStorage'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import './StartScreen.css'

/**
 * Where a session begins.
 *
 * Deliberately close to empty. A CAD package's start screen has exactly two
 * jobs — start something, or reopen something — and everything else it might
 * carry (a gallery, a tip of the day, a sample part) is a thing between the
 * user and the work. What it does owe them is an honest account of what was
 * left behind: nothing here is written to disk on its own, so the recovery copy
 * from the last session is the one piece of state worth the room.
 */
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
          <Icon name="kernel" size={22} className="start__mark" />
          <div>
            <h1 className="start__wordmark">Tectonic</h1>
            <p className="start__tagline">Parametric CAD in the browser</p>
          </div>
        </header>

        <div className="start__actions">
          <Button variant="primary" size="large" onClick={onNewDocument} disabled={busy}>
            <span className="start__action-title">
              <Icon name="file-new" size={16} />
              New Document
            </span>
            <span className="start__action-sub">Start from an empty part with origin planes</span>
          </Button>
          <Button size="large" onClick={onOpenFile} disabled={busy}>
            <span className="start__action-title">
              <Icon name="folder-open" size={16} />
              Open File
            </span>
            <span className="start__action-sub">Load an existing .tectonic document</span>
          </Button>
        </div>

        {/* Below the actions, not above them. A recovered document is worth
            offering and never worth blocking the way past — a user who came here
            to start something new should not have to dismiss anything first. */}
        {recovery ? (
          <section className="start__recovery" aria-label="Recovered document">
            <Icon name="warning" size={15} className="start__recovery-icon" />
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
              {/* Not gated on `busy`: throwing the recovered copy away needs
                  nothing from the geometry kernel, and blocking it while one
                  loads leaves the user staring at a panel they asked to close. */}
              <Button variant="ghost" onClick={onDiscardRecovery}>
                Discard
              </Button>
            </div>
          </section>
        ) : null}

        {busy ? (
          <p className="start__status" role="status">
            Starting the geometry kernel…
          </p>
        ) : null}

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
