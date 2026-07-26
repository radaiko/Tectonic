import { newId } from '../sketch/domain/ids'
import type { ComponentTransform } from './Transform'
import {
  IDENTITY_TRANSFORM,
  composeTransforms,
  createTransform,
  transformFromJSON,
  transformToJSON,
} from './Transform'
import type { ComponentKind } from './types'
import { AssemblyError, COMPONENT_KINDS } from './types'

export interface ComponentJSON {
  readonly id: string
  readonly name: string
  readonly kind: ComponentKind
  /** The part this instance places. Sub-assemblies carry no part of their own. */
  readonly partId: string | null
  readonly transform: ComponentTransform
  /** The sub-assembly this instance sits in; null at the top level. */
  readonly parentId: string | null
  /** The assembly document the instance belongs to. */
  readonly assemblyId: string
  readonly isGrounded: boolean
  /** Whether a sub-assembly's own mates may still move inside this one. */
  readonly isFlexible: boolean
  readonly material: string | null
  /** Mass of one instance, if the part defines one. */
  readonly mass: number | null
}

export interface ComponentInit {
  readonly id?: string
  readonly name?: string
  readonly kind?: ComponentKind
  readonly partId?: string | null
  readonly transform?: ComponentTransform
  readonly parentId?: string | null
  readonly assemblyId?: string
  readonly isGrounded?: boolean
  readonly isFlexible?: boolean
  readonly material?: string | null
  readonly mass?: number | null
}

/**
 * One placed instance in an assembly.
 *
 * The transform is always relative to whatever the component sits in, so moving
 * a sub-assembly carries everything below it without touching a single child.
 */
export class AssemblyComponent {
  readonly id: string
  name: string
  readonly kind: ComponentKind
  partId: string | null
  transform: ComponentTransform
  parentId: string | null
  assemblyId: string
  isGrounded: boolean
  isFlexible: boolean
  material: string | null
  mass: number | null

  constructor(init: ComponentInit) {
    this.id = init.id ?? newId()
    this.kind = COMPONENT_KINDS.includes(init.kind as ComponentKind)
      ? (init.kind as ComponentKind)
      : 'part'
    this.partId = init.partId ?? null
    this.name = init.name ?? (this.kind === 'sub-assembly' ? 'Sub-assembly' : (this.partId ?? 'Part'))
    this.transform = init.transform ? createTransform(init.transform) : IDENTITY_TRANSFORM
    this.parentId = init.parentId ?? null
    this.assemblyId = init.assemblyId ?? ''
    this.isGrounded = init.isGrounded ?? false
    this.isFlexible = init.isFlexible ?? false
    this.material = init.material ?? null
    this.mass = init.mass ?? null

    if (this.kind === 'part' && !this.partId) {
      throw new AssemblyError(`Component "${this.name}" needs a part to place`)
    }
    if (this.mass !== null && !(this.mass >= 0)) {
      throw new AssemblyError(`Component "${this.name}" cannot have a negative mass`)
    }
  }

  /** Whether other components can be nested inside this one. */
  get isAssembly(): boolean {
    return this.kind === 'sub-assembly'
  }

  toJSON(): ComponentJSON {
    return {
      id: this.id,
      name: this.name,
      kind: this.kind,
      partId: this.partId,
      transform: transformToJSON(this.transform),
      parentId: this.parentId,
      assemblyId: this.assemblyId,
      isGrounded: this.isGrounded,
      isFlexible: this.isFlexible,
      material: this.material,
      mass: this.mass,
    }
  }

  static fromJSON(json: ComponentJSON): AssemblyComponent {
    return new AssemblyComponent({
      ...json,
      transform: transformFromJSON(json.transform),
    })
  }

  clone(overrides: ComponentInit = {}): AssemblyComponent {
    return new AssemblyComponent({ ...this.toJSON(), id: newId(), ...overrides })
  }
}

export interface AssemblyTreeJSON {
  readonly id: string
  readonly name: string
  readonly components: readonly ComponentJSON[]
}

export interface AssemblyTreeInit {
  readonly id?: string
  readonly name?: string
  readonly components?: readonly (AssemblyComponent | ComponentInit)[]
}

/**
 * The structure of an assembly: which instances it holds, what they sit in and
 * where each of them is placed.
 *
 * Components are kept in one flat, ordered list with a parent link rather than
 * as nested arrays — a mate names two components wherever they live, and a flat
 * list is what makes that lookup, and the solver's graph walk, straightforward.
 */
export class AssemblyTree {
  readonly id: string
  name: string
  readonly #components: AssemblyComponent[] = []
  readonly #byId = new Map<string, AssemblyComponent>()

  constructor(init: AssemblyTreeInit = {}) {
    this.id = init.id ?? newId()
    this.name = init.name ?? 'Assembly'
    for (const entry of init.components ?? []) {
      const component =
        entry instanceof AssemblyComponent ? entry : new AssemblyComponent(entry)
      this.addComponent(component, component.parentId)
    }
  }

  /** Every component, parents always ahead of their children. */
  get components(): readonly AssemblyComponent[] {
    return this.#components
  }

  get length(): number {
    return this.#components.length
  }

  /** The components at the top level of the assembly. */
  get roots(): AssemblyComponent[] {
    return this.#components.filter((component) => component.parentId === null)
  }

  getComponent(id: string): AssemblyComponent | undefined {
    return this.#byId.get(id)
  }

  requireComponent(id: string): AssemblyComponent {
    const component = this.#byId.get(id)
    if (!component) throw new AssemblyError(`No component "${id}" in this assembly`)
    return component
  }

  /** Every component, or the children of one sub-assembly when given an id. */
  getComponents(parentId?: string | null): AssemblyComponent[] {
    if (parentId === undefined) return [...this.#components]
    return this.#components.filter((component) => component.parentId === parentId)
  }

  getChildren(id: string): AssemblyComponent[] {
    return this.getComponents(id)
  }

  /** Everything below a component, depth first. */
  getDescendants(id: string): AssemblyComponent[] {
    const found: AssemblyComponent[] = []
    const visit = (parentId: string): void => {
      for (const child of this.getChildren(parentId)) {
        found.push(child)
        visit(child.id)
      }
    }
    visit(id)
    return found
  }

  /**
   * Adds a component. A parent must be a sub-assembly that is already in the
   * tree — a part has no inside for another instance to sit in.
   */
  addComponent(
    component: AssemblyComponent | ComponentInit,
    parentId: string | null = null,
  ): AssemblyComponent {
    const instance =
      component instanceof AssemblyComponent ? component : new AssemblyComponent(component)

    if (this.#byId.has(instance.id)) {
      throw new AssemblyError(`Component "${instance.id}" is already in this assembly`)
    }
    if (parentId !== null) this.#requireContainer(parentId)

    instance.parentId = parentId
    instance.assemblyId = this.id
    this.#components.push(instance)
    this.#byId.set(instance.id, instance)
    return instance
  }

  /** Removes a component and everything nested inside it. Returns the ids. */
  removeComponent(id: string): string[] {
    const component = this.#byId.get(id)
    if (!component) return []

    const removed = [component, ...this.getDescendants(id)]
    for (const entry of removed) {
      this.#byId.delete(entry.id)
      const index = this.#components.indexOf(entry)
      if (index !== -1) this.#components.splice(index, 1)
    }
    return removed.map((entry) => entry.id)
  }

  /** The chain of components from the top level down to `id`. */
  getPath(id: string): AssemblyComponent[] {
    const path: AssemblyComponent[] = []
    let current = this.#byId.get(id)
    while (current) {
      path.unshift(current)
      current = current.parentId ? this.#byId.get(current.parentId) : undefined
    }
    if (path.length === 0) throw new AssemblyError(`No component "${id}" in this assembly`)
    return path
  }

  /** That path as a readable name, e.g. `Gearbox/Housing`. */
  pathName(id: string, separator = '/'): string {
    return this.getPath(id)
      .map((component) => component.name)
      .join(separator)
  }

  /** Where a component sits in the assembly's own space. */
  worldTransform(id: string): ComponentTransform {
    return this.getPath(id).reduce<ComponentTransform>(
      (accumulated, component) => composeTransforms(accumulated, component.transform),
      IDENTITY_TRANSFORM,
    )
  }

  /**
   * Re-parents a component, optionally giving it a new placement. Moving a
   * component into its own subtree is refused — it would orphan the branch.
   */
  moveComponent(
    id: string,
    newParentId: string | null,
    newTransform?: ComponentTransform,
  ): AssemblyComponent {
    const component = this.requireComponent(id)

    if (newParentId !== null) {
      this.#requireContainer(newParentId)
      if (newParentId === id || this.getDescendants(id).some((child) => child.id === newParentId)) {
        throw new AssemblyError(`"${component.name}" cannot be moved inside itself`)
      }
    }

    component.parentId = newParentId
    if (newTransform) component.transform = createTransform(newTransform)
    return component
  }

  setTransform(id: string, transform: ComponentTransform): AssemblyComponent {
    const component = this.requireComponent(id)
    component.transform = createTransform(transform)
    return component
  }

  /** Fixes a component where it stands, so the solver treats it as an anchor. */
  ground(id: string): AssemblyComponent {
    return this.setGrounded(id, true)
  }

  unground(id: string): AssemblyComponent {
    return this.setGrounded(id, false)
  }

  setGrounded(id: string, grounded: boolean): AssemblyComponent {
    const component = this.requireComponent(id)
    component.isGrounded = grounded
    return component
  }

  /** Whether a sub-assembly's own mates keep solving inside this assembly. */
  setFlexible(id: string, flexible: boolean): AssemblyComponent {
    const component = this.requireComponent(id)
    if (!component.isAssembly) {
      throw new AssemblyError(`"${component.name}" is a part, so it is always rigid`)
    }
    component.isFlexible = flexible
    return component
  }

  rename(id: string, name: string): AssemblyComponent {
    const component = this.requireComponent(id)
    const trimmed = name.trim()
    if (trimmed.length === 0) throw new AssemblyError('A component needs a name')
    component.name = trimmed
    return component
  }

  get groundedComponents(): AssemblyComponent[] {
    return this.#components.filter((component) => component.isGrounded)
  }

  toJSON(): AssemblyTreeJSON {
    return {
      id: this.id,
      name: this.name,
      components: this.#components.map((component) => component.toJSON()),
    }
  }

  static fromJSON(json: AssemblyTreeJSON): AssemblyTree {
    const tree = new AssemblyTree({ id: json.id, name: json.name })
    // Parents first: a child cannot be added before the branch it hangs off.
    for (const entry of orderByDepth(json.components ?? [])) {
      tree.addComponent(AssemblyComponent.fromJSON(entry), entry.parentId ?? null)
    }
    return tree
  }

  clone(): AssemblyTree {
    return AssemblyTree.fromJSON(this.toJSON())
  }

  #requireContainer(parentId: string): AssemblyComponent {
    const parent = this.requireComponent(parentId)
    if (!parent.isAssembly) {
      throw new AssemblyError(`"${parent.name}" is a part, so nothing can be nested inside it`)
    }
    return parent
  }
}

/** Serialised components sorted so every parent comes before its children. */
function orderByDepth(components: readonly ComponentJSON[]): ComponentJSON[] {
  const byParent = new Map<string | null, ComponentJSON[]>()
  for (const component of components) {
    const key = component.parentId ?? null
    const siblings = byParent.get(key)
    if (siblings) siblings.push(component)
    else byParent.set(key, [component])
  }

  const ordered: ComponentJSON[] = []
  const visit = (parentId: string | null): void => {
    for (const component of byParent.get(parentId) ?? []) {
      ordered.push(component)
      visit(component.id)
    }
  }
  visit(null)

  // Anything whose parent went missing is kept, at the top level, rather than
  // silently dropping part of the file.
  const seen = new Set(ordered.map((component) => component.id))
  for (const component of components) {
    if (!seen.has(component.id)) ordered.push({ ...component, parentId: null })
  }
  return ordered
}
