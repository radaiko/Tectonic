import { describe, expect, it } from 'vitest'
import { StubKernel } from '../../src/kernel/StubKernel'
import { StructuralProfile } from '../../src/weldments/StructuralProfile'
import {
  StructuralMember,
  arcPath,
  buildMember,
  endFrame,
  extendPolyline,
  linePath,
  pathPoints,
  polylinePath,
  sectionReach,
  segmentPoints,
  signedDistance,
} from '../../src/weldments/StructuralMember'
import { angleBetween, memberFrame, planeAt, polylineLength } from '../../src/weldments/geometry'
import { WeldmentError } from '../../src/weldments/types'

const SHS = StructuralProfile.fromCatalog('SHS 50x50x4')

function member(overrides: Partial<ConstructorParameters<typeof StructuralMember>[0]> = {}) {
  return new StructuralMember({
    profile: SHS,
    path: [linePath({ x: 0, y: 0, z: 0 }, { x: 1000, y: 0, z: 0 })],
    ...overrides,
  })
}

describe('paths', () => {
  it('takes a straight segment as its two ends', () => {
    expect(segmentPoints(linePath({ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 }))).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 5, y: 0, z: 0 },
    ])
  })

  it('chains a run of points into straight segments', () => {
    const path = polylinePath([
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 10, y: 10, z: 0 },
    ])

    expect(path).toHaveLength(2)
    expect(pathPoints(path)).toHaveLength(3)
  })

  it('refuses a chain of one point', () => {
    expect(() => polylinePath([{ x: 0, y: 0, z: 0 }])).toThrow(/at least two points/i)
  })

  it('facets an arc finely enough to hold the sag tolerance', () => {
    const quarter = arcPath(
      { x: 0, y: 0, z: 0 },
      { x: 100, y: 0, z: 0 },
      { x: 0, y: 100, z: 0 },
      { x: 0, y: 0, z: 1 },
    )
    const coarse = segmentPoints(quarter, 5)
    const fine = segmentPoints(quarter, 0.05)

    expect(fine.length).toBeGreaterThan(coarse.length)
    for (const point of fine) expect(Math.hypot(point.x, point.y)).toBeCloseTo(100, 6)
    // A quarter of a 100 mm circle is 157 mm; the chords fall just inside it.
    expect(polylineLength(fine)).toBeGreaterThan(157)
    expect(polylineLength(fine)).toBeLessThan(157.1)
  })

  it('takes a zero sweep as the full turn rather than nothing', () => {
    const full = segmentPoints(
      arcPath(
        { x: 0, y: 0, z: 0 },
        { x: 50, y: 0, z: 0 },
        { x: 50, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
      ),
      0.01,
    )

    // Chords always fall inside the arc, so the polyline is a hair short.
    expect(polylineLength(full)).toBeLessThan(2 * Math.PI * 50)
    expect(polylineLength(full)).toBeGreaterThan(2 * Math.PI * 50 * 0.999)
  })

  it('refuses an arc without a radius or a plane', () => {
    const centre = { x: 0, y: 0, z: 0 }
    expect(() => segmentPoints(arcPath(centre, centre, centre, { x: 0, y: 0, z: 1 }))).toThrow(
      /away from its centre/i,
    )
    expect(() =>
      segmentPoints(arcPath(centre, { x: 10, y: 0, z: 0 }, { x: 0, y: 10, z: 0 }, centre)),
    ).toThrow(/plane normal/i)
  })

  it('drops the duplicate point where two segments meet', () => {
    const points = pathPoints([
      linePath({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }),
      linePath({ x: 10, y: 0, z: 0 }, { x: 10, y: 10, z: 0 }),
    ])

    expect(points).toHaveLength(3)
  })

  it('refuses an empty path or one with no length', () => {
    expect(() => pathPoints([])).toThrow(/at least one path segment/i)
    expect(() =>
      pathPoints([linePath({ x: 1, y: 1, z: 1 }, { x: 1, y: 1, z: 1 })]),
    ).toThrow(/no length/i)
  })
})

describe('extendPolyline', () => {
  const points = [
    { x: 0, y: 0, z: 0 },
    { x: 100, y: 0, z: 0 },
  ]

  it('pushes each end out along its own direction', () => {
    const extended = extendPolyline(points, { start: 10, end: 20 })

    expect(extended[0]).toEqual({ x: -10, y: 0, z: 0 })
    expect(extended[1]).toEqual({ x: 120, y: 0, z: 0 })
  })

  it('pulls an end back when the extension is negative', () => {
    expect(extendPolyline(points, { start: -25, end: 0 })[0]?.x).toBeCloseTo(25, 9)
  })

  it('leaves a polyline alone when nothing is extended', () => {
    expect(extendPolyline(points, { start: 0, end: 0 })).toEqual(points)
    expect(extendPolyline([{ x: 1, y: 2, z: 3 }], { start: 5, end: 5 })).toHaveLength(1)
  })
})

describe('memberFrame', () => {
  it('keeps the section upright for a beam laid out in plan', () => {
    const frame = memberFrame({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })

    expect(frame.yAxis).toEqual({ x: 0, y: 0, z: 1 })
    // cross(xAxis, yAxis) has to come back out as the path direction.
    expect(angleBetween(frame.xAxis, { x: 0, y: 1, z: 0 })).toBeCloseTo(0, 6)
  })

  it('falls back to +Y for a column running up +Z', () => {
    expect(memberFrame({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }).yAxis).toEqual({
      x: 0,
      y: 1,
      z: 0,
    })
  })

  it('turns the section about the path when rolled', () => {
    const frame = memberFrame({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 90)

    expect(angleBetween(frame.yAxis, { x: 0, y: -1, z: 0 })).toBeCloseTo(0, 6)
  })

  it('refuses a path with no direction, or an up vector along it', () => {
    expect(() => memberFrame({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 })).toThrow(WeldmentError)
    expect(() =>
      memberFrame({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 0, { x: 2, y: 0, z: 0 }),
    ).toThrow(/cannot lie along/i)
  })

  it('refuses a cutting plane with no direction', () => {
    expect(() => planeAt({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 })).toThrow(WeldmentError)
  })
})

describe('StructuralMember', () => {
  it('measures its length and mass from the path and the profile', () => {
    const beam = member()

    expect(beam.length).toBeCloseTo(1000, 9)
    expect(beam.mass).toBeCloseTo(SHS.massPerMetre, 6)
    expect(beam.name).toBe('SHS 50x50x4')
  })

  it('defaults to running the path through the section centroid', () => {
    expect(member().alignment).toBe('centroid')
    expect(member({ alignment: 'nowhere' as never }).alignment).toBe('centroid')
  })

  it('applies the end extensions to the measured path', () => {
    const beam = member({ extension: { start: 50, end: 25 } })

    expect(beam.length).toBeCloseTo(1075, 9)
    expect(beam.startPoint).toEqual({ x: -50, y: 0, z: 0 })
    expect(beam.endPoint).toEqual({ x: 1025, y: 0, z: 0 })
  })

  it('reports the direction out of each end and the run between them', () => {
    const beam = member()

    expect(beam.directionAt('start')).toEqual({ x: -1, y: 0, z: 0 })
    expect(beam.directionAt('end')).toEqual({ x: 1, y: 0, z: 0 })
    expect(beam.tangentAt('start')).toEqual({ x: 1, y: 0, z: 0 })
    expect(beam.pointAt('end')).toEqual({ x: 1000, y: 0, z: 0 })
  })

  it('places the section the way its alignment asks', () => {
    const bottom = member({ alignment: 'bottom' }).section()

    expect(Math.min(...bottom.points.map((point) => point.y))).toBeCloseTo(0, 9)
  })

  it('keeps only known end treatments', () => {
    const beam = member({ treatments: { start: 'miter', end: 'welded' as never } })

    expect(beam.treatments).toEqual({ start: 'miter', end: 'none' })
  })

  it('copies its path rather than aliasing what it was given', () => {
    const path = [linePath({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 })]
    const beam = new StructuralMember({ profile: SHS, path })
    const first = path[0] as { start: { x: number } }
    first.start.x = 99

    expect(beam.startPoint.x).toBe(0)
  })

  it('refuses a member with no path at all', () => {
    expect(() => new StructuralMember({ profile: SHS, path: [] })).toThrow(WeldmentError)
  })

  it('round-trips through JSON, profile and all', () => {
    const beam = member({
      name: 'Rail',
      alignment: 'top',
      rotation: 30,
      offset: { x: 2, y: -3 },
      treatments: { start: 'miter' },
      extension: { end: 12 },
      material: 'S355',
    })
    const copy = StructuralMember.fromJSON(beam.toJSON())

    expect(copy.toJSON()).toEqual(beam.toJSON())
    expect(copy.profile.name).toBe(SHS.name)
    expect(copy.length).toBeCloseTo(beam.length, 9)
  })

  it('clones with a fresh id', () => {
    const beam = member()
    const copy = beam.clone({ name: 'Second' })

    expect(copy.id).not.toBe(beam.id)
    expect(copy.name).toBe('Second')
    expect(copy.length).toBeCloseTo(beam.length, 9)
  })
})

describe('endFrame and sectionReach', () => {
  it('sits the frame on the end point', () => {
    expect(endFrame(member(), 'end').origin).toEqual({ x: 1000, y: 0, z: 0 })
  })

  it('reaches half the diagonal of the section', () => {
    expect(sectionReach(member())).toBeCloseTo(Math.hypot(50, 50) / 2, 9)
  })

  it('measures which side of a plane a point falls', () => {
    const plane = planeAt({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })

    expect(signedDistance(plane, { x: 5, y: 0, z: 0 })).toBeCloseTo(5, 9)
    expect(signedDistance(plane, { x: -5, y: 0, z: 0 })).toBeCloseTo(-5, 9)
  })
})

describe('buildMember', () => {
  it('sweeps the profile along the path into a solid', async () => {
    const kernel = new StubKernel()
    await kernel.init()

    const shape = await buildMember(kernel, member())
    const bounds = await kernel.boundingBox(shape)

    expect(bounds.min.x).toBeCloseTo(0, 3)
    expect(bounds.max.x).toBeCloseTo(1000, 3)
    // A 50 mm tube centred on the path reaches 25 mm each side of it.
    expect(bounds.max.z - bounds.min.z).toBeCloseTo(50, 3)
    expect((await kernel.triangulate(shape)).indices.length).toBeGreaterThan(0)
  })

  it('follows a curved path', async () => {
    const kernel = new StubKernel()
    await kernel.init()

    const bent = member({
      path: [
        arcPath(
          { x: 0, y: 0, z: 0 },
          { x: 200, y: 0, z: 0 },
          { x: 0, y: 200, z: 0 },
          { x: 0, y: 0, z: 1 },
        ),
      ],
    })
    const bounds = await kernel.boundingBox(await buildMember(kernel, bent, { tolerance: 1 }))

    expect(bent.length).toBeGreaterThan(310)
    expect(bounds.max.y).toBeGreaterThan(190)
  })
})
