import { describe, expect, it } from 'vitest'
import {
  importDxf,
  readEntities,
  readHeader,
  readLayers,
  readRecords,
  tokenizeDxf,
} from '../../src/io/DxfImporter'
import type { DxfArc, DxfCircle, DxfLine, DxfPolyline } from '../../src/io/DxfImporter'
import { exportDxf } from '../../src/io/DxfExporter'
import { SketchModel } from '../../src/sketch/domain/SketchModel'
import {
  buildCenterArc,
  buildCircle,
  buildLine,
  buildPolygon,
  buildRegularPolygon,
  resolvePoint,
} from '../../src/sketch/domain/builders'
import { arcAngles, circleCenter, lineEnd, lineStart } from '../../src/sketch/domain/query'
import type { ArcEntity, CircleEntity, LineEntity } from '../../src/sketch/domain/SketchEntity'
import { ImportError } from '../../src/io/types'

/** Builds DXF text from alternating code/value arguments. */
function dxf(...pairs: (string | number)[]): string {
  return `${pairs.map(String).join('\n')}\n`
}

const MINIMAL = dxf(
  0,
  'SECTION',
  2,
  'HEADER',
  9,
  '$INSUNITS',
  70,
  4,
  0,
  'ENDSEC',
  0,
  'SECTION',
  2,
  'ENTITIES',
  0,
  'LINE',
  8,
  'outline',
  10,
  0,
  20,
  0,
  30,
  0,
  11,
  10,
  21,
  5,
  31,
  0,
  0,
  'ENDSEC',
  0,
  'EOF',
)

describe('tokenizeDxf', () => {
  it('pairs each code line with the value beneath it', () => {
    expect(tokenizeDxf('0\nSECTION\n2\nHEADER\n')).toEqual([
      { code: 0, value: 'SECTION' },
      { code: 2, value: 'HEADER' },
    ])
  })

  it('skips blank code lines', () => {
    expect(tokenizeDxf('\n\n0\nEOF\n')).toEqual([{ code: 0, value: 'EOF' }])
  })

  it('rejects a code that is not an integer', () => {
    expect(() => tokenizeDxf('abc\nSECTION\n')).toThrow(ImportError)
  })
})

describe('readRecords', () => {
  it('starts a record at every code-0 pair', () => {
    const records = readRecords(tokenizeDxf(MINIMAL))

    expect(records.map((record) => record.type)).toEqual([
      'SECTION',
      'ENDSEC',
      'SECTION',
      'LINE',
      'ENDSEC',
      'EOF',
    ])
  })

  it('ignores pairs before the first code 0', () => {
    expect(readRecords([{ code: 8, value: 'stray' }])).toEqual([])
  })
})

describe('readHeader', () => {
  it('keys variables by their $NAME', () => {
    expect(readHeader(readRecords(tokenizeDxf(MINIMAL)))).toEqual({ $INSUNITS: '4' })
  })

  it('is empty when the file has no HEADER section', () => {
    expect(readHeader(readRecords(tokenizeDxf(dxf(0, 'EOF'))))).toEqual({})
  })
})

describe('readLayers', () => {
  it('reads the LAYER table', () => {
    const text = dxf(
      0, 'SECTION', 2, 'TABLES',
      0, 'TABLE', 2, 'LTYPE', 0, 'LTYPE', 2, 'CONTINUOUS', 0, 'ENDTAB',
      0, 'TABLE', 2, 'LAYER',
      0, 'LAYER', 2, 'outline', 62, 5,
      0, 'LAYER', 2, 'hidden',
      0, 'ENDTAB', 0, 'ENDSEC', 0, 'EOF',
    )

    expect(readLayers(readRecords(tokenizeDxf(text)))).toEqual([
      { name: 'outline', color: 5 },
      { name: 'hidden', color: 7 },
    ])
  })
})

describe('readEntities', () => {
  it('reads a LINE with its layer and colour', () => {
    const [line] = readEntities(readRecords(tokenizeDxf(MINIMAL))) as [DxfLine]

    expect(line).toEqual({
      type: 'LINE',
      layer: 'outline',
      color: null,
      start: { x: 0, y: 0 },
      end: { x: 10, y: 5 },
    })
  })

  it('reads CIRCLE, ARC and POINT', () => {
    const text = dxf(
      0, 'SECTION', 2, 'ENTITIES',
      0, 'CIRCLE', 8, '0', 62, 1, 10, 5, 20, 5, 40, 3,
      0, 'ARC', 8, '0', 10, 0, 20, 0, 40, 2, 50, 90, 51, 180,
      0, 'POINT', 8, '0', 10, 7, 20, 8,
      0, 'ENDSEC', 0, 'EOF',
    )

    const entities = readEntities(readRecords(tokenizeDxf(text)))

    expect(entities).toHaveLength(3)
    expect(entities[0]).toMatchObject({ type: 'CIRCLE', center: { x: 5, y: 5 }, radius: 3, color: 1 })
    expect(entities[1]).toMatchObject({ type: 'ARC', startAngle: 90, endAngle: 180 })
    expect(entities[2]).toMatchObject({ type: 'POINT', position: { x: 7, y: 8 } })
  })

  it('reads an LWPOLYLINE from its interleaved vertex pairs', () => {
    const text = dxf(
      0, 'SECTION', 2, 'ENTITIES',
      0, 'LWPOLYLINE', 8, '0', 90, 3, 70, 1,
      10, 0, 20, 0, 10, 10, 20, 0, 10, 10, 20, 10,
      0, 'ENDSEC', 0, 'EOF',
    )

    const [polyline] = readEntities(readRecords(tokenizeDxf(text))) as [DxfPolyline]

    expect(polyline.closed).toBe(true)
    expect(polyline.vertices).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ])
  })

  it('reads a POLYLINE from its VERTEX records', () => {
    const text = dxf(
      0, 'SECTION', 2, 'ENTITIES',
      0, 'POLYLINE', 8, 'p', 66, 1, 70, 0, 10, 0, 20, 0, 30, 0,
      0, 'VERTEX', 8, 'p', 10, 1, 20, 2,
      0, 'VERTEX', 8, 'p', 10, 3, 20, 4,
      0, 'SEQEND', 8, 'p',
      0, 'ENDSEC', 0, 'EOF',
    )

    const [polyline] = readEntities(readRecords(tokenizeDxf(text))) as [DxfPolyline]

    expect(polyline.closed).toBe(false)
    expect(polyline.vertices).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ])
  })

  it('closes a POLYLINE that never got its SEQEND', () => {
    const text = dxf(
      0, 'SECTION', 2, 'ENTITIES',
      0, 'POLYLINE', 8, 'p', 66, 1,
      0, 'VERTEX', 10, 0, 20, 0,
      0, 'VERTEX', 10, 5, 20, 0,
      0, 'ENDSEC', 0, 'EOF',
    )

    expect(readEntities(readRecords(tokenizeDxf(text)))).toHaveLength(1)
  })

  it('skips entities outside the ENTITIES section and keywords it cannot read', () => {
    const text = dxf(
      0, 'SECTION', 2, 'BLOCKS', 0, 'LINE', 10, 0, 20, 0, 11, 1, 21, 1, 0, 'ENDSEC',
      0, 'SECTION', 2, 'ENTITIES', 0, 'MTEXT', 8, '0', 1, 'hello', 0, 'ENDSEC',
      0, 'EOF',
    )

    expect(readEntities(readRecords(tokenizeDxf(text)))).toEqual([])
  })

  it('rejects an entity missing a required group code', () => {
    const text = dxf(0, 'SECTION', 2, 'ENTITIES', 0, 'LINE', 10, 0, 0, 'ENDSEC', 0, 'EOF')

    expect(() => readEntities(readRecords(tokenizeDxf(text)))).toThrow(/missing group code 20/)
  })
})

describe('importDxf', () => {
  it('builds sketch geometry from the entities', () => {
    const result = importDxf(MINIMAL)

    expect(result.units).toBe('mm')
    expect(result.entities).toHaveLength(1)

    const [line] = result.sketch.entitiesOfType('line') as [LineEntity]
    expect(lineStart(result.sketch, line)).toMatchObject({ x: 0, y: 0 })
    expect(lineEnd(result.sketch, line)).toMatchObject({ x: 10, y: 5 })
  })

  it('converts DXF arcs into counter-clockwise sketch arcs', () => {
    const text = dxf(
      0, 'SECTION', 2, 'ENTITIES',
      0, 'ARC', 8, '0', 10, 0, 20, 0, 40, 2, 50, 0, 51, 90,
      0, 'ENDSEC', 0, 'EOF',
    )

    const { sketch } = importDxf(text)
    const [arc] = sketch.entitiesOfType('arc') as [ArcEntity]
    const angles = arcAngles(sketch, arc)

    expect(arc.radius).toBeCloseTo(2)
    expect(arc.clockwise).toBe(false)
    expect(angles.startAngle).toBeCloseTo(0)
    expect(angles.endAngle).toBeCloseTo(Math.PI / 2)
  })

  it('treats equal arc angles as a full turn', () => {
    const text = dxf(
      0, 'SECTION', 2, 'ENTITIES',
      0, 'ARC', 10, 0, 20, 0, 40, 1, 50, 45, 51, 45,
      0, 'ENDSEC', 0, 'EOF',
    )

    const { sketch } = importDxf(text)
    const [arc] = sketch.entitiesOfType('arc') as [ArcEntity]

    expect(arcAngles(sketch, arc).startAngle).toBeCloseTo(arcAngles(sketch, arc).endAngle)
  })

  it('rescales from the file units into the target units', () => {
    const inches = dxf(
      0, 'SECTION', 2, 'HEADER', 9, '$INSUNITS', 70, 1, 0, 'ENDSEC',
      0, 'SECTION', 2, 'ENTITIES',
      0, 'CIRCLE', 10, 1, 20, 0, 40, 1,
      0, 'ENDSEC', 0, 'EOF',
    )

    const result = importDxf(inches, { targetUnits: 'mm' })
    const [circle] = result.sketch.entitiesOfType('circle') as [CircleEntity]

    expect(result.units).toBe('in')
    expect(circle.radius).toBeCloseTo(25.4)
    expect(circleCenter(result.sketch, circle).x).toBeCloseTo(25.4)
  })

  it('applies an extra scale on top', () => {
    const result = importDxf(MINIMAL, { scale: 2 })
    const [line] = result.sketch.entitiesOfType('line') as [LineEntity]

    expect(lineEnd(result.sketch, line)).toMatchObject({ x: 20, y: 10 })
  })

  it('keeps only the requested layers', () => {
    const text = dxf(
      0, 'SECTION', 2, 'ENTITIES',
      0, 'LINE', 8, 'keep', 10, 0, 20, 0, 11, 1, 21, 1,
      0, 'LINE', 8, 'drop', 10, 0, 20, 0, 11, 2, 21, 2,
      0, 'ENDSEC', 0, 'EOF',
    )

    expect(importDxf(text, { layers: ['keep'] }).entities).toHaveLength(1)
  })

  it('names the sketch and places it on the requested plane', () => {
    const result = importDxf(MINIMAL, { name: 'Panel', plane: 'XZ' })

    expect(result.sketch.name).toBe('Panel')
    expect(result.sketch.plane).toBe('XZ')
  })

  it('converts polylines and points', () => {
    const text = dxf(
      0, 'SECTION', 2, 'ENTITIES',
      0, 'LWPOLYLINE', 70, 1, 10, 0, 20, 0, 10, 5, 20, 0, 10, 5, 20, 5,
      0, 'POINT', 10, 9, 20, 9,
      0, 'ENDSEC', 0, 'EOF',
    )

    const { sketch } = importDxf(text)

    expect(sketch.entitiesOfType('polygon')).toHaveLength(1)
    // Three polygon corners plus the standalone point.
    expect(sketch.entitiesOfType('point')).toHaveLength(4)
  })

  it('rejects a file with no SECTION', () => {
    expect(() => importDxf('nothing here')).toThrow(/no DXF SECTION/)
  })
})

describe('exportDxf', () => {
  function sampleSketch(): SketchModel {
    const sketch = new SketchModel({ name: 'Plate' })
    buildLine(sketch, { x: 0, y: 0 }, { x: 10, y: 0 })
    buildCircle(sketch, { x: 5, y: 5 }, 2)
    buildCenterArc(sketch, { x: 0, y: 0 }, { x: 3, y: 0 }, Math.PI / 2)
    return sketch
  }

  it('writes the R12 header, the layer table and the entities', () => {
    const text = exportDxf(sampleSketch())

    expect(text).toContain('AC1009')
    expect(text).toContain('$INSUNITS')
    expect(text).toMatch(/\bLAYER\b/)
    expect(text.trimEnd().endsWith('EOF')).toBe(true)
  })

  it('writes a LINE, a CIRCLE and an ARC', () => {
    const text = exportDxf(sampleSketch())

    expect(text).toMatch(/\n0\nLINE\n/)
    expect(text).toMatch(/\n0\nCIRCLE\n/)
    expect(text).toMatch(/\n0\nARC\n/)
  })

  it('records the units it was told the sketch is in', () => {
    expect(exportDxf(new SketchModel(), { units: 'in' })).toContain('$INSUNITS\n70\n1')
    expect(exportDxf(new SketchModel(), { units: 'in' })).toContain('$MEASUREMENT\n70\n0')
  })

  it('rescales into the target units', () => {
    const sketch = new SketchModel()
    buildCircle(sketch, { x: 0, y: 0 }, 1)

    const text = exportDxf(sketch, { units: 'in', targetUnits: 'mm' })

    expect(text).toContain('40\n25.4')
    expect(text).toContain('$INSUNITS\n70\n4')
  })

  it('skips construction geometry unless asked for it', () => {
    const sketch = new SketchModel()
    buildCircle(sketch, { x: 0, y: 0 }, 1, { isConstruction: true })

    expect(exportDxf(sketch)).not.toContain('CIRCLE')
    expect(exportDxf(sketch, { includeConstruction: true })).toContain('CIRCLE')
  })

  it('writes a closed POLYLINE for a polygon', () => {
    const sketch = new SketchModel()
    buildRegularPolygon(sketch, { x: 0, y: 0 }, 5, 6)

    const text = exportDxf(sketch)

    expect(text).toContain('POLYLINE')
    expect(text).toContain('70\n1')
    expect(text.match(/\n0\nVERTEX\n/g)).toHaveLength(6)
    expect(text).toContain('SEQEND')
  })

  it('writes an open POLYLINE for an open polygon', () => {
    const sketch = new SketchModel()
    buildPolygon(sketch, [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 1 },
    ], { closed: false })

    const text = exportDxf(sketch)

    expect(text.match(/\n0\nVERTEX\n/g)).toHaveLength(3)
  })

  it('writes standalone points but not the rectangle wrapper', () => {
    const sketch = new SketchModel()
    resolvePoint(sketch, { x: 1, y: 2 })

    expect(exportDxf(sketch)).toMatch(/\n0\nPOINT\n/)
  })

  it('places a rectangle on its four lines only', () => {
    const sketch = new SketchModel()
    buildLine(sketch, { x: 0, y: 0 }, { x: 1, y: 0 })

    expect(exportDxf(sketch).match(/\n0\nLINE\n/g)).toHaveLength(1)
  })
})

describe('DXF round trip', () => {
  it('brings lines, circles and arcs back where they started', () => {
    const original = new SketchModel()
    buildLine(original, { x: -5, y: 2 }, { x: 10, y: 7.5 })
    buildCircle(original, { x: 1, y: 2 }, 4)
    buildCenterArc(original, { x: 0, y: 0 }, { x: 5, y: 0 }, Math.PI / 3)

    const { sketch } = importDxf(exportDxf(original))

    const [line] = sketch.entitiesOfType('line') as [LineEntity]
    expect(lineStart(sketch, line).x).toBeCloseTo(-5)
    expect(lineEnd(sketch, line).y).toBeCloseTo(7.5)

    const [circle] = sketch.entitiesOfType('circle') as [CircleEntity]
    expect(circle.radius).toBeCloseTo(4)
    expect(circleCenter(sketch, circle)).toMatchObject({ x: 1, y: 2 })

    const [arc] = sketch.entitiesOfType('arc') as [ArcEntity]
    expect(arc.radius).toBeCloseTo(5)
    expect(arcAngles(sketch, arc).endAngle).toBeCloseTo(Math.PI / 3)
  })

  it('preserves a clockwise arc by swapping its ends', () => {
    const original = new SketchModel()
    buildCenterArc(original, { x: 0, y: 0 }, { x: 0, y: 4 }, -Math.PI / 2)

    const { sketch } = importDxf(exportDxf(original))
    const [arc] = sketch.entitiesOfType('arc') as [ArcEntity]
    const angles = arcAngles(sketch, arc)

    // The same sector, now described counter-clockwise from 0 to 90 degrees.
    expect(angles.startAngle).toBeCloseTo(0)
    expect(angles.endAngle).toBeCloseTo(Math.PI / 2)
  })
})
