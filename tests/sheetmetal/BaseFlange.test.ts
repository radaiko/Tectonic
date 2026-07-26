import { describe, expect, it } from 'vitest'
import {
  baseFlangeEdges,
  baseFlangeFrame,
  baseFlangeFromSketch,
  buildBaseFlange,
  contourChain,
  createBaseFlange,
} from '../../src/sheetmetal/BaseFlange'
import { SheetMetalParameters } from '../../src/sheetmetal/SheetMetalParameters'
import { SheetMetalPart } from '../../src/sheetmetal/SheetMetalPart'
import { createEdgeFlange } from '../../src/sheetmetal/EdgeFlange'
import { SheetMetalError } from '../../src/sheetmetal/types'
import { StubKernel } from '../../src/kernel/StubKernel'
import { extentOf, rectangleSketch, lineSketch } from '../features/support'

const PLATE = [
  { x: 0, y: 0 },
  { x: 40, y: 0 },
  { x: 40, y: 20 },
  { x: 0, y: 20 },
]

describe('createBaseFlange', () => {
  it('takes a closed outline with the defaults filled in', () => {
    const spec = createBaseFlange({ points: PLATE })

    expect(spec.profileKind).toBe('closed')
    expect(spec.points).toHaveLength(4)
    expect(spec.holes).toEqual([])
    expect(spec.plane).toBe('XY')
    expect(spec.planeOffset).toBe(0)
  })

  it('copies the points it is given rather than aliasing them', () => {
    const points = [...PLATE]
    const spec = createBaseFlange({ points })
    points[0] = { x: 99, y: 99 }

    expect(spec.points[0]).toEqual({ x: 0, y: 0 })
  })

  it('refuses a closed profile with fewer than three corners', () => {
    expect(() => createBaseFlange({ points: PLATE.slice(0, 2) })).toThrow(SheetMetalError)
  })

  it('refuses an open profile without a width or a second point', () => {
    expect(() =>
      createBaseFlange({ profileKind: 'open', points: [{ x: 0, y: 0 }] }),
    ).toThrow(/at least two points/i)
    expect(() =>
      createBaseFlange({ profileKind: 'open', points: PLATE, width: 0 }),
    ).toThrow(/positive width/i)
  })
})

describe('baseFlangeEdges', () => {
  it('numbers the edges of a closed face anticlockwise with outward normals', () => {
    const edges = baseFlangeEdges(createBaseFlange({ points: PLATE }))

    expect(edges).toHaveLength(4)
    expect(edges[0]?.index).toBe(0)
    expect(edges[0]?.length).toBe(40)
    expect(edges[0]?.direction).toEqual({ x: 1, y: 0 })
    // The bottom edge of an anticlockwise loop faces −Y.
    expect(edges[0]?.normal).toEqual({ x: 0, y: -1 })
  })

  it('exposes no edges on an open cross-section', () => {
    const spec = createBaseFlange({
      profileKind: 'open',
      points: [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 20 },
      ],
    })

    expect(baseFlangeEdges(spec)).toEqual([])
  })
})

describe('baseFlangeFrame', () => {
  it('places the face on its sketch plane at its offset', () => {
    const frame = baseFlangeFrame(
      createBaseFlange({ points: PLATE, plane: 'XZ', planeOffset: 5 }),
    )

    expect(frame.origin.y).toBe(5)
  })
})

describe('contourChain', () => {
  it('turns the interior vertices of an open profile into bends', () => {
    const spec = createBaseFlange({
      profileKind: 'open',
      points: [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 20 },
      ],
      width: 60,
    })
    const parameters = new SheetMetalParameters({ thickness: 1, innerRadius: 1 })
    const chain = contourChain(spec, parameters)

    expect(chain.steps).toHaveLength(1)
    expect(chain.steps[0]?.angle).toBeCloseTo(90, 9)
    // The straight run is shortened by the setback the bend consumes.
    expect(chain.steps[0]?.straight).toBeCloseTo(20 - parameters.outsideSetback(90), 9)
    expect(chain.options.startStation).toBeCloseTo(40 - parameters.outsideSetback(90), 9)
  })

  it('refuses a closed profile', () => {
    expect(() =>
      contourChain(createBaseFlange({ points: PLATE }), new SheetMetalParameters()),
    ).toThrow(/only an open base flange/i)
  })

  it('refuses a first segment shorter than its own bend', () => {
    const spec = createBaseFlange({
      profileKind: 'open',
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 20 },
      ],
    })

    expect(() =>
      contourChain(spec, new SheetMetalParameters({ thickness: 2, innerRadius: 4 })),
    ).toThrow(/shorter than its bend/i)
  })
})

describe('buildBaseFlange', () => {
  it('extrudes a closed profile to the sheet thickness', async () => {
    const kernel = new StubKernel()
    const shape = await buildBaseFlange(
      kernel,
      createBaseFlange({ points: PLATE }),
      new SheetMetalParameters({ thickness: 2 }),
    )

    expect(extentOf(await kernel.triangulate(shape))).toEqual({ x: 40, y: 20, z: 2 })
  })

  it('sweeps a folded cross-section by the flange width', async () => {
    const kernel = new StubKernel()
    const spec = createBaseFlange({
      profileKind: 'open',
      points: [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 20 },
      ],
      width: 60,
    })

    const shape = await buildBaseFlange(kernel, spec, new SheetMetalParameters())
    const mesh = await kernel.triangulate(shape)

    // The section is folded, so the body has depth on all three axes.
    const extent = extentOf(mesh)
    expect(extent.x).toBeGreaterThan(0)
    expect(extent.y).toBeGreaterThan(0)
    expect(extent.z).toBeGreaterThan(0)
    expect(mesh.indices.length).toBeGreaterThan(0)
  })
})

describe('baseFlangeFromSketch', () => {
  it('reads a closed region out of a sketch', () => {
    const spec = baseFlangeFromSketch(rectangleSketch(40, 20))

    expect(spec.profileKind).toBe('closed')
    expect(spec.points.length).toBeGreaterThanOrEqual(4)
    expect(spec.plane).toBe('XY')
  })

  it('reads an open contour when asked for one', () => {
    const spec = baseFlangeFromSketch(lineSketch({ x: 0, y: 0 }, { x: 0, y: 40 }), {
      profileKind: 'open',
      width: 25,
    })

    expect(spec.profileKind).toBe('open')
    expect(spec.width).toBe(25)
  })

  it('complains when the sketch holds nothing of the kind asked for', () => {
    expect(() => baseFlangeFromSketch(lineSketch())).toThrow(/no closed profile/i)
    expect(() =>
      baseFlangeFromSketch(rectangleSketch(10, 10), { profileKind: 'open', entityIds: ['none'] }),
    ).toThrow(/no open contour/i)
  })
})

describe('SheetMetalPart from a base flange', () => {
  it('builds the plate and the flanges folded off it as one body', async () => {
    const kernel = new StubKernel()
    const part = new SheetMetalPart({
      name: 'Bracket',
      base: createBaseFlange({ points: PLATE }),
      parameters: new SheetMetalParameters({ thickness: 1, innerRadius: 1 }),
    })
    part.addFeature(createEdgeFlange({ edgeIndex: 0, length: 10, angle: 90 }))

    const mesh = await kernel.triangulate(await part.build(kernel))
    const extent = extentOf(mesh)

    expect(mesh.positions.length).toBeGreaterThan(0)
    // The flange stands off the plate, so the body is taller than the sheet.
    expect(extent.z).toBeGreaterThan(1)
    expect(extent.x).toBeCloseTo(40, 6)
  })

  it('lets one feature per edge only', () => {
    const part = new SheetMetalPart({ base: createBaseFlange({ points: PLATE }) })
    part.addFeature(createEdgeFlange({ edgeIndex: 1 }))

    expect(() => part.addFeature(createEdgeFlange({ edgeIndex: 1 }))).toThrow(
      /already carries a feature/i,
    )
    expect(() => part.addFeature(createEdgeFlange({ edgeIndex: 9 }))).toThrow(/no edge 9/i)
  })

  it('round-trips a part with its features through JSON', () => {
    const part = new SheetMetalPart({
      name: 'Chassis',
      base: createBaseFlange({ points: PLATE, holes: [[{ x: 5, y: 5 }, { x: 9, y: 5 }, { x: 9, y: 9 }]] }),
      parameters: new SheetMetalParameters({ material: 'Aluminium', thickness: 1.6 }),
    })
    part.addFeature(createEdgeFlange({ id: 'flange-1', edgeIndex: 2, length: 12, angle: 60 }))

    const restored = SheetMetalPart.fromJSON(JSON.parse(JSON.stringify(part)))

    expect(restored.toJSON()).toEqual(part.toJSON())
    expect(restored.name).toBe('Chassis')
    expect(restored.parameters.material).toBe('Aluminium')
    expect(restored.getFeature('flange-1')?.edgeIndex).toBe(2)
    expect(restored.base.holes[0]).toHaveLength(3)
  })

  it('rejects an unknown feature kind when reading a file', () => {
    const part = new SheetMetalPart({ base: createBaseFlange({ points: PLATE }) })
    const json = { ...part.toJSON(), features: [{ kind: 'weld', id: 'x', edgeIndex: 0 }] }

    expect(() => SheetMetalPart.fromJSON(json as never)).toThrow(/unknown sheet metal feature/i)
  })
})
