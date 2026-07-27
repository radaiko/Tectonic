import type { Profile, Vec2 } from '../kernel/IKernel'
import {
  centroid as polygonCentroid,
  circlePoints,
  rectanglePoints,
  signedArea as polygonArea,
} from '../library/polygon'
import type { ProfileKind, ProfileTableEntry } from '../library/StructuralProfiles'
import { PROFILE_KINDS, profileMassPerMetre, requireProfile } from '../library/StructuralProfiles'
import { STEEL_DENSITY } from '../library/types'
import type { PartStandard } from '../library/types'
import type { MemberAlignment } from './types'
import { WeldmentError } from './types'

/** Facets used to approximate a round tube's wall. */
export const DEFAULT_TUBE_SEGMENTS = 32

/**
 * The five numbers every structural section is described by. Which of them a
 * kind actually reads is documented on {@link ProfileTableEntry}; a custom
 * profile fills in the same fields as a catalogue one.
 */
export interface ProfileDimensions {
  readonly height: number
  readonly width: number
  readonly webThickness: number
  readonly flangeThickness: number
  readonly rootRadius: number
}

export interface StructuralProfileJSON {
  readonly name: string
  readonly kind: ProfileKind
  readonly standard: PartStandard
  readonly series: string
  readonly dimensions: ProfileDimensions
  /** Cross-sectional area in mm². Published for rolled shapes, computed otherwise. */
  readonly area: number
  /** Material density in kg/mm³ — what turns the area into a mass per metre. */
  readonly density: number
}

export interface StructuralProfileInit {
  readonly name: string
  readonly kind: ProfileKind
  readonly standard?: PartStandard
  readonly series?: string
  readonly dimensions: ProfileDimensions
  readonly area?: number
  readonly density?: number
}

export interface SectionOptions {
  /** Facets per full circle for round tubes. Ignored by every other kind. */
  readonly segments?: number
  /** Where the section sits relative to the path. Defaults to `center`. */
  readonly alignment?: MemberAlignment
  /** Turn about the path, in degrees, applied after the alignment shift. */
  readonly rotation?: number
  /** Extra shift in section coordinates, applied after alignment and rotation. */
  readonly offset?: Vec2
}

/** Overall extent of a section, in millimetres. */
export interface SectionExtent {
  readonly width: number
  readonly height: number
}

const DEG = Math.PI / 180

/* -------------------------------------------------------------------------- */
/* Section geometry                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Every generator returns its outline anticlockwise about the bounding-box
 * centre, so `center` alignment is a no-op and the other nine are a shift by
 * half the extent. Holes are wound clockwise, which is what the kernel's
 * profile contract asks for.
 */
function iBeamSection(d: ProfileDimensions): Vec2[] {
  const hw = d.width / 2
  const hh = d.height / 2
  const tw = d.webThickness / 2
  const tf = d.flangeThickness
  return [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: -hh + tf },
    { x: tw, y: -hh + tf },
    { x: tw, y: hh - tf },
    { x: hw, y: hh - tf },
    { x: hw, y: hh },
    { x: -hw, y: hh },
    { x: -hw, y: hh - tf },
    { x: -tw, y: hh - tf },
    { x: -tw, y: -hh + tf },
    { x: -hw, y: -hh + tf },
  ]
}

/** Web on the left, flanges reaching right — the standard channel orientation. */
function channelSection(d: ProfileDimensions): Vec2[] {
  const hw = d.width / 2
  const hh = d.height / 2
  const tw = d.webThickness
  const tf = d.flangeThickness
  return [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: -hh + tf },
    { x: -hw + tw, y: -hh + tf },
    { x: -hw + tw, y: hh - tf },
    { x: hw, y: hh - tf },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ]
}

/** Heel at the bottom-left, long leg up. */
function angleSection(d: ProfileDimensions): Vec2[] {
  const hw = d.width / 2
  const hh = d.height / 2
  const t = d.webThickness
  return [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: -hh + t },
    { x: -hw + t, y: -hh + t },
    { x: -hw + t, y: hh },
    { x: -hw, y: hh },
  ]
}

/** Table across the top, stem hanging down. */
function teeSection(d: ProfileDimensions): Vec2[] {
  const hw = d.width / 2
  const hh = d.height / 2
  const tw = d.webThickness / 2
  const tf = d.flangeThickness
  return [
    { x: -tw, y: -hh },
    { x: tw, y: -hh },
    { x: tw, y: hh - tf },
    { x: hw, y: hh - tf },
    { x: hw, y: hh },
    { x: -hw, y: hh },
    { x: -hw, y: hh - tf },
    { x: -tw, y: hh - tf },
  ]
}

function rectangle(halfWidth: number, halfHeight: number): Vec2[] {
  return rectanglePoints(halfWidth * 2, halfHeight * 2)
}

/** The section of a profile, before any alignment, rotation or offset. */
export function baseSection(
  kind: ProfileKind,
  dimensions: ProfileDimensions,
  segments = DEFAULT_TUBE_SEGMENTS,
): Profile {
  switch (kind) {
    case 'i-beam':
      return { points: iBeamSection(dimensions) }
    case 'channel':
      return { points: channelSection(dimensions) }
    case 'angle':
      return { points: angleSection(dimensions) }
    case 'tee':
      return { points: teeSection(dimensions) }
    case 'flat-bar':
      return { points: rectangle(dimensions.width / 2, dimensions.height / 2) }
    case 'rectangular-tube': {
      const wall = dimensions.webThickness
      return {
        points: rectangle(dimensions.width / 2, dimensions.height / 2),
        // Holes run the other way round, so the sweep leaves the bore empty.
        holes: [rectangle(dimensions.width / 2 - wall, dimensions.height / 2 - wall).reverse()],
      }
    }
    case 'round-tube': {
      const radius = dimensions.width / 2
      const bore = radius - dimensions.webThickness
      const outline = circlePoints(radius, segments)
      return bore > 0
        ? { points: outline, holes: [circlePoints(bore, segments).reverse()] }
        : { points: outline }
    }
  }
}

/** Centroid of a profile, with its holes taken out of the outer loop. */
export function profileCentroid(profile: Profile): Vec2 {
  let area = polygonArea(profile.points)
  const centroid = polygonCentroid(profile.points)
  let x = centroid.x * area
  let y = centroid.y * area

  for (const hole of profile.holes ?? []) {
    // Holes are wound the opposite way, so their signed area already subtracts.
    const holeArea = polygonArea(hole)
    const holeCentroid = polygonCentroid(hole)
    area += holeArea
    x += holeCentroid.x * holeArea
    y += holeCentroid.y * holeArea
  }
  return Math.abs(area) < 1e-12 ? centroid : { x: x / area, y: y / area }
}

/**
 * How far the section must move for `alignment` to land on the path. The
 * generators centre their outlines on the bounding box, so eight of the ten
 * cases are half an extent and `center` is nothing at all.
 */
export function alignmentOffset(profile: Profile, alignment: MemberAlignment): Vec2 {
  const extent = sectionExtent(profile)
  const halfWidth = extent.width / 2
  const halfHeight = extent.height / 2

  switch (alignment) {
    case 'centroid': {
      const centroid = profileCentroid(profile)
      return { x: -centroid.x, y: -centroid.y }
    }
    case 'center':
      return { x: 0, y: 0 }
    case 'top-left':
      return { x: halfWidth, y: -halfHeight }
    case 'top':
      return { x: 0, y: -halfHeight }
    case 'top-right':
      return { x: -halfWidth, y: -halfHeight }
    case 'left':
      return { x: halfWidth, y: 0 }
    case 'right':
      return { x: -halfWidth, y: 0 }
    case 'bottom-left':
      return { x: halfWidth, y: halfHeight }
    case 'bottom':
      return { x: 0, y: halfHeight }
    case 'bottom-right':
      return { x: -halfWidth, y: halfHeight }
  }
}

/** Bounding extent of a profile's outer loop. */
export function sectionExtent(profile: Profile): SectionExtent {
  if (profile.points.length === 0) return { width: 0, height: 0 }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const point of profile.points) {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
  }
  return { width: maxX - minX, height: maxY - minY }
}

function placeLoop(points: readonly Vec2[], shift: Vec2, rotation: number): Vec2[] {
  const cos = Math.cos(rotation * DEG)
  const sin = Math.sin(rotation * DEG)
  return points.map((point) => {
    const x = point.x + shift.x
    const y = point.y + shift.y
    return { x: x * cos - y * sin, y: x * sin + y * cos }
  })
}

/** A profile shifted onto its alignment point, turned, then offset. */
export function placeSection(profile: Profile, options: SectionOptions = {}): Profile {
  const alignment = alignmentOffset(profile, options.alignment ?? 'center')
  const offset = options.offset ?? { x: 0, y: 0 }
  const rotation = options.rotation ?? 0
  const shift = { x: alignment.x, y: alignment.y }

  const points = placeLoop(profile.points, shift, rotation).map((point) => ({
    x: point.x + offset.x,
    y: point.y + offset.y,
  }))
  const holes = profile.holes?.map((hole) =>
    placeLoop(hole, shift, rotation).map((point) => ({
      x: point.x + offset.x,
      y: point.y + offset.y,
    })),
  )
  return holes ? { points, holes } : { points }
}

/* -------------------------------------------------------------------------- */
/* The profile                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * A structural shape a member can be swept from: a catalogue row, or a custom
 * set of dimensions in the same five fields.
 *
 * The class owns the cross-section geometry so that everything downstream — the
 * sweep, the cut list, the preview in the editor — measures the same polygon
 * rather than each re-deriving one from the dimensions.
 */
export class StructuralProfile {
  readonly name: string
  readonly kind: ProfileKind
  readonly standard: PartStandard
  readonly series: string
  readonly dimensions: ProfileDimensions
  readonly area: number
  readonly density: number

  constructor(init: StructuralProfileInit) {
    if (init.name.trim().length === 0) throw new WeldmentError('A profile needs a name')
    if (!PROFILE_KINDS.includes(init.kind)) {
      throw new WeldmentError(`"${init.kind}" is not a structural profile kind`)
    }
    validateDimensions(init.kind, init.dimensions)

    this.name = init.name.trim()
    this.kind = init.kind
    this.standard = init.standard ?? 'generic'
    this.series = init.series ?? this.name
    this.dimensions = { ...init.dimensions }
    this.density = init.density ?? STEEL_DENSITY
    this.area = init.area ?? Math.abs(profileArea(baseSection(this.kind, this.dimensions)))
  }

  /** A profile built from the embedded steel tables. */
  static fromCatalog(name: string, density = STEEL_DENSITY): StructuralProfile {
    return StructuralProfile.fromTable(requireProfile(name), density)
  }

  static fromTable(entry: ProfileTableEntry, density = STEEL_DENSITY): StructuralProfile {
    return new StructuralProfile({
      name: entry.name,
      kind: entry.kind,
      standard: entry.standard,
      series: entry.series,
      dimensions: {
        height: entry.height,
        width: entry.width,
        webThickness: entry.webThickness,
        flangeThickness: entry.flangeThickness,
        rootRadius: entry.rootRadius,
      },
      area: entry.area,
      density,
    })
  }

  /** Mass of one metre of the profile, in kilograms. */
  get massPerMetre(): number {
    return this.area * 1000 * this.density
  }

  /** The bare cross-section, centred on its bounding box. */
  section(segments = DEFAULT_TUBE_SEGMENTS): Profile {
    return baseSection(this.kind, this.dimensions, segments)
  }

  /** The cross-section as a member places it: aligned, turned and offset. */
  placedSection(options: SectionOptions = {}): Profile {
    return placeSection(this.section(options.segments ?? DEFAULT_TUBE_SEGMENTS), options)
  }

  extent(): SectionExtent {
    return sectionExtent(this.section())
  }

  centroid(): Vec2 {
    return profileCentroid(this.section())
  }

  toJSON(): StructuralProfileJSON {
    return {
      name: this.name,
      kind: this.kind,
      standard: this.standard,
      series: this.series,
      dimensions: { ...this.dimensions },
      area: this.area,
      density: this.density,
    }
  }

  static fromJSON(json: StructuralProfileJSON): StructuralProfile {
    return new StructuralProfile(json)
  }
}

/** Net area of a profile: its outer loop less every hole. */
export function profileArea(profile: Profile): number {
  let area = polygonArea(profile.points)
  for (const hole of profile.holes ?? []) area += polygonArea(hole)
  return area
}

function validateDimensions(kind: ProfileKind, dimensions: ProfileDimensions): void {
  const { height, width, webThickness, flangeThickness } = dimensions
  if (!(height > 0) || !(width > 0)) {
    throw new WeldmentError('A profile needs a positive height and width')
  }
  if (!(webThickness > 0) || !(flangeThickness > 0)) {
    throw new WeldmentError('A profile needs positive wall thicknesses')
  }
  if (kind === 'flat-bar') return

  // Checked ahead of the generic wall tests, which would otherwise report a
  // closed bore as a flange problem on a section that has no flanges.
  if (kind === 'round-tube') {
    if (2 * webThickness >= width) {
      throw new WeldmentError('A round tube wall cannot close its own bore')
    }
    return
  }
  if (kind === 'angle') {
    if (webThickness >= width || webThickness >= height) {
      throw new WeldmentError('An angle leg cannot be thicker than the leg is long')
    }
    return
  }
  if (webThickness >= width) {
    throw new WeldmentError(`The web of "${kind}" is thicker than the profile is wide`)
  }
  if (2 * flangeThickness >= height) {
    throw new WeldmentError(`The flanges of "${kind}" leave no web between them`)
  }
}

export { polygonArea, polygonCentroid, profileMassPerMetre }
