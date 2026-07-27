import type { PartCatalog, PartDefinition } from '../assembly/AssemblyFeatures'
import { AssemblyComponent, AssemblyTree } from '../assembly/AssemblyTree'
import type { ComponentTransform } from '../assembly/Transform'
import { ConfigurationTable, ParameterKind } from '../config/ConfigurationTable'
import type { BoundingBox, IKernel, ShapeHandle } from '../kernel/IKernel'
import { newId } from '../sketch/domain/ids'
import type { PartFamily, PartSolid, PartValues } from './StandardParts'
import {
  buildStandardPart,
  partExtent,
  partMass,
  requireFamily,
  requireSize,
  resolveParameters,
} from './StandardParts'
import { LibraryError, STEEL_DENSITY } from './types'

export interface LibraryPartJSON {
  /** The id an assembly component points at — the part, not the instance. */
  readonly id: string
  readonly familyId: string
  readonly size: string
  /** Parameters set away from the catalogue row, e.g. a non-standard length. */
  readonly overrides: PartValues
  readonly name: string
  readonly material: string
  readonly density: number
}

export interface LibraryPartInit {
  readonly id?: string
  readonly familyId: string
  readonly size: string
  readonly overrides?: PartValues
  readonly name?: string
  readonly material?: string
  readonly density?: number
}

/**
 * A catalogue entry chosen down to a size: which family, which row, and any
 * parameter set away from it.
 *
 * The part is the *definition*, not a placement — every component in the
 * assembly that names this id shares it, which is what makes "change the size
 * and every instance follows" a one-line edit rather than a sweep of the tree.
 */
export class LibraryPart {
  readonly id: string
  readonly familyId: string
  size: string
  overrides: PartValues
  name: string
  material: string
  density: number

  constructor(init: LibraryPartInit) {
    const family = requireFamily(init.familyId)
    requireSize(family, init.size)

    this.id = init.id ?? newId()
    this.familyId = family.id
    this.size = init.size
    this.overrides = { ...(init.overrides ?? {}) }
    this.name = init.name ?? `${family.name} ${init.size}`
    this.material = init.material ?? 'Steel'
    this.density = init.density ?? STEEL_DENSITY

    // Rejects an unknown parameter or a non-number here, where the caller can
    // still see which override it came from.
    resolveParameters(family, this.size, this.overrides)
  }

  get family(): PartFamily {
    return requireFamily(this.familyId)
  }

  /** The catalogue row's values with the overrides applied. */
  get values(): PartValues {
    return resolveParameters(this.family, this.size, this.overrides)
  }

  solid(): PartSolid {
    return this.family.build(this.values)
  }

  /** Mass of one of these, in kilograms. */
  get mass(): number {
    return partMass(this.solid(), this.density)
  }

  /** Extent in the part's own space, for interference checks and layout. */
  bounds(): BoundingBox {
    const extent = partExtent(this.solid())
    return {
      min: { x: -extent.radius, y: -extent.radius, z: extent.min },
      max: { x: extent.radius, y: extent.radius, z: extent.max },
    }
  }

  /** What the assembly needs to know about the part, without the geometry. */
  definition(): PartDefinition {
    return {
      id: this.id,
      name: this.name,
      material: this.material,
      mass: this.mass,
      bounds: this.bounds(),
    }
  }

  build(kernel: IKernel): Promise<ShapeHandle> {
    return buildStandardPart(kernel, this.solid())
  }

  toJSON(): LibraryPartJSON {
    return {
      id: this.id,
      familyId: this.familyId,
      size: this.size,
      overrides: { ...this.overrides },
      name: this.name,
      material: this.material,
      density: this.density,
    }
  }

  static fromJSON(json: LibraryPartJSON): LibraryPart {
    return new LibraryPart(json)
  }
}

/* -------------------------------------------------------------------------- */
/* The document's set of library parts                                         */
/* -------------------------------------------------------------------------- */

export interface LibraryCatalogJSON {
  readonly parts: readonly LibraryPartJSON[]
}

/**
 * The library parts a document has actually used. Sits between the read-only
 * catalogue and the assembly: the catalogue says what an M8 hex bolt is, this
 * says which ones this document has, and the assembly places them.
 */
export class LibraryCatalog {
  #parts: LibraryPart[] = []

  get parts(): readonly LibraryPart[] {
    return this.#parts
  }

  get length(): number {
    return this.#parts.length
  }

  add(part: LibraryPart): LibraryPart {
    if (this.get(part.id)) throw new LibraryError(`Duplicate library part id ${part.id}`)
    this.#parts.push(part)
    return part
  }

  /**
   * The part for this family, size and overrides — reusing one that is already
   * in the document rather than adding a second definition of the same bolt.
   */
  use(familyId: string, size: string, overrides: PartValues = {}): LibraryPart {
    const existing = this.#parts.find(
      (part) =>
        part.familyId === familyId &&
        part.size.toLowerCase() === size.toLowerCase() &&
        sameValues(part.overrides, overrides),
    )
    return existing ?? this.add(new LibraryPart({ familyId, size, overrides }))
  }

  get(id: string): LibraryPart | undefined {
    return this.#parts.find((part) => part.id === id)
  }

  require(id: string): LibraryPart {
    const part = this.get(id)
    if (!part) throw new LibraryError(`No library part with id ${id}`)
    return part
  }

  remove(id: string): boolean {
    const before = this.#parts.length
    this.#parts = this.#parts.filter((part) => part.id !== id)
    return this.#parts.length !== before
  }

  /**
   * Moves a part to a different catalogue size. Every instance in every
   * assembly follows, because they all point at this same definition.
   */
  resize(id: string, size: string, overrides?: PartValues): LibraryPart {
    const part = this.require(id)
    const family = part.family
    requireSize(family, size)

    part.size = size
    if (overrides) part.overrides = { ...overrides }
    part.name = `${family.name} ${size}`
    // Re-resolves, so an override the new size does not accept is caught here.
    resolveParameters(family, part.size, part.overrides)
    return part
  }

  /** The read-only view the assembly's mass, BOM and interference code wants. */
  toPartCatalog(): PartCatalog {
    return new Map(this.#parts.map((part) => [part.id, part.definition()]))
  }

  toJSON(): LibraryCatalogJSON {
    return { parts: this.#parts.map((part) => part.toJSON()) }
  }

  static fromJSON(json: LibraryCatalogJSON): LibraryCatalog {
    const catalog = new LibraryCatalog()
    for (const part of json.parts) catalog.add(LibraryPart.fromJSON(part))
    return catalog
  }
}

function sameValues(a: PartValues, b: PartValues): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) if (a[key] !== b[key]) return false
  return true
}

/* -------------------------------------------------------------------------- */
/* Placing parts in an assembly                                                */
/* -------------------------------------------------------------------------- */

export interface InsertPartOptions {
  readonly familyId: string
  readonly size: string
  readonly overrides?: PartValues
  readonly name?: string
  /** Sub-assembly to drop it into. Defaults to the top level. */
  readonly parentId?: string | null
  readonly transform?: ComponentTransform
  /** How many instances to place. Defaults to one. */
  readonly quantity?: number
}

export interface InsertPartResult {
  readonly part: LibraryPart
  readonly components: readonly AssemblyComponent[]
}

/**
 * Drops a catalogue part into an assembly. Repeated inserts of the same size
 * share one definition, so a frame with forty M8 bolts carries one bolt and
 * forty placements.
 */
export function insertStandardPart(
  tree: AssemblyTree,
  catalog: LibraryCatalog,
  options: InsertPartOptions,
): InsertPartResult {
  const quantity = Math.max(1, Math.round(options.quantity ?? 1))
  const part = catalog.use(options.familyId, options.size, options.overrides ?? {})
  const components: AssemblyComponent[] = []

  for (let index = 0; index < quantity; index += 1) {
    components.push(
      tree.addComponent(
        new AssemblyComponent({
          kind: 'part',
          partId: part.id,
          name: options.name ?? part.name,
          material: part.material,
          mass: part.mass,
          ...(options.transform ? { transform: options.transform } : {}),
        }),
        options.parentId ?? null,
      ),
    )
  }
  return { part, components }
}

/** Every component in the assembly that places this library part. */
export function instancesOf(tree: AssemblyTree, partId: string): AssemblyComponent[] {
  return tree.components.filter((component) => component.partId === partId)
}

/**
 * Pushes a part's current size through to its placements. Only the cached mass
 * on each instance needs it — the geometry is rebuilt from the definition — but
 * a stale mass would quietly wrong the whole assembly's total.
 */
export function refreshInstances(
  tree: AssemblyTree,
  catalog: LibraryCatalog,
  partId: string,
): AssemblyComponent[] {
  const part = catalog.require(partId)
  const instances = instancesOf(tree, partId)
  for (const component of instances) {
    component.mass = part.mass
    component.material = part.material
  }
  return instances
}

/* -------------------------------------------------------------------------- */
/* Configurations                                                              */
/* -------------------------------------------------------------------------- */

/**
 * A family as a configuration table: one column per driven parameter, one row
 * per catalogue size. That is exactly what a configured part is in the rest of
 * the app, so a standard part and a user's own family of variants are edited,
 * stored and applied by the same code.
 */
export function configurationFamily(family: PartFamily, targetId = family.id): ConfigurationTable {
  const table = new ConfigurationTable()
  const columns = new Map<string, string>()

  for (const parameter of family.parameters) {
    const column = table.addParameter({
      label: parameter.label,
      kind: ParameterKind.FeatureParameter,
      targetId,
      parameterKey: parameter.key,
      defaultValue: family.sizes[0]?.values[parameter.key] ?? 0,
    })
    columns.set(parameter.key, column.id)
  }

  for (const size of family.sizes) {
    const values: Record<string, number> = {}
    for (const [key, columnId] of columns) {
      const cell = size.values[key]
      if (cell !== undefined) values[columnId] = cell
    }
    table.addConfiguration({ name: size.size, description: family.name, values })
  }
  return table
}

/** The catalogue size a configuration row stands for, so a table reads back. */
export function sizeOfConfiguration(
  family: PartFamily,
  table: ConfigurationTable,
  configurationId: string,
): string | undefined {
  const name = table.getConfiguration(configurationId)?.name
  return family.sizes.find((size) => size.size === name)?.size
}

/** Every size of a family, built as a part each — a full configuration family. */
export function familyParts(familyId: string): LibraryPart[] {
  const family = requireFamily(familyId)
  return family.sizes.map((size) => new LibraryPart({ familyId: family.id, size: size.size }))
}
