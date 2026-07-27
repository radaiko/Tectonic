import type { Vec3 } from '../domain/vec3'
import { distance } from '../domain/vec3'
import { newId } from '../sketch/domain/ids'
import type { AssemblyTree } from './AssemblyTree'
import { AssemblyComponent } from './AssemblyTree'
import type { DerivedComponentInfo } from './DerivedComponent'
import { DerivationError, DerivationKind, LinkState, revisionOf } from './DerivedComponent'
import type { ComponentTransform } from './Transform'

/**
 * Modelling a part in the context of the assembly it belongs to.
 *
 * A part made this way sketches on a neighbour's face and dimensions to a
 * neighbour's edge, so its shape follows the components around it. Each of those
 * borrowings is an {@link ExternalReference}: it names the component and the
 * entity it reads, and it keeps a copy of the geometry as it was when the
 * reference was taken. That copy is what makes "is this still current?"
 * answerable without re-solving the assembly, and what the part falls back on
 * once the link is broken.
 */

export const ReferenceKind = {
  Face: 'face',
  Edge: 'edge',
  Vertex: 'vertex',
  /** A datum plane of the referenced component rather than its geometry. */
  Plane: 'plane',
} as const

export type ReferenceKind = (typeof ReferenceKind)[keyof typeof ReferenceKind]

export const REFERENCE_KINDS: readonly ReferenceKind[] = Object.values(ReferenceKind)

/** The geometry a reference borrowed, in assembly space. */
export interface CapturedGeometry {
  readonly points: readonly Vec3[]
  readonly normal?: Vec3
}

export interface ExternalReferenceJSON {
  readonly id: string
  readonly kind: ReferenceKind
  /** The component the geometry belongs to. */
  readonly componentId: string
  /** The face, edge or vertex id within that component. */
  readonly entityId: string
  readonly geometry: CapturedGeometry
  /** Revision of the geometry as captured. */
  readonly revision: string
  readonly broken: boolean
}

export type ExternalReference = ExternalReferenceJSON

/** Reads a component's geometry now. Undefined means the entity is gone. */
export type GeometryResolver = (
  componentId: string,
  entityId: string,
) => CapturedGeometry | undefined

export interface InContextPartJSON {
  readonly id: string
  readonly name: string
  /** The assembly the part was created in. */
  readonly assemblyId: string
  /** The component that places this part in that assembly. */
  readonly componentId: string
  readonly references: readonly ExternalReferenceJSON[]
  readonly independent: boolean
}

export interface InContextPartInit {
  readonly id?: string
  readonly name?: string
  readonly assemblyId: string
  readonly componentId: string
  readonly references?: readonly ExternalReferenceJSON[]
  readonly independent?: boolean
}

export class InContextPart {
  readonly id: string
  name: string
  readonly assemblyId: string
  componentId: string
  readonly references: ExternalReferenceJSON[]
  #independent: boolean

  constructor(init: InContextPartInit) {
    this.id = init.id ?? newId()
    this.assemblyId = init.assemblyId
    this.componentId = init.componentId
    this.name = init.name ?? 'Part'
    this.references = [...(init.references ?? [])]
    this.#independent = init.independent ?? false
  }

  get independent(): boolean {
    return this.#independent
  }

  /** The components this part reads geometry from. */
  get referencedComponentIds(): string[] {
    const found: string[] = []
    for (const reference of this.references) {
      if (!found.includes(reference.componentId)) found.push(reference.componentId)
    }
    return found
  }

  get brokenReferences(): ExternalReferenceJSON[] {
    return this.references.filter((reference) => reference.broken)
  }

  addReference(
    kind: ReferenceKind,
    componentId: string,
    entityId: string,
    geometry: CapturedGeometry,
  ): ExternalReferenceJSON {
    if (this.#independent) {
      throw new DerivationError(`"${this.name}" is independent, so it takes no new references`)
    }
    if (componentId === this.componentId) {
      throw new DerivationError(`"${this.name}" cannot reference itself`)
    }

    const reference: ExternalReferenceJSON = {
      id: newId(),
      kind,
      componentId,
      entityId,
      geometry,
      revision: revisionOf(geometry),
      broken: false,
    }
    this.references.push(reference)
    return reference
  }

  removeReference(id: string): boolean {
    const index = this.references.findIndex((reference) => reference.id === id)
    if (index === -1) return false
    this.references.splice(index, 1)
    return true
  }

  /**
   * Re-reads every reference. A reference whose entity has gone is marked
   * broken and keeps the geometry it captured, so the part still builds — it
   * just stops following.
   */
  update(resolve: GeometryResolver, tolerance = DEFAULT_TOLERANCE): ReferenceUpdateReport {
    if (this.#independent) {
      return { partId: this.id, moved: [], broken: [], unchanged: this.references.map((r) => r.id) }
    }

    const moved: string[] = []
    const broken: string[] = []
    const unchanged: string[] = []

    this.references.forEach((reference, index) => {
      const current = resolve(reference.componentId, reference.entityId)
      if (!current) {
        this.references[index] = { ...reference, broken: true }
        broken.push(reference.id)
        return
      }

      if (geometryMatches(reference.geometry, current, tolerance)) {
        if (reference.broken) this.references[index] = { ...reference, broken: false }
        unchanged.push(reference.id)
        return
      }

      this.references[index] = {
        ...reference,
        geometry: current,
        revision: revisionOf(current),
        broken: false,
      }
      moved.push(reference.id)
    })

    return { partId: this.id, moved, broken, unchanged }
  }

  /** Whether anything the part reads has moved since it was last updated. */
  isOutOfDate(resolve: GeometryResolver, tolerance = DEFAULT_TOLERANCE): boolean {
    if (this.#independent) return false
    return this.references.some((reference) => {
      const current = resolve(reference.componentId, reference.entityId)
      return current === undefined || !geometryMatches(reference.geometry, current, tolerance)
    })
  }

  /**
   * Breaks every link. The captured geometry stays, so the part keeps its
   * shape — it simply stops following the assembly around it.
   */
  makeIndependent(): void {
    this.#independent = true
  }

  state(resolve?: GeometryResolver): LinkState {
    if (this.#independent) return LinkState.Independent
    if (this.references.some((reference) => reference.broken)) return LinkState.Broken
    if (resolve && this.isOutOfDate(resolve)) return LinkState.OutOfDate
    return LinkState.InSync
  }

  describe(resolve?: GeometryResolver): DerivedComponentInfo {
    return {
      id: this.id,
      name: this.name,
      kind: DerivationKind.InContext,
      source: this.referencedComponentIds.join(', '),
      state: this.state(resolve),
      sourceRevision: this.references.length > 0 ? revisionOf(this.references.map((r) => r.revision)) : null,
    }
  }

  toJSON(): InContextPartJSON {
    return {
      id: this.id,
      name: this.name,
      assemblyId: this.assemblyId,
      componentId: this.componentId,
      references: this.references.map((reference) => ({ ...reference })),
      independent: this.#independent,
    }
  }

  static fromJSON(json: InContextPartJSON): InContextPart {
    return new InContextPart(json)
  }
}

export interface ReferenceUpdateReport {
  readonly partId: string
  /** References whose geometry moved and was re-captured. */
  readonly moved: readonly string[]
  /** References whose entity has gone. */
  readonly broken: readonly string[]
  readonly unchanged: readonly string[]
}

export interface TopDownUpdateReport {
  readonly parts: readonly ReferenceUpdateReport[]
  /** Parts that need rebuilding because something they read moved. */
  readonly rebuild: readonly string[]
}

export interface CreateInContextOptions {
  readonly name?: string
  /** The part this component places. Generated when absent. */
  readonly partId?: string
  /** Sub-assembly to create the part inside, or null for the top level. */
  readonly parentId?: string | null
  readonly transform?: ComponentTransform
}

export interface CreateInContextResult {
  readonly component: AssemblyComponent
  readonly part: InContextPart
}

/** Points closer than this are the same point — matches the kernel's weld. */
const DEFAULT_TOLERANCE = 1e-6

/**
 * The in-context parts of one assembly: creating them, pointing them at
 * neighbouring geometry, and propagating a change through all of them at once.
 */
export class TopDownDesign {
  readonly #assembly: AssemblyTree
  readonly #parts = new Map<string, InContextPart>()

  constructor(assembly: AssemblyTree, parts: readonly InContextPart[] = []) {
    this.#assembly = assembly
    for (const part of parts) this.#parts.set(part.id, part)
  }

  get assembly(): AssemblyTree {
    return this.#assembly
  }

  get parts(): readonly InContextPart[] {
    return [...this.#parts.values()]
  }

  get length(): number {
    return this.#parts.size
  }

  getPart(id: string): InContextPart | undefined {
    return this.#parts.get(id)
  }

  requirePart(id: string): InContextPart {
    const part = this.#parts.get(id)
    if (!part) throw new DerivationError(`No in-context part "${id}"`)
    return part
  }

  /** The in-context part behind an assembly component, if there is one. */
  forComponent(componentId: string): InContextPart | undefined {
    return this.parts.find((part) => part.componentId === componentId)
  }

  /**
   * Creates a new part inside the assembly and places it. The component goes
   * into the tree straight away so other parts can reference it in turn.
   */
  createPartInContext(options: CreateInContextOptions = {}): CreateInContextResult {
    const partId = options.partId ?? newId()
    const name = options.name ?? `Part ${this.#parts.size + 1}`

    const component = this.#assembly.addComponent(
      new AssemblyComponent({
        name,
        kind: 'part',
        partId,
        ...(options.transform ? { transform: options.transform } : {}),
      }),
      options.parentId ?? null,
    )

    const part = new InContextPart({
      id: partId,
      name,
      assemblyId: this.#assembly.id,
      componentId: component.id,
    })
    this.#parts.set(part.id, part)
    return { component, part }
  }

  /** Registers a part that was created elsewhere, e.g. read back from a file. */
  addPart(part: InContextPart): InContextPart {
    if (this.#parts.has(part.id)) throw new DerivationError(`"${part.name}" is already in this design`)
    this.#parts.set(part.id, part)
    return part
  }

  removePart(id: string, removeComponent = true): boolean {
    const part = this.#parts.get(id)
    if (!part) return false
    if (removeComponent) this.#assembly.removeComponent(part.componentId)
    return this.#parts.delete(id)
  }

  /** Points a part at a neighbour's face, edge or vertex. */
  reference(
    partId: string,
    kind: ReferenceKind,
    componentId: string,
    entityId: string,
    geometry: CapturedGeometry,
  ): ExternalReferenceJSON {
    if (!this.#assembly.getComponent(componentId)) {
      throw new DerivationError(`No component "${componentId}" in this assembly`)
    }
    const part = this.requirePart(partId)
    // A reference to a component that already reads this part would make the
    // two chase each other on every rebuild.
    if (this.#readsFrom(componentId, part.componentId)) {
      throw new DerivationError(
        `"${part.name}" cannot reference a component that already references it`,
      )
    }
    return part.addReference(kind, componentId, entityId, geometry)
  }

  /** Re-reads every reference in the design and says what has to rebuild. */
  updateAll(resolve: GeometryResolver, tolerance = DEFAULT_TOLERANCE): TopDownUpdateReport {
    const parts: ReferenceUpdateReport[] = []
    const rebuild: string[] = []

    for (const part of this.parts) {
      const report = part.update(resolve, tolerance)
      parts.push(report)
      if (report.moved.length > 0 || report.broken.length > 0) rebuild.push(part.id)
    }

    return { parts, rebuild }
  }

  /** Parts that read geometry from a given component. */
  dependentsOf(componentId: string): InContextPart[] {
    return this.parts.filter((part) => part.referencedComponentIds.includes(componentId))
  }

  makeIndependent(partId: string): InContextPart {
    const part = this.requirePart(partId)
    part.makeIndependent()
    return part
  }

  toJSON(): readonly InContextPartJSON[] {
    return this.parts.map((part) => part.toJSON())
  }

  static fromJSON(
    assembly: AssemblyTree,
    json: readonly InContextPartJSON[] | undefined,
  ): TopDownDesign {
    const parts: InContextPart[] = []
    for (const entry of json ?? []) {
      try {
        parts.push(InContextPart.fromJSON(entry))
      } catch {
        // A part this build cannot place is dropped rather than failing the open.
      }
    }
    return new TopDownDesign(assembly, parts)
  }

  /** Whether `componentId` reads, directly or through others, from `targetId`. */
  #readsFrom(componentId: string, targetId: string): boolean {
    const seen = new Set<string>()
    const queue = [componentId]

    while (queue.length > 0) {
      const current = queue.shift() as string
      if (current === targetId) return true
      if (seen.has(current)) continue
      seen.add(current)

      const part = this.forComponent(current)
      if (part) queue.push(...part.referencedComponentIds)
    }
    return false
  }
}

/** Whether two captures describe the same geometry, within tolerance. */
export function geometryMatches(
  a: CapturedGeometry,
  b: CapturedGeometry,
  tolerance = DEFAULT_TOLERANCE,
): boolean {
  if (a.points.length !== b.points.length) return false
  for (const [index, point] of a.points.entries()) {
    if (distance(point, b.points[index] as Vec3) > tolerance) return false
  }
  if ((a.normal === undefined) !== (b.normal === undefined)) return false
  if (a.normal && b.normal && distance(a.normal, b.normal) > tolerance) return false
  return true
}
