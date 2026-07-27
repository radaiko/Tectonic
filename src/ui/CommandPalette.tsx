import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Command } from './commands'
import { filterCommands } from './commands'
import './CommandPalette.css'

export interface CommandPaletteProps {
  readonly open: boolean
  readonly onClose: () => void
  /** Everything runnable right now — the shell rebuilds this as context changes. */
  readonly commands: readonly Command[]
}

/**
 * Search-and-run over the commands the shell offers. Opening it belongs to the
 * shell, which owns the Ctrl+P chord; from there the palette owns its own keys
 * so arrows and Enter never reach the editor behind it.
 */
export function CommandPalette({
  open,
  onClose,
  commands,
}: CommandPaletteProps): React.ReactElement | null {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const activeRef = useRef<HTMLLIElement | null>(null)

  const matches = useMemo(() => filterCommands(commands, query), [commands, query])
  // A shrinking result list must not leave the highlight past its end.
  const selected = matches.length === 0 ? -1 : Math.min(activeIndex, matches.length - 1)

  // Every opening starts from a clean search, otherwise the palette reopens
  // filtered by whatever was typed last time.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIndex(0)
    inputRef.current?.focus()
  }, [open])

  // Keyboard navigation can outrun the visible window on a long list.
  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [selected])

  const run = useCallback(
    (command: Command) => {
      // Closing first means a command that opens another panel wins the race
      // for focus rather than being shut again on the way out.
      onClose()
      command.run()
    },
    [onClose],
  )

  if (!open) return null

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(matches.length === 0 ? 0 : (selected + 1) % matches.length)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(matches.length === 0 ? 0 : (selected - 1 + matches.length) % matches.length)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const command = matches[selected]
      if (command) run(command)
    }
  }

  return (
    <div className="palette" onPointerDown={onClose}>
      <div
        className="palette__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <input
          className="palette__search"
          type="text"
          role="combobox"
          aria-label="Search commands"
          aria-expanded="true"
          aria-controls="palette-results"
          aria-activedescendant={selected >= 0 ? `palette-option-${selected}` : undefined}
          placeholder="Type a command…"
          value={query}
          ref={inputRef}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
          }}
        />

        {matches.length === 0 ? (
          <p className="palette__empty">No matching command.</p>
        ) : (
          <ul className="palette__results" id="palette-results" role="listbox" aria-label="Commands">
            {matches.map((command, index) => (
              <li
                key={command.id}
                id={`palette-option-${index}`}
                role="option"
                aria-selected={index === selected}
                className={`palette__item${index === selected ? ' palette__item--active' : ''}`}
                ref={index === selected ? activeRef : undefined}
                onPointerEnter={() => setActiveIndex(index)}
                onClick={() => run(command)}
              >
                <span className="palette__category">{command.category}</span>
                <span className="palette__title">{command.title}</span>
                {command.shortcut ? (
                  <kbd className="palette__shortcut">{command.shortcut}</kbd>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <footer className="palette__footer">
          <span>↑↓ to navigate</span>
          <span>Enter to run</span>
          <span>Esc to dismiss</span>
        </footer>
      </div>
    </div>
  )
}
