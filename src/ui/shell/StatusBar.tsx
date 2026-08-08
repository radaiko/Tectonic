import type { ReactNode } from 'react'
import type { IconName } from '../Icon'
import { Icon } from '../Icon'
import './StatusBar.css'

/**
 * The read-out along the bottom: what the document holds, what is picked, and
 * what is doing the modelling.
 *
 * Every entry here answers a question a user would otherwise have to open a
 * dialog for, and none of them is a control. That is the rule the bar is built
 * on — a status bar that hides actions is a status bar people stop reading.
 */
export interface StatusItem {
  readonly id: string
  readonly label: string
  readonly icon?: IconName
  /** Draws attention only when something is genuinely off. */
  readonly tone?: 'default' | 'warning' | 'error' | 'accent'
  readonly title?: string
}

export interface StatusBarProps {
  readonly items: readonly StatusItem[]
  /** Pinned to the right — the timeline toggle, the kernel read-out. */
  readonly trailing?: ReactNode
}

export function StatusBar({ items, trailing }: StatusBarProps): React.ReactElement {
  return (
    <footer className="statusbar" aria-label="Document status">
      {items.map((item) => (
        <span
          key={item.id}
          className={`statusbar__item${item.tone && item.tone !== 'default' ? ` statusbar__item--${item.tone}` : ''}`}
          {...(item.title ? { title: item.title } : {})}
        >
          {item.icon ? <Icon name={item.icon} size={13} /> : null}
          {item.label}
        </span>
      ))}
      <span className="statusbar__spacer" />
      {trailing}
    </footer>
  )
}
