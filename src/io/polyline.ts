import type { Vec2 } from '../sketch/domain/geometry'

/** Points this close together are the same point to a 2D exporter. */
export const POLYLINE_TOLERANCE = 1e-9

/**
 * Whether a tessellation comes back to where it started. Tessellating a closed
 * curve repeats the first point at the end, but trigonometry rarely lands on it
 * exactly, so the comparison has to allow a little slack.
 */
export function isClosedPolyline(
  points: readonly Vec2[],
  tolerance = POLYLINE_TOLERANCE,
): boolean {
  if (points.length < 3) return false
  const first = points[0] as Vec2
  const last = points[points.length - 1] as Vec2
  return Math.abs(first.x - last.x) <= tolerance && Math.abs(first.y - last.y) <= tolerance
}
