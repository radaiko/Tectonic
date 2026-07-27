import type { Vec2 } from '../../sketch/domain/geometry'
import type { DetailCircle } from '../domain/DrawingView'
import type { Segment2 } from './geometry2d'
import { boundsOf, clipSegmentToCircle, scaleSegment } from './geometry2d'
import type { ViewGeometry } from './ViewGenerator'

/**
 * Detail views: a circle drawn on a parent view, blown up.
 *
 * The parent's line work is reused rather than reprojected. Orthographic
 * projection is affine, so scaling what the parent already worked out gives the
 * same answer as projecting again at a larger scale — and it guarantees the
 * detail agrees with the view it was taken from, down to which edges came out
 * hidden.
 */

export interface DetailOptions {
  readonly circle: DetailCircle
  /**
   * Enlargement applied on top of the parent's line work. A drawing normally
   * leaves this at 1 and gets its enlargement from the detail view's own scale,
   * which is what puts "DETAIL A (2:1)" in the label.
   */
  readonly magnification?: number
  /**
   * Draws the detail's own boundary as a ragged break line instead of a full
   * circle, which is what a detail lifted out of a larger part usually gets.
   */
  readonly broken?: boolean
  /** Points around the boundary. */
  readonly segments?: number
}

export interface DetailGeometry extends ViewGeometry {
  /** The detail's own boundary, in the detail's coordinates. */
  readonly boundary: readonly Segment2[]
  /** Radius of the detail as drawn. */
  readonly radius: number
  readonly magnification: number
}

const DEFAULT_SEGMENTS = 64
const DEFAULT_MAGNIFICATION = 1

/**
 * The parent's geometry trimmed to the detail circle and enlarged, centred on
 * the origin so the detail can be placed anywhere on the sheet.
 */
export function generateDetailView(
  parent: ViewGeometry,
  options: DetailOptions,
): DetailGeometry {
  const { circle } = options
  const magnification = positive(options.magnification, DEFAULT_MAGNIFICATION)
  const radius = Math.max(circle.radius, 0)

  const trim = (segments: readonly Segment2[]): Segment2[] => {
    const kept: Segment2[] = []
    for (const segment of segments) {
      const clipped = clipSegmentToCircle(segment, circle.center, radius)
      if (!clipped) continue
      // Re-centre on the detail's own origin, then enlarge about it.
      const centred = {
        a: { x: clipped.a.x - circle.center.x, y: clipped.a.y - circle.center.y },
        b: { x: clipped.b.x - circle.center.x, y: clipped.b.y - circle.center.y },
      }
      kept.push(scaleSegment(centred, magnification))
    }
    return kept
  }

  const visible = trim(parent.visible)
  const hidden = trim(parent.hidden)
  const tangent = trim(parent.tangent)
  const drawnRadius = radius * magnification

  return {
    visible,
    hidden,
    tangent,
    bounds: boundsOf([...visible, ...hidden, ...tangent]),
    approximated: parent.approximated,
    boundary: detailBoundary(drawnRadius, options.broken ?? circle.broken ?? false, options.segments),
    radius: drawnRadius,
    magnification,
  }
}

/**
 * The ring around a detail view. A broken boundary wobbles in and out by a few
 * percent, which is how a torn-out detail is conventionally drawn.
 */
export function detailBoundary(radius: number, broken: boolean, segments = DEFAULT_SEGMENTS): Segment2[] {
  const count = Math.max(Math.floor(segments), 8)
  const points: Vec2[] = []
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2
    // A fixed wobble rather than a random one: a drawing has to redraw the same.
    const wobble = broken ? 1 + 0.04 * Math.sin(angle * 7) : 1
    points.push({ x: Math.cos(angle) * radius * wobble, y: Math.sin(angle) * radius * wobble })
  }

  const boundary: Segment2[] = []
  for (let index = 0; index < points.length; index += 1) {
    boundary.push({
      a: points[index] as Vec2,
      b: points[(index + 1) % points.length] as Vec2,
    })
  }
  return boundary
}

function positive(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback
}
