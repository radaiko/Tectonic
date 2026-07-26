import { describe, expect, it } from 'vitest'
import {
  applyActiveConfiguration,
  applyConfiguration,
  captureConfiguration,
} from '../../src/config/applyConfiguration'
import { ConfigurationTable, ParameterKind } from '../../src/config/ConfigurationTable'
import { FeatureTree } from '../../src/features/FeatureTree'
import { FeatureType } from '../../src/features/domain/FeatureType'
import { createFeature } from '../../src/features/domain/factory'
import { HorizontalConstraint, LengthConstraint } from '../../src/sketch/domain/Constraint'
import { buildLine } from '../../src/sketch/domain/builders'
import { SketchModel } from '../../src/sketch/domain/SketchModel'

interface Fixture {
  readonly table: ConfigurationTable
  readonly sketch: SketchModel
  readonly tree: FeatureTree
  readonly configId: string
}

/** A sketch with one driven line, and a tree with an extrude and a hole. */
function fixture(): Fixture {
  const sketch = new SketchModel({ name: 'Sketch 1', plane: 'XY' })
  const line = buildLine(sketch, { x: 0, y: 0 }, { x: 50, y: 0 })
  sketch.addConstraint(new LengthConstraint({ id: 'len', lineId: line.id, value: 50 }))

  const tree = new FeatureTree()
  tree.addFeature(createFeature(FeatureType.Extrude, { id: 'extrude', sketchId: sketch.id }))
  tree.addFeature(createFeature(FeatureType.Hole, { id: 'hole', sketchId: sketch.id }))

  const table = new ConfigurationTable()
  table.addParameter({
    id: 'width',
    kind: ParameterKind.Dimension,
    targetId: 'len',
    defaultValue: 50,
  })
  table.addParameter({
    id: 'depth',
    kind: ParameterKind.FeatureParameter,
    targetId: 'extrude',
    parameterKey: 'distance',
    defaultValue: 10,
  })
  table.addParameter({
    id: 'drilled',
    kind: ParameterKind.Suppression,
    targetId: 'hole',
    defaultValue: false,
  })
  table.addParameter({
    id: 'bracket',
    kind: ParameterKind.Instance,
    targetId: 'component-1',
    defaultValue: true,
  })

  const config = table.addConfiguration({ name: 'Large' })
  return { table, sketch, tree, configId: config.id }
}

describe('applyConfiguration', () => {
  it('writes every kind of parameter into the model', () => {
    const { table, sketch, tree, configId } = fixture()
    table.setValue(configId, 'width', 120)
    table.setValue(configId, 'depth', 35)
    table.setValue(configId, 'drilled', true)
    table.setValue(configId, 'bracket', false)

    const report = applyConfiguration(table, configId, { sketches: [sketch], tree })

    expect(report.skipped).toEqual([])
    expect(report.applied).toEqual(['width', 'depth', 'drilled', 'bracket'])
    expect(sketch.constraints.get('len')).toMatchObject({ value: 120, isDriving: true })
    expect(tree.getFeature('extrude')?.parameters.distance).toBe(35)
    expect(tree.getFeature('hole')?.suppressed).toBe(true)
    expect(report.instances).toEqual({ 'component-1': false })
  })

  it('applies the column defaults where a row has no override', () => {
    const { table, sketch, tree, configId } = fixture()
    applyConfiguration(table, configId, { sketches: [sketch], tree })
    expect(sketch.constraints.get('len')).toMatchObject({ value: 50 })
    expect(tree.getFeature('extrude')?.parameters.distance).toBe(10)
  })

  it('unsuppresses a feature when the cell goes back to false', () => {
    const { table, sketch, tree, configId } = fixture()
    tree.suppressFeature('hole')
    table.setValue(configId, 'drilled', false)

    applyConfiguration(table, configId, { sketches: [sketch], tree })
    expect(tree.getFeature('hole')?.suppressed).toBe(false)
  })

  it('reads a boolean written as a number or a string', () => {
    const { table, sketch, tree, configId } = fixture()
    table.setValue(configId, 'drilled', 1)
    applyConfiguration(table, configId, { sketches: [sketch], tree })
    expect(tree.getFeature('hole')?.suppressed).toBe(true)

    table.setValue(configId, 'drilled', 'False')
    applyConfiguration(table, configId, { sketches: [sketch], tree })
    expect(tree.getFeature('hole')?.suppressed).toBe(false)
  })

  it('reports what it could not apply instead of throwing', () => {
    const { table, configId } = fixture()
    const report = applyConfiguration(table, configId)

    expect(report.applied).toEqual(['bracket'])
    expect(report.skipped.map((entry) => entry.parameterId)).toEqual(['width', 'depth', 'drilled'])
    expect(report.skipped[0]?.reason).toBe('No such dimension')
    expect(report.skipped[1]?.reason).toBe('No such feature')
  })

  it('refuses to drive a constraint that carries no dimension', () => {
    const { table, sketch, tree, configId } = fixture()
    const line = [...sketch.entities.values()].find((entity) => entity.type === 'line')
    sketch.addConstraint(new HorizontalConstraint({ id: 'geo', lineId: line?.id as string }))
    table.addParameter({
      id: 'bogus',
      kind: ParameterKind.Dimension,
      targetId: 'geo',
      defaultValue: 5,
    })

    const report = applyConfiguration(table, configId, { sketches: [sketch], tree })
    expect(report.skipped).toContainEqual({ parameterId: 'bogus', reason: 'Not a driving dimension' })
  })

  it('refuses a dimension whose value is not a number', () => {
    const { table, sketch, tree, configId } = fixture()
    table.setValue(configId, 'width', 'wide')
    const report = applyConfiguration(table, configId, { sketches: [sketch], tree })
    expect(report.skipped).toContainEqual({ parameterId: 'width', reason: 'Not a number' })
  })

  it('skips a feature-parameter column that lost its key', () => {
    const { table, sketch, tree, configId } = fixture()
    // Only a hand-edited file can get here, so build the state directly.
    const restored = ConfigurationTable.fromJSON({
      ...table.toJSON(),
      parameters: table
        .toJSON()
        .parameters.map((parameter) =>
          parameter.id === 'depth' ? { ...parameter, kind: ParameterKind.FeatureParameter, parameterKey: undefined } : parameter,
        ),
    })
    const report = applyConfiguration(restored, configId, { sketches: [sketch], tree })
    expect(report.skipped).toContainEqual({ parameterId: 'depth', reason: 'No parameter key' })
  })

  it('skips everything for an unknown configuration', () => {
    const { table, sketch, tree } = fixture()
    const report = applyConfiguration(table, 'ghost', { sketches: [sketch], tree })
    expect(report.applied).toEqual([])
    expect(report.skipped).toHaveLength(4)
    expect(report.skipped[0]?.reason).toBe('Unknown configuration')
  })
})

describe('applyActiveConfiguration', () => {
  it('applies whichever row is active', () => {
    const { table, sketch, tree, configId } = fixture()
    table.setValue(configId, 'width', 80)
    const report = applyActiveConfiguration(table, { sketches: [sketch], tree })
    expect(report.applied).toContain('width')
    expect(sketch.constraints.get('len')).toMatchObject({ value: 80 })
  })

  it('does nothing when the table has no rows', () => {
    const report = applyActiveConfiguration(new ConfigurationTable())
    expect(report.applied).toEqual([])
    expect(report.instances).toEqual({})
  })
})

describe('captureConfiguration', () => {
  it('reads the model back into a row', () => {
    const { table, sketch, tree, configId } = fixture()
    const constraint = sketch.constraints.get('len')
    if (constraint && 'value' in constraint) constraint.value = 77
    tree.getFeature('extrude')?.setParameters({ distance: 42 })
    tree.suppressFeature('hole')

    expect(captureConfiguration(table, configId, { sketches: [sketch], tree })).toBe(3)
    expect(table.resolve(configId)).toMatchObject({ width: 77, depth: 42, drilled: true })
  })

  it('captures nothing when the model is not supplied', () => {
    const { table, configId } = fixture()
    expect(captureConfiguration(table, configId)).toBe(0)
  })

  it('skips a feature parameter that is not a scalar', () => {
    const { table, sketch, tree, configId } = fixture()
    tree.getFeature('extrude')?.setParameters({ distance: [1, 2] })
    expect(captureConfiguration(table, configId, { sketches: [sketch], tree })).toBe(2)
  })
})
