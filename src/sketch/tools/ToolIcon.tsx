import type { ToolId } from './SketchTool'

/**
 * Line-art icons for the sketch tool palette, drawn as vectors on a 24-unit
 * grid so they stay sharp at any size and on any pixel ratio.
 *
 * They are stroked in `currentColor`, which is what lets the palette's hover,
 * active and disabled colours reach the artwork without a second set of assets.
 * Each one draws the thing the tool makes — the geometry, not a letter for it —
 * and construction hints the sketch itself uses (endpoint dots, extension
 * lines, a dashed mirror axis) carry over so the palette reads like the canvas.
 */

/** Endpoint handle, drawn the way the sketch renderer draws a picked point. */
function Point({ x, y }: { readonly x: number; readonly y: number }): React.ReactElement {
  return <circle cx={x} cy={y} r={1.6} fill="currentColor" stroke="none" />
}

const GLYPHS: Record<ToolId, React.ReactElement> = {
  select: <path d="M5 2.5 5 18.4 9 14.6 11.6 20 14.3 18.7 11.7 13.4 17 13.1Z" />,
  line: (
    <>
      <path d="M5.5 18.5 18.5 5.5" />
      <Point x={5.5} y={18.5} />
      <Point x={18.5} y={5.5} />
    </>
  ),
  circle: (
    <>
      <circle cx={12} cy={12} r={8} />
      <Point x={12} y={12} />
    </>
  ),
  arc: (
    <>
      <path d="M3.5 17.5A9.5 9.5 0 0 1 20.5 17.5" />
      <Point x={3.5} y={17.5} />
      <Point x={20.5} y={17.5} />
    </>
  ),
  rectangle: (
    <>
      <rect x={3.5} y={6} width={17} height={12} />
      <Point x={3.5} y={18} />
      <Point x={20.5} y={6} />
    </>
  ),
  slot: (
    <>
      <path d="M8.5 6.5h7a5.5 5.5 0 0 1 0 11h-7a5.5 5.5 0 0 1 0-11Z" />
      <Point x={8.5} y={12} />
      <Point x={15.5} y={12} />
    </>
  ),
  polygon: <path d="M12 3.5 19.4 7.75 19.4 16.25 12 20.5 4.6 16.25 4.6 7.75Z" />,
  ellipse: (
    <>
      <ellipse cx={12} cy={12} rx={9} ry={6} />
      <Point x={12} y={12} />
    </>
  ),
  spline: (
    <>
      <path d="M3 17.5C6.5 6.5 10.5 19.5 14 12.5 16 8.5 18.5 6.5 21 6" />
      <Point x={3} y={17.5} />
      <Point x={21} y={6} />
    </>
  ),
  // Scissors: two handles and a pair of crossed blades.
  trim: (
    <>
      <circle cx={6} cy={6.5} r={2.6} />
      <circle cx={6} cy={17.5} r={2.6} />
      <path d="M8.2 8 20 19.5M8.2 16 20 4.5" />
    </>
  ),
  // A corner rounded off, against the sharp one it replaces.
  fillet: (
    <>
      <path d="M4 20V11a7 7 0 0 1 7-7h9" />
      <path d="M4 4h7M4 4v7" strokeDasharray="2 2.4" />
    </>
  ),
  // The same corner, cut straight instead.
  chamfer: (
    <>
      <path d="M4 20V12l8-8h8" />
      <path d="M4 4h8M4 4v8" strokeDasharray="2 2.4" />
    </>
  ),
  dimension: (
    <>
      <path d="M4.5 4.5v15M19.5 4.5v15" />
      <path d="M4.5 12h15" />
      <path d="M8 8.5 4.5 12 8 15.5M16 8.5 19.5 12 16 15.5" />
    </>
  ),
  mirror: (
    <>
      <path d="M12 2.5v19" strokeDasharray="2.5 2.5" />
      <path d="M8.5 6 3 12l5.5 6ZM15.5 6 21 12l-5.5 6Z" />
    </>
  ),
  pattern: (
    <>
      <rect x={3.5} y={3.5} width={5} height={5} />
      <rect x={15.5} y={3.5} width={5} height={5} />
      <rect x={3.5} y={15.5} width={5} height={5} />
      <rect x={15.5} y={15.5} width={5} height={5} />
      <rect x={9.5} y={9.5} width={5} height={5} />
    </>
  ),
  // A profile and the curve offset from it.
  offset: (
    <>
      <rect x={3} y={3} width={13} height={13} rx={2} strokeDasharray="2.5 2.5" />
      <rect x={8} y={8} width={13} height={13} rx={2} />
    </>
  ),
}

export interface ToolIconProps {
  readonly tool: ToolId
  /** Edge length in CSS pixels. The artwork scales; nothing is rasterised. */
  readonly size?: number
}

/**
 * The icon for one sketch tool. Purely decorative: the button around it carries
 * the accessible name, so this is hidden from assistive technology.
 */
export function ToolIcon({ tool, size = 20 }: ToolIconProps): React.ReactElement {
  return (
    <svg
      className="sketch__tool-icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {GLYPHS[tool]}
    </svg>
  )
}
