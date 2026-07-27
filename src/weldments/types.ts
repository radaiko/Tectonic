/** Raised when a structural member or weldment cannot be described or built. */
export class WeldmentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WeldmentError'
  }
}

/**
 * Which point of the cross-section rides on the sketch path. Nine of these are
 * the corners, edge midpoints and centre of the section's bounding box; the
 * tenth puts the area centroid on the path, which is what a structural analysis
 * expects and what an unequal angle needs to sit sensibly.
 */
export const MEMBER_ALIGNMENTS = [
  'centroid',
  'center',
  'top-left',
  'top',
  'top-right',
  'left',
  'right',
  'bottom-left',
  'bottom',
  'bottom-right',
] as const
export type MemberAlignment = (typeof MEMBER_ALIGNMENTS)[number]

/** Which end of a member a treatment applies to. */
export const MEMBER_ENDS = ['start', 'end'] as const
export type MemberEnd = (typeof MEMBER_ENDS)[number]

/**
 * How a member finishes where it meets another.
 *
 * - `none` — cut square at the path end, no joint involved.
 * - `butt` — cut square and set back so the member lands flat on its neighbour.
 * - `miter` — cut on the bisector of the two axes, so both members share one face.
 * - `cope` — notched to wrap the member it runs into; a subtraction, not a plane.
 * - `weld-prep` — a bevel cut leaving a groove for the weld metal.
 */
export const END_TREATMENTS = ['none', 'butt', 'miter', 'cope', 'weld-prep'] as const
export type EndTreatment = (typeof END_TREATMENTS)[number]

/** How the members at a joint come together. */
export const JOINT_KINDS = ['corner', 'tee', 'cross'] as const
export type JointKind = (typeof JOINT_KINDS)[number]

/** Default root gap left for weld metal, in millimetres. */
export const DEFAULT_WELD_GAP = 0

/** Included angle of a weld-prep bevel, in degrees. */
export const DEFAULT_PREP_ANGLE = 30

/** How close two member endpoints must be to count as the same joint, in mm. */
export const JOINT_TOLERANCE = 1e-3
