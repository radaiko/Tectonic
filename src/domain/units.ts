import type { LengthUnit } from './Document'

/**
 * Length units, and what they are worth in millimetres.
 *
 * This lives in the domain rather than in one pipeline because everything that
 * has to put a model on paper needs it: the exporters, and the drawing sheet,
 * whose own coordinates are always millimetres no matter what the model is
 * modelled in.
 */

/** Millimetres per unit, for every unit the document can be expressed in. */
export const MILLIMETRES_PER_UNIT: Readonly<Record<LengthUnit, number>> = {
  mm: 1,
  cm: 10,
  m: 1000,
  in: 25.4,
  ft: 304.8,
}

/** Factor that converts a length in `from` to the same length in `to`. */
export function unitScale(from: LengthUnit, to: LengthUnit): number {
  return MILLIMETRES_PER_UNIT[from] / MILLIMETRES_PER_UNIT[to]
}

/** How many millimetres one unit of `units` measures. */
export function millimetresPerUnit(units: LengthUnit): number {
  return MILLIMETRES_PER_UNIT[units]
}
