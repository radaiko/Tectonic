/**
 * Custom properties: the free-form metadata a document hangs off its parts,
 * assemblies, features and bodies.
 *
 * Two things live here. A {@link PropertySet} is the bag of values on one
 * entity, and a {@link PropertySchema} is the document-wide agreement about
 * what those names mean — the type a value should be, whether it is required,
 * and which values are allowed. The schema is advisory: a set will happily hold
 * a property the schema never heard of, because a file written by a later build
 * is worth more read than rejected. `validate` is what turns the disagreement
 * into something the UI can show.
 *
 * Values are typed rather than stringly-typed so a number property sorts and a
 * date property formats, and the JSON form carries the type alongside the value
 * so `Date` survives the round trip that `JSON.stringify` alone would flatten.
 */

export const PROPERTY_TYPES = ['string', 'number', 'boolean', 'date', 'list'] as const

export type PropertyType = (typeof PROPERTY_TYPES)[number]

/** Anything a property can hold. `list` is a list of strings. */
export type PropertyValue = string | number | boolean | Date | readonly string[]

export interface PropertyDefinition {
  readonly name: string
  readonly type: PropertyType
  /** Written into a set by `applyDefaults` when the property is absent. */
  readonly defaultValue?: PropertyValue
  /** Restricts a string or list property to a fixed vocabulary. */
  readonly allowedValues?: readonly string[]
  readonly required?: boolean
  /** Shown instead of `name` in the editor. */
  readonly label?: string
  readonly description?: string
}

/** The JSON shape of one property: its type, then its value. */
export interface PropertyEntryJSON {
  readonly type: PropertyType
  readonly value: string | number | boolean | readonly string[]
}

export type PropertySetJSON = Readonly<Record<string, PropertyEntryJSON>>

export function isPropertyType(value: unknown): value is PropertyType {
  return (PROPERTY_TYPES as readonly string[]).includes(value as string)
}

/** The type a runtime value would be stored as, or null if it is not storable. */
export function propertyTypeOf(value: unknown): PropertyType | null {
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return Number.isFinite(value) ? 'number' : null
  if (typeof value === 'boolean') return 'boolean'
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : 'date'
  if (Array.isArray(value)) {
    return value.every((entry) => typeof entry === 'string') ? 'list' : null
  }
  return null
}

export function isPropertyValue(value: unknown): value is PropertyValue {
  return propertyTypeOf(value) !== null
}

/** A property value as text, for grids, BOM columns and title blocks. */
export function formatPropertyValue(value: PropertyValue): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

/**
 * Reads text typed into the editor as the requested type. Returns null when the
 * text cannot be that type, which is what keeps a half-typed number out of the
 * set rather than storing `NaN`.
 */
export function parsePropertyValue(type: PropertyType, text: string): PropertyValue | null {
  switch (type) {
    case 'string':
      return text
    case 'number': {
      if (text.trim() === '') return null
      const parsed = Number(text)
      return Number.isFinite(parsed) ? parsed : null
    }
    case 'boolean': {
      const normalized = text.trim().toLowerCase()
      if (['true', 'yes', '1', 'on'].includes(normalized)) return true
      if (['false', 'no', '0', 'off', ''].includes(normalized)) return false
      return null
    }
    case 'date': {
      const parsed = new Date(text)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }
    case 'list':
      return text
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry !== '')
  }
}

/** Properties on one entity. Insertion order is preserved, as a Map's is. */
export class PropertySet {
  readonly #values = new Map<string, PropertyValue>()

  constructor(entries: Iterable<readonly [string, PropertyValue]> = []) {
    for (const [name, value] of entries) this.set(name, value)
  }

  get size(): number {
    return this.#values.size
  }

  get isEmpty(): boolean {
    return this.#values.size === 0
  }

  has(name: string): boolean {
    return this.#values.has(name)
  }

  get(name: string): PropertyValue | undefined {
    return this.#values.get(name)
  }

  getString(name: string, fallback = ''): string {
    const value = this.#values.get(name)
    return value === undefined ? fallback : formatPropertyValue(value)
  }

  getNumber(name: string, fallback = 0): number {
    const value = this.#values.get(name)
    return typeof value === 'number' ? value : fallback
  }

  getBoolean(name: string, fallback = false): boolean {
    const value = this.#values.get(name)
    return typeof value === 'boolean' ? value : fallback
  }

  getDate(name: string): Date | null {
    const value = this.#values.get(name)
    return value instanceof Date ? value : null
  }

  getList(name: string): readonly string[] {
    const value = this.#values.get(name)
    return Array.isArray(value) ? value : []
  }

  /** Stores a value. Values this build cannot represent are ignored. */
  set(name: string, value: PropertyValue): this {
    if (name === '') return this
    if (!isPropertyValue(value)) return this
    this.#values.set(name, Array.isArray(value) ? [...value] : value)
    return this
  }

  delete(name: string): boolean {
    return this.#values.delete(name)
  }

  clear(): void {
    this.#values.clear()
  }

  /** Property names in insertion order. */
  names(): string[] {
    return [...this.#values.keys()]
  }

  entries(): [string, PropertyValue][] {
    return [...this.#values.entries()]
  }

  /** The type each stored value actually has. */
  typeOf(name: string): PropertyType | null {
    const value = this.#values.get(name)
    return value === undefined ? null : propertyTypeOf(value)
  }

  /** This set with `other` written over it — `other` wins on a clash. */
  merge(other: PropertySet): PropertySet {
    const merged = this.clone()
    for (const [name, value] of other.entries()) merged.set(name, value)
    return merged
  }

  clone(): PropertySet {
    return new PropertySet(this.entries())
  }

  toJSON(): PropertySetJSON {
    const json: Record<string, PropertyEntryJSON> = {}
    for (const [name, value] of this.#values) {
      const type = propertyTypeOf(value) as PropertyType
      json[name] = {
        type,
        value: value instanceof Date ? value.toISOString() : (value as PropertyEntryJSON['value']),
      }
    }
    return json
  }

  /** Reads a set back, skipping entries this build cannot make sense of. */
  static fromJSON(value: unknown): PropertySet {
    const set = new PropertySet()
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return set

    for (const [name, entry] of Object.entries(value as Record<string, unknown>)) {
      const parsed = entryFromJSON(entry)
      if (parsed !== null) set.set(name, parsed)
    }
    return set
  }
}

function entryFromJSON(value: unknown): PropertyValue | null {
  // A bare value — what a hand-edited file is likely to carry — is read at face
  // value; the tagged form is what this build writes.
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return isPropertyValue(value) ? value : null
  }
  if (Array.isArray(value)) {
    return value.every((item) => typeof item === 'string') ? (value as string[]) : null
  }
  if (typeof value !== 'object' || value === null) return null

  const candidate = value as Record<string, unknown>
  if (!isPropertyType(candidate.type)) return null
  const raw = candidate.value

  if (candidate.type === 'date') {
    if (typeof raw !== 'string') return null
    const date = new Date(raw)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (candidate.type === 'list') {
    if (!Array.isArray(raw)) return null
    return raw.every((item) => typeof item === 'string') ? (raw as string[]) : null
  }
  return propertyTypeOf(raw) === candidate.type ? (raw as PropertyValue) : null
}

export type PropertyIssueKind = 'missing' | 'wrong-type' | 'not-allowed'

export interface PropertyIssue {
  readonly property: string
  readonly kind: PropertyIssueKind
  readonly message: string
}

export interface PropertySchemaJSON {
  readonly definitions: readonly PropertyDefinition[]
}

/**
 * The document's property schema. Definitions are keyed by name, so redefining
 * a property replaces it rather than shadowing it.
 */
export class PropertySchema {
  readonly #definitions = new Map<string, PropertyDefinition>()

  constructor(definitions: readonly PropertyDefinition[] = []) {
    for (const definition of definitions) this.define(definition)
  }

  get size(): number {
    return this.#definitions.size
  }

  get definitions(): PropertyDefinition[] {
    return [...this.#definitions.values()]
  }

  define(definition: PropertyDefinition): this {
    if (definition.name === '' || !isPropertyType(definition.type)) return this
    this.#definitions.set(definition.name, definition)
    return this
  }

  get(name: string): PropertyDefinition | undefined {
    return this.#definitions.get(name)
  }

  remove(name: string): boolean {
    return this.#definitions.delete(name)
  }

  /** Every definition that carries a default, written into a copy of `set`. */
  applyDefaults(set: PropertySet): PropertySet {
    const filled = set.clone()
    for (const definition of this.#definitions.values()) {
      if (definition.defaultValue === undefined) continue
      if (filled.has(definition.name)) continue
      filled.set(definition.name, definition.defaultValue)
    }
    return filled
  }

  /**
   * What is wrong with a set, in definition order: required properties that are
   * absent, values of the wrong type, and values outside a fixed vocabulary.
   * Properties the schema never declared are not an issue — extra metadata is
   * the point of custom properties.
   */
  validate(set: PropertySet): PropertyIssue[] {
    const issues: PropertyIssue[] = []

    for (const definition of this.#definitions.values()) {
      const value = set.get(definition.name)

      if (value === undefined) {
        if (definition.required === true) {
          issues.push({
            property: definition.name,
            kind: 'missing',
            message: `"${definition.name}" is required`,
          })
        }
        continue
      }

      if (propertyTypeOf(value) !== definition.type) {
        issues.push({
          property: definition.name,
          kind: 'wrong-type',
          message: `"${definition.name}" should be a ${definition.type}`,
        })
        continue
      }

      const allowed = definition.allowedValues
      if (allowed === undefined || allowed.length === 0) continue

      const offenders = Array.isArray(value)
        ? value.filter((entry) => !allowed.includes(entry))
        : allowed.includes(formatPropertyValue(value))
          ? []
          : [formatPropertyValue(value)]

      if (offenders.length > 0) {
        issues.push({
          property: definition.name,
          kind: 'not-allowed',
          message: `"${definition.name}" does not allow ${offenders.join(', ')}`,
        })
      }
    }
    return issues
  }

  toJSON(): PropertySchemaJSON {
    return { definitions: this.definitions }
  }

  static fromJSON(value: unknown): PropertySchema {
    const schema = new PropertySchema()
    if (typeof value !== 'object' || value === null) return schema
    const candidate = value as Record<string, unknown>
    const list = Array.isArray(candidate.definitions) ? candidate.definitions : []

    for (const entry of list) {
      if (typeof entry !== 'object' || entry === null) continue
      const definition = entry as Record<string, unknown>
      if (typeof definition.name !== 'string' || !isPropertyType(definition.type)) continue
      schema.define(definition as unknown as PropertyDefinition)
    }
    return schema
  }
}

export type PropertyStoreJSON = Readonly<Record<string, PropertySetJSON>>

/**
 * Every entity's properties in one place, keyed by entity id.
 *
 * Properties live beside the model rather than inside each entity so a body
 * rebuilt by the feature tree does not lose the metadata someone typed against
 * it, and so the whole lot serialises as one object in the .tectonic file.
 */
export class PropertyStore {
  readonly #sets = new Map<string, PropertySet>()

  get size(): number {
    return this.#sets.size
  }

  /** The entity's set, created empty on first access so callers can just write. */
  for(entityId: string): PropertySet {
    const existing = this.#sets.get(entityId)
    if (existing) return existing
    const created = new PropertySet()
    this.#sets.set(entityId, created)
    return created
  }

  /** The entity's set, or undefined when nothing was ever written for it. */
  peek(entityId: string): PropertySet | undefined {
    return this.#sets.get(entityId)
  }

  set(entityId: string, properties: PropertySet): this {
    this.#sets.set(entityId, properties)
    return this
  }

  remove(entityId: string): boolean {
    return this.#sets.delete(entityId)
  }

  entityIds(): string[] {
    return [...this.#sets.keys()]
  }

  /** Every entity carrying `name`, with the value each gave it. */
  findByProperty(name: string): { entityId: string; value: PropertyValue }[] {
    const found: { entityId: string; value: PropertyValue }[] = []
    for (const [entityId, set] of this.#sets) {
      const value = set.get(name)
      if (value !== undefined) found.push({ entityId, value })
    }
    return found
  }

  /** Empty sets are dropped rather than written as `{}` noise. */
  toJSON(): PropertyStoreJSON {
    const json: Record<string, PropertySetJSON> = {}
    for (const [entityId, set] of this.#sets) {
      if (set.isEmpty) continue
      json[entityId] = set.toJSON()
    }
    return json
  }

  static fromJSON(value: unknown): PropertyStore {
    const store = new PropertyStore()
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return store

    for (const [entityId, entry] of Object.entries(value as Record<string, unknown>)) {
      store.set(entityId, PropertySet.fromJSON(entry))
    }
    return store
  }
}
