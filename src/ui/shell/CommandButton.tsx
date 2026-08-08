import type { ReactNode } from 'react'
import type { IconName } from '../Icon'
import { Icon } from '../Icon'
import './CommandButton.css'

/**
 * One command in a ribbon group, a panel header or a viewport overlay.
 *
 * This is the single place the application decides what a command *looks* like,
 * which is what keeps a fillet button in the Modify group and a fillet button in
 * a context strip from drifting into two different controls.
 *
 * The two ways a command can be unusable are deliberately kept apart, because
 * they are different facts and a user acts on them differently:
 *
 *  - `disabled` — not right *now*. There is no sketch to extrude, nothing
 *    selected to fillet. Try again in a moment and it works. Rendered as a real
 *    disabled button: it is out of the tab order because there is nothing to
 *    learn from stopping on it.
 *  - `unavailable` — not *here*. The loaded geometry backend cannot do this at
 *    all. Rendered as `aria-disabled` rather than `disabled`, so it stays
 *    focusable and its reason is reachable from the keyboard, and the reason is
 *    folded into the accessible name rather than hidden in a tooltip. Silently
 *    greying it out would leave the user guessing; wiring it to a no-op that
 *    reports success would be a lie.
 */
export interface CommandButtonProps {
  readonly label: string
  readonly icon?: IconName
  /**
   * Artwork drawn in place of a named icon, for command sets that already own
   * their own drawings — the sketch tools, whose glyphs show the geometry each
   * one makes. Reusing those beats copying sixteen paths into the shared set and
   * then having two versions of a line tool to keep in step.
   */
  readonly iconNode?: ReactNode
  readonly onSelect?: () => void
  /** Icon above the label (ribbon) or beside it (dense strips and menus). */
  readonly size?: 'large' | 'small'
  /** What the command does, shown under the label in the tooltip. */
  readonly description?: string
  /** How the same command is reached from the keyboard, e.g. 'E'. */
  readonly shortcut?: string
  /** Unusable right now — see the note above. */
  readonly disabled?: boolean
  /** Not supported by this build or backend, with the reason. See the note above. */
  readonly unavailable?: string
  /** For commands that hold a state, such as a sketch tool. */
  readonly active?: boolean
  /** Carries the accent, for the one command a context is really about. */
  readonly emphasis?: 'primary'
  readonly className?: string
}

export function CommandButton({
  label,
  icon,
  iconNode,
  onSelect,
  size = 'large',
  description,
  shortcut,
  disabled = false,
  unavailable,
  active,
  emphasis,
  className,
}: CommandButtonProps): React.ReactElement {
  const blocked = unavailable !== undefined

  const classes = [
    'cmd',
    `cmd--${size}`,
    active ? 'cmd--active' : '',
    emphasis === 'primary' ? 'cmd--primary' : '',
    blocked ? 'cmd--unavailable' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  // Everything the tooltip can say, in the order it is worth reading: what the
  // command is, what it does, how to reach it, and why it will not run.
  const tooltip = [
    shortcut ? `${label} (${shortcut})` : label,
    description,
    unavailable,
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <button
      type="button"
      className={classes}
      title={tooltip}
      // The name a screen reader announces carries the blocking reason with it,
      // so "why can I not use this" never depends on a hover.
      aria-label={blocked ? `${label} — ${unavailable}` : label}
      {...(active === undefined ? {} : { 'aria-pressed': active })}
      {...(blocked ? { 'aria-disabled': true } : {})}
      disabled={disabled}
      onClick={blocked ? undefined : onSelect}
    >
      <span className="cmd__art" aria-hidden="true">
        {iconNode ?? (icon ? <Icon name={icon} size={size === 'large' ? 20 : 15} /> : null)}
      </span>
      <span className="cmd__label">{label}</span>
      {shortcut && size === 'small' ? <kbd className="cmd__key">{shortcut}</kbd> : null}
    </button>
  )
}
