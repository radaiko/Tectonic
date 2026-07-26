import type { BoundingBox, PlaneFrame, Vec3 } from '../kernel/IKernel'
import { addVec3, lengthVec3, scaleVec3, subtractVec3 } from '../features/geometry/plane'
import type { AssemblyComponent, AssemblyTree } from './AssemblyTree'
import type { Mate } from './Mate'
import type { ComponentTransform } from './Transform'
import {
  IDENTITY_TRANSFORM,
  composeTransforms,
  createTransform,
  interpolateTransforms,
  invertTransform,
  mirrorTransform,
  rotationAbout,
} from './Transform'
import {
  boxCenter,
  boxVolume,
  intersectBoxes,
  transformBounds,
  unionBoxes,
} from './geometry'
import { AssemblyError } from './types'

/** A full turn — a circular pattern of this angle closes on itself. */
const FULL_CIRCLE = 360

/** What the assembly knows about a part it places. */
export interface PartDefinition {
  readonly id: string
  readonly name?: string
  readonly material?: string
  /** Mass of one instance, in the document's units. */
  readonly mass?: number
  /** Extent of the part in its own space, used for interference checks. */
  readonly bounds?: BoundingBox
}

export type PartCatalog = ReadonlyMap<string, PartDefinition>

/* -------------------------------------------------------------------------- */
/* Patterns and mirrors                                                        */
/* -------------------------------------------------------------------------- */

export interface RectangularPatternOptions {
  readonly componentIds: readonly string[]
  /** Instances along the first direction, including the original. */
  readonly count: number
  readonly spacing: number
  /** Direction in the seed's parent space. Defaults to +X. */
  readonly direction?: Vec3
  readonly secondCount?: number
  readonly secondSpacing?: number
  /** Defaults to +Y. */
  readonly secondDirection?: Vec3
}

export interface CircularPatternOptions {
  readonly componentIds: readonly string[]
  /** Instances around the axis, including the original. */
  readonly count: number
  /** Angle the instances are spread over. A full circle closes the ring. */
  readonly angle?: number
  readonly axis: Vec3
  /** Point the axis runs through, in the seed's parent space. */
  readonly axisOrigin?: Vec3
  /** Turns each instance to follow the ring rather than staying square. */
  readonly rotateInstances?: boolean
}

export interface MirrorComponentsOptions {
  readonly componentIds: readonly string[]
  /** Mirror plane, in the seed's parent space. */
  readonly plane: PlaneFrame
}

/**
 * Copies of a component laid out on a grid.
 *
 * The seed keeps its place — the pattern only adds the instances around it —
 * and every copy is a genuine instance of the same part, so editing the part
 * still changes all of them.
 */
export function rectangularPattern(
  tree: AssemblyTree,
  options: RectangularPatternOptions,
): AssemblyComponent[] {
  const count = requireCount(options.count, 'A rectangular pattern needs at least one instance')
  const secondCount = requireCount(
    options.secondCount ?? 1,
    'A rectangular pattern needs at least one row',
  )
  const direction = options.direction ?? { x: 1, y: 0, z: 0 }
  const secondDirection = options.secondDirection ?? { x: 0, y: 1, z: 0 }
  const secondSpacing = options.secondSpacing ?? options.spacing

  const created: AssemblyComponent[] = []
  for (const seed of requireSeeds(tree, options.componentIds)) {
    for (let column = 0; column < count; column += 1) {
      for (let row = 0; row < secondCount; row += 1) {
        if (column === 0 && row === 0) continue
        const offset = addVec3(
          scaleVec3(direction, options.spacing * column),
          scaleVec3(secondDirection, secondSpacing * row),
        )
        created.push(
          duplicateComponent(tree, seed, {
            position: addVec3(seed.transform.position, offset),
            rotation: seed.transform.rotation,
          }),
        )
      }
    }
  }
  return created
}

/** Copies of a component spun about an axis. */
export function circularPattern(
  tree: AssemblyTree,
  options: CircularPatternOptions,
): AssemblyComponent[] {
  const count = requireCount(options.count, 'A circular pattern needs at least one instance')
  const angle = options.angle ?? FULL_CIRCLE
  const origin = options.axisOrigin ?? { x: 0, y: 0, z: 0 }
  const rotateInstances = options.rotateInstances ?? true

  // A full circle divides the whole turn between the instances; anything less
  // puts one at each end of the span.
  const step =
    Math.abs(Math.abs(angle) - FULL_CIRCLE) < 1e-9 ? angle / count : angle / Math.max(1, count - 1)

  const created: AssemblyComponent[] = []
  for (const seed of requireSeeds(tree, options.componentIds)) {
    for (let index = 1; index < count; index += 1) {
      const rotation = rotationAbout(options.axis, step * index, origin)
      const placed = composeTransforms(rotation, seed.transform)
      created.push(
        duplicateComponent(
          tree,
          seed,
          rotateInstances
            ? placed
            : { position: placed.position, rotation: seed.transform.rotation },
        ),
      )
    }
  }
  return created
}

/** Copies of a component reflected through a plane — the opposite hand. */
export function mirrorComponents(
  tree: AssemblyTree,
  options: MirrorComponentsOptions,
): AssemblyComponent[] {
  return requireSeeds(tree, options.componentIds).map((seed) =>
    duplicateComponent(tree, seed, mirrorTransform(seed.transform, options.plane), 'Mirror'),
  )
}

/**
 * Adds a copy of a component — and of everything nested inside it — at a new
 * placement, alongside the original.
 */
export function duplicateComponent(
  tree: AssemblyTree,
  seed: AssemblyComponent,
  transform: ComponentTransform,
  suffix = 'Instance',
): AssemblyComponent {
  const copy = seed.clone({
    name: `${seed.name} (${suffix})`,
    transform: createTransform(transform),
    // A copy is never grounded: the original already anchors the assembly.
    isGrounded: false,
  })
  tree.addComponent(copy, seed.parentId)

  // Children keep their own placements; they move with the parent.
  const idMap = new Map<string, string>([[seed.id, copy.id]])
  for (const child of tree.getDescendants(seed.id)) {
    const parentId = idMap.get(child.parentId ?? '')
    if (!parentId) continue
    const childCopy = child.clone({ isGrounded: false })
    tree.addComponent(childCopy, parentId)
    idMap.set(child.id, childCopy.id)
  }
  return copy
}

/* -------------------------------------------------------------------------- */
/* Replace                                                                     */
/* -------------------------------------------------------------------------- */

export interface ReplaceComponentOptions {
  readonly componentId: string
  /** The part to place instead. */
  readonly partId: string
  readonly name?: string
  /** Mates to check against the new part. */
  readonly mates?: readonly Mate[]
  /** Whether an entity a mate grips still exists on the new part. */
  readonly entityExists?: (partId: string, entityRef: string) => boolean
}

export interface ReplaceComponentResult {
  readonly component: AssemblyComponent
  /** Mates whose entities were found again on the new part. */
  readonly preserved: readonly Mate[]
  /** Mates that no longer have anything to grip and need re-picking. */
  readonly dropped: readonly Mate[]
}

/**
 * Swaps the part a component places, keeping where it sits.
 *
 * Mates are preserved when the new part still carries the entity they grip.
 * The check is handed in, because only the caller knows the new part's
 * topology; without one every mate is kept for the user to review.
 */
export function replaceComponent(
  tree: AssemblyTree,
  options: ReplaceComponentOptions,
): ReplaceComponentResult {
  const component = tree.requireComponent(options.componentId)
  if (component.isAssembly) {
    throw new AssemblyError(`"${component.name}" is a sub-assembly, not a placed part`)
  }
  if (!options.partId) throw new AssemblyError('A replacement needs a part')

  component.partId = options.partId
  if (options.name !== undefined) component.name = options.name

  const exists = options.entityExists ?? ((): boolean => true)
  const preserved: Mate[] = []
  const dropped: Mate[] = []

  for (const mate of options.mates ?? []) {
    if (!mate.involves(component.id)) continue
    if (exists(options.partId, mate.entityFor(component.id))) preserved.push(mate)
    else dropped.push(mate)
  }
  return { component, preserved, dropped }
}

/* -------------------------------------------------------------------------- */
/* Exploded view                                                               */
/* -------------------------------------------------------------------------- */

export interface ExplodedViewJSON {
  readonly offsets: readonly (readonly [string, ComponentTransform])[]
}

/**
 * Where each component sits when the assembly is pulled apart.
 *
 * The offsets are stored separately from the model: exploding is a way of
 * looking at an assembly, not a change to it, so the solved placements stay
 * exactly as they were.
 */
export class ExplodedView {
  readonly #offsets = new Map<string, ComponentTransform>()

  constructor(offsets: Iterable<readonly [string, ComponentTransform]> = []) {
    for (const [id, transform] of offsets) this.#offsets.set(id, createTransform(transform))
  }

  get offsets(): ReadonlyMap<string, ComponentTransform> {
    return this.#offsets
  }

  get size(): number {
    return this.#offsets.size
  }

  /** Sets how far a component moves when fully exploded. */
  setOffset(componentId: string, offset: ComponentTransform | Vec3): ComponentTransform {
    const transform = isTransform(offset) ? createTransform(offset) : createTransform({ position: offset })
    this.#offsets.set(componentId, transform)
    return transform
  }

  getOffset(componentId: string): ComponentTransform | undefined {
    return this.#offsets.get(componentId)
  }

  removeOffset(componentId: string): boolean {
    return this.#offsets.delete(componentId)
  }

  clear(): void {
    this.#offsets.clear()
  }

  /**
   * World placements at a given explode amount, 0 being fully assembled and 1
   * fully apart. Components without an offset simply stay put.
   */
  transformsAt(tree: AssemblyTree, fraction: number): Map<string, ComponentTransform> {
    const amount = Math.min(1, Math.max(0, fraction))
    const placements = new Map<string, ComponentTransform>()

    for (const component of tree.components) {
      const world = tree.worldTransform(component.id)
      const offset = this.#offsets.get(component.id)
      placements.set(
        component.id,
        offset
          ? composeTransforms(interpolateTransforms(IDENTITY_TRANSFORM, offset, amount), world)
          : world,
      )
    }
    return placements
  }

  toJSON(): ExplodedViewJSON {
    return { offsets: [...this.#offsets].map(([id, transform]) => [id, transform] as const) }
  }

  static fromJSON(json: ExplodedViewJSON): ExplodedView {
    return new ExplodedView(json.offsets ?? [])
  }

  /**
   * An explode that pushes every component straight out from the middle of the
   * assembly — the usual starting point, which the user then adjusts.
   */
  static auto(tree: AssemblyTree, distance = 50): ExplodedView {
    const components = tree.components.filter((component) => component.parentId === null)
    const view = new ExplodedView()
    if (components.length === 0) return view

    const positions = components.map((component) => tree.worldTransform(component.id).position)
    const centre = positions.reduce(
      (total, position) => addVec3(total, position),
      { x: 0, y: 0, z: 0 } as Vec3,
    )
    const middle = scaleVec3(centre, 1 / positions.length)

    components.forEach((component, index) => {
      const away = subtractVec3(positions[index] as Vec3, middle)
      const length = lengthVec3(away)
      const direction =
        length > 1e-9 ? scaleVec3(away, 1 / length) : ({ x: 1, y: 0, z: 0 } as Vec3)
      view.setOffset(component.id, scaleVec3(direction, distance))
    })
    return view
  }
}

/* -------------------------------------------------------------------------- */
/* Interference and collisions                                                 */
/* -------------------------------------------------------------------------- */

export interface InterferencePair {
  readonly componentIdA: string
  readonly componentIdB: string
  /** The overlapping region, in assembly space. */
  readonly box: BoundingBox
  readonly volume: number
}

export interface InterferenceOptions {
  /** Overlaps smaller than this are ignored — touching faces are not clashes. */
  readonly tolerance?: number
  /** Pairs to leave out, e.g. a bolt deliberately buried in a tapped hole. */
  readonly ignore?: (a: AssemblyComponent, b: AssemblyComponent) => boolean
}

/** The extent of every placed component, in assembly space. */
export function componentBounds(
  tree: AssemblyTree,
  catalog: PartCatalog,
  overrides: ReadonlyMap<string, ComponentTransform> = new Map(),
): Map<string, BoundingBox> {
  const boxes = new Map<string, BoundingBox>()
  for (const component of tree.components) {
    const bounds = component.partId ? catalog.get(component.partId)?.bounds : undefined
    if (!bounds) continue
    const world = overrides.get(component.id) ?? tree.worldTransform(component.id)
    boxes.set(component.id, transformBounds(bounds, world))
  }
  return boxes
}

/**
 * Components whose solids share space.
 *
 * The test is on placed bounding boxes: it never misses a real clash, and the
 * pairs it reports are what a B-Rep intersection would then be run on. Parts
 * without a known extent are skipped rather than guessed at.
 */
export function detectInterference(
  tree: AssemblyTree,
  catalog: PartCatalog,
  options: InterferenceOptions = {},
): InterferencePair[] {
  const tolerance = options.tolerance ?? 1e-9
  const boxes = componentBounds(tree, catalog)
  const ids = [...boxes.keys()]
  const found: InterferencePair[] = []

  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = tree.requireComponent(ids[i] as string)
      const b = tree.requireComponent(ids[j] as string)
      if (isNested(tree, a, b)) continue
      if (options.ignore?.(a, b)) continue

      const overlap = intersectBoxes(
        boxes.get(a.id) as BoundingBox,
        boxes.get(b.id) as BoundingBox,
      )
      if (!overlap) continue
      const volume = boxVolume(overlap)
      if (volume <= tolerance) continue
      found.push({ componentIdA: a.id, componentIdB: b.id, box: overlap, volume })
    }
  }
  return found
}

export interface CollisionHit {
  readonly componentId: string
  readonly box: BoundingBox
  readonly volume: number
}

/**
 * What a component would run into if it were moved to `world`.
 *
 * This is the drag-time check: only the component being moved is re-placed, so
 * the rest of the assembly does not have to be re-solved on every mouse move.
 */
export function detectCollisions(
  tree: AssemblyTree,
  catalog: PartCatalog,
  componentId: string,
  world: ComponentTransform,
  options: InterferenceOptions = {},
): CollisionHit[] {
  const tolerance = options.tolerance ?? 1e-9
  const moving = tree.requireComponent(componentId)
  const descendants = tree.getDescendants(componentId)

  // The dragged component travels with everything nested inside it.
  const overrides = new Map<string, ComponentTransform>([[componentId, world]])
  for (const child of descendants) {
    const relative = composeTransforms(
      invertTransform(tree.worldTransform(componentId)),
      tree.worldTransform(child.id),
    )
    overrides.set(child.id, composeTransforms(world, relative))
  }

  const boxes = componentBounds(tree, catalog, overrides)
  const movingBox = [componentId, ...descendants.map((child) => child.id)]
    .map((id) => boxes.get(id))
    .filter((box): box is BoundingBox => box !== undefined)
    .reduce<BoundingBox | null>((total, box) => (total ? unionBoxes(total, box) : box), null)

  if (!movingBox) return []

  const hits: CollisionHit[] = []
  for (const [otherId, box] of boxes) {
    if (otherId === componentId || descendants.some((child) => child.id === otherId)) continue
    const other = tree.requireComponent(otherId)
    if (isNested(tree, moving, other)) continue
    if (options.ignore?.(moving, other)) continue

    const overlap = intersectBoxes(movingBox, box)
    if (!overlap) continue
    const volume = boxVolume(overlap)
    if (volume <= tolerance) continue
    hits.push({ componentId: otherId, box: overlap, volume })
  }
  return hits
}

/* -------------------------------------------------------------------------- */
/* Bill of materials                                                           */
/* -------------------------------------------------------------------------- */

export interface BomEntry {
  /** Line identifier: the part id, or the sub-assembly's name. */
  readonly id: string
  readonly partId: string | null
  readonly name: string
  readonly quantity: number
  readonly material: string | null
  /** Mass of one instance. */
  readonly mass: number | null
  /** Mass of the whole line, when a unit mass is known. */
  readonly totalMass: number | null
  readonly componentIds: readonly string[]
}

/**
 * The parts list, one line per part however many times it is placed.
 *
 * The catalog is the authority on a part's name, material and mass; a component
 * that names none falls back to what the instance itself carries, so an
 * assembly still produces a usable list before any part library is loaded.
 */
export function billOfMaterials(
  tree: AssemblyTree,
  catalog: PartCatalog = new Map(),
): BomEntry[] {
  const lines = new Map<string, BomEntry>()

  for (const component of tree.components) {
    const definition = component.partId ? catalog.get(component.partId) : undefined
    const key = component.partId ?? `assembly:${component.name}`
    const current = lines.get(key)

    if (current) {
      const quantity = current.quantity + 1
      lines.set(key, {
        ...current,
        quantity,
        totalMass: current.mass === null ? null : current.mass * quantity,
        componentIds: [...current.componentIds, component.id],
      })
      continue
    }

    const mass = definition?.mass ?? component.mass ?? null
    lines.set(key, {
      id: key,
      partId: component.partId,
      name: definition?.name ?? component.name,
      quantity: 1,
      material: definition?.material ?? component.material ?? null,
      mass,
      totalMass: mass,
      componentIds: [component.id],
    })
  }

  return [...lines.values()]
}

/** Total mass of a parts list, ignoring lines with no mass. */
export function bomMass(entries: readonly BomEntry[]): number {
  return entries.reduce((total, entry) => total + (entry.totalMass ?? 0), 0)
}

/* -------------------------------------------------------------------------- */

function requireSeeds(
  tree: AssemblyTree,
  componentIds: readonly string[],
): AssemblyComponent[] {
  if (componentIds.length === 0) {
    throw new AssemblyError('An assembly feature needs at least one component to work on')
  }
  return componentIds.map((id) => tree.requireComponent(id))
}

function requireCount(count: number, message: string): number {
  const rounded = Math.trunc(count)
  if (!(rounded >= 1)) throw new AssemblyError(message)
  return rounded
}

/** Whether one component contains the other, in either direction. */
function isNested(tree: AssemblyTree, a: AssemblyComponent, b: AssemblyComponent): boolean {
  return (
    tree.getPath(a.id).some((entry) => entry.id === b.id) ||
    tree.getPath(b.id).some((entry) => entry.id === a.id)
  )
}

function isTransform(value: ComponentTransform | Vec3): value is ComponentTransform {
  return typeof (value as ComponentTransform).position === 'object'
}

/** Centre of a placed component, handy when laying out an exploded view. */
export function componentCenter(
  tree: AssemblyTree,
  catalog: PartCatalog,
  componentId: string,
): Vec3 {
  const component = tree.requireComponent(componentId)
  const bounds = component.partId ? catalog.get(component.partId)?.bounds : undefined
  const world = tree.worldTransform(componentId)
  return bounds ? boxCenter(transformBounds(bounds, world)) : world.position
}
