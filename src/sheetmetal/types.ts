/**
 * Shared vocabulary of the sheet metal environment. Everything here is plain
 * data so the model can be serialised, diffed and tested without a kernel.
 */

/** How a corner is relieved where a bend runs out into unbent material. */
export const RELIEF_TYPES = ['rectangular', 'tear', 'round', 'none'] as const
export type ReliefType = (typeof RELIEF_TYPES)[number]

/** Which quantity the operator supplies to compensate for stretch in a bend. */
export const BEND_METHODS = ['k-factor', 'bend-allowance', 'bend-deduction'] as const
export type BendMethod = (typeof BEND_METHODS)[number]

/** The shapes a hem can be folded into. */
export const HEM_TYPES = ['open', 'closed', 'teardrop', 'rolled'] as const
export type HemType = (typeof HEM_TYPES)[number]

/** The kinds of feature that attach to an edge of a sheet metal face. */
export const EDGE_FEATURE_KINDS = ['edge-flange', 'hem', 'jog'] as const
export type EdgeFeatureKind = (typeof EDGE_FEATURE_KINDS)[number]

/** Whether the sketch driving a base flange bounds an area or is a section. */
export const BASE_PROFILE_KINDS = ['closed', 'open'] as const
export type BaseProfileKind = (typeof BASE_PROFILE_KINDS)[number]

/** Whether a length is measured to the virtual sharp corner or from the bend. */
export const LENGTH_MODES = ['outside', 'tangent'] as const
export type LengthMode = (typeof LENGTH_MODES)[number]

/**
 * One turn in a folded sheet, followed by the flat run that comes after it.
 *
 * `angle` is signed: positive folds towards the far face of the sheet, negative
 * towards the near one, which is what lets a jog bend one way and then back.
 * `straight` is always tangent-to-tangent — callers that dimension to the sharp
 * corner subtract the setback before building the step.
 */
export interface BendStep {
  /** Turn angle in degrees. Magnitude must be greater than zero. */
  readonly angle: number
  /** Inner bend radius. */
  readonly radius: number
  /** Flat run after the bend, measured from the bend's exit tangent. */
  readonly straight: number
}

/** One straight edge of a flat sheet metal face, in the sketch plane's 2D space. */
export interface SheetEdge {
  /** Position in the owning loop; also how a feature names the edge. */
  readonly index: number
  readonly start: { readonly x: number; readonly y: number }
  readonly end: { readonly x: number; readonly y: number }
  /** Unit vector from `start` to `end`. */
  readonly direction: { readonly x: number; readonly y: number }
  /** Unit vector pointing out of the face, perpendicular to `direction`. */
  readonly normal: { readonly x: number; readonly y: number }
  readonly length: number
}

/** What every feature attached to an edge of a face carries. */
export interface EdgeFeatureBase {
  readonly id: string
  /** Which edge of the base face the feature hangs off. */
  readonly edgeIndex: number
  /** Material removed at the edge's start, e.g. by a mitre or a relief. */
  readonly trimStart: number
  /** Material removed at the edge's end. */
  readonly trimEnd: number
  readonly relief: ReliefType
}

/** Raised when a sheet metal model cannot be built as described. */
export class SheetMetalError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SheetMetalError'
  }
}
