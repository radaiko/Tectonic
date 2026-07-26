import { describe, expect, it } from 'vitest'
import {
  importSvg,
  parseLength,
  parsePoints,
  parseViewBox,
} from '../../src/io/SvgImporter'
import { exportSvg, pathData } from '../../src/io/SvgExporter'
import { arcToCenter, parsePathData, sampleArc } from '../../src/io/svgPath'
import type { ArcSegment, CubicSegment } from '../../src/io/svgPath'
import { SketchModel } from '../../src/sketch/domain/SketchModel'
import {
  buildCenterArc,
  buildCircle,
  buildEllipse,
  buildLine,
  buildPolygon,
  buildSpline,
  resolvePoint,
} from '../../src/sketch/domain/builders'
import { arcAngles, circleCenter, lineEnd, lineStart } from '../../src/sketch/domain/query'
import type { ArcEntity, CircleEntity, LineEntity } from '../../src/sketch/domain/SketchEntity'
import { ImportError } from '../../src/io/types'

const SQUARE = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100mm" height="100mm">
  <path d="M 10 10 L 90 10 L 90 90 L 10 90 Z"/>
</svg>`

describe('parsePathData', () => {
  it('resolves a closed square into four line segments', () => {
    const [subPath] = parsePathData('M 0 0 L 10 0 L 10 10 L 0 10 Z')

    expect(subPath?.closed).toBe(true)
    expect(subPath?.segments).toHaveLength(4)
    expect(subPath?.segments[3]).toMatchObject({ from: { x: 0, y: 10 }, to: { x: 0, y: 0 } })
  })

  it('resolves relative commands against the current point', () => {
    const [subPath] = parsePathData('m 5 5 l 10 0 l 0 10')

    expect(subPath?.start).toEqual({ x: 5, y: 5 })
    expect(subPath?.segments[1]).toMatchObject({ to: { x: 15, y: 15 } })
  })

  it('resolves H and V', () => {
    const [subPath] = parsePathData('M 0 0 H 10 V 20 h -5 v -5')

    expect(subPath?.segments.map((segment) => segment.to)).toEqual([
      { x: 10, y: 0 },
      { x: 10, y: 20 },
      { x: 5, y: 20 },
      { x: 5, y: 15 },
    ])
  })

  it('treats extra pairs after a moveto as linetos', () => {
    const [subPath] = parsePathData('M 0 0 5 5 10 10')

    expect(subPath?.segments).toHaveLength(2)
  })

  it('reflects the previous control point for S', () => {
    const [subPath] = parsePathData('M 0 0 C 1 1 2 2 3 3 S 5 5 6 6')
    const smooth = subPath?.segments[1] as CubicSegment

    expect(smooth.control1).toEqual({ x: 4, y: 4 })
  })

  it('uses the current point for an S with no cubic before it', () => {
    const [subPath] = parsePathData('M 1 1 S 5 5 6 6')
    const smooth = subPath?.segments[0] as CubicSegment

    expect(smooth.control1).toEqual({ x: 1, y: 1 })
  })

  it('reflects the previous control point for T', () => {
    const [subPath] = parsePathData('M 0 0 Q 2 2 4 0 T 8 0')

    expect(subPath?.segments[1]).toMatchObject({ control: { x: 6, y: -2 } })
  })

  it('starts a fresh sub-path after Z', () => {
    const subPaths = parsePathData('M 0 0 L 1 0 Z L 2 2')

    expect(subPaths).toHaveLength(2)
    expect(subPaths[0]?.closed).toBe(true)
    expect(subPaths[1]?.closed).toBe(false)
  })

  it('does not add a closing line when the path already returned home', () => {
    const [subPath] = parsePathData('M 0 0 L 1 0 L 0 0 Z')

    expect(subPath?.segments).toHaveLength(2)
  })

  it('reads an arc command with its flags', () => {
    const [subPath] = parsePathData('M 0 0 A 5 5 0 1 0 10 0')

    expect(subPath?.segments[0]).toMatchObject({
      kind: 'arc',
      rx: 5,
      ry: 5,
      largeArc: true,
      sweep: false,
    })
  })

  it('returns nothing for empty data', () => {
    expect(parsePathData('')).toEqual([])
  })

  it('rejects data that does not start with a command', () => {
    expect(() => parsePathData('10 20 30')).toThrow(ImportError)
  })

  it('rejects a command with too few numbers', () => {
    expect(() => parsePathData('M 0')).toThrow(/needs 2 numbers/)
  })
})

describe('arcToCenter', () => {
  const base = {
    kind: 'arc',
    rx: 5,
    ry: 5,
    xAxisRotation: 0,
    largeArc: false,
    sweep: true,
  } as const

  it('finds the centre of a quarter turn', () => {
    // Of the two circles through both points, sweep=1 picks the one the arc
    // turns about in the direction of increasing angle.
    const arc = arcToCenter({ ...base, from: { x: 0, y: 5 }, to: { x: 5, y: 0 } })

    expect(arc?.center.x).toBeCloseTo(5)
    expect(arc?.center.y).toBeCloseTo(5)
    expect(arc?.deltaAngle).toBeCloseTo(Math.PI / 2)
  })

  it('picks the other centre when the sweep runs the other way', () => {
    const arc = arcToCenter({ ...base, sweep: false, from: { x: 0, y: 5 }, to: { x: 5, y: 0 } })

    expect(arc?.center.x).toBeCloseTo(0)
    expect(arc?.center.y).toBeCloseTo(0)
    expect(arc?.deltaAngle).toBeCloseTo(-Math.PI / 2)
  })

  it('takes the long way round when largeArc is set', () => {
    const arc = arcToCenter({
      ...base,
      largeArc: true,
      from: { x: 0, y: 5 },
      to: { x: 5, y: 0 },
    })

    expect(Math.abs(arc?.deltaAngle ?? 0)).toBeCloseTo((3 * Math.PI) / 2)
  })

  it('grows radii that cannot reach both endpoints', () => {
    const arc = arcToCenter({ ...base, rx: 1, ry: 1, from: { x: 0, y: 0 }, to: { x: 10, y: 0 } })

    expect(arc?.rx).toBeCloseTo(5)
  })

  it('returns null for a degenerate arc', () => {
    expect(arcToCenter({ ...base, rx: 0, from: { x: 0, y: 0 }, to: { x: 5, y: 0 } })).toBeNull()
    expect(arcToCenter({ ...base, from: { x: 1, y: 1 }, to: { x: 1, y: 1 } })).toBeNull()
  })
})

describe('sampleArc', () => {
  it('samples endpoints included', () => {
    const arc = arcToCenter({
      kind: 'arc',
      rx: 2,
      ry: 1,
      xAxisRotation: 0,
      largeArc: false,
      sweep: true,
      from: { x: 2, y: 0 },
      to: { x: -2, y: 0 },
    } as ArcSegment)

    const points = sampleArc(arc!, 8)

    expect(points).toHaveLength(9)
    expect(points[0]?.x).toBeCloseTo(2)
    expect(points[8]?.x).toBeCloseTo(-2)
  })
})

describe('parseViewBox / parseLength / parsePoints', () => {
  it('reads a four-number viewBox', () => {
    expect(parseViewBox('0 -10 100 50')).toEqual({ minX: 0, minY: -10, width: 100, height: 50 })
  })

  it('returns null for a viewBox it cannot read', () => {
    expect(parseViewBox(undefined)).toBeNull()
    expect(parseViewBox('0 0 100')).toBeNull()
    expect(parseViewBox('a b c d')).toBeNull()
  })

  it('ignores the unit suffix on a length', () => {
    expect(parseLength('100mm')).toBe(100)
    expect(parseLength('2.5e1px')).toBe(25)
    expect(parseLength('auto')).toBeNull()
    expect(parseLength(undefined)).toBeNull()
  })

  it('reads a points list', () => {
    expect(parsePoints('0,0 10,0 10,10')).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ])
  })
})

describe('importSvg', () => {
  it('reads the document attributes', () => {
    const result = importSvg(SQUARE)

    expect(result.viewBox).toEqual({ minX: 0, minY: 0, width: 100, height: 100 })
    expect(result.width).toBe(100)
    expect(result.height).toBe(100)
    expect(result.elementCount).toBe(1)
  })

  it('mirrors the drawing about the viewBox so y points up', () => {
    const { sketch } = importSvg(SQUARE)
    const lines = sketch.entitiesOfType('line') as LineEntity[]

    expect(lines).toHaveLength(4)
    // The path's top edge at y=10 lands at y=90 in sketch space.
    expect(lineStart(sketch, lines[0] as LineEntity)).toMatchObject({ x: 10, y: 90 })
  })

  it('leaves coordinates alone when the flip is switched off', () => {
    const { sketch } = importSvg(SQUARE, { flipY: false })
    const [line] = sketch.entitiesOfType('line') as [LineEntity]

    expect(lineStart(sketch, line)).toMatchObject({ x: 10, y: 10 })
  })

  it('mirrors about the origin when there is no viewBox', () => {
    const { sketch } = importSvg('<svg><path d="M 0 10 L 10 10"/></svg>')
    const [line] = sketch.entitiesOfType('line') as [LineEntity]

    expect(lineStart(sketch, line)).toMatchObject({ x: 0, y: -10 })
  })

  it('applies an extra scale', () => {
    const { sketch } = importSvg(SQUARE, { flipY: false, scale: 2 })
    const [line] = sketch.entitiesOfType('line') as [LineEntity]

    expect(lineStart(sketch, line)).toMatchObject({ x: 20, y: 20 })
  })

  it('composes group and element transforms', () => {
    const svg = `<svg><g transform="translate(10 0)"><g transform="scale(2)">
      <line x1="0" y1="0" x2="5" y2="0"/></g></g></svg>`

    const { sketch } = importSvg(svg, { flipY: false })
    const [line] = sketch.entitiesOfType('line') as [LineEntity]

    expect(lineEnd(sketch, line)).toMatchObject({ x: 20, y: 0 })
  })

  it('reads circles, ellipses, rects, polylines and polygons', () => {
    const svg = `<svg viewBox="0 0 100 100">
      <circle cx="10" cy="10" r="5"/>
      <ellipse cx="30" cy="10" rx="8" ry="4"/>
      <rect x="0" y="0" width="10" height="20"/>
      <polyline points="0,0 5,5"/>
      <polygon points="0,0 5,0 5,5"/>
      <text x="0" y="0">ignored</text>
    </svg>`

    const result = importSvg(svg)

    expect(result.elementCount).toBe(5)
    expect(result.sketch.entitiesOfType('circle')).toHaveLength(1)
    expect(result.sketch.entitiesOfType('ellipse')).toHaveLength(1)
    expect(result.sketch.entitiesOfType('polygon')).toHaveLength(3)
  })

  it('turns a circle under a non-uniform transform into an ellipse', () => {
    const svg = `<svg><g transform="scale(2 1)"><circle cx="0" cy="0" r="5"/></g></svg>`

    expect(importSvg(svg).sketch.entitiesOfType('ellipse')).toHaveLength(1)
  })

  it('skips a circle with no radius', () => {
    expect(importSvg('<svg><circle cx="1" cy="1"/></svg>').sketch.entities.size).toBe(0)
  })

  it('keeps cubic and quadratic curves as splines', () => {
    const { sketch } = importSvg('<svg><path d="M 0 0 C 1 1 2 1 3 0 Q 4 -1 5 0"/></svg>')
    const splines = sketch.entitiesOfType('spline')

    expect(splines.map((spline) => (spline as { degree: number }).degree)).toEqual([3, 2])
  })

  it('keeps a circular arc as an arc', () => {
    const { sketch } = importSvg('<svg><path d="M 0 5 A 5 5 0 0 1 5 0"/></svg>', {
      flipY: false,
    })
    const [arc] = sketch.entitiesOfType('arc') as [ArcEntity]

    expect(arc.radius).toBeCloseTo(5)
    expect(circleCenter(sketch, arc)).toMatchObject({ x: 5, y: 5 })
    // Without the flip the sweep direction is the one the file described.
    expect(arc.clockwise).toBe(false)
  })

  it('flips the sweep direction along with the drawing', () => {
    const { sketch } = importSvg('<svg><path d="M 0 5 A 5 5 0 0 1 5 0"/></svg>')
    const [arc] = sketch.entitiesOfType('arc') as [ArcEntity]

    expect(arc.clockwise).toBe(true)
  })

  it('tessellates an elliptical arc', () => {
    const { sketch } = importSvg('<svg><path d="M 0 4 A 8 4 0 0 1 8 0"/></svg>', { segments: 6 })

    expect(sketch.entitiesOfType('polygon')).toHaveLength(1)
    expect(sketch.entitiesOfType('point')).toHaveLength(7)
  })

  it('draws a degenerate arc as a straight line', () => {
    const { sketch } = importSvg('<svg><path d="M 0 0 A 0 0 0 0 1 10 0"/></svg>')

    expect(sketch.entitiesOfType('line')).toHaveLength(1)
  })

  it('skips a zero-length line segment', () => {
    const { sketch } = importSvg('<svg><path d="M 5 5 L 5 5"/></svg>')

    expect(sketch.entitiesOfType('line')).toHaveLength(0)
  })

  it('rejects a document whose root is not svg', () => {
    expect(() => importSvg('<html></html>')).toThrow(/not <svg>/)
  })
})

describe('exportSvg', () => {
  function sampleSketch(): SketchModel {
    const sketch = new SketchModel()
    buildLine(sketch, { x: 0, y: 0 }, { x: 10, y: 0 })
    buildCircle(sketch, { x: 5, y: 5 }, 2)
    return sketch
  }

  it('writes a well-formed document with a viewBox', () => {
    const svg = exportSvg(sampleSketch(), { margin: 0 })

    expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    // The drawing spans x 0..10 and y 0..7.
    expect(svg).toContain('viewBox="0 0 10 7"')
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true)
  })

  it('writes one path per drawable entity', () => {
    expect(exportSvg(sampleSketch()).match(/<path /g)).toHaveLength(2)
  })

  it('mirrors y so the drawing reads right in SVG space', () => {
    const sketch = new SketchModel()
    buildLine(sketch, { x: 0, y: 0 }, { x: 10, y: 5 })

    // Mirrored about y = 5, the midpoint of the drawing's own extent.
    expect(exportSvg(sketch)).toContain('d="M 0 5 L 10 0"')
  })

  it('writes the stroke attributes it was given', () => {
    const svg = exportSvg(sampleSketch(), { stroke: '#ff0000', strokeWidth: 2, fill: 'white' })

    expect(svg).toContain('stroke="#ff0000"')
    expect(svg).toContain('stroke-width="2"')
    expect(svg).toContain('fill="white"')
  })

  it('dashes construction geometry when it is included', () => {
    const sketch = new SketchModel()
    buildCircle(sketch, { x: 0, y: 0 }, 1, { isConstruction: true })

    expect(exportSvg(sketch)).not.toContain('<path')
    expect(exportSvg(sketch, { includeConstruction: true })).toContain('stroke-dasharray')
  })

  it('writes a title and unit suffixes when asked', () => {
    const svg = exportSvg(sampleSketch(), { title: 'Plate <1>', units: 'mm' })

    expect(svg).toContain('<title>Plate &lt;1&gt;</title>')
    expect(svg).toMatch(/width="[\d.]+mm"/)
  })

  it('falls back to a unit box for an empty sketch', () => {
    expect(exportSvg(new SketchModel(), { margin: 0 })).toContain('viewBox="0 0 1 1"')
  })

  it('writes a circle as two half turns', () => {
    const sketch = new SketchModel()
    buildCircle(sketch, { x: 0, y: 0 }, 5)

    expect(exportSvg(sketch)).toContain('d="M 5 0 A 5 5 0 0 1 -5 0 A 5 5 0 0 1 5 0 Z"')
  })

  it('marks an arc of more than half a turn as a large arc', () => {
    const sketch = new SketchModel()
    buildCenterArc(sketch, { x: 0, y: 0 }, { x: 5, y: 0 }, (3 * Math.PI) / 2)

    expect(exportSvg(sketch)).toMatch(/A 5 5 0 1 0 /)
  })

  it('tessellates entities without an SVG counterpart', () => {
    const sketch = new SketchModel()
    buildEllipse(sketch, { x: 0, y: 0 }, { x: 4, y: 0 }, 2)
    buildSpline(sketch, [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 3, y: 0 },
    ])

    const svg = exportSvg(sketch, { segments: 8 })

    expect(svg.match(/<path /g)).toHaveLength(2)
    expect(svg).toContain('Z"')
  })

  it('has nothing to draw for a point', () => {
    const sketch = new SketchModel()
    const id = resolvePoint(sketch, { x: 0, y: 0 })

    expect(pathData(sketch, sketch.requireEntity(id), 8, 4)).toBeNull()
  })

  it('has nothing to draw for a polygon of one point', () => {
    const sketch = new SketchModel()
    const polygon = buildPolygon(sketch, [
      { x: 1, y: 1 },
      { x: 1, y: 1 },
    ], { closed: false })
    polygon.pointIds = [polygon.pointIds[0] as string]

    expect(pathData(sketch, polygon, 8, 4)).toBeNull()
  })
})

describe('SVG round trip', () => {
  it('brings lines and circles back where they started', () => {
    const original = new SketchModel()
    buildLine(original, { x: 0, y: 0 }, { x: 40, y: 20 })
    buildCircle(original, { x: 20, y: 10 }, 6)

    const { sketch } = importSvg(exportSvg(original))

    const [line] = sketch.entitiesOfType('line') as [LineEntity]
    expect(lineStart(sketch, line)).toMatchObject({ x: 0, y: 0 })
    expect(lineEnd(sketch, line)).toMatchObject({ x: 40, y: 20 })

    // Two half-turn arcs come back rather than one circle entity.
    const arcs = sketch.entitiesOfType('arc') as ArcEntity[]
    expect(arcs).toHaveLength(2)
    expect(arcs[0]?.radius).toBeCloseTo(6)
    expect(circleCenter(sketch, arcs[0] as ArcEntity).x).toBeCloseTo(20)
  })

  it('brings an arc back with the same sweep', () => {
    const original = new SketchModel()
    buildCenterArc(original, { x: 0, y: 0 }, { x: 10, y: 0 }, Math.PI / 2)

    const { sketch } = importSvg(exportSvg(original))
    const [arc] = sketch.entitiesOfType('arc') as [ArcEntity]
    const angles = arcAngles(sketch, arc)

    expect(arc.clockwise).toBe(false)
    expect(angles.startAngle).toBeCloseTo(0)
    expect(angles.endAngle).toBeCloseTo(Math.PI / 2)
  })
})
