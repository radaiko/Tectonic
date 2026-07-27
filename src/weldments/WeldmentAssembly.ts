import type { IKernel, PlaneFrame, ShapeHandle, Vec3 } from '../kernel/IKernel'
import { newId } from '../sketch/domain/ids'
import {
  addVec3,
  angleBetween,
  closestOnPolyline,
  cross,
  dotVec3,
  lengthVec3,
  normalize,
  planeAt,
  scaleVec3,
  subtractVec3,
} from './geometry'
import type { StructuralMemberJSON } from './StructuralMember'
import { DEFAULT_PATH_TOLERANCE, StructuralMember, buildMember, endFrame } from './StructuralMember'
import type { EndTreatment, JointKind, MemberEnd } from './types'
import {
  DEFAULT_PREP_ANGLE,
  DEFAULT_WELD_GAP,
  JOINT_TOLERANCE,
  MEMBER_ENDS,
  WeldmentError,
} from './types'

/* -------------------------------------------------------------------------- */
/* Joints                                                                      */
/* -------------------------------------------------------------------------- */

export interface JointContact {
  readonly memberId: string
  /** Which end of the member touches, or null when it is met mid-span. */
  readonly end: MemberEnd | null
}

export interface WeldmentJoint {
  readonly id: string
  readonly position: Vec3
  readonly kind: JointKind
  readonly contacts: readonly JointContact[]
}

interface Cluster {
  position: Vec3
  contacts: JointContact[]
}

/**
 * Where the members touch. Two ends landing on the same point make a corner;
 * an end landing on another member's mid-span makes a tee; anything busier is a
 * cross, which the treatments then handle one pair at a time.
 *
 * Members meeting at a joint are found by proximity rather than by shared
 * sketch geometry, so a frame stays jointed after a member is nudged and its
 * path no longer literally shares a point with its neighbour.
 */
export function findJoints(
  members: readonly StructuralMember[],
  tolerance = JOINT_TOLERANCE,
): WeldmentJoint[] {
  const clusters: Cluster[] = []

  for (const member of members) {
    for (const end of MEMBER_ENDS) {
      const position = member.pointAt(end)
      const existing = clusters.find(
        (cluster) => lengthVec3(subtractVec3(cluster.position, position)) <= tolerance,
      )
      if (existing) existing.contacts.push({ memberId: member.id, end })
      else clusters.push({ position, contacts: [{ memberId: member.id, end }] })
    }
  }

  for (const cluster of clusters) {
    for (const member of members) {
      if (cluster.contacts.some((contact) => contact.memberId === member.id)) continue
      const hit = closestOnPolyline(cluster.position, member.points())
      if (hit.distance <= tolerance) cluster.contacts.push({ memberId: member.id, end: null })
    }
  }

  return clusters
    .filter((cluster) => cluster.contacts.length > 1)
    .map((cluster) => ({
      id: `joint-${cluster.contacts.map((contact) => `${contact.memberId}:${contact.end ?? 'span'}`).join('|')}`,
      position: cluster.position,
      kind: jointKind(cluster.contacts),
      contacts: cluster.contacts,
    }))
}

function jointKind(contacts: readonly JointContact[]): JointKind {
  if (contacts.some((contact) => contact.end === null)) return 'tee'
  return contacts.length === 2 ? 'corner' : 'cross'
}

/* -------------------------------------------------------------------------- */
/* End treatments                                                              */
/* -------------------------------------------------------------------------- */

export interface ResolvedTreatment {
  readonly memberId: string
  readonly end: MemberEnd
  readonly treatment: EndTreatment
  readonly jointId: string | null
  readonly gap: number
  /**
   * The cut, as a plane whose normal points at the material that is kept. Null
   * for `none` — nothing is cut — and for `cope`, which is a subtraction rather
   * than a plane.
   */
  readonly plane: PlaneFrame | null
  /** Angle between the cut face and the member axis, in degrees. 90 is square. */
  readonly angle: number
  /** How far up the axis the cut pulls the end back, in millimetres. */
  readonly setback: number
  /** Members notched out of this end. Only ever set for `cope`. */
  readonly copeAgainst: readonly string[]
}

/** Direction from the joint into the member's body. */
function legDirection(member: StructuralMember, end: MemberEnd): Vec3 {
  return scaleVec3(member.directionAt(end), -1)
}

/**
 * How far along the axis a cut plane pulls the end back. Positive removes
 * material; a plane nearly parallel to the axis cannot be measured this way, so
 * it reports nothing rather than a number that runs off to infinity.
 */
export function planeSetback(plane: PlaneFrame, point: Vec3, leg: Vec3): number {
  const normal = normalize(cross(plane.xAxis, plane.yAxis))
  const along = dotVec3(leg, normal)
  if (Math.abs(along) < 1e-6) return 0
  return dotVec3(subtractVec3(plane.origin, point), normal) / along
}

/** Turns `direction` about `axis` by `degrees`; `axis` must be perpendicular to it. */
function tilt(direction: Vec3, axis: Vec3, degrees: number): Vec3 {
  const radians = (degrees * Math.PI) / 180
  return normalize(
    addVec3(
      scaleVec3(direction, Math.cos(radians)),
      scaleVec3(cross(normalize(axis), direction), Math.sin(radians)),
    ),
  )
}

export interface TreatmentOptions {
  readonly gap?: number
  readonly prepAngle?: number
  readonly tolerance?: number
}

/**
 * Works out what each member's ends are actually cut by.
 *
 * A treatment only means something in the context of a joint — a miter needs
 * something to bisect with — so an end whose joint cannot supply a partner is
 * reported with a null plane rather than being silently cut square.
 */
export function resolveTreatments(
  members: readonly StructuralMember[],
  options: TreatmentOptions = {},
): ResolvedTreatment[] {
  const gap = options.gap ?? DEFAULT_WELD_GAP
  const prepAngle = options.prepAngle ?? DEFAULT_PREP_ANGLE
  const joints = findJoints(members, options.tolerance ?? JOINT_TOLERANCE)
  const byId = new Map(members.map((member) => [member.id, member]))
  const resolved: ResolvedTreatment[] = []

  for (const member of members) {
    for (const end of MEMBER_ENDS) {
      const treatment = member.treatments[end]
      const joint = joints.find((candidate) =>
        candidate.contacts.some(
          (contact) => contact.memberId === member.id && contact.end === end,
        ),
      )
      resolved.push(resolveOne(member, end, treatment, joint, byId, { gap, prepAngle }))
    }
  }
  return resolved
}

function resolveOne(
  member: StructuralMember,
  end: MemberEnd,
  treatment: EndTreatment,
  joint: WeldmentJoint | undefined,
  byId: ReadonlyMap<string, StructuralMember>,
  settings: { readonly gap: number; readonly prepAngle: number },
): ResolvedTreatment {
  const base = {
    memberId: member.id,
    end,
    treatment,
    jointId: joint?.id ?? null,
    gap: settings.gap,
    copeAgainst: [] as readonly string[],
  }
  const nothing: ResolvedTreatment = { ...base, plane: null, angle: 90, setback: 0 }
  if (treatment === 'none' || !joint) return nothing

  const point = member.pointAt(end)
  const leg = legDirection(member, end)

  if (treatment === 'cope') {
    // A cope wraps whatever the member runs into, so the notch is the other
    // members' solids rather than a plane through this one.
    const against = joint.contacts
      .filter((contact) => contact.memberId !== member.id)
      .map((contact) => contact.memberId)
    return { ...base, plane: null, angle: 90, setback: 0, copeAgainst: against }
  }

  if (treatment === 'miter') {
    const partner = joint.contacts.find(
      (contact) => contact.memberId !== member.id && contact.end !== null,
    )
    const other = partner ? byId.get(partner.memberId) : undefined
    if (!other || !partner?.end) return nothing

    const otherLeg = legDirection(other, partner.end)
    const bisector = subtractVec3(leg, otherLeg)
    // Collinear members have no bisector to cut on; a square cut is the honest
    // answer there, and it is what a miter degenerates to anyway.
    if (lengthVec3(bisector) < 1e-9) return squareCut(base, point, leg, settings.gap)

    const normal = normalize(bisector)
    const origin = addVec3(point, scaleVec3(normal, settings.gap / 2))
    const plane = planeAt(origin, normal)
    return {
      ...base,
      plane,
      angle: 90 - angleBetween(normal, leg),
      setback: planeSetback(plane, point, leg),
    }
  }

  if (treatment === 'weld-prep') {
    const axis = endFrame(member, end).xAxis
    const normal = tilt(leg, axis, settings.prepAngle)
    const plane = planeAt(addVec3(point, scaleVec3(leg, settings.gap)), normal)
    return {
      ...base,
      plane,
      angle: 90 - angleBetween(normal, leg),
      setback: planeSetback(plane, point, leg),
    }
  }

  return squareCut(base, point, leg, settings.gap)
}

function squareCut(
  base: Omit<ResolvedTreatment, 'plane' | 'angle' | 'setback'>,
  point: Vec3,
  leg: Vec3,
  gap: number,
): ResolvedTreatment {
  const plane = planeAt(addVec3(point, scaleVec3(leg, gap)), leg)
  return { ...base, plane, angle: 90, setback: gap }
}

/* -------------------------------------------------------------------------- */
/* The weldment                                                                */
/* -------------------------------------------------------------------------- */

export interface WeldmentAssemblyJSON {
  readonly id: string
  readonly name: string
  readonly members: readonly StructuralMemberJSON[]
  readonly gap: number
  readonly prepAngle: number
  readonly tolerance: number
}

export interface WeldmentAssemblyInit {
  readonly id?: string
  readonly name?: string
  readonly members?: readonly StructuralMember[]
  readonly gap?: number
  readonly prepAngle?: number
  readonly tolerance?: number
}

/** One row of the cut list: identical sticks, counted. */
export interface CutListEntry {
  readonly profile: string
  readonly description: string
  /** Length after both ends are trimmed, in millimetres. */
  readonly length: number
  readonly quantity: number
  /** Cut angle at each end, in degrees; 90 is a square cut. */
  readonly angles: readonly [number, number]
  readonly totalLength: number
  /** Mass of every stick in the row, in kilograms. */
  readonly mass: number
  readonly memberIds: readonly string[]
}

/** Rounding used when deciding two members are the same stick, in millimetres. */
const CUT_LIST_PRECISION = 2

/**
 * A welded structure: the members, the gaps left between them, and the joints
 * that follow from where they happen to meet.
 *
 * Joints are derived rather than stored. That keeps a frame correct after a
 * sketch moves — the members follow the sketch, the joints follow the members —
 * at the cost of re-deriving them on each query, which is cheap at the sizes a
 * weldment runs to.
 */
export class WeldmentAssembly {
  readonly id: string
  name: string
  gap: number
  prepAngle: number
  tolerance: number
  #members: StructuralMember[]

  constructor(init: WeldmentAssemblyInit = {}) {
    this.id = init.id ?? newId()
    this.name = init.name ?? 'Weldment'
    this.gap = init.gap ?? DEFAULT_WELD_GAP
    this.prepAngle = init.prepAngle ?? DEFAULT_PREP_ANGLE
    this.tolerance = init.tolerance ?? JOINT_TOLERANCE
    this.#members = []

    if (this.gap < 0) throw new WeldmentError('A weld gap cannot be negative')
    for (const member of init.members ?? []) this.add(member)
  }

  get members(): readonly StructuralMember[] {
    return this.#members
  }

  get length(): number {
    return this.#members.length
  }

  add(member: StructuralMember): StructuralMember {
    if (this.get(member.id)) throw new WeldmentError(`Duplicate member id ${member.id}`)
    this.#members.push(member)
    return member
  }

  get(id: string): StructuralMember | undefined {
    return this.#members.find((member) => member.id === id)
  }

  require(id: string): StructuralMember {
    const member = this.get(id)
    if (!member) throw new WeldmentError(`No member with id ${id}`)
    return member
  }

  remove(id: string): boolean {
    const before = this.#members.length
    this.#members = this.#members.filter((member) => member.id !== id)
    return this.#members.length !== before
  }

  joints(): WeldmentJoint[] {
    return findJoints(this.#members, this.tolerance)
  }

  treatments(): ResolvedTreatment[] {
    return resolveTreatments(this.#members, {
      gap: this.gap,
      prepAngle: this.prepAngle,
      tolerance: this.tolerance,
    })
  }

  /**
   * Gives every jointed end the treatment its joint calls for: corners are
   * mitered, and a member running into another's mid-span is coped around it.
   * Ends that meet nothing are left alone.
   */
  applyAutoTreatments(): void {
    for (const joint of this.joints()) {
      for (const contact of joint.contacts) {
        if (contact.end === null) continue
        const member = this.get(contact.memberId)
        if (!member) continue
        member.treatments[contact.end] = joint.kind === 'corner' ? 'miter' : 'cope'
      }
    }
  }

  /** Trimmed length of one member, after both its end treatments. */
  trimmedLength(id: string, treatments = this.treatments()): number {
    const member = this.require(id)
    const setback = treatments
      .filter((entry) => entry.memberId === id)
      .reduce((total, entry) => total + entry.setback, 0)
    return Math.max(0, member.length - setback)
  }

  /** Total mass of the weldment, in kilograms, after trimming. */
  get mass(): number {
    const treatments = this.treatments()
    return this.#members.reduce(
      (total, member) =>
        total + (this.trimmedLength(member.id, treatments) / 1000) * member.profile.massPerMetre,
      0,
    )
  }

  /**
   * The shop's list: identical sticks — same profile, same length, same end
   * angles — collapsed into one row with a quantity.
   */
  cutList(): CutListEntry[] {
    const treatments = this.treatments()
    const rows = new Map<string, CutListEntry>()

    for (const member of this.#members) {
      const length = round(this.trimmedLength(member.id, treatments), CUT_LIST_PRECISION)
      const angles: [number, number] = [
        round(angleOf(treatments, member.id, 'start'), 1),
        round(angleOf(treatments, member.id, 'end'), 1),
      ]
      const key = `${member.profile.name}|${length}|${angles[0]}|${angles[1]}`
      const existing = rows.get(key)
      const mass = (length / 1000) * member.profile.massPerMetre

      rows.set(
        key,
        existing
          ? {
              ...existing,
              quantity: existing.quantity + 1,
              totalLength: round(existing.totalLength + length, CUT_LIST_PRECISION),
              mass: round(existing.mass + mass, 3),
              memberIds: [...existing.memberIds, member.id],
            }
          : {
              profile: member.profile.name,
              description: `${member.profile.name} — ${length} mm`,
              length,
              quantity: 1,
              angles,
              totalLength: length,
              mass: round(mass, 3),
              memberIds: [member.id],
            },
      )
    }
    return [...rows.values()]
  }

  toJSON(): WeldmentAssemblyJSON {
    return {
      id: this.id,
      name: this.name,
      members: this.#members.map((member) => member.toJSON()),
      gap: this.gap,
      prepAngle: this.prepAngle,
      tolerance: this.tolerance,
    }
  }

  static fromJSON(json: WeldmentAssemblyJSON): WeldmentAssembly {
    return new WeldmentAssembly({
      ...json,
      members: json.members.map((member) => StructuralMember.fromJSON(member)),
    })
  }

  clone(): WeldmentAssembly {
    return WeldmentAssembly.fromJSON(this.toJSON())
  }
}

function angleOf(
  treatments: readonly ResolvedTreatment[],
  memberId: string,
  end: MemberEnd,
): number {
  return (
    treatments.find((entry) => entry.memberId === memberId && entry.end === end)?.angle ?? 90
  )
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/* -------------------------------------------------------------------------- */
/* Building                                                                    */
/* -------------------------------------------------------------------------- */

export interface BuiltMember {
  readonly memberId: string
  readonly shape: ShapeHandle
}

export interface BuildWeldmentOptions {
  readonly tolerance?: number
}

/**
 * Builds every member and applies its end treatments: plane cuts for miters,
 * butts and weld preps, and a subtraction for a cope.
 *
 * Copes are cut against the *untrimmed* neighbour, which is what a shop does —
 * the notch has to clear the run whether or not the run itself is later cut.
 * Intermediate handles are left for the caller to dispose along with the
 * results, since a kernel is free to alias them.
 */
export async function buildWeldment(
  kernel: IKernel,
  assembly: WeldmentAssembly,
  options: BuildWeldmentOptions = {},
): Promise<BuiltMember[]> {
  const tolerance = options.tolerance ?? DEFAULT_PATH_TOLERANCE
  const raw = new Map<string, ShapeHandle>()
  for (const member of assembly.members) {
    raw.set(member.id, await buildMember(kernel, member, { tolerance }))
  }

  const treatments = assembly.treatments()
  const built: BuiltMember[] = []

  for (const member of assembly.members) {
    let shape = raw.get(member.id) as ShapeHandle
    for (const treatment of treatments.filter((entry) => entry.memberId === member.id)) {
      if (treatment.plane) {
        const pieces = await kernel.split(shape, { plane: treatment.plane, keep: 'front' })
        const kept = pieces[0]
        if (kept) shape = kept
        continue
      }
      for (const otherId of treatment.copeAgainst) {
        const cutter = raw.get(otherId)
        if (cutter) shape = await kernel.booleanSubtract(shape, cutter)
      }
    }
    built.push({ memberId: member.id, shape })
  }
  return built
}
