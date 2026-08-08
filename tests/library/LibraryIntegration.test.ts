import { describe, expect, it } from 'vitest'
import { AssemblyTree } from '../../src/assembly/AssemblyTree'
import { billOfMaterials } from '../../src/assembly/AssemblyFeatures'
import { StubKernel } from '../../src/kernel/StubKernel'
import {
  LibraryCatalog,
  LibraryPart,
  configurationFamily,
  familyParts,
  insertStandardPart,
  instancesOf,
  refreshInstances,
  sizeOfConfiguration,
} from '../../src/library/LibraryIntegration'
import { requireFamily } from '../../src/library/StandardParts'
import { LibraryError } from '../../src/library/types'

describe('LibraryPart', () => {
  it('names itself after the family and size it was chosen from', () => {
    const bolt = new LibraryPart({ familyId: 'hex-bolt', size: 'M8' })

    expect(bolt.name).toBe('Hex head bolt M8')
    expect(bolt.material).toBe('Steel')
    expect(bolt.values.diameter).toBe(8)
    expect(bolt.mass).toBeGreaterThan(0)
  })

  it('takes an override away from the catalogue row', () => {
    const bolt = new LibraryPart({ familyId: 'hex-bolt', size: 'M8', overrides: { length: 80 } })

    expect(bolt.values.length).toBe(80)
    expect(bolt.mass).toBeGreaterThan(new LibraryPart({ familyId: 'hex-bolt', size: 'M8' }).mass)
  })

  it('refuses an unknown family, size or parameter at the point it is chosen', () => {
    expect(() => new LibraryPart({ familyId: 'nope', size: 'M8' })).toThrow(LibraryError)
    expect(() => new LibraryPart({ familyId: 'hex-bolt', size: 'M7' })).toThrow(/no size/i)
    expect(
      () => new LibraryPart({ familyId: 'hex-bolt', size: 'M8', overrides: { nope: 1 } }),
    ).toThrow(/no parameter/i)
  })

  it('bounds the part about its own axis, head above and shank below', () => {
    const bounds = new LibraryPart({ familyId: 'hex-bolt', size: 'M10' }).bounds()

    expect(bounds.min.z).toBe(-50)
    expect(bounds.max.z).toBeCloseTo(6.4, 6)
    expect(bounds.max.x).toBeCloseTo(-bounds.min.x, 9)
  })

  it('describes itself to the assembly without any geometry', () => {
    const definition = new LibraryPart({ familyId: 'flat-washer', size: 'M6' }).definition()

    expect(definition).toMatchObject({ name: 'Flat washer M6', material: 'Steel' })
    expect(definition.mass).toBeGreaterThan(0)
  })

  it('round-trips through JSON', () => {
    const bolt = new LibraryPart({
      familyId: 'socket-head-cap-screw',
      size: 'M6',
      overrides: { length: 45 },
      material: 'A2 stainless',
    })
    const copy = LibraryPart.fromJSON(bolt.toJSON())

    expect(copy.toJSON()).toEqual(bolt.toJSON())
    expect(copy.mass).toBeCloseTo(bolt.mass, 12)
  })

  it('builds through the kernel', async () => {
    const kernel = new StubKernel()
    await kernel.init()

    const shape = await new LibraryPart({ familyId: 'hex-nut', size: 'M12' }).build(kernel)
    expect((await kernel.triangulate(shape)).indices.length).toBeGreaterThan(0)
  })
})

describe('LibraryCatalog', () => {
  it('reuses one definition for the same family, size and overrides', () => {
    const catalog = new LibraryCatalog()
    const first = catalog.use('hex-bolt', 'M8')
    const again = catalog.use('hex-bolt', 'M8')

    expect(again).toBe(first)
    expect(catalog.length).toBe(1)
  })

  it('keeps a differently overridden part apart', () => {
    const catalog = new LibraryCatalog()
    catalog.use('hex-bolt', 'M8')
    catalog.use('hex-bolt', 'M8', { length: 60 })

    expect(catalog.length).toBe(2)
  })

  it('refuses a duplicate id and reports a missing one', () => {
    const catalog = new LibraryCatalog()
    const part = catalog.use('hex-nut', 'M6')

    expect(() => catalog.add(part)).toThrow(/duplicate/i)
    expect(catalog.get('nope')).toBeUndefined()
    expect(() => catalog.require('nope')).toThrow(LibraryError)
  })

  it('removes a part and says whether it was there', () => {
    const catalog = new LibraryCatalog()
    const part = catalog.use('hex-nut', 'M6')

    expect(catalog.remove(part.id)).toBe(true)
    expect(catalog.remove(part.id)).toBe(false)
  })

  it('exposes itself as the assembly part catalogue', () => {
    const catalog = new LibraryCatalog()
    const part = catalog.use('flat-washer', 'M10')
    const map = catalog.toPartCatalog()

    expect(map.get(part.id)?.name).toBe('Flat washer M10')
    expect(map.size).toBe(1)
  })

  it('round-trips through JSON', () => {
    const catalog = new LibraryCatalog()
    catalog.use('hex-bolt', 'M8')
    catalog.use('hex-nut', 'M8')

    expect(LibraryCatalog.fromJSON(catalog.toJSON()).toJSON()).toEqual(catalog.toJSON())
  })
})

describe('inserting into an assembly', () => {
  it('places one component per instance, all sharing a definition', () => {
    const tree = new AssemblyTree()
    const catalog = new LibraryCatalog()
    const { part, components } = insertStandardPart(tree, catalog, {
      familyId: 'hex-bolt',
      size: 'M8',
      quantity: 4,
    })

    expect(components).toHaveLength(4)
    expect(catalog.length).toBe(1)
    expect(tree.length).toBe(4)
    for (const component of components) expect(component.partId).toBe(part.id)
  })

  it('defaults to a single instance at the top level', () => {
    const tree = new AssemblyTree()
    const { components } = insertStandardPart(tree, new LibraryCatalog(), {
      familyId: 'hex-nut',
      size: 'M8',
    })

    expect(components).toHaveLength(1)
    expect(components[0]?.parentId).toBeNull()
    expect(components[0]?.mass).toBeGreaterThan(0)
  })

  it('places into a sub-assembly when asked', () => {
    const tree = new AssemblyTree()
    const sub = tree.addComponent({ kind: 'sub-assembly', name: 'Bracket' })
    const { components } = insertStandardPart(tree, new LibraryCatalog(), {
      familyId: 'flat-washer',
      size: 'M6',
      parentId: sub.id,
      name: 'Shim',
    })

    expect(components[0]?.parentId).toBe(sub.id)
    expect(components[0]?.name).toBe('Shim')
  })

  it('feeds the assembly bill of materials', () => {
    const tree = new AssemblyTree()
    const catalog = new LibraryCatalog()
    insertStandardPart(tree, catalog, { familyId: 'hex-bolt', size: 'M8', quantity: 6 })
    insertStandardPart(tree, catalog, { familyId: 'hex-nut', size: 'M8', quantity: 6 })

    const bom = billOfMaterials(tree, catalog.toPartCatalog())
    expect(bom).toHaveLength(2)
    for (const entry of bom) expect(entry.quantity).toBe(6)
  })
})

describe('resizing a part', () => {
  it('moves every instance to the new size at once', () => {
    const tree = new AssemblyTree()
    const catalog = new LibraryCatalog()
    const { part } = insertStandardPart(tree, catalog, {
      familyId: 'hex-bolt',
      size: 'M8',
      quantity: 3,
    })
    const before = part.mass

    catalog.resize(part.id, 'M16')
    const refreshed = refreshInstances(tree, catalog, part.id)

    expect(part.name).toBe('Hex head bolt M16')
    expect(part.mass).toBeGreaterThan(before)
    expect(refreshed).toHaveLength(3)
    for (const component of refreshed) expect(component.mass).toBeCloseTo(part.mass, 12)
  })

  it('takes new overrides along with the size', () => {
    const catalog = new LibraryCatalog()
    const part = catalog.use('hex-bolt', 'M8', { length: 60 })

    catalog.resize(part.id, 'M10', { length: 90 })
    expect(part.values).toMatchObject({ diameter: 10, length: 90 })
  })

  it('refuses a size the family does not have', () => {
    const catalog = new LibraryCatalog()
    const part = catalog.use('hex-bolt', 'M8')

    expect(() => catalog.resize(part.id, 'M7')).toThrow(/no size/i)
    expect(part.size).toBe('M8')
  })

  it('lists the instances of a part', () => {
    const tree = new AssemblyTree()
    const catalog = new LibraryCatalog()
    const { part } = insertStandardPart(tree, catalog, {
      familyId: 'dowel-pin',
      size: '6×30',
      quantity: 2,
    })

    expect(instancesOf(tree, part.id)).toHaveLength(2)
    expect(instancesOf(tree, 'nope')).toHaveLength(0)
  })
})

describe('configurationFamily', () => {
  const family = requireFamily('hex-bolt')
  const table = configurationFamily(family)

  it('gives every parameter a column and every size a row', () => {
    expect(table.parameters).toHaveLength(family.parameters.length)
    expect(table.configurations).toHaveLength(family.sizes.length)
    expect(table.activeId).toBe(table.configurations[0]?.id)
  })

  it('resolves a row back to the catalogue values', () => {
    const row = table.configurations.find((entry) => entry.name === 'M12')
    const diameter = table.parameters.find((column) => column.parameterKey === 'diameter')
    const resolved = table.resolve(row?.id ?? '')

    expect(resolved[diameter?.id ?? '']).toBe(12)
  })

  it('points its columns at the part it configures', () => {
    const targeted = configurationFamily(family, 'part-42')
    for (const column of targeted.parameters) expect(column.targetId).toBe('part-42')
  })

  it('reads a row back as the size it stands for', () => {
    const row = table.configurations.find((entry) => entry.name === 'M20')

    expect(sizeOfConfiguration(family, table, row?.id ?? '')).toBe('M20')
    expect(sizeOfConfiguration(family, table, 'nope')).toBeUndefined()
  })
})

describe('familyParts', () => {
  it('builds one part per catalogue size', () => {
    const parts = familyParts('ball-bearing')

    expect(parts).toHaveLength(requireFamily('ball-bearing').sizes.length)
    expect(parts.map((part) => part.size)).toContain('6204')
    expect(new Set(parts.map((part) => part.id)).size).toBe(parts.length)
  })
})
