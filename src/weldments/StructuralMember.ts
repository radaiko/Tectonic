import type { IKernel, PlaneFrame, Profile, ShapeHandle, Vec2, Vec3 } from '../kernel/IKernel'
import { newId } from '../sketch/domain/ids'
import {
  addVec3,
  cross,
  dotVec3,
  endDirection,
  endTangent,
  lengthVec3,
  memberFrame,
  normalize,
  polylineLength,
  scaleVec3,
  subtractVec3,
} from './geometry'
import type { SectionOptions, StructuralProfileJSON } from './StructuralProfile'
import { DEFAULT_TUBE_SEGMENTS, StructuralProfile } from './StructuralProfile'
import type { EndTreatment, MemberAlignment, MemberEnd } from './types'
import { END_TREATMENTS, MEMBER_ALIGNMENTS, WeldmentError } from './types'

/** Chord sag allowed when an arc path is turned into a polyline, in mm. */
export const DEFAULT_PATH_TOLERANCE = 0.25

/** Most facets an arc is ever split into, however tight the tolerance. */
const MAX_ARC_SEGMENTS = 256

/* -------------------------------------------------------------------------- */
/* Paths                                                                       */
/* -------------------------------------------------------------------------- */

export interface LinePathSegment {
  readonly kind: 'line'
  readonly start: Vec3
  readonly end: Vec3
}

/**
 * An arc of a circle, given the way a sketch hands one over: centre, the two
 * endpoints, and the normal of the plane it turns in. The sweep always runs
 * anticlockwise about that normal, so reversing the normal takes the long way
 * round instead.
 */
export interface ArcPathSegment {
  readonly kind: 'arc'
  readonly center: Vec3
  readonly start: Vec3
  readonly end: Vec3
  readonly normal: Vec3
}

export type MemberPathSegment = LinePathSegment | ArcPathSegment
export type MemberPath = readonly MemberPathSegment[]

export function linePath(start: Vec3, end: Vec3): LinePathSegment {
  return { kind: 'line', start, end }
}

export function arcPath(center: Vec3, start: Vec3, end: Vec3, normal: Vec3): ArcPathSegment {
  return { kind: 'arc', center, start, end, normal }
}

/** A chain of straight segments through a run of points — a selected polyline. */
export function polylinePath(points: readonly Vec3[]): MemberPathSegment[] {
  if (points.length < 2) throw new WeldmentError('A member path needs at least two points')
  const segments: MemberPathSegment[] = []
  for (let index = 1; index < points.length; index += 1) {
    segments.push(linePath(points[index - 1] as Vec3, points[index] as Vec3))
  }
  return segments
}

/** The points one segment contributes, including both of its ends. */
export function segmentPoints(
  segment: MemberPathSegment,
  tolerance = DEFAULT_PATH_TOLERANCE,
): Vec3[] {
  if (segment.kind === 'line') return [segment.start, segment.end]

  const radial = subtractVec3(segment.start, segment.center)
  const radius = lengthVec3(radial)
  if (radius < 1e-9) throw new WeldmentError('An arc path needs a start away from its centre')

  const normal = normalize(segment.normal)
  if (lengthVec3(normal) === 0) throw new WeldmentError('An arc path needs a plane normal')

  const xAxis = normalize(radial)
  const yAxis = cross(normal, xAxis)
  const toEnd = subtractVec3(segment.end, segment.center)
  let sweep = Math.atan2(dotVec3(toEnd, yAxis), dotVec3(toEnd, xAxis))
  // A sweep of zero would collapse the arc, so treat it as the full turn.
  if (sweep <= 1e-12) sweep += Math.PI * 2

  const step = arcStep(radius, tolerance)
  const count = Math.max(1, Math.min(MAX_ARC_SEGMENTS, Math.ceil(sweep / step)))

  const points: Vec3[] = []
  for (let index = 0; index <= count; index += 1) {
    const phi = (index / count) * sweep
    points.push(
      addVec3(
        segment.center,
        addVec3(scaleVec3(xAxis, Math.cos(phi) * radius), scaleVec3(yAxis, Math.sin(phi) * radius)),
      ),
    )
  }
  return points
}

/** Turn per facet that keeps the chord sag inside `tolerance`. */
function arcStep(radius: number, tolerance: number): number {
  const sag = Math.max(1e-6, Math.min(tolerance, radius))
  return 2 * Math.acos(Math.max(-1, Math.min(1, 1 - sag / radius)))
}

/** The whole path as one polyline, with duplicate joint points dropped. */
export function pathPoints(path: MemberPath, tolerance = DEFAULT_PATH_TOLERANCE): Vec3[] {
  if (path.length === 0) throw new WeldmentError('A member needs at least one path segment')

  const points: Vec3[] = []
  for (const segment of path) {
    for (const point of segmentPoints(segment, tolerance)) {
      const previous = points[points.length - 1]
      if (previous && lengthVec3(subtractVec3(previous, point)) < 1e-9) continue
      points.push(point)
    }
  }
  if (points.length < 2) throw new WeldmentError('A member path has no length')
  return points
}

/* -------------------------------------------------------------------------- */
/* The member                                                                  */
/* -------------------------------------------------------------------------- */

/** How much a member's ends are pushed out (positive) or pulled back. */
export interface MemberExtension {
  readonly start: number
  readonly end: number
}

export interface StructuralMemberJSON {
  readonly id: string
  readonly name: string
  readonly profile: StructuralProfileJSON
  readonly path: MemberPath
  readonly alignment: MemberAlignment
  /** Turn of the section about the path, in degrees. */
  readonly rotation: number
  /** Extra shift of the section, after alignment and rotation. */
  readonly offset: Vec2
  readonly treatments: Readonly<Record<MemberEnd, EndTreatment>>
  readonly extension: MemberExtension
  /** Facets per circle for a round tube's section. */
  readonly segments: number
  readonly material: string | null
}

export interface StructuralMemberInit {
  readonly id?: string
  readonly name?: string
  readonly profile: StructuralProfile
  readonly path: MemberPath
  readonly alignment?: MemberAlignment
  readonly rotation?: number
  readonly offset?: Vec2
  readonly treatments?: Partial<Record<MemberEnd, EndTreatment>>
  readonly extension?: Partial<MemberExtension>
  readonly segments?: number
  readonly material?: string | null
}

/**
 * One length of structural steel: a path taken from a sketch, a profile swept
 * along it, and whatever the ends have been cut back to.
 *
 * The member owns only its own geometry. What its ends are cut *by* is a
 * property of the joint, so {@link WeldmentAssembly} resolves that and hands
 * back cutting planes — a member on its own is always an untrimmed stick.
 */
export class StructuralMember {
  readonly id: string
  name: string
  profile: StructuralProfile
  path: MemberPath
  alignment: MemberAlignment
  rotation: number
  offset: Vec2
  treatments: Record<MemberEnd, EndTreatment>
  extension: MemberExtension
  segments: number
  material: string | null

  constructor(init: StructuralMemberInit) {
    if (init.path.length === 0) throw new WeldmentError('A member needs at least one path segment')

    this.id = init.id ?? newId()
    this.profile = init.profile
    this.name = init.name ?? init.profile.name
    this.path = init.path.map(copySegment)
    this.alignment = MEMBER_ALIGNMENTS.includes(init.alignment as MemberAlignment)
      ? (init.alignment as MemberAlignment)
      : 'centroid'
    this.rotation = init.rotation ?? 0
    this.offset = init.offset ? { ...init.offset } : { x: 0, y: 0 }
    this.treatments = {
      start: treatmentOf(init.treatments?.start),
      end: treatmentOf(init.treatments?.end),
    }
    this.extension = {
      start: init.extension?.start ?? 0,
      end: init.extension?.end ?? 0,
    }
    this.segments = Math.max(3, Math.round(init.segments ?? DEFAULT_TUBE_SEGMENTS))
    this.material = init.material ?? null

    // Validates the path eagerly: a member that cannot be measured is worth
    // rejecting where it was described rather than three calls into a build.
    this.points()
  }

  /** The path as a polyline, with the end extensions applied. */
  points(tolerance = DEFAULT_PATH_TOLERANCE): Vec3[] {
    const points = pathPoints(this.path, tolerance)
    return extendPolyline(points, this.extension)
  }

  get startPoint(): Vec3 {
    return this.points()[0] as Vec3
  }

  get endPoint(): Vec3 {
    const points = this.points()
    return points[points.length - 1] as Vec3
  }

  /** Direction the member runs in, start towards end, at one of its ends. */
  tangentAt(end: MemberEnd): Vec3 {
    return endTangent(this.points(), end)
  }

  /** Direction pointing out of the member at one of its ends. */
  directionAt(end: MemberEnd): Vec3 {
    return endDirection(this.points(), end)
  }

  pointAt(end: MemberEnd): Vec3 {
    return end === 'start' ? this.startPoint : this.endPoint
  }

  /** Length along the path, in millimetres. */
  get length(): number {
    return polylineLength(this.points())
  }

  /** Mass of the untrimmed member, in kilograms. */
  get mass(): number {
    return (this.length / 1000) * this.profile.massPerMetre
  }

  get sectionOptions(): SectionOptions {
    return {
      segments: this.segments,
      alignment: this.alignment,
      rotation: this.rotation,
      offset: this.offset,
    }
  }

  /** The cross-section as it sits on the path. */
  section(): Profile {
    return this.profile.placedSection(this.sectionOptions)
  }

  /** The plane the section is swept from, at the start of the path. */
  frame(tolerance = DEFAULT_PATH_TOLERANCE): PlaneFrame {
    const points = this.points(tolerance)
    return memberFrame(points[0] as Vec3, endTangent(points, 'start'))
  }

  toJSON(): StructuralMemberJSON {
    return {
      id: this.id,
      name: this.name,
      profile: this.profile.toJSON(),
      path: this.path.map(copySegment),
      alignment: this.alignment,
      rotation: this.rotation,
      offset: { ...this.offset },
      treatments: { ...this.treatments },
      extension: { ...this.extension },
      segments: this.segments,
      material: this.material,
    }
  }

  static fromJSON(json: StructuralMemberJSON): StructuralMember {
    return new StructuralMember({
      ...json,
      profile: StructuralProfile.fromJSON(json.profile),
    })
  }

  clone(overrides: Partial<StructuralMemberInit> = {}): StructuralMember {
    return new StructuralMember({
      ...this.toJSON(),
      profile: this.profile,
      id: newId(),
      ...overrides,
    })
  }
}

function treatmentOf(value: EndTreatment | undefined): EndTreatment {
  return END_TREATMENTS.includes(value as EndTreatment) ? (value as EndTreatment) : 'none'
}

function copySegment(segment: MemberPathSegment): MemberPathSegment {
  return segment.kind === 'line'
    ? { kind: 'line', start: { ...segment.start }, end: { ...segment.end } }
    : {
        kind: 'arc',
        center: { ...segment.center },
        start: { ...segment.start },
        end: { ...segment.end },
        normal: { ...segment.normal },
      }
}

/**
 * Pushes a polyline's ends out along their own tangents. A negative extension
 * pulls the end back instead, which is how "trim to the next member" is
 * expressed once the joint has said how far.
 */
export function extendPolyline(points: readonly Vec3[], extension: MemberExtension): Vec3[] {
  const result = points.map((point) => ({ ...point }))
  if (result.length < 2) return result

  if (extension.start !== 0) {
    const direction = endDirection(result, 'start')
    result[0] = addVec3(result[0] as Vec3, scaleVec3(direction, extension.start))
  }
  if (extension.end !== 0) {
    const direction = endDirection(result, 'end')
    const last = result.length - 1
    result[last] = addVec3(result[last] as Vec3, scaleVec3(direction, extension.end))
  }
  return result
}

/* -------------------------------------------------------------------------- */
/* Building                                                                    */
/* -------------------------------------------------------------------------- */

export interface BuildMemberOptions {
  readonly tolerance?: number
}

/**
 * Sweeps the member's profile along its path. The result is the raw stick — end
 * treatments are cuts applied afterwards, by {@link buildWeldment}.
 */
export async function buildMember(
  kernel: IKernel,
  member: StructuralMember,
  options: BuildMemberOptions = {},
): Promise<ShapeHandle> {
  const tolerance = options.tolerance ?? DEFAULT_PATH_TOLERANCE
  const points = member.points(tolerance)
  return kernel.sweep({
    profile: member.section(),
    path: points,
    plane: member.frame(tolerance),
    orientation: 'follow-path',
  })
}

/**
 * Where the cross-section sits in world space at one end of the member — the
 * frame a joint measures its cut planes against.
 */
export function endFrame(member: StructuralMember, end: MemberEnd): PlaneFrame {
  const points = member.points()
  const tangent = endTangent(points, end)
  return memberFrame(member.pointAt(end), tangent, member.rotation)
}

/** Half the diagonal of the member's section — the reach a cut must clear. */
export function sectionReach(member: StructuralMember): number {
  const extent = member.profile.extent()
  return Math.hypot(extent.width, extent.height) / 2
}

/** Signed distance from a point to a plane, along the plane's normal. */
export function signedDistance(plane: PlaneFrame, point: Vec3): number {
  const normal = normalize(cross(plane.xAxis, plane.yAxis))
  return dotVec3(subtractVec3(point, plane.origin), normal)
}
