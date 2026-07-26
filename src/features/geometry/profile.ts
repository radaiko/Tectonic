import type { Profile } from '../../kernel/IKernel'
import type { Vec2 } from '../../sketch/domain/geometry'
import type { SketchEntity } from '../../sketch/domain/SketchEntity'
import type { SketchModel } from '../../sketch/domain/SketchModel'
import { tessellate } from '../../sketch/domain/query'

/** Curve segments finer than this collapse to a single point. */
const WELD_TOLERANCE = 1e-7

/**
 * Turns sketch geometry into the closed regions a solid feature can consume.
 *
 * Entities that already bound an area (circles, rectangles, slots, closed
 * polygons, ellipses) each become a loop of their own; open ones (lines, arcs,
 * splines) are chained end to end through their shared points. Loops that sit
 * inside another loop become its holes.
 */
export function sketchProfiles(
  sketch: SketchModel,
  entityIds?: readonly string[],
): Profile[] {
  const selected = entityIds && entityIds.length > 0 ? new Set(entityIds) : null
  const loops: Vec2[][] = []
  const segments: Segment[] = []

  for (const entity of sketch.entities.values()) {
    if (entity.isConstruction) continue
    if (entity.type === 'point') continue
    if (selected && !selected.has(entity.id)) continue

    if (isClosedEntity(entity)) {
      const loop = stripClosingPoint(tessellate(sketch, entity))
      if (loop.length >= 3) loops.push(loop)
      continue
    }

    const ends = endpointsOf(entity)
    if (ends) segments.push({ ...ends, points: tessellate(sketch, entity) })
  }

  loops.push(...closedChains(segments))
  return nestLoops(loops)
}

/**
 * The longest open chain in a sketch, as an ordered polyline — the shape a sweep
 * follows. Returns an empty array when the sketch has no usable curve.
 */
export function sketchPath(sketch: SketchModel, entityIds?: readonly string[]): Vec2[] {
  const selected = entityIds && entityIds.length > 0 ? new Set(entityIds) : null
  const segments: Segment[] = []

  for (const entity of sketch.entities.values()) {
    if (entity.isConstruction || entity.type === 'point') continue
    if (selected && !selected.has(entity.id)) continue
    const ends = endpointsOf(entity)
    if (ends) segments.push({ ...ends, points: tessellate(sketch, entity) })
  }

  let longest: Vec2[] = []
  for (const chain of allChains(segments)) {
    if (polylineLength(chain) > polylineLength(longest)) longest = chain
  }
  return longest
}

/**
 * Grows an open polyline into the closed region a rib occupies: the path offset
 * by half the thickness to each side, walked out and back. Corners are mitred by
 * averaging the adjacent segment normals, which is exact for gentle bends and
 * pinches slightly on sharp ones.
 */
export function thickenPath(path: readonly Vec2[], thickness: number): Profile | null {
  const spine = weld(path)
  if (spine.length < 2 || !(thickness > 0)) return null

  const half = thickness / 2
  const normals = spine.map((_, index) => {
    const before = spine[Math.max(0, index - 1)] as Vec2
    const after = spine[Math.min(spine.length - 1, index + 1)] as Vec2
    const dx = after.x - before.x
    const dy = after.y - before.y
    const magnitude = Math.hypot(dx, dy)
    return magnitude === 0 ? { x: 0, y: 0 } : { x: -dy / magnitude, y: dx / magnitude }
  })

  const left = spine.map((point, index) => ({
    x: point.x + (normals[index] as Vec2).x * half,
    y: point.y + (normals[index] as Vec2).y * half,
  }))
  const right = spine.map((point, index) => ({
    x: point.x - (normals[index] as Vec2).x * half,
    y: point.y - (normals[index] as Vec2).y * half,
  }))

  const loop = weld([...left, ...right.reverse()])
  if (loop.length < 3) return null
  return { points: signedArea(loop) >= 0 ? loop : loop.reverse() }
}

/** Signed area of a loop: positive when its points run counter-clockwise. */
export function signedArea(loop: readonly Vec2[]): number {
  let total = 0
  for (let index = 0; index < loop.length; index += 1) {
    const a = loop[index] as Vec2
    const b = loop[(index + 1) % loop.length] as Vec2
    total += a.x * b.y - b.x * a.y
  }
  return total / 2
}

export function isPointInside(point: Vec2, loop: readonly Vec2[]): boolean {
  let inside = false
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i, i += 1) {
    const a = loop[i] as Vec2
    const b = loop[j] as Vec2
    const straddles = a.y > point.y !== b.y > point.y
    if (!straddles) continue
    const crossing = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    if (point.x < crossing) inside = !inside
  }
  return inside
}

/* -------------------------------------------------------------------------- */

interface Segment {
  readonly startId: string
  readonly endId: string
  readonly points: Vec2[]
}

function isClosedEntity(entity: SketchEntity): boolean {
  switch (entity.type) {
    case 'circle':
    case 'rectangle':
    case 'slot':
    case 'ellipse':
      return true
    case 'polygon':
      return entity.closed
    default:
      return false
  }
}

/** The two point ids an open entity runs between, or null if it has none. */
function endpointsOf(entity: SketchEntity): { startId: string; endId: string } | null {
  switch (entity.type) {
    case 'line':
    case 'arc':
      return { startId: entity.startPointId, endId: entity.endPointId }
    case 'spline': {
      const first = entity.controlPointIds[0]
      const last = entity.controlPointIds[entity.controlPointIds.length - 1]
      return first && last ? { startId: first, endId: last } : null
    }
    case 'polygon': {
      if (entity.closed) return null
      const first = entity.pointIds[0]
      const last = entity.pointIds[entity.pointIds.length - 1]
      return first && last ? { startId: first, endId: last } : null
    }
    default:
      return null
  }
}

/** Walks the segment graph, returning every chain that closes back on itself. */
function closedChains(segments: readonly Segment[]): Vec2[][] {
  return allChains(segments, true)
}

/**
 * Traces chains of segments joined at shared points. With `closedOnly`, chains
 * that never return to their starting point are discarded.
 */
function allChains(segments: readonly Segment[], closedOnly = false): Vec2[][] {
  const used = new Set<number>()
  const chains: Vec2[][] = []

  for (let seed = 0; seed < segments.length; seed += 1) {
    if (used.has(seed)) continue
    const first = segments[seed] as Segment
    used.add(seed)

    const points = [...first.points]
    const startId = first.startId
    let currentId = first.endId
    let closed = startId === currentId

    while (!closed) {
      const nextIndex = segments.findIndex(
        (segment, index) =>
          !used.has(index) && (segment.startId === currentId || segment.endId === currentId),
      )
      if (nextIndex === -1) break

      const next = segments[nextIndex] as Segment
      used.add(nextIndex)
      const forward = next.startId === currentId
      points.push(...(forward ? next.points : [...next.points].reverse()).slice(1))
      currentId = forward ? next.endId : next.startId
      closed = currentId === startId
    }

    const loop = closed ? stripClosingPoint(points) : weld(points)
    if (closedOnly && !closed) continue
    if (loop.length >= (closed ? 3 : 2)) chains.push(loop)
  }

  return chains
}

function stripClosingPoint(points: readonly Vec2[]): Vec2[] {
  const loop = weld(points)
  const first = loop[0]
  const last = loop[loop.length - 1]
  if (loop.length > 1 && first && last && isSamePoint(first, last)) loop.pop()
  return loop
}

/** Drops consecutive duplicates so degenerate segments never reach the kernel. */
function weld(points: readonly Vec2[]): Vec2[] {
  const result: Vec2[] = []
  for (const point of points) {
    const previous = result[result.length - 1]
    if (previous && isSamePoint(previous, point)) continue
    result.push({ x: point.x, y: point.y })
  }
  return result
}

function isSamePoint(a: Vec2, b: Vec2): boolean {
  return Math.abs(a.x - b.x) < WELD_TOLERANCE && Math.abs(a.y - b.y) < WELD_TOLERANCE
}

function polylineLength(points: readonly Vec2[]): number {
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    total += Math.hypot(
      (points[index] as Vec2).x - (points[index - 1] as Vec2).x,
      (points[index] as Vec2).y - (points[index - 1] as Vec2).y,
    )
  }
  return total
}

/**
 * Sorts loops into outer boundaries and the holes cut out of them. A loop nested
 * an odd number of deep is a hole in the smallest loop that contains it.
 */
function nestLoops(loops: readonly Vec2[][]): Profile[] {
  const containers = loops.map((loop, index) =>
    loops
      .map((other, otherIndex) => ({ other, otherIndex }))
      .filter(
        ({ other, otherIndex }) =>
          otherIndex !== index && isPointInside(loop[0] as Vec2, other),
      )
      .sort((a, b) => Math.abs(signedArea(a.other)) - Math.abs(signedArea(b.other))),
  )

  const profiles: Profile[] = []
  const holesByOuter = new Map<number, Vec2[][]>()

  loops.forEach((loop, index) => {
    const depth = (containers[index] as { otherIndex: number }[]).length
    if (depth % 2 === 1) {
      const parent = (containers[index] as { otherIndex: number }[])[0]?.otherIndex ?? 0
      holesByOuter.set(parent, [...(holesByOuter.get(parent) ?? []), orient(loop, false)])
    }
  })

  loops.forEach((loop, index) => {
    const depth = (containers[index] as { otherIndex: number }[]).length
    if (depth % 2 === 1) return
    const holes = holesByOuter.get(index)
    profiles.push(
      holes && holes.length > 0
        ? { points: orient(loop, true), holes }
        : { points: orient(loop, true) },
    )
  })

  return profiles
}

/** Reverses a loop when its winding does not match what the kernel expects. */
function orient(loop: readonly Vec2[], counterClockwise: boolean): Vec2[] {
  const area = signedArea(loop)
  const matches = counterClockwise ? area >= 0 : area < 0
  return matches ? [...loop] : [...loop].reverse()
}
