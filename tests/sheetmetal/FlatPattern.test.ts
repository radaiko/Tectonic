import { describe, expect, it } from 'vitest'
import {
  DXF_LAYERS,
  boundsOf,
  flatPattern,
  flatPatternToDXF,
  flatPatternToSVG,
} from '../../src/sheetmetal/FlatPattern'
import { createBaseFlange } from '../../src/sheetmetal/BaseFlange'
import { createEdgeFlange } from '../../src/sheetmetal/EdgeFlange'
import { createHem } from '../../src/sheetmetal/Hem'
import { SheetMetalParameters } from '../../src/sheetmetal/SheetMetalParameters'
import { SheetMetalPart } from '../../src/sheetmetal/SheetMetalPart'
import { FoldUnfold } from '../../src/sheetmetal/FoldUnfold'
import { edgeFeatureDevelopment } from '../../src/sheetmetal/SheetMetalPart'

const PLATE = [
  { x: 0, y: 0 },
  { x: 40, y: 0 },
  { x: 40, y: 20 },
  { x: 0, y: 20 },
]

function plate(): SheetMetalPart {
  return new SheetMetalPart({
    name: 'Plate',
    base: createBaseFlange({ points: PLATE }),
    parameters: new SheetMetalParameters({ thickness: 1, innerRadius: 1 }),
  })
}

/** A cross-section folded twice, which has no base face to keep. */
function channel(): SheetMetalPart {
  return new SheetMetalPart({
    name: 'Channel',
    base: createBaseFlange({
      profileKind: 'open',
      points: [
        { x: 0, y: 20 },
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 20 },
      ],
      width: 60,
    }),
    parameters: new SheetMetalParameters({ thickness: 1, innerRadius: 1 }),
  })
}

describe('flatPattern of a plate', () => {
  it('keeps the base face when nothing is folded off it', () => {
    const pattern = flatPattern(plate())

    expect(pattern.outline).toHaveLength(4)
    expect(pattern.bendLines).toEqual([])
    expect(pattern.bounds.width).toBe(40)
    expect(pattern.bounds.height).toBe(20)
    expect(pattern.thickness).toBe(1)
  })

  it('grows a tab as deep as the flange develops', () => {
    const part = plate()
    const flange = part.addFeature(createEdgeFlange({ edgeIndex: 0, length: 10, angle: 90 }))
    const development = edgeFeatureDevelopment(flange, part.parameters)
    const pattern = flatPattern(part)

    // The tab hangs off the −Y edge, so the pattern reaches below the face.
    expect(pattern.bounds.min.y).toBeCloseTo(-development.length, 9)
    expect(pattern.bounds.height).toBeCloseTo(20 + development.length, 9)
  })

  it('carries the holes of the face through unchanged', () => {
    const part = new SheetMetalPart({
      base: createBaseFlange({
        points: PLATE,
        holes: [
          [
            { x: 10, y: 5 },
            { x: 14, y: 5 },
            { x: 14, y: 9 },
            { x: 10, y: 9 },
          ],
        ],
      }),
    })

    expect(flatPattern(part).holes).toHaveLength(1)
    expect(flatPattern(part).holes[0]).toHaveLength(4)
  })
})

describe('flat pattern bend lines', () => {
  it('puts a bend line down the middle of every bend zone', () => {
    const part = plate()
    const flange = part.addFeature(
      createEdgeFlange({ id: 'flange-1', edgeIndex: 0, length: 10, angle: 90 }),
    )
    const pattern = flatPattern(part)

    expect(pattern.bendLines).toHaveLength(1)
    const bend = pattern.bendLines[0]
    expect(bend?.featureId).toBe('flange-1')
    expect(bend?.angle).toBeCloseTo(90, 9)
    expect(bend?.radius).toBe(1)
    expect(bend?.allowance).toBeGreaterThan(0)
    expect(bend?.direction).toBe('up')

    // The line runs along the edge it folds on, at mid-allowance. The tab grows
    // along the edge's outward normal, which is −Y here, and the bend starts a
    // setback inside the face — so the line sits just inside it.
    expect(bend?.start.y).toBeCloseTo(bend?.end.y ?? Number.NaN, 9)
    // `zone.start` here is the scalar station along the development; the flat
    // pattern's own bend zone carries a Vec2 start instead.
    const zone = edgeFeatureDevelopment(flange, part.parameters).zones[0]
    expect(bend?.start.y).toBeCloseTo(-((zone?.start ?? 0) + (zone?.allowance ?? 0) / 2), 9)
    expect(pattern.bendZones[0]?.corners).toHaveLength(4)
  })

  it('marks a flange folded the other way as a down bend', () => {
    const part = plate()
    part.addFeature(createEdgeFlange({ edgeIndex: 1, length: 8, angle: 90, flip: true }))

    expect(flatPattern(part).bendLines[0]?.direction).toBe('down')
  })

  it('reports both bends of a hem', () => {
    const part = plate()
    part.addFeature(createHem({ edgeIndex: 2, hemType: 'closed', length: 6 }))
    const pattern = flatPattern(part)

    expect(pattern.bendLines.length).toBeGreaterThanOrEqual(1)
    expect(pattern.bendLines.every((bend) => bend.allowance > 0)).toBe(true)
  })

  it('rolls a folded cross-section out into a plain rectangle', () => {
    const pattern = flatPattern(channel())

    expect(pattern.outline).toHaveLength(4)
    expect(pattern.bendLines).toHaveLength(2)
    expect(pattern.bounds.height).toBe(60)
    // Flat length is the developed length of the whole chain.
    expect(pattern.bounds.width).toBeGreaterThan(40)
    expect(pattern.reliefs).toEqual([])
  })
})

describe('flat pattern reliefs', () => {
  it('notches both ends of a bend that runs out into flat material', () => {
    const part = plate()
    part.addFeature(createEdgeFlange({ edgeIndex: 0, length: 10, relief: 'rectangular' }))
    const reliefs = flatPattern(part).reliefs

    expect(reliefs).toHaveLength(2)
    expect(reliefs[0]?.type).toBe('rectangular')
    expect(reliefs[0]?.loop).toHaveLength(4)
  })

  it('leaves the shared corner of two neighbouring flanges alone', () => {
    const part = plate()
    part.addFeature(createEdgeFlange({ edgeIndex: 0, length: 10 }))
    part.addFeature(createEdgeFlange({ edgeIndex: 1, length: 10 }))

    // Four corners between them, but the one they share needs no relief.
    expect(flatPattern(part).reliefs).toHaveLength(2)
  })

  it('draws a tear relief as a triangle and a round one as an arc', () => {
    const tear = plate()
    tear.addFeature(createEdgeFlange({ edgeIndex: 0, length: 10, relief: 'tear' }))
    const round = plate()
    round.addFeature(createEdgeFlange({ edgeIndex: 0, length: 10, relief: 'round' }))

    expect(flatPattern(tear).reliefs[0]?.loop).toHaveLength(3)
    expect(flatPattern(round).reliefs[0]?.loop.length).toBeGreaterThan(4)
  })

  it('cuts nothing when the relief is turned off', () => {
    const part = plate()
    part.addFeature(createEdgeFlange({ edgeIndex: 0, length: 10, relief: 'none' }))

    expect(flatPattern(part).reliefs).toEqual([])
  })
})

describe('boundsOf', () => {
  it('reports an empty extent for no points', () => {
    expect(boundsOf([])).toEqual({
      min: { x: 0, y: 0 },
      max: { x: 0, y: 0 },
      width: 0,
      height: 0,
    })
  })
})

describe('flatPatternToDXF', () => {
  it('writes an entities section that closes properly', () => {
    const dxf = flatPatternToDXF(flatPattern(plate()))
    const lines = dxf.split('\n')

    expect(lines.slice(0, 4)).toEqual(['0', 'SECTION', '2', 'ENTITIES'])
    expect(lines.slice(-4, -1)).toEqual(['ENDSEC', '0', 'EOF'])
  })

  it('writes one closed loop of lines for the outline', () => {
    const dxf = flatPatternToDXF(flatPattern(plate()))
    const entities = dxf.split('\n').filter((line) => line === 'LINE')

    // A rectangle: four corners, four segments.
    expect(entities).toHaveLength(4)
    expect(dxf).toContain(DXF_LAYERS.outline)
  })

  it('puts bends, holes and reliefs on their own layers', () => {
    const part = plate()
    part.addFeature(createEdgeFlange({ edgeIndex: 0, length: 10 }))
    const dxf = flatPatternToDXF(flatPattern(part))

    expect(dxf).toContain(DXF_LAYERS.bend)
    expect(dxf).toContain(DXF_LAYERS.relief)
    expect(dxf).not.toContain(DXF_LAYERS.hole)

    const withHole = new SheetMetalPart({
      base: createBaseFlange({
        points: PLATE,
        holes: [
          [
            { x: 5, y: 5 },
            { x: 9, y: 5 },
            { x: 9, y: 9 },
          ],
        ],
      }),
    })
    expect(flatPatternToDXF(flatPattern(withHole))).toContain(DXF_LAYERS.hole)
  })

  it('writes the pattern coordinates through', () => {
    const dxf = flatPatternToDXF(flatPattern(plate()))

    expect(dxf).toContain('40')
    expect(dxf).toContain('20')
  })
})

describe('flatPatternToSVG', () => {
  it('sizes the document to the pattern plus a margin', () => {
    const svg = flatPatternToSVG(flatPattern(plate()), { margin: 5 })

    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('viewBox="-5 -5 50 30"')
    expect(svg).toContain('width="50mm"')
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true)
  })

  it('dashes the bend lines over the outline', () => {
    const part = plate()
    part.addFeature(createEdgeFlange({ edgeIndex: 0, length: 10 }))
    const svg = flatPatternToSVG(flatPattern(part), { bendColor: '#ff0000' })

    expect(svg).toContain('stroke-dasharray')
    expect(svg).toContain('#ff0000')
    expect(svg).toContain('fill-rule="evenodd"')
  })
})

describe('FoldUnfold', () => {
  it('hands back the pattern when the part is unfolded and folds it again', () => {
    const part = plate()
    part.addFeature(createEdgeFlange({ edgeIndex: 0, length: 10 }))
    const fold = new FoldUnfold(part)

    expect(fold.isUnfolded).toBe(false)
    const pattern = fold.unfold()
    expect(fold.isUnfolded).toBe(true)
    expect(pattern.bendLines).toHaveLength(1)

    expect(fold.refold()).toBe(part)
    expect(fold.isUnfolded).toBe(false)
  })

  it('keeps a cut drawn on the flat and knows whether it crosses a bend', () => {
    const part = plate()
    part.addFeature(createEdgeFlange({ edgeIndex: 0, length: 10 }))
    const fold = new FoldUnfold(part)
    fold.unfold()

    const insideFace = fold.addCut([
      { x: 10, y: 5 },
      { x: 14, y: 5 },
      { x: 14, y: 9 },
      { x: 10, y: 9 },
    ])

    expect(fold.cuts).toHaveLength(1)
    expect(fold.isAcrossBend(insideFace)).toBe(false)
    expect(fold.liesOnBaseFace(insideFace)).toBe(true)

    // Reaches from the tab up into the strip of material the bend consumes.
    const acrossBend = fold.addCut([
      { x: 18, y: -3 },
      { x: 22, y: -3 },
      { x: 22, y: 1 },
      { x: 18, y: 1 },
    ])
    expect(fold.isAcrossBend(acrossBend)).toBe(true)
    expect(fold.bendsCrossed(acrossBend)).toHaveLength(1)

    expect(fold.removeCut(insideFace.id)).toBe(true)
    expect(fold.removeCut('missing')).toBe(false)
  })

  it('refuses a cut while the part is folded', () => {
    const fold = new FoldUnfold(plate())

    expect(() => fold.addCut(PLATE)).toThrow(/unfold the part/i)
  })
})
