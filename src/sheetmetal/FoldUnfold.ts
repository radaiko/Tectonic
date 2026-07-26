import type { IKernel, ShapeHandle } from '../kernel/IKernel'
import { offsetFrame } from '../features/geometry/plane'
import { isPointInside } from '../features/geometry/profile'
import { newId } from '../sketch/domain/ids'
import type { Vec2 } from '../sketch/domain/geometry'
import type { FlatBendZone, FlatPattern } from './FlatPattern'
import { flatPattern } from './FlatPattern'
import type { SheetMetalPart } from './SheetMetalPart'
import { normalizeLoop } from './geometry'
import { SheetMetalError } from './types'

/** A hole drawn on the flat pattern while the part is unfolded. */
export interface FlatCut {
  readonly id: string
  readonly loop: readonly Vec2[]
}

/**
 * The fold state of a sheet metal part.
 *
 * Unfolding does not change the model: the bends are still there, they are just
 * not being applied. That is what makes a cut drawn while unfolded survive the
 * refold — it is stored in flat coordinates and re-read against the same
 * pattern every time.
 *
 * Cuts that fall entirely inside the base face are carried into the folded
 * solid. Cuts on a flange, or across a bend, are kept and reported but are only
 * applied to the flat body — mapping material back around a bend needs the
 * B-Rep kernel, not a tessellation.
 */
export class FoldUnfold {
  readonly part: SheetMetalPart
  #unfolded = false
  #cuts: FlatCut[] = []

  constructor(part: SheetMetalPart) {
    this.part = part
  }

  get isUnfolded(): boolean {
    return this.#unfolded
  }

  get cuts(): readonly FlatCut[] {
    return this.#cuts
  }

  /** Flattens the part for editing and hands back the pattern to draw on. */
  unfold(): FlatPattern {
    this.#unfolded = true
    return this.pattern()
  }

  /** Puts the bends back. Cuts drawn while flat are kept. */
  refold(): SheetMetalPart {
    this.#unfolded = false
    return this.part
  }

  pattern(): FlatPattern {
    return flatPattern(this.part)
  }

  /** Records a cut. Only legal while the part is unfolded. */
  addCut(loop: readonly Vec2[], id = newId()): FlatCut {
    if (!this.#unfolded) {
      throw new SheetMetalError('Unfold the part before cutting across its bends')
    }
    const cut: FlatCut = { id, loop: normalizeLoop(loop) }
    this.#cuts.push(cut)
    return cut
  }

  removeCut(id: string): boolean {
    const index = this.#cuts.findIndex((cut) => cut.id === id)
    if (index === -1) return false
    this.#cuts.splice(index, 1)
    return true
  }

  /** The bend zones a cut runs into, in pattern order. */
  bendsCrossed(cut: FlatCut): FlatBendZone[] {
    return this.pattern().bendZones.filter((zone) => overlapsZone(cut.loop, zone))
  }

  /** Whether a cut spans a bend rather than sitting on one flat face. */
  isAcrossBend(cut: FlatCut): boolean {
    return this.bendsCrossed(cut).length > 0
  }

  /** Whether a cut can be carried into the folded solid as it stands. */
  liesOnBaseFace(cut: FlatCut): boolean {
    if (this.part.base.profileKind !== 'closed') return false
    const face = normalizeLoop(this.part.base.points)
    return cut.loop.every((point) => isPointInside(point, face))
  }

  /**
   * The body as it currently stands: flat while unfolded, folded otherwise,
   * with whichever cuts apply to that state taken out of it.
   */
  async build(kernel: IKernel): Promise<ShapeHandle> {
    const shape = this.#unfolded ? await this.#buildFlat(kernel) : await this.part.build(kernel)
    const cuts = this.#unfolded ? this.#cuts : this.#cuts.filter((cut) => this.liesOnBaseFace(cut))
    return this.#subtract(kernel, shape, cuts)
  }

  async #buildFlat(kernel: IKernel): Promise<ShapeHandle> {
    const pattern = this.pattern()
    return kernel.extrude({
      profile: { points: normalizeLoop(pattern.outline), holes: pattern.holes },
      distance: this.part.parameters.thickness,
      plane: this.part.frame,
    })
  }

  async #subtract(
    kernel: IKernel,
    shape: ShapeHandle,
    cuts: readonly FlatCut[],
  ): Promise<ShapeHandle> {
    const thickness = this.part.parameters.thickness
    let current = shape

    for (const cut of cuts) {
      const tool = await kernel.extrude({
        profile: { points: cut.loop },
        distance: thickness * 3,
        plane: offsetFrame(this.part.frame, -thickness),
      })
      const result = await kernel.booleanSubtract(current, tool)
      kernel.dispose(current)
      kernel.dispose(tool)
      current = result
    }
    return current
  }
}

/** Whether a loop reaches into the strip of material a bend consumes. */
function overlapsZone(loop: readonly Vec2[], zone: FlatBendZone): boolean {
  const corners = zone.corners
  if (corners.length < 4) return false
  if (loop.some((point) => isPointInside(point, corners))) return true
  // A cut can also swallow a bend whole, in which case no corner is outside it.
  return corners.some((corner) => isPointInside(corner, loop))
}
