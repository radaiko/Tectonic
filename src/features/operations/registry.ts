import { FeatureType } from '../domain/FeatureType'
import { chamferOperation } from './ChamferOperation'
import { combineOperation } from './CombineOperation'
import { cutOperation } from './CutOperation'
import { directEditOperation } from './DirectEditOperation'
import { draftOperation } from './DraftOperation'
import { extrudeOperation } from './ExtrudeOperation'
import { filletOperation } from './FilletOperation'
import { holeOperation } from './HoleOperation'
import { loftOperation } from './LoftOperation'
import { mirrorOperation } from './MirrorOperation'
import { patternOperation } from './PatternOperation'
import { revolveOperation } from './RevolveOperation'
import { ribOperation } from './RibOperation'
import { scaleOperation } from './ScaleOperation'
import { shellOperation } from './ShellOperation'
import { splitOperation } from './SplitOperation'
import { sweepOperation } from './SweepOperation'
import type { FeatureOperation } from './types'

/**
 * The one place a feature kind is bound to the code that builds it. Every entry
 * is required, so adding a {@link FeatureType} without an operation is a
 * compile error rather than a rebuild that quietly skips it.
 */
const OPERATIONS: Record<FeatureType, FeatureOperation> = {
  [FeatureType.Extrude]: extrudeOperation,
  [FeatureType.Revolve]: revolveOperation,
  [FeatureType.Sweep]: sweepOperation,
  [FeatureType.Loft]: loftOperation,
  [FeatureType.CutExtrude]: cutOperation,
  [FeatureType.CutRevolve]: cutOperation,
  [FeatureType.CutSweep]: cutOperation,
  [FeatureType.CutLoft]: cutOperation,
  [FeatureType.Fillet]: filletOperation,
  [FeatureType.Chamfer]: chamferOperation,
  [FeatureType.Shell]: shellOperation,
  [FeatureType.Hole]: holeOperation,
  [FeatureType.Rib]: ribOperation,
  [FeatureType.Draft]: draftOperation,
  [FeatureType.Pattern]: patternOperation,
  [FeatureType.Mirror]: mirrorOperation,
  [FeatureType.Scale]: scaleOperation,
  [FeatureType.Combine]: combineOperation,
  [FeatureType.Split]: splitOperation,
  [FeatureType.DirectEdit]: directEditOperation,
}

export function featureOperation(type: FeatureType): FeatureOperation {
  return OPERATIONS[type]
}
