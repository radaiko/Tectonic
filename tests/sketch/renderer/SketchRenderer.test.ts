import { beforeEach, describe, expect, it } from 'vitest'
import { CanvasRecorder } from '../../helpers/mockCanvas'
import { SketchModel } from '../../../src/sketch/domain/SketchModel'
import {
  buildCenterArc,
  buildCircle,
  buildEllipse,
  buildLine,
  buildPolygon,
  buildRectangle,
  buildSlot,
  buildSpline,
} from '../../../src/sketch/domain/builders'
import {
  DistanceConstraint,
  HorizontalConstraint,
  ParallelConstraint,
  RadiusConstraint,
  VerticalConstraint,
} from '../../../src/sketch/domain/Constraint'
import { SKETCH_COLORS, SketchRenderer } from '../../../src/sketch/renderer/SketchRenderer'
import { createView } from '../../../src/sketch/renderer/view'

let recorder: CanvasRecorder
let renderer: SketchRenderer

const view = createView(800, 600)

beforeEach(() => {
  recorder = new CanvasRecorder()
  renderer = new SketchRenderer(recorder.context)
})

describe('canvas setup', () => {
  it('clears the whole canvas', () => {
    renderer.render(new SketchModel(), { view })
    expect(recorder.callsTo('clearRect')[0]?.args).toEqual([0, 0, 800, 600])
  })

  it('applies the device pixel ratio', () => {
    renderer.render(new SketchModel(), { view, devicePixelRatio: 2 })
    expect(recorder.callsTo('setTransform')[0]?.args).toEqual([2, 0, 0, 2, 0, 0])
  })

  it('balances save and restore', () => {
    renderer.render(new SketchModel(), { view })
    expect(recorder.countOf('save')).toBe(recorder.countOf('restore'))
  })
})

describe('grid and axes', () => {
  it('draws grid lines by default', () => {
    renderer.render(new SketchModel(), { view })
    expect(recorder.valuesOf('strokeStyle')).toContain(SKETCH_COLORS.grid)
  })

  it('omits the grid when asked', () => {
    renderer.render(new SketchModel(), { view, showGrid: false })
    expect(recorder.valuesOf('strokeStyle')).not.toContain(SKETCH_COLORS.grid)
  })

  it('draws both coordinate axes', () => {
    renderer.render(new SketchModel(), { view })
    const strokes = recorder.valuesOf('strokeStyle')
    expect(strokes).toContain(SKETCH_COLORS.axisX)
    expect(strokes).toContain(SKETCH_COLORS.axisY)
  })

  it('labels the axes at the origin', () => {
    renderer.render(new SketchModel(), { view })
    expect(recorder.textsDrawn()).toEqual(expect.arrayContaining(['X', 'Y']))
  })
})

describe('entities', () => {
  it('draws a line between its screen endpoints', () => {
    const model = new SketchModel()
    buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    renderer.render(model, { view, showGrid: false })

    expect(recorder.callsTo('moveTo').some((call) => call.args[0] === 400 && call.args[1] === 300))
      .toBe(true)
    expect(recorder.callsTo('lineTo').some((call) => call.args[0] === 500 && call.args[1] === 300))
      .toBe(true)
  })

  it('draws a circle as an arc', () => {
    const model = new SketchModel()
    buildCircle(model, { x: 0, y: 0 }, 50)
    renderer.render(model, { view, showGrid: false })

    const circle = recorder.callsTo('arc').find((call) => call.args[2] === 50)
    expect(circle).toBeDefined()
  })

  it('dashes construction geometry', () => {
    const model = new SketchModel()
    buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 }, { isConstruction: true })
    renderer.render(model, { view, showGrid: false })

    const dashes = recorder.callsTo('setLineDash').map((call) => call.args[0])
    expect(dashes.some((pattern) => Array.isArray(pattern) && pattern.length > 0)).toBe(true)
  })

  it('renders every entity kind without error', () => {
    const model = new SketchModel()
    buildLine(model, { x: 0, y: 0 }, { x: 10, y: 0 })
    buildCircle(model, { x: 40, y: 0 }, 5)
    buildCenterArc(model, { x: 80, y: 0 }, { x: 85, y: 0 }, Math.PI / 2)
    buildRectangle(model, { x: 0, y: 20 }, { x: 30, y: 40 })
    buildSlot(model, { x: 60, y: 30 }, { x: 90, y: 30 }, 8)
    buildPolygon(model, [
      { x: 0, y: -20 },
      { x: 10, y: -30 },
      { x: 20, y: -20 },
    ])
    buildEllipse(model, { x: 60, y: -30 }, { x: 80, y: -30 }, 8)
    buildSpline(model, [
      { x: -40, y: 0 },
      { x: -30, y: 10 },
      { x: -20, y: 0 },
    ])

    expect(() => renderer.render(model, { view })).not.toThrow()
    expect(recorder.countOf('stroke')).toBeGreaterThan(8)
  })
})

describe('selection feedback', () => {
  it('highlights selected entities', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    renderer.render(model, { view, showGrid: false, selectedEntityIds: [line.id] })

    expect(recorder.valuesOf('strokeStyle')).toContain(SKETCH_COLORS.selected)
  })

  it('glows the hovered entity', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    renderer.render(model, { view, showGrid: false, hoveredEntityId: line.id })

    expect(recorder.valuesOf('strokeStyle')).toContain(SKETCH_COLORS.hovered)
  })

  it('marks under-constrained entities in the warning colour', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    renderer.render(model, {
      view,
      showGrid: false,
      underConstrainedEntityIds: [line.id],
    })

    expect(recorder.valuesOf('strokeStyle')).toContain(SKETCH_COLORS.underConstrained)
  })

  it('draws selection above the under-constrained colour', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    renderer.render(model, {
      view,
      showGrid: false,
      selectedEntityIds: [line.id],
      underConstrainedEntityIds: [line.id],
    })

    expect(recorder.valuesOf('strokeStyle')).not.toContain(SKETCH_COLORS.underConstrained)
  })
})

describe('snap indicator', () => {
  it('draws a marker and its label', () => {
    renderer.render(new SketchModel(), {
      view,
      showGrid: false,
      snap: {
        point: { x: 0, y: 0 },
        type: 'endpoint',
        entityId: undefined,
        secondaryEntityId: undefined,
        distance: 0,
        priority: 0,
        label: 'Endpoint',
      },
    })

    expect(recorder.valuesOf('strokeStyle')).toContain(SKETCH_COLORS.snap)
    expect(recorder.textsDrawn()).toContain('Endpoint')
  })
})

describe('constraint icons', () => {
  it('badges horizontal and vertical constraints', () => {
    const model = new SketchModel()
    const horizontal = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    const vertical = buildLine(model, { x: 0, y: 0 }, { x: 0, y: 100 })
    model.addConstraint(new HorizontalConstraint({ lineId: horizontal.id }))
    model.addConstraint(new VerticalConstraint({ lineId: vertical.id }))

    renderer.render(model, { view, showGrid: false })

    expect(recorder.textsDrawn()).toEqual(expect.arrayContaining(['H', 'V']))
  })

  it('badges a parallel constraint on both lines', () => {
    const model = new SketchModel()
    const a = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    const b = buildLine(model, { x: 0, y: 20 }, { x: 100, y: 20 })
    model.addConstraint(new ParallelConstraint({ lineId1: a.id, lineId2: b.id }))

    renderer.render(model, { view, showGrid: false })

    expect(recorder.textsDrawn().filter((text) => text === '∥')).toHaveLength(2)
  })

  it('omits icons when constraint display is off', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    model.addConstraint(new HorizontalConstraint({ lineId: line.id }))

    renderer.render(model, { view, showGrid: false, showConstraints: false })

    expect(recorder.textsDrawn()).not.toContain('H')
  })
})

describe('dimension labels', () => {
  it('draws the value of a distance dimension', () => {
    const model = new SketchModel()
    const line = buildLine(model, { x: 0, y: 0 }, { x: 100, y: 0 })
    model.addConstraint(
      new DistanceConstraint({
        pointId1: line.startPointId,
        pointId2: line.endPointId,
        value: 100,
      }),
    )

    renderer.render(model, { view, showGrid: false })

    expect(recorder.textsDrawn()).toContain('100')
  })

  it('prefixes a radius dimension', () => {
    const model = new SketchModel()
    const circle = buildCircle(model, { x: 0, y: 0 }, 25)
    model.addConstraint(new RadiusConstraint({ circleId: circle.id, value: 25 }))

    renderer.render(model, { view, showGrid: false })

    expect(recorder.textsDrawn()).toContain('R25')
  })

  it('omits dimensions when display is off', () => {
    const model = new SketchModel()
    const circle = buildCircle(model, { x: 0, y: 0 }, 25)
    model.addConstraint(new RadiusConstraint({ circleId: circle.id, value: 25 }))

    renderer.render(model, { view, showGrid: false, showDimensions: false })

    expect(recorder.textsDrawn()).not.toContain('R25')
  })

  it('reports where each dimension label landed so the UI can edit it', () => {
    const model = new SketchModel()
    const circle = buildCircle(model, { x: 0, y: 0 }, 25)
    const radius = model.addConstraint(new RadiusConstraint({ circleId: circle.id, value: 25 }))

    const layout = renderer.render(model, { view, showGrid: false })

    expect(layout.dimensionLabels.find((label) => label.constraintId === radius.id)).toBeDefined()
  })
})

describe('preview overlay', () => {
  it('draws a rubber-band preview polyline', () => {
    renderer.render(new SketchModel(), {
      view,
      showGrid: false,
      preview: {
        kind: 'polyline',
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ],
      },
    })

    expect(recorder.valuesOf('strokeStyle')).toContain(SKETCH_COLORS.preview)
  })

  it('draws a preview circle', () => {
    renderer.render(new SketchModel(), {
      view,
      showGrid: false,
      preview: { kind: 'circle', center: { x: 0, y: 0 }, radius: 40 },
    })

    expect(recorder.callsTo('arc').some((call) => call.args[2] === 40)).toBe(true)
  })

  it('draws a selection rectangle', () => {
    renderer.render(new SketchModel(), {
      view,
      showGrid: false,
      preview: { kind: 'box', from: { x: 0, y: 0 }, to: { x: 50, y: 50 } },
    })

    expect(recorder.countOf('strokeRect')).toBeGreaterThan(0)
  })
})
