import { useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import type { IconName } from '../Icon'
import { CommandButton } from './CommandButton'
import './Ribbon.css'

/**
 * The command ribbon: workspace tabs over grouped, labelled commands.
 *
 * This is the shape a mechanical CAD package has settled on, and the reason is
 * not fashion — a modelling session runs through a small number of verbs
 * (create, modify, construct, inspect) applied over and over, and a ribbon puts
 * every one of them one click away with its name attached. A flat toolbar of
 * bare icons makes the same commands reachable and un-learnable.
 *
 * The whole thing is driven by data. A tab is a list of groups, a group is a
 * list of commands, and the editor builds that list from what it can actually
 * do — so a command that exists here is a command that runs, and one that
 * cannot run says why instead of quietly failing.
 */
export interface RibbonCommand {
  readonly id: string
  readonly label: string
  readonly icon?: IconName
  /** Artwork drawn instead of a named icon — see {@link CommandButton}. */
  readonly iconNode?: ReactNode
  readonly onSelect?: () => void
  readonly description?: string
  readonly shortcut?: string
  /** Unusable in the current state — no sketch to build from, nothing picked. */
  readonly disabled?: boolean
  /** Not supported by this backend or build, and why. Never silently hidden. */
  readonly unavailable?: string
  /** For commands that hold a state, such as the active sketch tool. */
  readonly active?: boolean
  readonly emphasis?: 'primary'
}

export interface RibbonGroup {
  readonly id: string
  /** The caption under the group, e.g. 'Create'. */
  readonly label: string
  readonly commands: readonly RibbonCommand[]
  /**
   * Overrides the group's ARIA role. The sketch tool group takes `toolbar`,
   * because that is exactly what it is: a set of mutually exclusive tools.
   */
  readonly role?: 'toolbar' | 'group'
  /** Overrides the accessible name, when the caption is not the whole story. */
  readonly ariaLabel?: string
}

export interface RibbonTab {
  readonly id: string
  readonly label: string
  readonly groups: readonly RibbonGroup[]
  /**
   * Shown in place of the groups when this workspace is not modelled yet. A tab
   * that is on screen and empty reads as broken; one that says what it is for
   * and that it is not here yet reads as honest.
   */
  readonly placeholder?: string
}

export interface RibbonProps {
  readonly tabs: readonly RibbonTab[]
  readonly activeTabId: string
  readonly onTabChange: (tabId: string) => void
  /** Names the tab strip, e.g. 'Workspace' or 'Sketch workspace'. */
  readonly label: string
  /** Pinned to the right of the command row — the one action a mode is about. */
  readonly trailing?: ReactNode
  /**
   * Role and name for the command region as a whole.
   *
   * Modelling commands are independent actions, so the default — a plain
   * container of labelled groups — is the honest description. The sketch tools
   * are not: they are one mutually exclusive setting, and calling that region a
   * `toolbar` is what tells assistive technology that picking one puts the
   * previous one down.
   */
  readonly commandsRole?: 'toolbar'
  readonly commandsLabel?: string
}

export function Ribbon({
  tabs,
  activeTabId,
  onTabChange,
  label,
  trailing,
  commandsRole,
  commandsLabel,
}: RibbonProps): React.ReactElement {
  const stripRef = useRef<HTMLDivElement | null>(null)
  const active = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]

  /**
   * Arrow-key movement across the tab strip.
   *
   * A tablist is a single tab stop with the arrows moving inside it — that is
   * what the pattern specifies and what a screen reader user expects. Without
   * this, reaching the last workspace from the keyboard means tabbing past
   * every one before it.
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const step =
        event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : event.key === 'Home' ? 0 : event.key === 'End' ? 0 : null
      if (step === null) return
      event.preventDefault()

      const index = tabs.findIndex((tab) => tab.id === activeTabId)
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? tabs.length - 1
            : (index + step + tabs.length) % tabs.length
      const target = tabs[next]
      if (!target) return
      onTabChange(target.id)
      // Focus follows selection, which is the automatic-activation form of the
      // pattern — the ribbon has no expensive tab to make that a bad idea.
      stripRef.current?.querySelector<HTMLElement>(`[data-tab-id="${target.id}"]`)?.focus()
    },
    [activeTabId, onTabChange, tabs],
  )

  return (
    <div className="ribbon">
      <div
        className="ribbon__tabs"
        role="tablist"
        aria-label={label}
        ref={stripRef}
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            data-tab-id={tab.id}
            id={`ribbon-tab-${tab.id}`}
            className={`ribbon__tab${tab.id === active?.id ? ' ribbon__tab--active' : ''}`}
            aria-selected={tab.id === active?.id}
            aria-controls={`ribbon-panel-${tab.id}`}
            tabIndex={tab.id === active?.id ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="ribbon__row"
        role="tabpanel"
        id={`ribbon-panel-${active?.id ?? 'none'}`}
        aria-labelledby={`ribbon-tab-${active?.id ?? 'none'}`}
        tabIndex={-1}
      >
        <div
          className="ribbon__groups"
          {...(commandsRole ? { role: commandsRole } : {})}
          {...(commandsLabel ? { 'aria-label': commandsLabel } : {})}
        >
          {active?.placeholder ? (
            <p className="ribbon__placeholder">{active.placeholder}</p>
          ) : (
            active?.groups.map((group) => <Group key={group.id} group={group} />)
          )}
        </div>
        {trailing ? <div className="ribbon__trailing">{trailing}</div> : null}
      </div>
    </div>
  )
}

function Group({ group }: { readonly group: RibbonGroup }): React.ReactElement {
  return (
    <section
      className="ribbon__group"
      role={group.role ?? 'group'}
      aria-label={group.ariaLabel ?? group.label}
    >
      <div className="ribbon__commands">
        {group.commands.map((command) => (
          <CommandButton
            key={command.id}
            label={command.label}
            {...(command.icon === undefined ? {} : { icon: command.icon })}
            {...(command.iconNode === undefined ? {} : { iconNode: command.iconNode })}
            {...(command.onSelect === undefined ? {} : { onSelect: command.onSelect })}
            {...(command.description === undefined ? {} : { description: command.description })}
            {...(command.shortcut === undefined ? {} : { shortcut: command.shortcut })}
            {...(command.disabled === undefined ? {} : { disabled: command.disabled })}
            {...(command.unavailable === undefined ? {} : { unavailable: command.unavailable })}
            {...(command.active === undefined ? {} : { active: command.active })}
            {...(command.emphasis === undefined ? {} : { emphasis: command.emphasis })}
          />
        ))}
      </div>
      <span className="ribbon__group-label" aria-hidden="true">
        {group.label}
      </span>
    </section>
  )
}
