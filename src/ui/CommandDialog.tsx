import type { ReactNode } from 'react'
import { Icon } from './Icon'
import './CommandDialog.css'

/**
 * The command dialog: a running command, what it still needs, and the two ways
 * out of it.
 *
 * A modelling command that consumes geometry cannot simply be a button. "Extrude"
 * used to fire the moment it was pressed and build from whichever sketch the
 * editor happened to think was current — which is guessing, and the guess was
 * wrong exactly when a document had more than one sketch in it. The fix is the
 * shape every CAD package uses: pressing the command opens *this*, which says
 * what it wants, shows what has been picked so far as chips, and does nothing at
 * all until OK is pressed.
 *
 * It is a plain presentational shell. What is being selected, and whether that
 * is enough to run, are the editor's decisions — this only makes them visible.
 */

/** One thing the command has taken, as a removable chip. */
export interface CommandChip {
  readonly id: string
  readonly label: string
  readonly onRemove?: () => void
}

export interface CommandDialogProps {
  /** The command's name, e.g. "Extrude". */
  readonly title: string
  /** What the command is waiting for, in a sentence. */
  readonly prompt: string
  readonly chips: readonly CommandChip[]
  /** Shown when nothing has been picked yet, in place of the chips. */
  readonly emptyLabel: string
  /** The chooser, a list, or whatever else the command offers as an alternative. */
  readonly children?: ReactNode
  /** False while the command still needs something. OK stays disabled. */
  readonly canConfirm: boolean
  readonly confirmLabel?: string
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

export function CommandDialog({
  title,
  prompt,
  chips,
  emptyLabel,
  children,
  canConfirm,
  confirmLabel = 'OK',
  onConfirm,
  onCancel,
}: CommandDialogProps): React.ReactElement {
  return (
    <section
      className="command-dialog"
      role="dialog"
      aria-label={title}
      aria-describedby="command-dialog-prompt"
      data-testid="command-dialog"
    >
      <header className="command-dialog__header">
        <Icon name="sketch" size={15} />
        <h2 className="command-dialog__title">{title}</h2>
      </header>

      <p className="command-dialog__prompt" id="command-dialog-prompt" role="status">
        {prompt}
      </p>

      {chips.length === 0 ? (
        <p className="command-dialog__empty">{emptyLabel}</p>
      ) : (
        <ul className="command-dialog__chips" aria-label={`${title} selection`}>
          {chips.map((chip) => (
            <li key={chip.id}>
              {chip.onRemove ? (
                <button
                  type="button"
                  className="command-dialog__chip"
                  aria-label={`Remove ${chip.label} from the selection`}
                  onClick={chip.onRemove}
                >
                  <span>{chip.label}</span>
                  <Icon name="close" size={12} />
                </button>
              ) : (
                <span className="command-dialog__chip">{chip.label}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {children}

      {/* Both ways out are always on screen. A selection mode you cannot see the
          end of is a mode users get stuck in. */}
      <div className="command-dialog__actions">
        <button
          type="button"
          className="command-dialog__action command-dialog__action--primary"
          disabled={!canConfirm}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
        <button type="button" className="command-dialog__action" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  )
}
