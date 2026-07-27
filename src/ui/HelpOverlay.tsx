import { useEffect, useRef } from 'react'
import type { ShortcutSection } from './shortcuts'
import { SHORTCUT_SECTIONS } from './shortcuts'
import './HelpOverlay.css'

export interface HelpOverlayProps {
  readonly open: boolean
  readonly onClose: () => void
  /** Overridable so tests — and any future context-sensitive help — can narrow it. */
  readonly sections?: readonly ShortcutSection[]
}

/**
 * The keyboard reference, shown centred over whatever is on screen. Opening and
 * closing it belongs to the shell, which owns the `?` and `F1` chords; this
 * component only adds the dismissals a modal is expected to have.
 */
export function HelpOverlay({
  open,
  onClose,
  sections = SHORTCUT_SECTIONS,
}: HelpOverlayProps): React.ReactElement | null {
  const panelRef = useRef<HTMLDivElement | null>(null)

  // Escape is handled here rather than in the shell so it closes the help even
  // when focus has wandered off the panel.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  // Taking focus keeps Tab inside reach of the close button and stops the key
  // that opened the overlay from carrying on into the editor underneath.
  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div className="help-overlay" onPointerDown={onClose}>
      <div
        className="help-overlay__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        tabIndex={-1}
        ref={panelRef}
        // The backdrop closes on any press; the panel is not the backdrop.
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="help-overlay__header">
          <h2 className="help-overlay__title">Keyboard shortcuts</h2>
          <button
            type="button"
            className="help-overlay__close"
            aria-label="Close help"
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        <div className="help-overlay__sections">
          {sections.map((section) => (
            <section className="help-overlay__section" key={section.title}>
              <h3 className="help-overlay__section-title">{section.title}</h3>
              <p className="help-overlay__scope">{section.scope}</p>
              <dl className="help-overlay__bindings">
                {section.bindings.map((binding) => (
                  <div className="help-overlay__binding" key={`${binding.keys.join('+')}-${binding.action}`}>
                    <dt className="help-overlay__keys">
                      {binding.keys.map((key) => (
                        <kbd className="help-overlay__key" key={key}>
                          {key}
                        </kbd>
                      ))}
                    </dt>
                    <dd className="help-overlay__action">{binding.action}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <footer className="help-overlay__footer">
          <span>
            On macOS press <kbd className="help-overlay__key">⌘</kbd> wherever{' '}
            <kbd className="help-overlay__key">Ctrl</kbd> is listed.
          </span>
          <span>
            <kbd className="help-overlay__key">Esc</kbd> closes this panel.
          </span>
        </footer>
      </div>
    </div>
  )
}
