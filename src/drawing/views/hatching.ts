import type { Vec2 } from '../../sketch/domain/geometry'
import type { Bounds2, Segment2 } from './geometry2d'
import { boundsOf, loopSegments, rotatePoint } from './geometry2d'

/**
 * Section hatching. The loops bounding the cut face are turned sideways so the
 * hatch runs horizontally, scanned line by line with the even-odd rule — which
 * is what makes a hole in the middle of a cut face come out unhatched without
 * anybody having to say which loop is a hole — and turned back.
 */

export interface HatchOptions {
  /** Angle of the hatch lines, in degrees. */
  readonly angle?: number
  /** Distance between lines, in the same units as the loops. */
  readonly spacing?: number
  /** Shifts the line pattern along its normal, to offset adjacent parts. */
  readonly phase?: number
}

export const DEFAULT_HATCH_ANGLE = 45
export const DEFAULT_HATCH_SPACING = 3

/** Angles for the nth cut part, so neighbouring parts hatch differently. */
export function hatchAngleFor(index: number): number {
  const angles = [45, 135, 30, 120, 60, 150]
  return angles[index % angles.length] as number
}

export function hatchLoops(
  loops: readonly (readonly Vec2[])[],
  options: HatchOptions = {},
): Segment2[] {
  const angle = ((options.angle ?? DEFAULT_HATCH_ANGLE) * Math.PI) / 180
  const spacing = options.spacing ?? DEFAULT_HATCH_SPACING
  const phase = options.phase ?? 0
  if (!(spacing > 0)) return []

  // Rotate into a frame where the hatch is horizontal; scanning is then a
  // matter of walking y and pairing up x crossings.
  const rotated = loops
    .map((loop) => loop.map((point) => rotatePoint(point, -angle)))
    .filter((loop) => loop.length >= 3)
  if (rotated.length === 0) return []

  const edges: Segment2[] = []
  for (const loop of rotated) edges.push(...loopSegments(loop))
  if (edges.length === 0) return []

  const bounds: Bounds2 = boundsOf(edges)
  const first = Math.ceil((bounds.minY - phase) / spacing) * spacing + phase
  const lines: Segment2[] = []

  for (let y = first; y <= bounds.maxY; y += spacing) {
    const crossings: number[] = []
    for (const edge of edges) {
      const lower = Math.min(edge.a.y, edge.b.y)
      const upper = Math.max(edge.a.y, edge.b.y)
      // Half-open in y so a scan line through a corner is counted once.
      if (y < lower || y >= upper) continue
      const span = edge.b.y - edge.a.y
      if (span === 0) continue
      crossings.push(edge.a.x + ((y - edge.a.y) / span) * (edge.b.x - edge.a.x))
    }
    if (crossings.length < 2) continue

    crossings.sort((a, b) => a - b)
    for (let index = 0; index + 1 < crossings.length; index += 2) {
      const from = crossings[index] as number
      const to = crossings[index + 1] as number
      if (to - from <= 1e-9) continue
      lines.push({
        a: rotatePoint({ x: from, y }, angle),
        b: rotatePoint({ x: to, y }, angle),
      })
    }
  }
  return lines
}
