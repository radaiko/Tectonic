import { describe, expect, it } from 'vitest'
import {
  ConfigurationError,
  ConfigurationTable,
  PARAMETER_KINDS,
  ParameterKind,
} from '../../src/config/ConfigurationTable'

/** A table with one numeric column and one suppression column. */
function seededTable(): ConfigurationTable {
  const table = new ConfigurationTable()
  table.addParameter({
    id: 'depth',
    label: 'Depth',
    kind: ParameterKind.FeatureParameter,
    targetId: 'feature-1',
    parameterKey: 'distance',
    defaultValue: 10,
  })
  table.addParameter({
    id: 'hole',
    kind: ParameterKind.Suppression,
    targetId: 'feature-2',
    defaultValue: false,
  })
  return table
}

describe('parameters', () => {
  it('lists the four kinds a configuration can drive', () => {
    expect(PARAMETER_KINDS).toEqual(['dimension', 'featureParameter', 'suppression', 'instance'])
  })

  it('adds a column with a generated id and label', () => {
    const table = new ConfigurationTable()
    const parameter = table.addParameter({
      kind: ParameterKind.Dimension,
      targetId: 'constraint-1',
      defaultValue: 25,
    })
    expect(parameter.id.length).toBeGreaterThan(0)
    expect(parameter.label).toBe('Dimension constraint-1')
    expect(table.parameters).toHaveLength(1)
  })

  it('labels each kind sensibly by default', () => {
    const table = new ConfigurationTable()
    expect(
      table.addParameter({
        kind: ParameterKind.FeatureParameter,
        targetId: 'f',
        parameterKey: 'distance',
        defaultValue: 1,
      }).label,
    ).toBe('distance')
    expect(
      table.addParameter({ kind: ParameterKind.Suppression, targetId: 'f', defaultValue: false })
        .label,
    ).toBe('Suppressed')
    expect(
      table.addParameter({ kind: ParameterKind.Instance, targetId: 'c', defaultValue: true }).label,
    ).toBe('Included')
  })

  it('insists on a parameter key for a feature parameter', () => {
    const table = new ConfigurationTable()
    expect(() =>
      table.addParameter({
        kind: ParameterKind.FeatureParameter,
        targetId: 'feature-1',
        defaultValue: 5,
      }),
    ).toThrow(ConfigurationError)
  })

  it('rejects a duplicate column id', () => {
    const table = seededTable()
    expect(() =>
      table.addParameter({ id: 'depth', kind: ParameterKind.Suppression, targetId: 'x', defaultValue: false }),
    ).toThrow(/Duplicate parameter/)
  })

  it('drops a column together with its overrides', () => {
    const table = seededTable()
    const config = table.addConfiguration({ name: 'Tall' })
    table.setValue(config.id, 'depth', 40)

    expect(table.removeParameter('depth')).toBe(true)
    expect(table.removeParameter('depth')).toBe(false)
    expect(table.getConfiguration(config.id)?.values).toEqual({})
    expect(table.resolve(config.id)).not.toHaveProperty('depth')
  })
})

describe('configurations', () => {
  it('names rows and activates the first one', () => {
    const table = seededTable()
    const first = table.addConfiguration()
    const second = table.addConfiguration()
    expect(first.name).toBe('Configuration 1')
    expect(second.name).toBe('Configuration 2')
    expect(table.activeId).toBe(first.id)
    expect(table.length).toBe(2)
  })

  it('skips names that are already taken', () => {
    const table = seededTable()
    table.addConfiguration({ name: 'Configuration 1' })
    expect(table.addConfiguration().name).toBe('Configuration 2')
  })

  it('rejects a duplicate id and an unknown parent', () => {
    const table = seededTable()
    const config = table.addConfiguration({ id: 'base' })
    expect(() => table.addConfiguration({ id: 'base' })).toThrow(/Duplicate configuration/)
    expect(() => table.addConfiguration({ parentId: 'ghost' })).toThrow(/inherit from/)
    expect(config.parentId).toBeNull()
  })

  it('renames and describes rows', () => {
    const table = seededTable()
    const config = table.addConfiguration()
    expect(table.rename(config.id, '  Large  ')).toBe(true)
    expect(table.getConfiguration(config.id)?.name).toBe('Large')
    expect(table.rename(config.id, '   ')).toBe(false)
    expect(table.rename('ghost', 'x')).toBe(false)

    expect(table.describe(config.id, 'The big one')).toBe(true)
    expect(table.getConfiguration(config.id)?.description).toBe('The big one')
    expect(table.describe('ghost', 'x')).toBe(false)
  })

  it('activates a row that exists', () => {
    const table = seededTable()
    const first = table.addConfiguration()
    const second = table.addConfiguration()
    expect(table.activate(second.id)).toBe(true)
    expect(table.activeId).toBe(second.id)
    expect(table.activate('ghost')).toBe(false)
    expect(table.activeId).toBe(second.id)
    expect(first.id).not.toBe(second.id)
  })

  it('requires a configuration when asked to', () => {
    const table = seededTable()
    expect(() => table.requireConfiguration('ghost')).toThrow(ConfigurationError)
  })

  it('removes a row and re-parents its children', () => {
    const table = seededTable()
    const base = table.addConfiguration({ name: 'Base' })
    const middle = table.derive(base.id, 'Middle')
    const leaf = table.derive(middle.id, 'Leaf')

    expect(table.removeConfiguration(middle.id)).toBe(true)
    expect(table.getConfiguration(leaf.id)?.parentId).toBe(base.id)
    expect(table.removeConfiguration('ghost')).toBe(false)
  })

  it('moves the active row when the active one is removed', () => {
    const table = seededTable()
    const first = table.addConfiguration()
    const second = table.addConfiguration()
    table.removeConfiguration(first.id)
    expect(table.activeId).toBe(second.id)

    table.removeConfiguration(second.id)
    expect(table.activeId).toBeNull()
  })
})

describe('derived configurations', () => {
  it('starts identical to its parent and diverges on edit', () => {
    const table = seededTable()
    const base = table.addConfiguration({ name: 'Base' })
    table.setValue(base.id, 'depth', 30)

    const derived = table.derive(base.id, 'Deep')
    expect(table.resolve(derived.id).depth).toBe(30)

    table.setValue(derived.id, 'depth', 60)
    expect(table.resolve(derived.id).depth).toBe(60)
    expect(table.resolve(base.id).depth).toBe(30)
  })

  it('inherits through several levels, nearest override winning', () => {
    const table = seededTable()
    const base = table.addConfiguration({ name: 'Base' })
    table.setValue(base.id, 'depth', 10)
    const middle = table.derive(base.id)
    table.setValue(middle.id, 'hole', true)
    const leaf = table.derive(middle.id)
    table.setValue(leaf.id, 'depth', 99)

    expect(table.resolve(leaf.id)).toEqual({ depth: 99, hole: true })
    expect(table.inheritanceChain(leaf.id).map((entry) => entry.id)).toEqual([
      leaf.id,
      middle.id,
      base.id,
    ])
  })

  it('lists the descendants of a row', () => {
    const table = seededTable()
    const base = table.addConfiguration()
    const middle = table.derive(base.id)
    const leaf = table.derive(middle.id)
    const sibling = table.addConfiguration()

    expect(table.descendantsOf(base.id).map((entry) => entry.id)).toEqual([middle.id, leaf.id])
    expect(table.descendantsOf(sibling.id)).toEqual([])
  })

  it('derives from a row that must exist', () => {
    expect(() => seededTable().derive('ghost')).toThrow(ConfigurationError)
  })
})

describe('cells', () => {
  it('falls back to the column default when nothing is set', () => {
    const table = seededTable()
    const config = table.addConfiguration()
    expect(table.resolve(config.id)).toEqual({ depth: 10, hole: false })
    expect(table.resolveValue(config.id, 'depth')).toBe(10)
  })

  it('reports whether a cell is overridden here or inherited', () => {
    const table = seededTable()
    const base = table.addConfiguration()
    table.setValue(base.id, 'depth', 20)
    const derived = table.derive(base.id)

    expect(table.isOverridden(base.id, 'depth')).toBe(true)
    expect(table.isOverridden(derived.id, 'depth')).toBe(false)
    expect(table.resolve(derived.id).depth).toBe(20)
  })

  it('clears an override so the cell inherits again', () => {
    const table = seededTable()
    const base = table.addConfiguration()
    table.setValue(base.id, 'depth', 20)
    const derived = table.derive(base.id)
    table.setValue(derived.id, 'depth', 50)

    expect(table.clearValue(derived.id, 'depth')).toBe(true)
    expect(table.resolve(derived.id).depth).toBe(20)
    expect(table.clearValue(derived.id, 'depth')).toBe(false)
    expect(table.clearValue('ghost', 'depth')).toBe(false)
  })

  it('refuses a cell whose row or column is unknown', () => {
    const table = seededTable()
    const config = table.addConfiguration()
    expect(table.setValue('ghost', 'depth', 1)).toBe(false)
    expect(table.setValue(config.id, 'ghost', 1)).toBe(false)
  })

  it('resolves an unknown configuration to the defaults only', () => {
    expect(seededTable().resolve('ghost')).toEqual({ depth: 10, hole: false })
  })

  it('ignores overrides of a column that no longer exists', () => {
    const table = seededTable()
    const config = table.addConfiguration({ values: { ghost: 5 } })
    expect(table.resolve(config.id)).toEqual({ depth: 10, hole: false })
  })

  it('renders the whole grid', () => {
    const table = seededTable()
    const base = table.addConfiguration({ name: 'Base' })
    table.setValue(base.id, 'depth', 15)
    table.derive(base.id, 'Derived')

    const rows = table.rows()
    expect(rows).toHaveLength(2)
    expect(rows[0]?.configuration.name).toBe('Base')
    expect(rows[1]?.values.depth).toBe(15)
  })
})

describe('serialization', () => {
  it('round-trips through JSON', () => {
    const table = seededTable()
    const base = table.addConfiguration({ name: 'Base', description: 'Stock' })
    table.setValue(base.id, 'depth', 30)
    const derived = table.derive(base.id, 'Deep')
    table.setValue(derived.id, 'hole', true)
    table.activate(derived.id)

    const restored = ConfigurationTable.fromJSON(table.toJSON())
    expect(restored.toJSON()).toEqual(table.toJSON())
    expect(restored.activeId).toBe(derived.id)
    expect(restored.resolve(derived.id)).toEqual({ depth: 30, hole: true })
  })

  it('reads rows whose parent comes later in the file', () => {
    const table = seededTable()
    const json = {
      parameters: table.toJSON().parameters,
      configurations: [
        { id: 'child', name: 'Child', description: '', parentId: 'parent', values: { depth: 5 } },
        { id: 'parent', name: 'Parent', description: '', parentId: null, values: { hole: true } },
      ],
      activeId: 'child',
    }
    const restored = ConfigurationTable.fromJSON(json)
    expect(restored.resolve('child')).toEqual({ depth: 5, hole: true })
  })

  it('drops a column of an unknown kind and a duplicate id', () => {
    const restored = ConfigurationTable.fromJSON({
      parameters: [
        { id: 'a', label: 'A', kind: 'dimension', targetId: 't', defaultValue: 1 },
        { id: 'a', label: 'Again', kind: 'dimension', targetId: 't', defaultValue: 2 },
        {
          id: 'b',
          label: 'B',
          kind: 'nonsense' as never,
          targetId: 't',
          defaultValue: 3,
        },
      ],
      configurations: [],
      activeId: null,
    })
    expect(restored.parameters.map((parameter) => parameter.id)).toEqual(['a'])
    expect(restored.getParameter('a')?.label).toBe('A')
  })

  it('keeps a row whose parent is missing, as a root', () => {
    const restored = ConfigurationTable.fromJSON({
      parameters: [],
      configurations: [{ id: 'orphan', name: 'Orphan', description: '', parentId: 'gone', values: {} }],
      activeId: 'gone',
    })
    expect(restored.getConfiguration('orphan')?.parentId).toBeNull()
    expect(restored.activeId).toBe('orphan')
  })

  it('clones without sharing state', () => {
    const table = seededTable()
    const config = table.addConfiguration()
    const clone = table.clone()
    clone.setValue(config.id, 'depth', 999)

    expect(table.resolve(config.id).depth).toBe(10)
    expect(clone.resolve(config.id).depth).toBe(999)
  })
})
