import type { ReactNode } from 'react'
import { Icon } from '../Icon'
import { IconButton } from './IconButton'
import './AppBar.css'

/**
 * The band across the top: who you are, what you have open, and whether it is
 * safe to close.
 *
 * Everything here is document-level and lives above whichever workspace is
 * showing — the ribbon underneath changes as the user moves between modelling
 * and sketching, this does not. That split is the point: it means the save
 * state and the way out are always in the same place on screen, which is the
 * one thing a user needs to be able to find without looking.
 *
 * Notably absent is anything that starts a sketch. A sketch is entered by
 * choosing what it sits on — an origin plane or a planar face — so a top-level
 * button that opened "the sketch surface" without asking which sketch would be a
 * second, contradictory way in.
 */
export interface AppBarProps {
  readonly documentName: string
  readonly onRenameDocument: (name: string) => void
  /** Whether there are edits that have not been written to a file. */
  readonly modified: boolean
  /** What undo would take back, or null when there is nothing. */
  readonly undoLabel: string | null
  readonly redoLabel: string | null
  readonly onUndo: () => void
  readonly onRedo: () => void
  /** Document-level actions, right-aligned. */
  readonly actions?: ReactNode
}

export function AppBar({
  documentName,
  onRenameDocument,
  modified,
  undoLabel,
  redoLabel,
  onUndo,
  onRedo,
  actions,
}: AppBarProps): React.ReactElement {
  return (
    <header className="appbar">
      <span className="appbar__brand">
        <Icon name="kernel" size={15} />
        Tectonic
      </span>

      <div className="appbar__identity">
        {/* An input rather than a heading: the title is edited where it is read,
            which is the only place a user looks for it. It is styled to read as
            text until it is hovered or focused. */}
        <input
          className="appbar__doc"
          aria-label="Document name"
          value={documentName}
          spellCheck={false}
          onChange={(event) => onRenameDocument(event.target.value)}
        />
        <span
          className={`appbar__state${modified ? ' appbar__state--modified' : ''}`}
          title={
            modified
              ? 'This document has edits that have not been written to a file.'
              : 'Everything is written to the file.'
          }
        >
          {modified ? 'Modified' : 'Saved'}
        </span>
      </div>

      {/* Undo names the step it would take back in its tooltip. Knowing *what* a
          click will undo is the difference between using undo and being afraid
          of it — but the accessible name stays the short, stable one. */}
      <div className="appbar__history" role="group" aria-label="Document history">
        <IconButton
          icon="undo"
          label="Undo"
          title={undoLabel ? `Undo ${undoLabel}` : 'Nothing to undo'}
          disabled={undoLabel === null}
          onClick={onUndo}
        />
        <IconButton
          icon="redo"
          label="Redo"
          title={redoLabel ? `Redo ${redoLabel}` : 'Nothing to redo'}
          disabled={redoLabel === null}
          onClick={onRedo}
        />
      </div>

      <div className="appbar__spacer" />

      {actions ? <div className="appbar__actions">{actions}</div> : null}
    </header>
  )
}
