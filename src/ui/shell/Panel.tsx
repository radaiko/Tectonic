import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import type { IconName } from '../Icon'
import { Icon } from '../Icon'
import './Panel.css'

/**
 * A docked side region — the browser on the left, the inspector on the right.
 *
 * One component for both sides, because the only thing that genuinely differs
 * is which edge carries the separator. Everything a panel does — its header,
 * its scrolling, its width — is a decision that should be made once, and was.
 */
export interface PanelProps {
  readonly side: 'left' | 'right'
  /** Names the region in the accessibility tree and in the header. */
  readonly label: string
  /** Controls beside the title, e.g. show-all or a collapse toggle. */
  readonly headerActions?: ReactNode
  readonly children: ReactNode
  readonly className?: string
}

export function Panel({
  side,
  label,
  headerActions,
  children,
  className,
}: PanelProps): React.ReactElement {
  return (
    <aside
      className={['panel', `panel--${side}`, className].filter(Boolean).join(' ')}
      aria-label={label}
    >
      <div className="panel__header">
        <h2 className="panel__title">{label}</h2>
        {headerActions ? <div className="panel__header-actions">{headerActions}</div> : null}
      </div>
      <div className="panel__body">{children}</div>
    </aside>
  )
}

/**
 * A collapsible section inside a panel.
 *
 * The disclosure is a real button with `aria-expanded` pointing at the region it
 * controls, so the browser tree can be walked without a pointer — which matters
 * more here than in most interfaces, because the tree is how a part is
 * navigated once it has more than a handful of features in it.
 */
export interface PanelSectionProps {
  readonly title: string
  readonly icon?: IconName
  /** Shown after the title — a count, a support, a state. */
  readonly detail?: ReactNode
  /** Controls on the section header, revealed on hover or focus. */
  readonly actions?: ReactNode
  readonly defaultOpen?: boolean
  readonly children: ReactNode
  readonly className?: string
}

export function PanelSection({
  title,
  icon,
  detail,
  actions,
  defaultOpen = true,
  children,
  className,
}: PanelSectionProps): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen)
  const regionId = useId()

  return (
    <section className={['psection', className].filter(Boolean).join(' ')}>
      <div className="psection__header">
        <button
          type="button"
          className="psection__toggle"
          aria-expanded={open}
          aria-controls={regionId}
          onClick={() => setOpen((current) => !current)}
        >
          <Icon name={open ? 'chevron-down' : 'chevron-right'} size={13} />
          {icon ? <Icon name={icon} size={14} className="psection__icon" /> : null}
          <span className="psection__title">{title}</span>
          {detail ? <span className="psection__detail">{detail}</span> : null}
        </button>
        {actions ? <div className="psection__actions">{actions}</div> : null}
      </div>
      <div className="psection__body" id={regionId} hidden={!open}>
        {children}
      </div>
    </section>
  )
}

/** The message a panel shows in place of content it has none of. */
export function PanelEmpty({ children }: { readonly children: ReactNode }): React.ReactElement {
  return <p className="panel__empty">{children}</p>
}
