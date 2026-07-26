import { newId } from '../sketch/domain/ids'
import type { SheetMetalParameters } from './SheetMetalParameters'
import type { EdgeFlangeSpec } from './EdgeFlange'
import { DEFAULT_FLANGE_ANGLE, createEdgeFlange } from './EdgeFlange'
import type { LengthMode, ReliefType, SheetEdge } from './types'
import { LENGTH_MODES, RELIEF_TYPES, SheetMetalError } from './types'

/** Corners closer to straight than this are treated as having no corner at all. */
const COLLINEAR_TOLERANCE = 1e-6

export interface MiterFlangeSpec {
  readonly id: string
  /** Edges the flange runs along, in any order. */
  readonly edgeIndices: readonly number[]
  readonly length: number
  readonly angle: number
  readonly radius: number | null
  readonly lengthMode: LengthMode
  readonly flip: boolean
  /** Opening left between two flanges that meet at a corner. */
  readonly gap: number
  readonly relief: ReliefType
}

export interface MiterFlangeInit {
  readonly id?: string
  readonly edgeIndices: readonly number[]
  readonly length?: number
  readonly angle?: number
  readonly radius?: number | null
  readonly lengthMode?: LengthMode
  readonly flip?: boolean
  readonly gap?: number
  readonly relief?: ReliefType
}

export function createMiterFlange(init: MiterFlangeInit): MiterFlangeSpec {
  const spec: MiterFlangeSpec = {
    id: init.id ?? newId(),
    edgeIndices: [...new Set(init.edgeIndices.map((index) => Math.trunc(index)))],
    length: init.length ?? 10,
    angle: init.angle ?? DEFAULT_FLANGE_ANGLE,
    radius: init.radius ?? null,
    lengthMode: LENGTH_MODES.includes(init.lengthMode as LengthMode)
      ? (init.lengthMode as LengthMode)
      : 'outside',
    flip: init.flip ?? false,
    gap: init.gap ?? 0,
    relief: RELIEF_TYPES.includes(init.relief as ReliefType)
      ? (init.relief as ReliefType)
      : 'rectangular',
  }
  if (spec.edgeIndices.length === 0) {
    throw new SheetMetalError('A mitre flange needs at least one edge')
  }
  if (!(spec.gap >= 0)) throw new SheetMetalError('A mitre gap cannot be negative')
  return spec
}

/**
 * Expands one mitre flange into the individual flanges it stands for.
 *
 * Where two of the selected edges meet, both flanges are pulled back from the
 * shared corner so they butt on the bisector instead of driving through each
 * other. The pull-back is measured at mid-thickness — a flat pattern has no
 * thickness to cut a true mitre through — plus half the requested gap.
 */
export function expandMiterFlange(
  spec: MiterFlangeSpec,
  edges: readonly SheetEdge[],
  parameters: SheetMetalParameters,
): EdgeFlangeSpec[] {
  const selected = new Set(spec.edgeIndices)
  for (const index of selected) {
    if (!edges[index]) throw new SheetMetalError(`This face has no edge ${index}`)
  }

  return spec.edgeIndices.map((index) => {
    const previous = (index - 1 + edges.length) % edges.length
    const next = (index + 1) % edges.length
    return createEdgeFlange({
      id: `${spec.id}-${index}`,
      edgeIndex: index,
      length: spec.length,
      angle: spec.angle,
      radius: spec.radius,
      lengthMode: spec.lengthMode,
      flip: spec.flip,
      miteredCorners: true,
      relief: spec.relief,
      trimStart: selected.has(previous)
        ? cornerTrim(edges, previous, index, spec.gap, parameters)
        : 0,
      trimEnd: selected.has(next) ? cornerTrim(edges, index, next, spec.gap, parameters) : 0,
    })
  })
}

/**
 * How far a flange retreats from the corner it shares with the next one along:
 * half the sheet's thickness measured across the corner, plus half the gap.
 */
export function cornerTrim(
  edges: readonly SheetEdge[],
  fromIndex: number,
  toIndex: number,
  gap: number,
  parameters: SheetMetalParameters,
): number {
  const from = edges[fromIndex]
  const to = edges[toIndex]
  if (!from || !to) throw new SheetMetalError('A mitre needs two edges that share a corner')

  const cross = from.direction.x * to.direction.y - from.direction.y * to.direction.x
  const dot = from.direction.x * to.direction.x + from.direction.y * to.direction.y
  const interior = Math.PI - Math.atan2(cross, dot)
  const spread = Math.abs(Math.sin(interior))

  return spread < COLLINEAR_TOLERANCE
    ? gap / 2
    : parameters.thickness / (2 * spread) + gap / 2
}
