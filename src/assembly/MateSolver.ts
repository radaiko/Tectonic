import type { Vec3 } from '../kernel/IKernel'
import { cross, dotVec3, lengthVec3, scaleVec3, subtractVec3 } from '../features/geometry/plane'
import type { AssemblyComponent, AssemblyTree } from './AssemblyTree'
import type { Mate, MateKind } from './Mate'
import { FULL_DEGREES_OF_FREEDOM, clampToLimits } from './Mate'
import type { ComponentTransform } from './Transform'
import {
  IDENTITY_TRANSFORM,
  composeTransforms,
  interpolateTransforms,
  invertTransform,
  matrixToQuaternion,
  quaternionFromAxisAngle,
  multiplyQuaternions,
  transformsEqual,
} from './Transform'

/** How closely two placements must agree before a mate counts as satisfied. */
export const SOLVE_TOLERANCE = 1e-6

export type MateStatus = 'solved' | 'warning' | 'error'

/**
 * A place a mate can grip: an origin and the direction that matters there — the
 * normal of a face, the axis of a hole, the direction of an edge.
 */
export interface EntityFrame {
  readonly origin: Vec3
  readonly axis: Vec3
  /** Fixes the roll about `axis`. Derived from the axis when left out. */
  readonly reference?: Vec3
}

/** The frame of one entity of one component, in that component's own space. */
export type EntityFrameResolver = (
  component: AssemblyComponent,
  entityRef: string,
) => EntityFrame | undefined

export const DEFAULT_ENTITY_FRAME: EntityFrame = {
  origin: { x: 0, y: 0, z: 0 },
  axis: { x: 0, y: 0, z: 1 },
}

/** A resolver backed by a map keyed `componentId:entityRef`. */
export function entityFrameLookup(
  frames: ReadonlyMap<string, EntityFrame>,
): EntityFrameResolver {
  return (component, entityRef) =>
    frames.get(`${component.id}:${entityRef}`) ?? frames.get(entityRef)
}

export interface MateSolverOptions {
  /** Where each mated entity sits. Defaults to the component's own origin. */
  readonly resolveEntity?: EntityFrameResolver
  readonly tolerance?: number
}

/** A component that is still free to move, and by how much. */
export interface UnsolvedComponent {
  readonly componentId: string
  readonly degreesOfFreedom: number
}

/** A component held by more mates than it has freedom, and which ones. */
export interface OverConstrainedComponent {
  readonly componentId: string
  readonly mateIds: readonly string[]
  readonly degreesRemoved: number
  /** True when the surplus mates disagree rather than merely repeat. */
  readonly conflicting: boolean
}

export interface MateSolution {
  /** Solved placement of every component, relative to its parent. */
  readonly transforms: ReadonlyMap<string, ComponentTransform>
  /** The same placements in assembly space. */
  readonly worldTransforms: ReadonlyMap<string, ComponentTransform>
  readonly mateStatus: ReadonlyMap<string, MateStatus>
  /** Why a mate is not simply solved, keyed by mate id. */
  readonly messages: ReadonlyMap<string, string>
  readonly overConstrained: readonly OverConstrainedComponent[]
  readonly unsolved: readonly UnsolvedComponent[]
  /** Mates the solver could not satisfy. */
  readonly conflicts: readonly string[]
  /** Components anchored where they stood because nothing grounded them. */
  readonly floating: readonly string[]
  /** True when every mate is satisfied. */
  readonly isSolved: boolean
}

/** How a mate lines the two entity frames up. */
interface MateAlignment {
  /** Angle between the two axes, in degrees; `null` takes it from the mate. */
  readonly tilt: number | null
  readonly constrainsPosition: boolean
  readonly constrainsOrientation: boolean
  /** Whether the mate's limits govern travel along the axis or about it. */
  readonly driven: 'distance' | 'angle' | 'both'
}

const ALIGNMENTS: Record<MateKind, MateAlignment> = {
  // Two faces meet, so their outward normals end up opposed.
  coincident: { tilt: 180, constrainsPosition: true, constrainsOrientation: true, driven: 'distance' },
  distance: { tilt: 180, constrainsPosition: true, constrainsOrientation: true, driven: 'distance' },
  concentric: { tilt: 0, constrainsPosition: true, constrainsOrientation: true, driven: 'both' },
  tangent: { tilt: 0, constrainsPosition: true, constrainsOrientation: false, driven: 'distance' },
  parallel: { tilt: 0, constrainsPosition: false, constrainsOrientation: true, driven: 'angle' },
  perpendicular: { tilt: 90, constrainsPosition: false, constrainsOrientation: true, driven: 'angle' },
  angle: { tilt: null, constrainsPosition: false, constrainsOrientation: true, driven: 'angle' },
  lock: { tilt: 0, constrainsPosition: true, constrainsOrientation: true, driven: 'both' },
  fastened: { tilt: 0, constrainsPosition: true, constrainsOrientation: true, driven: 'both' },
  revolute: { tilt: 0, constrainsPosition: true, constrainsOrientation: true, driven: 'angle' },
  slider: { tilt: 0, constrainsPosition: true, constrainsOrientation: true, driven: 'distance' },
  cylindrical: { tilt: 0, constrainsPosition: true, constrainsOrientation: true, driven: 'both' },
  planar: { tilt: 180, constrainsPosition: true, constrainsOrientation: true, driven: 'distance' },
  ball: { tilt: 0, constrainsPosition: true, constrainsOrientation: false, driven: 'angle' },
  screw: { tilt: 0, constrainsPosition: true, constrainsOrientation: true, driven: 'both' },
  gear: { tilt: 0, constrainsPosition: true, constrainsOrientation: true, driven: 'angle' },
  'rack-and-pinion': {
    tilt: 0,
    constrainsPosition: true,
    constrainsOrientation: true,
    driven: 'both',
  },
}

/**
 * Works out where every component ends up.
 *
 * The graph is walked outwards from the grounded components, so each mate is
 * applied only once one of its two ends is already placed — which is what makes
 * the result independent of the order the mates were created in. A mate whose
 * ends are both placed by the time it comes up closes a loop: it cannot move
 * anything, so it is checked instead, and reported as redundant or conflicting.
 */
export class MateSolver {
  readonly tree: AssemblyTree
  readonly #mates: Mate[]
  readonly #resolve: EntityFrameResolver
  readonly #tolerance: number

  constructor(tree: AssemblyTree, mates: readonly Mate[] = [], options: MateSolverOptions = {}) {
    this.tree = tree
    this.#mates = [...mates]
    this.#resolve = options.resolveEntity ?? (() => undefined)
    this.#tolerance = options.tolerance ?? SOLVE_TOLERANCE
  }

  get mates(): readonly Mate[] {
    return this.#mates
  }

  addMate(mate: Mate): Mate {
    this.tree.requireComponent(mate.componentId1)
    this.tree.requireComponent(mate.componentId2)
    this.#mates.push(mate)
    return mate
  }

  removeMate(id: string): boolean {
    const index = this.#mates.findIndex((mate) => mate.id === id)
    if (index === -1) return false
    this.#mates.splice(index, 1)
    return true
  }

  getMate(id: string): Mate | undefined {
    return this.#mates.find((mate) => mate.id === id)
  }

  /** Every mate that touches a component. */
  matesFor(componentId: string): Mate[] {
    return this.#mates.filter((mate) => mate.involves(componentId))
  }

  solve(): MateSolution {
    const components = this.tree.components
    const active = this.#mates.filter((mate) => !mate.suppressed && this.#bothEndsExist(mate))

    // Local placements start where the model stands and are moved from there;
    // world placements are always read back through the parent chain, so moving
    // a sub-assembly carries its children without any extra bookkeeping.
    const locals = new Map<string, ComponentTransform>(
      components.map((component) => [component.id, component.transform]),
    )
    const initialWorld = new Map<string, ComponentTransform>(
      components.map((component) => [component.id, this.tree.worldTransform(component.id)]),
    )

    const worldOf = (id: string): ComponentTransform =>
      this.tree
        .getPath(id)
        .reduce<ComponentTransform>(
          (accumulated, component) =>
            composeTransforms(accumulated, locals.get(component.id) ?? component.transform),
          IDENTITY_TRANSFORM,
        )

    const setWorld = (component: AssemblyComponent, world: ComponentTransform): void => {
      const parentWorld = component.parentId ? worldOf(component.parentId) : IDENTITY_TRANSFORM
      locals.set(component.id, composeTransforms(invertTransform(parentWorld), world))
    }

    const status = new Map<string, MateStatus>()
    const messages = new Map<string, string>()
    const conflicts: string[] = []
    const floating: string[] = []
    const surplus = new Map<string, Set<string>>()

    const placed = new Set<string>()
    const queue: string[] = []

    const anchor = (component: AssemblyComponent): void => {
      placed.add(component.id)
      queue.push(component.id)
      // Everything nested inside a rigid instance travels with it.
      if (!component.isFlexible) {
        for (const child of this.tree.getDescendants(component.id)) placed.add(child.id)
      }
    }

    for (const component of components) {
      if (component.isGrounded) anchor(component)
    }

    const mated = new Set<string>()
    for (const mate of active) {
      mated.add(mate.componentId1)
      mated.add(mate.componentId2)
    }

    // Nothing grounded, or an island of mates hanging off nothing: pin the first
    // component of that island where it stands so the rest can be solved around it.
    const seedIsland = (): boolean => {
      for (const component of components) {
        if (placed.has(component.id) || !mated.has(component.id)) continue
        anchor(component)
        floating.push(component.id)
        return true
      }
      return false
    }

    do {
      while (queue.length > 0) {
        const currentId = queue.shift() as string
        for (const mate of active) {
          const otherId = mate.other(currentId)
          if (otherId === undefined) continue

          const mover = this.tree.requireComponent(otherId)
          const fixedId = currentId

          if (placed.has(otherId) || mover.isGrounded) {
            this.#closeLoop(mate, {
              fixedId,
              moverId: otherId,
              worldOf,
              initialWorld,
              status,
              messages,
              conflicts,
              surplus,
            })
            continue
          }

          const world = this.#targetWorld(mate, fixedId, otherId, worldOf, initialWorld)
          setWorld(mover, world)
          status.set(mate.id, status.get(mate.id) ?? 'solved')
          anchor(mover)
        }
      }
    } while (seedIsland())

    for (const mate of active) {
      if (!status.has(mate.id)) {
        status.set(mate.id, 'warning')
        messages.set(mate.id, 'This mate holds nothing that could be placed')
      }
    }

    const worldTransforms = new Map<string, ComponentTransform>(
      components.map((component) => [component.id, worldOf(component.id)]),
    )
    const removedByComponent = this.#degreesRemoved(active)

    return {
      transforms: new Map(locals),
      worldTransforms,
      mateStatus: status,
      messages,
      overConstrained: this.#overConstrained(active, removedByComponent, surplus, conflicts),
      unsolved: this.#unsolved(removedByComponent),
      conflicts,
      floating,
      isSolved: conflicts.length === 0,
    }
  }

  /** Writes a solution back into the tree. */
  apply(solution: MateSolution): void {
    for (const [id, transform] of solution.transforms) {
      const component = this.tree.getComponent(id)
      if (component) component.transform = transform
    }
  }

  /**
   * The placements part way to the solution, for playing a mate back as a
   * movement rather than a jump. `fraction` runs from 0 (as it stands) to 1.
   */
  animate(solution: MateSolution, fraction: number): Map<string, ComponentTransform> {
    const frames = new Map<string, ComponentTransform>()
    for (const component of this.tree.components) {
      const target = solution.transforms.get(component.id)
      frames.set(
        component.id,
        target ? interpolateTransforms(component.transform, target, fraction) : component.transform,
      )
    }
    return frames
  }

  #bothEndsExist(mate: Mate): boolean {
    return (
      this.tree.getComponent(mate.componentId1) !== undefined &&
      this.tree.getComponent(mate.componentId2) !== undefined
    )
  }

  /** A mate whose two ends are both already placed: check it, never move it. */
  #closeLoop(
    mate: Mate,
    context: {
      readonly fixedId: string
      readonly moverId: string
      readonly worldOf: (id: string) => ComponentTransform
      readonly initialWorld: ReadonlyMap<string, ComponentTransform>
      readonly status: Map<string, MateStatus>
      readonly messages: Map<string, string>
      readonly conflicts: string[]
      readonly surplus: Map<string, Set<string>>
    },
  ): void {
    if (context.status.get(mate.id) === 'solved') return

    const wanted = this.#targetWorld(
      mate,
      context.fixedId,
      context.moverId,
      context.worldOf,
      context.initialWorld,
    )
    const satisfied = transformsEqual(wanted, context.worldOf(context.moverId), this.#tolerance)

    context.status.set(mate.id, satisfied ? 'warning' : 'error')
    context.messages.set(
      mate.id,
      satisfied
        ? 'This mate repeats a constraint the assembly already has'
        : 'This mate cannot be satisfied alongside the others',
    )
    if (!satisfied && !context.conflicts.includes(mate.id)) context.conflicts.push(mate.id)

    const entry = context.surplus.get(context.moverId) ?? new Set<string>()
    entry.add(mate.id)
    context.surplus.set(context.moverId, entry)
  }

  /** Where a mate wants the moving component, in assembly space. */
  #targetWorld(
    mate: Mate,
    fixedId: string,
    moverId: string,
    worldOf: (id: string) => ComponentTransform,
    initialWorld: ReadonlyMap<string, ComponentTransform>,
  ): ComponentTransform {
    const current = worldOf(moverId)

    // A locked mate keeps the pair exactly as the user left it.
    if (mate.isLocked) {
      const before = initialWorld.get(moverId) ?? current
      const fixedBefore = initialWorld.get(fixedId) ?? worldOf(fixedId)
      const relative = composeTransforms(invertTransform(fixedBefore), before)
      return composeTransforms(worldOf(fixedId), relative)
    }

    const alignment = ALIGNMENTS[mate.type]
    const fixedComponent = this.tree.requireComponent(fixedId)
    const moverComponent = this.tree.requireComponent(moverId)

    const fixedFrame = composeTransforms(
      worldOf(fixedId),
      frameTransform(this.#entityFrame(fixedComponent, mate.entityFor(fixedId))),
    )
    const moverFrame = frameTransform(this.#entityFrame(moverComponent, mate.entityFor(moverId)))

    const { distance, angle } = drivenValues(mate, alignment)
    const tilt = alignment.tilt ?? mate.parameters.angle
    const flip = mate.parameters.flip ? 180 : 0

    const offset: ComponentTransform = {
      position: { x: 0, y: 0, z: distance },
      rotation: multiplyQuaternions(
        quaternionFromAxisAngle({ x: 0, y: 0, z: 1 }, angle),
        quaternionFromAxisAngle({ x: 1, y: 0, z: 0 }, tilt + flip),
      ),
    }

    const solved = composeTransforms(
      composeTransforms(fixedFrame, offset),
      invertTransform(moverFrame),
    )

    return {
      position: alignment.constrainsPosition ? solved.position : current.position,
      rotation: alignment.constrainsOrientation ? solved.rotation : current.rotation,
    }
  }

  #entityFrame(component: AssemblyComponent, entityRef: string): EntityFrame {
    return this.#resolve(component, entityRef) ?? DEFAULT_ENTITY_FRAME
  }

  #degreesRemoved(mates: readonly Mate[]): Map<string, number> {
    const removed = new Map<string, number>()
    for (const mate of mates) {
      for (const id of [mate.componentId1, mate.componentId2]) {
        const component = this.tree.getComponent(id)
        if (!component || component.isGrounded) continue
        removed.set(id, (removed.get(id) ?? 0) + mate.degreesRemoved)
      }
    }
    return removed
  }

  #overConstrained(
    mates: readonly Mate[],
    removed: ReadonlyMap<string, number>,
    surplus: ReadonlyMap<string, Set<string>>,
    conflicts: readonly string[],
  ): OverConstrainedComponent[] {
    const found: OverConstrainedComponent[] = []
    const unsatisfied = new Set(conflicts)
    const ids = new Set<string>([...surplus.keys()])
    for (const [id, count] of removed) {
      if (count > FULL_DEGREES_OF_FREEDOM) ids.add(id)
    }

    for (const componentId of ids) {
      const count = removed.get(componentId) ?? 0
      const extra = surplus.get(componentId)
      const mateIds =
        extra && extra.size > 0
          ? [...extra]
          : mates.filter((mate) => mate.involves(componentId)).map((mate) => mate.id)
      found.push({
        componentId,
        mateIds,
        degreesRemoved: count,
        // Surplus alone only means the component is held more than once, which a
        // repeated mate does harmlessly. It conflicts only once one of those
        // mates could not be satisfied where the others put the component.
        conflicting: mateIds.some((mateId) => unsatisfied.has(mateId)),
      })
    }
    return found
  }

  #unsolved(removed: ReadonlyMap<string, number>): UnsolvedComponent[] {
    const found: UnsolvedComponent[] = []
    for (const component of this.tree.components) {
      if (component.isGrounded) continue
      // A part inside a rigid sub-assembly has no freedom of its own.
      const parent = component.parentId ? this.tree.getComponent(component.parentId) : undefined
      if (parent && !parent.isFlexible) continue

      const degreesOfFreedom = Math.max(
        0,
        FULL_DEGREES_OF_FREEDOM - (removed.get(component.id) ?? 0),
      )
      if (degreesOfFreedom > 0) found.push({ componentId: component.id, degreesOfFreedom })
    }
    return found
  }
}

/**
 * The travel a mate asks for, clamped to whichever limits govern it.
 *
 * A mate carries one limit range, and it is read in the units of the single
 * quantity that mate drives: degrees for a purely angular mate, lengths for
 * everything else. Clamping the other quantity against it as well would measure
 * an angle against a linear range — which silently mis-orients any mate that
 * drives both, such as a cylindrical, screw or rack-and-pinion joint.
 */
function drivenValues(
  mate: Mate,
  alignment: MateAlignment,
): { readonly distance: number; readonly angle: number } {
  const { distance, angle, limits } = mate.parameters
  const limitsGovernAngle = alignment.driven === 'angle'
  return {
    distance: limitsGovernAngle ? distance : clampToLimits(distance, limits),
    angle: limitsGovernAngle ? clampToLimits(angle, limits) : angle,
  }
}

/**
 * An entity frame as a placement: +Z along the entity's axis, +X along its
 * reference direction. Mates are then expressed as offsets in that frame.
 */
export function frameTransform(frame: EntityFrame): ComponentTransform {
  const z = unit(frame.axis, { x: 0, y: 0, z: 1 })
  const seed = frame.reference ?? perpendicularTo(z)
  const projected = subtractVec3(seed, scaleVec3(z, dotVec3(seed, z)))
  const x = lengthVec3(projected) > 1e-9 ? unit(projected, perpendicularTo(z)) : perpendicularTo(z)
  const y = cross(z, x)

  return {
    position: frame.origin,
    // Columns of the rotation are the frame's own axes.
    rotation: matrixToQuaternion([x.x, y.x, z.x, x.y, y.y, z.y, x.z, y.z, z.z]),
  }
}

function perpendicularTo(axis: Vec3): Vec3 {
  const seed: Vec3 = Math.abs(axis.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 }
  return unit(cross(seed, axis), { x: 1, y: 0, z: 0 })
}

function unit(vector: Vec3, fallback: Vec3): Vec3 {
  const length = lengthVec3(vector)
  return length > 1e-9 ? scaleVec3(vector, 1 / length) : fallback
}
