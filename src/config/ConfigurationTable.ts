import { newId } from '../sketch/domain/ids'

/**
 * What a configuration is allowed to change. Anything the feature tree or a
 * sketch can be driven by is expressible as one of these four kinds, which
 * keeps the table a flat grid rather than a tree of special cases.
 */
export const ParameterKind = {
  /** A driving dimension in a sketch, addressed by its constraint id. */
  Dimension: 'dimension',
  /** One key of a feature's parameters, e.g. an extrude's depth. */
  FeatureParameter: 'featureParameter',
  /** Whether a feature is suppressed. */
  Suppression: 'suppression',
  /** Whether an assembly component instance is included. */
  Instance: 'instance',
} as const

export type ParameterKind = (typeof ParameterKind)[keyof typeof ParameterKind]

export const PARAMETER_KINDS: readonly ParameterKind[] = Object.values(ParameterKind)

export type ConfigurationValue = string | number | boolean

export interface ConfigurationParameterJSON {
  readonly id: string
  readonly label: string
  readonly kind: ParameterKind
  /** Constraint, feature or component id the parameter drives. */
  readonly targetId: string
  /** Which key of a feature's parameters — only for `featureParameter`. */
  readonly parameterKey?: string
  /** Value used by any configuration that does not override it. */
  readonly defaultValue: ConfigurationValue
}

export type ConfigurationParameter = ConfigurationParameterJSON

export interface ConfigurationJSON {
  readonly id: string
  readonly name: string
  readonly description: string
  /** The configuration this one inherits from, or null for a root. */
  readonly parentId: string | null
  /** Overrides by parameter id. A missing key inherits. */
  readonly values: Readonly<Record<string, ConfigurationValue>>
}

export type Configuration = ConfigurationJSON

export interface ConfigurationTableJSON {
  readonly parameters: readonly ConfigurationParameterJSON[]
  readonly configurations: readonly ConfigurationJSON[]
  readonly activeId: string | null
}

export interface AddParameterOptions {
  readonly id?: string
  readonly label?: string
  readonly kind: ParameterKind
  readonly targetId: string
  readonly parameterKey?: string
  readonly defaultValue: ConfigurationValue
}

export interface AddConfigurationOptions {
  readonly id?: string
  readonly name?: string
  readonly description?: string
  readonly parentId?: string | null
  readonly values?: Readonly<Record<string, ConfigurationValue>>
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigurationError'
  }
}

/**
 * The variants table: rows are named configurations, columns are the parameters
 * they drive. A configuration may derive from another, overriding only the cells
 * it cares about, so a family of parts stays a handful of differences rather
 * than a full copy each.
 *
 * The table only *describes* the variants. Pushing a row into the model is
 * {@link applyConfiguration}'s job, which keeps this class free of any
 * dependency on the sketch, the feature tree or the assembly.
 */
export class ConfigurationTable {
  #parameters: ConfigurationParameter[] = []
  #configurations: Configuration[] = []
  #activeId: string | null = null

  get parameters(): readonly ConfigurationParameter[] {
    return this.#parameters
  }

  get configurations(): readonly Configuration[] {
    return this.#configurations
  }

  get activeId(): string | null {
    return this.#activeId
  }

  get length(): number {
    return this.#configurations.length
  }

  /* -------------------------------------------------------------------- */
  /* Columns                                                               */
  /* -------------------------------------------------------------------- */

  addParameter(options: AddParameterOptions): ConfigurationParameter {
    if (options.kind === ParameterKind.FeatureParameter && !options.parameterKey) {
      throw new ConfigurationError('A feature parameter column needs a parameterKey')
    }

    const id = options.id ?? newId()
    if (this.getParameter(id)) throw new ConfigurationError(`Duplicate parameter id ${id}`)

    const parameter: ConfigurationParameter = {
      id,
      label: options.label ?? defaultLabel(options),
      kind: options.kind,
      targetId: options.targetId,
      ...(options.parameterKey ? { parameterKey: options.parameterKey } : {}),
      defaultValue: options.defaultValue,
    }
    this.#parameters.push(parameter)
    return parameter
  }

  getParameter(id: string): ConfigurationParameter | undefined {
    return this.#parameters.find((parameter) => parameter.id === id)
  }

  /** Drops a column, together with every override of it. */
  removeParameter(id: string): boolean {
    const before = this.#parameters.length
    this.#parameters = this.#parameters.filter((parameter) => parameter.id !== id)
    if (this.#parameters.length === before) return false

    this.#configurations = this.#configurations.map((configuration) => {
      if (!(id in configuration.values)) return configuration
      const values = { ...configuration.values }
      delete values[id]
      return { ...configuration, values }
    })
    return true
  }

  /* -------------------------------------------------------------------- */
  /* Rows                                                                  */
  /* -------------------------------------------------------------------- */

  addConfiguration(options: AddConfigurationOptions = {}): Configuration {
    const id = options.id ?? newId()
    if (this.getConfiguration(id)) throw new ConfigurationError(`Duplicate configuration id ${id}`)

    const parentId = options.parentId ?? null
    if (parentId !== null && !this.getConfiguration(parentId)) {
      throw new ConfigurationError(`No configuration with id ${parentId} to inherit from`)
    }

    const configuration: Configuration = {
      id,
      name: options.name ?? this.#nextName(),
      description: options.description ?? '',
      parentId,
      values: { ...(options.values ?? {}) },
    }
    this.#configurations.push(configuration)
    // The first row becomes active, so a table is never left with nothing selected.
    if (this.#activeId === null) this.#activeId = id
    return configuration
  }

  getConfiguration(id: string): Configuration | undefined {
    return this.#configurations.find((configuration) => configuration.id === id)
  }

  requireConfiguration(id: string): Configuration {
    const configuration = this.getConfiguration(id)
    if (!configuration) throw new ConfigurationError(`No configuration with id ${id}`)
    return configuration
  }

  /**
   * A new configuration that inherits from `id` — the derived-configuration
   * command. It starts with no overrides, so it is identical to its parent until
   * a cell is edited.
   */
  derive(id: string, name?: string): Configuration {
    const parent = this.requireConfiguration(id)
    return this.addConfiguration({
      parentId: parent.id,
      ...(name === undefined ? {} : { name }),
    })
  }

  /** Removes a row. Children are re-parented onto its parent, keeping their overrides. */
  removeConfiguration(id: string): boolean {
    const doomed = this.getConfiguration(id)
    if (!doomed) return false

    this.#configurations = this.#configurations
      .filter((configuration) => configuration.id !== id)
      .map((configuration) =>
        configuration.parentId === id
          ? { ...configuration, parentId: doomed.parentId }
          : configuration,
      )

    if (this.#activeId === id) this.#activeId = this.#configurations[0]?.id ?? null
    return true
  }

  rename(id: string, name: string): boolean {
    const configuration = this.getConfiguration(id)
    if (!configuration || name.trim().length === 0) return false
    this.#replace({ ...configuration, name: name.trim() })
    return true
  }

  describe(id: string, description: string): boolean {
    const configuration = this.getConfiguration(id)
    if (!configuration) return false
    this.#replace({ ...configuration, description })
    return true
  }

  activate(id: string): boolean {
    if (!this.getConfiguration(id)) return false
    this.#activeId = id
    return true
  }

  /* -------------------------------------------------------------------- */
  /* Cells                                                                 */
  /* -------------------------------------------------------------------- */

  setValue(configurationId: string, parameterId: string, value: ConfigurationValue): boolean {
    const configuration = this.getConfiguration(configurationId)
    if (!configuration || !this.getParameter(parameterId)) return false
    this.#replace({
      ...configuration,
      values: { ...configuration.values, [parameterId]: value },
    })
    return true
  }

  /** Clears an override so the cell inherits again. */
  clearValue(configurationId: string, parameterId: string): boolean {
    const configuration = this.getConfiguration(configurationId)
    if (!configuration || !(parameterId in configuration.values)) return false
    const values = { ...configuration.values }
    delete values[parameterId]
    this.#replace({ ...configuration, values })
    return true
  }

  /** Whether a cell is set on this row itself rather than inherited. */
  isOverridden(configurationId: string, parameterId: string): boolean {
    return parameterId in (this.getConfiguration(configurationId)?.values ?? {})
  }

  /**
   * Every parameter's value for a configuration, walking up the inheritance
   * chain and falling back to the column default. A cycle in the chain — which
   * only a corrupt file can produce — stops at the first repeat rather than
   * hanging.
   */
  resolve(configurationId: string): Record<string, ConfigurationValue> {
    const chain = this.inheritanceChain(configurationId)
    const resolved: Record<string, ConfigurationValue> = {}

    for (const parameter of this.#parameters) {
      resolved[parameter.id] = parameter.defaultValue
    }
    // Walk root-first so the nearest override wins.
    for (const configuration of [...chain].reverse()) {
      for (const [parameterId, value] of Object.entries(configuration.values)) {
        if (this.getParameter(parameterId)) resolved[parameterId] = value
      }
    }
    return resolved
  }

  /** One parameter's effective value for a configuration. */
  resolveValue(configurationId: string, parameterId: string): ConfigurationValue | undefined {
    return this.resolve(configurationId)[parameterId]
  }

  /** The configuration and its ancestors, nearest first. */
  inheritanceChain(configurationId: string): Configuration[] {
    const chain: Configuration[] = []
    const seen = new Set<string>()
    let current = this.getConfiguration(configurationId)

    while (current && !seen.has(current.id)) {
      seen.add(current.id)
      chain.push(current)
      current = current.parentId ? this.getConfiguration(current.parentId) : undefined
    }
    return chain
  }

  /** Configurations that inherit from `id`, directly or through another row. */
  descendantsOf(id: string): Configuration[] {
    return this.#configurations.filter((configuration) =>
      this.inheritanceChain(configuration.id)
        .slice(1)
        .some((ancestor) => ancestor.id === id),
    )
  }

  /** The table as a grid, ready for the panel to render. */
  rows(): { readonly configuration: Configuration; readonly values: Record<string, ConfigurationValue> }[] {
    return this.#configurations.map((configuration) => ({
      configuration,
      values: this.resolve(configuration.id),
    }))
  }

  /* -------------------------------------------------------------------- */

  toJSON(): ConfigurationTableJSON {
    return {
      parameters: this.#parameters.map((parameter) => ({ ...parameter })),
      configurations: this.#configurations.map((configuration) => ({
        ...configuration,
        values: { ...configuration.values },
      })),
      activeId: this.#activeId,
    }
  }

  static fromJSON(json: ConfigurationTableJSON): ConfigurationTable {
    const table = new ConfigurationTable()
    // Columns are taken as written rather than re-validated: a file is worth
    // more read with a broken column — which apply-time reports and skips —
    // than rejected outright.
    for (const parameter of json.parameters) {
      if (!PARAMETER_KINDS.includes(parameter.kind) || table.getParameter(parameter.id)) continue
      table.#parameters.push({
        ...parameter,
        ...(parameter.parameterKey === undefined ? {} : { parameterKey: parameter.parameterKey }),
      })
    }
    // Parents must exist before their children, so rows whose parent has not
    // been read yet are deferred rather than rejected.
    const pending = [...json.configurations]
    let progress = true
    while (pending.length > 0 && progress) {
      progress = false
      for (let index = 0; index < pending.length; index += 1) {
        const entry = pending[index] as ConfigurationJSON
        if (entry.parentId !== null && !table.getConfiguration(entry.parentId)) continue
        table.addConfiguration({ ...entry })
        pending.splice(index, 1)
        index -= 1
        progress = true
      }
    }
    // Anything still pending points at a parent that is not in the file; keep it
    // as a root rather than losing the row.
    for (const entry of pending) table.addConfiguration({ ...entry, parentId: null })

    if (json.activeId && table.getConfiguration(json.activeId)) table.#activeId = json.activeId
    return table
  }

  clone(): ConfigurationTable {
    return ConfigurationTable.fromJSON(this.toJSON())
  }

  #replace(configuration: Configuration): void {
    this.#configurations = this.#configurations.map((candidate) =>
      candidate.id === configuration.id ? configuration : candidate,
    )
  }

  #nextName(): string {
    const taken = new Set(this.#configurations.map((configuration) => configuration.name))
    for (let index = 1; ; index += 1) {
      const name = `Configuration ${index}`
      if (!taken.has(name)) return name
    }
  }
}

function defaultLabel(options: AddParameterOptions): string {
  switch (options.kind) {
    case ParameterKind.Dimension:
      return `Dimension ${options.targetId}`
    case ParameterKind.FeatureParameter:
      return options.parameterKey ?? 'Parameter'
    case ParameterKind.Suppression:
      return 'Suppressed'
    case ParameterKind.Instance:
      return 'Included'
  }
}
