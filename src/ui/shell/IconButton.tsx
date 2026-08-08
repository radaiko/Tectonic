import type { IconName } from '../Icon'
import { Icon } from '../Icon'
import './IconButton.css'

/**
 * A compact action: an icon, optionally with a label beside it.
 *
 * Used wherever a control has to sit inside a band of fixed height — the app
 * bar, a panel header, a viewport overlay — as opposed to the ribbon, which has
 * room for the stacked form. The label is always supplied even when it is not
 * drawn, because an icon with no accessible name is a button that only sighted
 * pointer users can operate.
 */
export interface IconButtonProps {
  readonly icon: IconName
  /** The accessible name, and the visible text when `showLabel` is set. */
  readonly label: string
  readonly onClick?: () => void
  readonly showLabel?: boolean
  /** Fuller text for the tooltip. Falls back to the label. */
  readonly title?: string
  readonly disabled?: boolean
  readonly active?: boolean
  readonly tone?: 'default' | 'accent' | 'danger'
  readonly size?: 'sm' | 'md'
  readonly className?: string
}

export function IconButton({
  icon,
  label,
  onClick,
  showLabel = false,
  title,
  disabled = false,
  active,
  tone = 'default',
  size = 'md',
  className,
}: IconButtonProps): React.ReactElement {
  const classes = [
    'iconbtn',
    `iconbtn--${size}`,
    tone === 'default' ? '' : `iconbtn--${tone}`,
    active ? 'iconbtn--active' : '',
    showLabel ? 'iconbtn--labelled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={classes}
      // Kept distinct from the tooltip: the tooltip is free to say more (undo
      // names the step it would take back), while the name a screen reader
      // announces stays the short, stable one.
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
      {...(active === undefined ? {} : { 'aria-pressed': active })}
      onClick={onClick}
    >
      <Icon name={icon} size={size === 'sm' ? 14 : 16} />
      {showLabel ? <span className="iconbtn__label">{label}</span> : null}
    </button>
  )
}
