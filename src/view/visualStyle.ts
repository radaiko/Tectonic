import type { VisualStyle } from './types'

/**
 * Everything a renderer needs to draw a body in a given style, as plain data.
 * Keeping it renderer-agnostic means the three.js viewport, a future 2D preview
 * and the drawing exporter can all read the same table.
 */
export interface StyleAppearance {
  /** Draw the shaded triangles at all. */
  readonly faces: boolean
  /** Draw the sharp edges over the faces. */
  readonly edges: boolean
  /** Also draw the edges that the body itself hides, as in a hidden-line view. */
  readonly hiddenEdges: boolean
  /** Face opacity in [0, 1]. Anything below 1 needs blending. */
  readonly opacity: number
  /** Lit with the scene lights, or drawn flat. */
  readonly lit: boolean
  readonly background: string
  readonly faceColor: string
  readonly edgeColor: string
  /** Colour used for the edges a body hides, when `hiddenEdges` is set. */
  readonly hiddenEdgeColor: string
  /** Whether the grid and axes helpers are shown under this style. */
  readonly helpers: boolean
}

export const VISUAL_STYLES: readonly VisualStyle[] = [
  'shaded',
  'shadedEdges',
  'wireframe',
  'xray',
  'hiddenLine',
  'technical',
]

export const DEFAULT_VISUAL_STYLE: VisualStyle = 'shadedEdges'

const LABELS: Record<VisualStyle, string> = {
  shaded: 'Shaded',
  shadedEdges: 'Shaded with edges',
  wireframe: 'Wireframe',
  xray: 'X-ray',
  hiddenLine: 'Hidden line',
  technical: 'Technical illustration',
}

const DARK_BACKGROUND = '#1a1d21'
const PAPER_BACKGROUND = '#ffffff'
const SURFACE = '#4d9bd9'
const DARK_EDGE = '#0f1417'

const APPEARANCES: Record<VisualStyle, StyleAppearance> = {
  shaded: {
    faces: true,
    edges: false,
    hiddenEdges: false,
    opacity: 1,
    lit: true,
    background: DARK_BACKGROUND,
    faceColor: SURFACE,
    edgeColor: DARK_EDGE,
    hiddenEdgeColor: DARK_EDGE,
    helpers: true,
  },
  shadedEdges: {
    faces: true,
    edges: true,
    hiddenEdges: false,
    opacity: 1,
    lit: true,
    background: DARK_BACKGROUND,
    faceColor: SURFACE,
    edgeColor: DARK_EDGE,
    hiddenEdgeColor: DARK_EDGE,
    helpers: true,
  },
  wireframe: {
    faces: false,
    edges: true,
    hiddenEdges: true,
    opacity: 0,
    lit: false,
    background: DARK_BACKGROUND,
    faceColor: SURFACE,
    edgeColor: '#9fb4c4',
    hiddenEdgeColor: '#9fb4c4',
    helpers: true,
  },
  xray: {
    faces: true,
    edges: true,
    hiddenEdges: true,
    opacity: 0.28,
    lit: true,
    background: DARK_BACKGROUND,
    faceColor: SURFACE,
    edgeColor: '#cfe2f0',
    hiddenEdgeColor: '#5d7182',
    helpers: true,
  },
  hiddenLine: {
    // Faces are drawn in the background colour so they occlude without being
    // seen — the classic way to get a hidden-line picture out of a shaded pipe.
    faces: true,
    edges: true,
    hiddenEdges: false,
    opacity: 1,
    lit: false,
    background: PAPER_BACKGROUND,
    faceColor: PAPER_BACKGROUND,
    edgeColor: '#111417',
    hiddenEdgeColor: '#8a929a',
    helpers: false,
  },
  technical: {
    faces: false,
    edges: true,
    hiddenEdges: false,
    opacity: 0,
    lit: false,
    background: PAPER_BACKGROUND,
    faceColor: PAPER_BACKGROUND,
    edgeColor: '#1c4f80',
    hiddenEdgeColor: '#9db6cd',
    helpers: false,
  },
}

export function styleLabel(style: VisualStyle): string {
  return LABELS[style]
}

export function styleAppearance(style: VisualStyle): StyleAppearance {
  return APPEARANCES[style]
}

export function isVisualStyle(value: unknown): value is VisualStyle {
  return typeof value === 'string' && (VISUAL_STYLES as readonly string[]).includes(value)
}

/** The next style in the list, so a single key can cycle through them. */
export function nextVisualStyle(style: VisualStyle): VisualStyle {
  const index = VISUAL_STYLES.indexOf(style)
  return VISUAL_STYLES[(index + 1) % VISUAL_STYLES.length] as VisualStyle
}

/** Styles that need blending, i.e. that must be drawn after the opaque pass. */
export function isTransparent(style: VisualStyle): boolean {
  const appearance = APPEARANCES[style]
  return appearance.faces && appearance.opacity < 1
}
