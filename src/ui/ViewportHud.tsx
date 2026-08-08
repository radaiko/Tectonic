import { Icon } from './Icon'
import './ViewportHud.css'

/**
 * The state read-out over the viewport: which mode is live, which tool has the
 * pointer, and what is picked.
 *
 * A modelling tool is modal — a click means "start a line" or "choose this face
 * to fillet" depending on state the user set several actions ago — and the
 * usual fix, a status bar at the bottom, puts that answer as far from the
 * pointer as the window allows. This sits in the top-left corner of the stage,
 * where the eye already is.
 *
 * Two rules keep it from becoming clutter: it never takes the pointer, so it
 * can never intercept a click meant for geometry, and it sits in the corner
 * furthest from the view cube and the origin legend, so it covers no control
 * and — at three short lines — very little model.
 */
export interface ViewportHudProps {
  /** Which surface has the screen. */
  readonly mode: 'model' | 'sketch'
  /** The open sketch, when drawing. */
  readonly sketchName?: string | undefined
  /** The active drawing tool, when drawing. */
  readonly toolLabel?: string | undefined
  readonly selectionCount: number
  /**
   * What a feature is currently taking picks of, if a field is armed. This is
   * the single most important thing the HUD says: while a field is armed the
   * viewport ignores everything except that kind, and without a read-out the
   * only symptom is that clicks stop working.
   */
  readonly pickingKind?: string | null
  /** What to do next, in a few words. */
  readonly hint?: string | undefined
}

export function ViewportHud({
  mode,
  sketchName,
  toolLabel,
  selectionCount,
  pickingKind,
  hint,
}: ViewportHudProps): React.ReactElement {
  return (
    <div className="hud" data-testid="viewport-hud-state">
      <p className="hud__mode">
        <Icon name={mode === 'sketch' ? 'sketch' : 'body'} size={13} />
        {mode === 'sketch' ? (sketchName ?? 'Sketch') : 'Model'}
        {mode === 'sketch' && toolLabel ? (
          <span className="hud__tool">{toolLabel}</span>
        ) : null}
      </p>

      {pickingKind ? (
        <p className="hud__line hud__line--armed" role="status">
          Picking {pickingKind}s — click in the view to add
        </p>
      ) : /* The 3D selection, and only while the 3D view is the thing it is
             over. A sketch has a selection of its own, reported in the sketch
             status bar, and showing the leftover model pick beside the drawing
             tool would be two different meanings of "selected" on one screen. */
      mode === 'model' && selectionCount > 0 ? (
        <p className="hud__line">
          {selectionCount} selected
        </p>
      ) : hint ? (
        <p className="hud__line hud__line--hint">{hint}</p>
      ) : null}
    </div>
  )
}
