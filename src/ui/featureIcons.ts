import { FeatureType } from '../features/domain/FeatureType'
import type { IconName } from './Icon'

/**
 * The icon each kind of feature wears, everywhere it appears.
 *
 * One map rather than one per panel: the browser row, the ribbon command and
 * the inspector heading for an extrude have to be the same picture, or the user
 * has to learn the feature set once per surface. Kinds that are variations on
 * the same operation — an extrude and an extrude cut, a revolve and a revolved
 * surface — deliberately share a glyph, because they are the same gesture
 * applied differently, and the label beside it is what tells them apart.
 */
const FEATURE_ICONS: Record<FeatureType, IconName> = {
  [FeatureType.Extrude]: 'extrude',
  [FeatureType.Revolve]: 'revolve',
  [FeatureType.Sweep]: 'sweep',
  [FeatureType.Loft]: 'loft',
  [FeatureType.CutExtrude]: 'extrude',
  [FeatureType.CutRevolve]: 'revolve',
  [FeatureType.CutSweep]: 'sweep',
  [FeatureType.CutLoft]: 'loft',
  [FeatureType.Fillet]: 'fillet',
  [FeatureType.Chamfer]: 'chamfer',
  [FeatureType.Shell]: 'shell',
  [FeatureType.Hole]: 'hole',
  [FeatureType.Rib]: 'rib',
  [FeatureType.Draft]: 'draft',
  [FeatureType.Pattern]: 'pattern',
  [FeatureType.Mirror]: 'mirror',
  [FeatureType.Scale]: 'scale',
  [FeatureType.Combine]: 'combine',
  [FeatureType.Split]: 'split',
  [FeatureType.DirectEdit]: 'direct-edit',
  [FeatureType.BaseFlange]: 'sheet-metal',
  [FeatureType.EdgeFlange]: 'sheet-metal',
  [FeatureType.MiterFlange]: 'sheet-metal',
  [FeatureType.Hem]: 'sheet-metal',
  [FeatureType.Jog]: 'sheet-metal',
  [FeatureType.Unfold]: 'sheet-metal',
  [FeatureType.Refold]: 'sheet-metal',
  [FeatureType.ExtrudeSurface]: 'extrude',
  [FeatureType.RevolveSurface]: 'revolve',
  [FeatureType.SweepSurface]: 'sweep',
  [FeatureType.LoftSurface]: 'loft',
  [FeatureType.BoundarySurface]: 'surface',
  [FeatureType.RuledSurface]: 'surface',
  [FeatureType.PatchSurface]: 'surface',
  [FeatureType.OffsetSurface]: 'surface',
  [FeatureType.ExtendSurface]: 'surface',
  [FeatureType.TrimSurface]: 'split',
  [FeatureType.UntrimSurface]: 'surface',
  [FeatureType.KnitSurface]: 'combine',
  [FeatureType.SplitSurface]: 'split',
  [FeatureType.ThickenSurface]: 'shell',
  [FeatureType.StitchSurface]: 'combine',
}

export function featureIconName(type: FeatureType): IconName {
  return FEATURE_ICONS[type]
}
