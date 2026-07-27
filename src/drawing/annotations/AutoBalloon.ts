import type { AssemblyTree } from '../../assembly/AssemblyTree'
import type { BomEntry, PartCatalog } from '../../assembly/AssemblyFeatures'
import { billOfMaterials } from '../../assembly/AssemblyFeatures'
import type { Vec3 } from '../../domain/vec3'
import type { Vec2 } from '../../sketch/domain/geometry'
import type { BalloonAnnotation, BalloonShape } from '../domain/Annotation'
import { newAnnotationId } from '../domain/Annotation'

/**
 * Auto-ballooning: one numbered balloon per unique component in an assembly
 * view, laid out so the numbers can actually be read.
 *
 * The hard part of ballooning is never the circles, it is that a dozen leaders
 * pointing into the middle of a view produce a knot. So the balloons are placed
 * outside the view first — on a ring, a row or a column, whichever suits the
 * drawing — and only then nudged apart where they still collide. Placing them
 * outside and pushing in beats placing them on the parts and pulling out: the
 * leaders end up short, roughly radial, and crossing far less often.
 *
 * Numbering is BOM item numbers, not balloon-placement order. A balloon that
 * says 4 must mean line 4 of the parts list however the balloons were laid out,
 * so {@link autoBalloon} takes the BOM as the authority and every balloon it
 * returns comes with the link back to its entry.
 */

/** A component in the view, and where its leader should land. */
export interface BalloonTarget {
  readonly componentId: string
  readonly partId: string | null
  readonly name: string
  /** Where the leader points, in the view's local millimetres. */
  readonly attachment: Vec2
}

/**
 * The unique components of an assembly, projected into a view.
 *
 * `project` is the view's own model-to-sheet transform — the drawing code that
 * built the view owns it, so nothing here has to know about cameras. Components
 * the projection cannot place are left out rather than ballooned at the origin.
 */
export function balloonTargets(
  tree: AssemblyTree,
  project: (position: Vec3, componentId: string) => Vec2 | null,
): BalloonTarget[] {
  const seen = new Set<string>()
  const targets: BalloonTarget[] = []

  for (const component of tree.components) {
    // One balloon per part, not per instance: eight identical screws get one
    // balloon reading "8" from the BOM, which is what a parts list means.
    const key = component.partId ?? `assembly:${component.name}`
    if (seen.has(key)) continue

    const attachment = project(component.transform.position, component.id)
    if (attachment === null) continue

    seen.add(key)
    targets.push({
      componentId: component.id,
      partId: component.partId,
      name: component.name,
      attachment,
    })
  }
  return targets
}

export const BALLOON_NUMBERINGS = ['bom', 'sequential', 'name'] as const

export type BalloonNumbering = (typeof BALLOON_NUMBERINGS)[number]

export const BALLOON_LAYOUTS = ['auto', 'radial', 'horizontal', 'vertical'] as const

export type BalloonLayout = (typeof BALLOON_LAYOUTS)[number]

export interface AutoBalloonOptions {
  readonly viewId: string
  /** The parts list the item numbers come from. Built from the tree if absent. */
  readonly bom?: readonly BomEntry[]
  readonly catalog?: PartCatalog
  readonly numbering?: BalloonNumbering
  readonly layout?: BalloonLayout
  readonly shape?: BalloonShape
  /** Balloon radius in sheet millimetres. */
  readonly radius?: number
  /** How far outside the view's extent the balloons sit, in millimetres. */
  readonly standoff?: number
  /** Shows the line quantity under the item number. */
  readonly showQuantity?: boolean
  /** Extent of the view's geometry, for placing the ring. Derived if absent. */
  readonly extent?: BalloonExtent
}

export interface BalloonExtent {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}

/** A balloon and the BOM line it stands for. */
export interface BalloonLink {
  readonly balloon: BalloonAnnotation
  readonly itemNumber: number
  readonly bomEntryId: string
  readonly componentId: string
  readonly partId: string | null
  readonly quantity: number
}

export interface AutoBalloonResult {
  readonly balloons: readonly BalloonAnnotation[]
  readonly links: readonly BalloonLink[]
  /** Targets that had no BOM line — nothing to number them with. */
  readonly unmatched: readonly BalloonTarget[]
}

const DEFAULT_RADIUS = 4
const DEFAULT_STANDOFF = 12

/**
 * Balloons for every target, numbered from the BOM and laid out clear of the
 * view and of each other.
 */
export function autoBalloon(
  targets: readonly BalloonTarget[],
  tree: AssemblyTree,
  options: AutoBalloonOptions,
): AutoBalloonResult {
  const bom = options.bom ?? billOfMaterials(tree, options.catalog ?? new Map())
  const radius = options.radius ?? DEFAULT_RADIUS
  const shape = options.shape ?? 'circle'

  const numbered = numberTargets(targets, bom, options.numbering ?? 'bom')
  const placed = layoutBalloons(
    numbered.map((entry) => entry.target),
    options.layout ?? 'auto',
    {
      radius,
      standoff: options.standoff ?? DEFAULT_STANDOFF,
      extent: options.extent ?? extentOf(targets),
    },
  )

  const links: BalloonLink[] = numbered.map((entry, index) => {
    const balloon: BalloonAnnotation = {
      id: newAnnotationId(),
      type: 'balloon',
      viewId: options.viewId,
      position: placed[index] as Vec2,
      label: String(entry.itemNumber),
      radius,
      shape,
      attachment: entry.target.attachment,
      ...(options.showQuantity === true ? { quantity: entry.entry.quantity } : {}),
    }
    return {
      balloon,
      itemNumber: entry.itemNumber,
      bomEntryId: entry.entry.id,
      componentId: entry.target.componentId,
      partId: entry.target.partId,
      quantity: entry.entry.quantity,
    }
  })

  return {
    balloons: links.map((link) => link.balloon),
    links,
    unmatched: numbered.length === targets.length ? [] : unmatchedTargets(targets, numbered),
  }
}

interface NumberedTarget {
  readonly target: BalloonTarget
  readonly entry: BomEntry
  readonly itemNumber: number
}

/**
 * Pairs each target with its BOM line and its item number.
 *
 * `bom` numbers by the parts list, which is the only mode that keeps a balloon
 * and a BOM row agreeing. `sequential` numbers in the order the components were
 * found, and `name` alphabetically — both useful when the drawing is the
 * authority and the BOM is generated from it.
 */
function numberTargets(
  targets: readonly BalloonTarget[],
  bom: readonly BomEntry[],
  numbering: BalloonNumbering,
): NumberedTarget[] {
  const byKey = new Map<string, { entry: BomEntry; item: number }>()
  bom.forEach((entry, index) => {
    byKey.set(entry.id, { entry, item: index + 1 })
  })

  const matched: { target: BalloonTarget; entry: BomEntry; bomItem: number }[] = []
  for (const target of targets) {
    const key = target.partId ?? `assembly:${target.name}`
    const found = byKey.get(key)
    if (!found) continue
    matched.push({ target, entry: found.entry, bomItem: found.item })
  }

  if (numbering === 'bom') {
    return matched
      .sort((a, b) => a.bomItem - b.bomItem)
      .map((entry) => ({ target: entry.target, entry: entry.entry, itemNumber: entry.bomItem }))
  }

  const ordered =
    numbering === 'name'
      ? [...matched].sort((a, b) => a.target.name.localeCompare(b.target.name))
      : matched

  return ordered.map((entry, index) => ({
    target: entry.target,
    entry: entry.entry,
    itemNumber: index + 1,
  }))
}

function unmatchedTargets(
  targets: readonly BalloonTarget[],
  numbered: readonly NumberedTarget[],
): BalloonTarget[] {
  const placed = new Set(numbered.map((entry) => entry.target.componentId))
  return targets.filter((target) => !placed.has(target.componentId))
}

/** The bounding box of every attachment point, or a unit box when there are none. */
export function extentOf(targets: readonly BalloonTarget[]): BalloonExtent {
  if (targets.length === 0) return { minX: -1, minY: -1, maxX: 1, maxY: 1 }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const target of targets) {
    minX = Math.min(minX, target.attachment.x)
    minY = Math.min(minY, target.attachment.y)
    maxX = Math.max(maxX, target.attachment.x)
    maxY = Math.max(maxY, target.attachment.y)
  }
  return { minX, minY, maxX, maxY }
}

export interface LayoutSettings {
  readonly radius: number
  readonly standoff: number
  readonly extent: BalloonExtent
}

/** Where each balloon sits, in the same order as `targets`. */
export function layoutBalloons(
  targets: readonly BalloonTarget[],
  layout: BalloonLayout,
  settings: LayoutSettings,
): Vec2[] {
  if (targets.length === 0) return []

  const positions =
    layout === 'horizontal'
      ? rowLayout(targets, settings)
      : layout === 'vertical'
        ? columnLayout(targets, settings)
        : radialLayout(targets, settings)

  // Radial placement can still collide when two parts sit at the same angle;
  // `auto` is radial plus the clean-up pass. The explicit layouts are left
  // exactly as asked for, because a row the user asked for should stay a row.
  return layout === 'auto' ? separateBalloons(positions, settings.radius) : positions
}

/**
 * Balloons on a ring around the view, each at the angle of the part it points
 * at. The ring is an ellipse fitted to the view's extent so a long, flat
 * assembly gets a long, flat ring rather than a circle with acres of gap.
 */
function radialLayout(targets: readonly BalloonTarget[], settings: LayoutSettings): Vec2[] {
  const { extent, standoff, radius } = settings
  const centerX = (extent.minX + extent.maxX) / 2
  const centerY = (extent.minY + extent.maxY) / 2
  const radiusX = (extent.maxX - extent.minX) / 2 + standoff + radius
  const radiusY = (extent.maxY - extent.minY) / 2 + standoff + radius

  return targets.map((target, index) => {
    const dx = target.attachment.x - centerX
    const dy = target.attachment.y - centerY
    // A part dead centre has no direction of its own, so it is spread around
    // the ring by its index instead of piling up at angle zero.
    const angle =
      dx === 0 && dy === 0 ? (index / targets.length) * Math.PI * 2 : Math.atan2(dy, dx)
    return { x: centerX + Math.cos(angle) * radiusX, y: centerY + Math.sin(angle) * radiusY }
  })
}

/** A row above the view, ordered left to right by where the parts sit. */
function rowLayout(targets: readonly BalloonTarget[], settings: LayoutSettings): Vec2[] {
  const { extent, standoff, radius } = settings
  const y = extent.maxY + standoff + radius
  const order = [...targets.keys()].sort(
    (a, b) =>
      (targets[a] as BalloonTarget).attachment.x - (targets[b] as BalloonTarget).attachment.x,
  )
  const pitch = Math.max(radius * 2.5, (extent.maxX - extent.minX) / Math.max(1, targets.length - 1))
  const startX = extent.minX

  const positions = new Array<Vec2>(targets.length)
  order.forEach((targetIndex, slot) => {
    positions[targetIndex] = { x: startX + slot * pitch, y }
  })
  return positions
}

/** A column to the right of the view, ordered bottom to top. */
function columnLayout(targets: readonly BalloonTarget[], settings: LayoutSettings): Vec2[] {
  const { extent, standoff, radius } = settings
  const x = extent.maxX + standoff + radius
  const order = [...targets.keys()].sort(
    (a, b) =>
      (targets[a] as BalloonTarget).attachment.y - (targets[b] as BalloonTarget).attachment.y,
  )
  const pitch = Math.max(radius * 2.5, (extent.maxY - extent.minY) / Math.max(1, targets.length - 1))
  const startY = extent.minY

  const positions = new Array<Vec2>(targets.length)
  order.forEach((targetIndex, slot) => {
    positions[targetIndex] = { x, y: startY + slot * pitch }
  })
  return positions
}

/**
 * Pushes overlapping balloons apart along the line between them, a fraction of
 * the overlap per pass so a crowded cluster relaxes instead of exploding.
 */
export function separateBalloons(
  positions: readonly Vec2[],
  radius: number,
  iterations = 24,
): Vec2[] {
  const minimum = radius * 2.2
  const working = positions.map((position) => ({ x: position.x, y: position.y }))

  for (let pass = 0; pass < iterations; pass += 1) {
    let moved = false
    for (let i = 0; i < working.length; i += 1) {
      for (let j = i + 1; j < working.length; j += 1) {
        const a = working[i] as { x: number; y: number }
        const b = working[j] as { x: number; y: number }
        const dx = b.x - a.x
        const dy = b.y - a.y
        const distance = Math.hypot(dx, dy)
        if (distance >= minimum) continue

        // Coincident balloons are separated along x, which at least gives the
        // next pass something to work with.
        const ux = distance === 0 ? 1 : dx / distance
        const uy = distance === 0 ? 0 : dy / distance
        const push = (minimum - distance) / 2
        a.x -= ux * push
        a.y -= uy * push
        b.x += ux * push
        b.y += uy * push
        moved = true
      }
    }
    if (!moved) break
  }
  return working
}

/** Whether any two balloons still overlap — what a test or a warning asks. */
export function balloonsOverlap(positions: readonly Vec2[], radius: number): boolean {
  for (let i = 0; i < positions.length; i += 1) {
    for (let j = i + 1; j < positions.length; j += 1) {
      const a = positions[i] as Vec2
      const b = positions[j] as Vec2
      if (Math.hypot(b.x - a.x, b.y - a.y) < radius * 2) return true
    }
  }
  return false
}
