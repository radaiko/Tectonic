import type { Vec2 } from '../kernel/IKernel'

/**
 * Closed-polygon maths shared by the structural sections and the parametric
 * hardware. Both describe their geometry as flat loops that the kernel then
 * extrudes or revolves, so both need the same handful of measurements — and
 * both need their loops wound the way the kernel's profile contract expects.
 */

/** Signed area of a closed polygon; positive when wound anticlockwise. */
export function signedArea(points: readonly Vec2[]): number {
  let twice = 0
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index] as Vec2
    const b = points[(index + 1) % points.length] as Vec2
    twice += a.x * b.y - b.x * a.y
  }
  return twice / 2
}

/** Area centroid of a closed polygon. Degenerate loops fall back to their mean. */
export function centroid(points: readonly Vec2[]): Vec2 {
  const area = signedArea(points)
  if (Math.abs(area) < 1e-12) {
    const count = Math.max(points.length, 1)
    const sum = points.reduce((total, point) => ({ x: total.x + point.x, y: total.y + point.y }), {
      x: 0,
      y: 0,
    })
    return { x: sum.x / count, y: sum.y / count }
  }

  let x = 0
  let y = 0
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index] as Vec2
    const b = points[(index + 1) % points.length] as Vec2
    const cross = a.x * b.y - b.x * a.y
    x += (a.x + b.x) * cross
    y += (a.y + b.y) * cross
  }
  return { x: x / (6 * area), y: y / (6 * area) }
}

/** The same loop, wound anticlockwise. */
export function counterClockwise(points: readonly Vec2[]): Vec2[] {
  return signedArea(points) < 0 ? [...points].reverse() : [...points]
}

/** The same loop, wound clockwise — how the kernel wants a hole. */
export function clockwise(points: readonly Vec2[]): Vec2[] {
  return signedArea(points) > 0 ? [...points].reverse() : [...points]
}

/** A circle approximated by `segments` chords, anticlockwise from +X. */
export function circlePoints(radius: number, segments: number, center: Vec2 = { x: 0, y: 0 }): Vec2[] {
  const points: Vec2[] = []
  for (let index = 0; index < segments; index += 1) {
    const phi = (index / segments) * Math.PI * 2
    points.push({ x: center.x + Math.cos(phi) * radius, y: center.y + Math.sin(phi) * radius })
  }
  return points
}

/** An axis-aligned rectangle centred on the origin, anticlockwise. */
export function rectanglePoints(width: number, height: number): Vec2[] {
  const hw = width / 2
  const hh = height / 2
  return [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ]
}

/**
 * A regular polygon given its across-flats size — how every hex head, nut and
 * socket in the catalogue is dimensioned. The first flat faces +Y.
 */
export function regularPolygonAcrossFlats(acrossFlats: number, sides: number): Vec2[] {
  const radius = acrossFlats / 2 / Math.cos(Math.PI / sides)
  const points: Vec2[] = []
  for (let index = 0; index < sides; index += 1) {
    const phi = (index / sides) * Math.PI * 2 + Math.PI / sides
    points.push({ x: Math.cos(phi) * radius, y: Math.sin(phi) * radius })
  }
  return points
}

/**
 * A rectangle with semicircular ends, centred on the origin and running along
 * X — the shape of a parallel key, a cotter pin and a slot.
 */
export function obroundPoints(length: number, width: number, segments = 12): Vec2[] {
  const radius = width / 2
  const straight = Math.max(0, length / 2 - radius)
  const points: Vec2[] = []
  const perEnd = Math.max(2, Math.round(segments / 2))

  for (let index = 0; index <= perEnd; index += 1) {
    const phi = -Math.PI / 2 + (index / perEnd) * Math.PI
    points.push({ x: straight + Math.cos(phi) * radius, y: Math.sin(phi) * radius })
  }
  for (let index = 0; index <= perEnd; index += 1) {
    const phi = Math.PI / 2 + (index / perEnd) * Math.PI
    points.push({ x: -straight + Math.cos(phi) * radius, y: Math.sin(phi) * radius })
  }
  return counterClockwise(points)
}

/**
 * The part of a disc left above a chord — a Woodruff key's side view. `height`
 * is the overall height of the segment, measured from the chord to the arc.
 */
export function discSegmentPoints(diameter: number, height: number, segments = 16): Vec2[] {
  const radius = diameter / 2
  const rise = Math.max(0, Math.min(height, 2 * radius))
  const cosine = Math.max(-1, Math.min(1, (radius - rise) / radius))
  const half = Math.acos(cosine)

  const points: Vec2[] = []
  for (let index = 0; index <= segments; index += 1) {
    const theta = -half + (index / segments) * (2 * half)
    points.push({ x: Math.sin(theta) * radius, y: Math.cos(theta) * radius })
  }
  return counterClockwise(points)
}

/** A star of `teeth` points, alternating between the two radii — a tooth washer. */
export function toothedPoints(outerRadius: number, rootRadius: number, teeth: number): Vec2[] {
  const points: Vec2[] = []
  const step = Math.PI / teeth
  for (let index = 0; index < teeth * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : rootRadius
    const phi = index * step
    points.push({ x: Math.cos(phi) * radius, y: Math.sin(phi) * radius })
  }
  return points
}
