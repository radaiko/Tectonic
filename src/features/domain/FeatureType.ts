/**
 * Every kind of entry the feature tree can hold. Values are the strings written
 * into .tectonic files, so they are stable and must not be renamed.
 */
export const FeatureType = {
  Extrude: 'ExtrudeFeature',
  Revolve: 'RevolveFeature',
  Sweep: 'SweepFeature',
  Loft: 'LoftFeature',
  CutExtrude: 'CutExtrudeFeature',
  CutRevolve: 'CutRevolveFeature',
  CutSweep: 'CutSweepFeature',
  CutLoft: 'CutLoftFeature',
  Fillet: 'FilletFeature',
  Chamfer: 'ChamferFeature',
  Shell: 'ShellFeature',
  Hole: 'HoleFeature',
  Rib: 'RibFeature',
  Draft: 'DraftFeature',
  Pattern: 'PatternFeature',
  Mirror: 'MirrorFeature',
  Scale: 'ScaleFeature',
  Combine: 'CombineFeature',
  Split: 'SplitFeature',
  DirectEdit: 'DirectEditFeature',
  BaseFlange: 'BaseFlangeFeature',
  EdgeFlange: 'EdgeFlangeFeature',
  MiterFlange: 'MiterFlangeFeature',
  Hem: 'HemFeature',
  Jog: 'JogFeature',
  Unfold: 'UnfoldFeature',
  Refold: 'RefoldFeature',
  ExtrudeSurface: 'ExtrudeSurfaceFeature',
  RevolveSurface: 'RevolveSurfaceFeature',
  SweepSurface: 'SweepSurfaceFeature',
  LoftSurface: 'LoftSurfaceFeature',
  BoundarySurface: 'BoundarySurfaceFeature',
  RuledSurface: 'RuledSurfaceFeature',
  PatchSurface: 'PatchSurfaceFeature',
  OffsetSurface: 'OffsetSurfaceFeature',
  ExtendSurface: 'ExtendSurfaceFeature',
  TrimSurface: 'TrimSurfaceFeature',
  UntrimSurface: 'UntrimSurfaceFeature',
  KnitSurface: 'KnitSurfaceFeature',
  SplitSurface: 'SplitSurfaceFeature',
  ThickenSurface: 'ThickenSurfaceFeature',
  StitchSurface: 'StitchSurfaceFeature',
} as const

export type FeatureType = (typeof FeatureType)[keyof typeof FeatureType]

export const FEATURE_TYPES: readonly FeatureType[] = Object.values(FeatureType)

/** The cut variants pair one-to-one with their additive counterparts. */
const CUT_OF: Partial<Record<FeatureType, FeatureType>> = {
  [FeatureType.Extrude]: FeatureType.CutExtrude,
  [FeatureType.Revolve]: FeatureType.CutRevolve,
  [FeatureType.Sweep]: FeatureType.CutSweep,
  [FeatureType.Loft]: FeatureType.CutLoft,
}

const ADDITIVE_OF: Partial<Record<FeatureType, FeatureType>> = Object.fromEntries(
  Object.entries(CUT_OF).map(([additive, cut]) => [cut, additive]),
) as Partial<Record<FeatureType, FeatureType>>

export function isCutFeature(type: FeatureType): boolean {
  return type in ADDITIVE_OF
}

/** The additive operation a cut feature is built on — itself when already additive. */
export function additiveEquivalent(type: FeatureType): FeatureType {
  return ADDITIVE_OF[type] ?? type
}

export function cutEquivalent(type: FeatureType): FeatureType {
  return CUT_OF[type] ?? type
}

/** Features that turn a sketch into new geometry rather than modifying a solid. */
export function isSketchFeature(type: FeatureType): boolean {
  switch (type) {
    case FeatureType.Extrude:
    case FeatureType.Revolve:
    case FeatureType.Sweep:
    case FeatureType.Loft:
    case FeatureType.CutExtrude:
    case FeatureType.CutRevolve:
    case FeatureType.CutSweep:
    case FeatureType.CutLoft:
    case FeatureType.Rib:
    case FeatureType.Hole:
    case FeatureType.BaseFlange:
    case FeatureType.ExtrudeSurface:
    case FeatureType.RevolveSurface:
    case FeatureType.SweepSurface:
    case FeatureType.PatchSurface:
      return true
    default:
      return false
  }
}

const LABELS: Record<FeatureType, string> = {
  [FeatureType.Extrude]: 'Extrude',
  [FeatureType.Revolve]: 'Revolve',
  [FeatureType.Sweep]: 'Sweep',
  [FeatureType.Loft]: 'Loft',
  [FeatureType.CutExtrude]: 'Extrude Cut',
  [FeatureType.CutRevolve]: 'Revolve Cut',
  [FeatureType.CutSweep]: 'Sweep Cut',
  [FeatureType.CutLoft]: 'Loft Cut',
  [FeatureType.Fillet]: 'Fillet',
  [FeatureType.Chamfer]: 'Chamfer',
  [FeatureType.Shell]: 'Shell',
  [FeatureType.Hole]: 'Hole',
  [FeatureType.Rib]: 'Rib',
  [FeatureType.Draft]: 'Draft',
  [FeatureType.Pattern]: 'Pattern',
  [FeatureType.Mirror]: 'Mirror',
  [FeatureType.Scale]: 'Scale',
  [FeatureType.Combine]: 'Combine',
  [FeatureType.Split]: 'Split',
  [FeatureType.DirectEdit]: 'Direct Edit',
  [FeatureType.BaseFlange]: 'Base Flange',
  [FeatureType.EdgeFlange]: 'Edge Flange',
  [FeatureType.MiterFlange]: 'Mitre Flange',
  [FeatureType.Hem]: 'Hem',
  [FeatureType.Jog]: 'Jog',
  [FeatureType.Unfold]: 'Unfold',
  [FeatureType.Refold]: 'Refold',
  [FeatureType.ExtrudeSurface]: 'Extruded Surface',
  [FeatureType.RevolveSurface]: 'Revolved Surface',
  [FeatureType.SweepSurface]: 'Swept Surface',
  [FeatureType.LoftSurface]: 'Lofted Surface',
  [FeatureType.BoundarySurface]: 'Boundary Surface',
  [FeatureType.RuledSurface]: 'Ruled Surface',
  [FeatureType.PatchSurface]: 'Patch',
  [FeatureType.OffsetSurface]: 'Offset Surface',
  [FeatureType.ExtendSurface]: 'Extend Surface',
  [FeatureType.TrimSurface]: 'Trim Surface',
  [FeatureType.UntrimSurface]: 'Untrim Surface',
  [FeatureType.KnitSurface]: 'Knit Surface',
  [FeatureType.SplitSurface]: 'Split Surface',
  [FeatureType.ThickenSurface]: 'Thicken',
  [FeatureType.StitchSurface]: 'Stitch',
}

const SHEET_METAL_TYPES: readonly FeatureType[] = [
  FeatureType.BaseFlange,
  FeatureType.EdgeFlange,
  FeatureType.MiterFlange,
  FeatureType.Hem,
  FeatureType.Jog,
  FeatureType.Unfold,
  FeatureType.Refold,
]

/** Features that belong to the sheet metal environment rather than the solid one. */
export function isSheetMetalFeature(type: FeatureType): boolean {
  return SHEET_METAL_TYPES.includes(type)
}

const SURFACE_TYPES: readonly FeatureType[] = [
  FeatureType.ExtrudeSurface,
  FeatureType.RevolveSurface,
  FeatureType.SweepSurface,
  FeatureType.LoftSurface,
  FeatureType.BoundarySurface,
  FeatureType.RuledSurface,
  FeatureType.PatchSurface,
  FeatureType.OffsetSurface,
  FeatureType.ExtendSurface,
  FeatureType.TrimSurface,
  FeatureType.UntrimSurface,
  FeatureType.KnitSurface,
  FeatureType.SplitSurface,
  FeatureType.ThickenSurface,
  FeatureType.StitchSurface,
]

/** Features that belong to the surface environment — see `surface/`. */
export function isSurfaceFeature(type: FeatureType): boolean {
  return SURFACE_TYPES.includes(type)
}

/**
 * Surface features that leave a solid behind rather than a sheet. They are the
 * bridge out of the surface environment, so a solid feature may depend on one.
 */
export function producesSolid(type: FeatureType): boolean {
  return type === FeatureType.ThickenSurface || type === FeatureType.StitchSurface
}

/** Human-readable name used for default feature names and tree rows. */
export function featureLabel(type: FeatureType): string {
  return LABELS[type]
}

export function isFeatureType(value: unknown): value is FeatureType {
  return typeof value === 'string' && (FEATURE_TYPES as readonly string[]).includes(value)
}
