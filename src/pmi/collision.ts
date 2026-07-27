import type { Vec3 } from '../domain/vec3'
import { add, cross, dot, normalize, scale, subtract } from '../domain/vec3'
import type { Vec2 } from '../sketch/domain/geometry'
import type { PmiAnnotation } from './PmiAnnotation'
import { formatPmiAnnotation } from './PmiAnnotation'
import type { PmiView, ViewDirection } from './PmiView'

/**
 * Keeping annotation labels off each other.
 *
 * PMI collides in a way drawing annotations mostly do not: a model carries
 * every view's dimensions in the same space, and two of them authored a week
 * apart land on top of each other the first time somebody turns the part.
 *
 * The approach is the cheap one that works. Labels are projected onto the plane
 * the reader is looking at, boxed by their text, and pushed apart along
 * whichever axis they overlap least — repeated a handful of times so a cluster
 * settles rather than swapping two labels back and forth forever. It runs on
 * the projection because that is where the overlap is: two labels a hundred
 * millimetres apart in depth still collide on screen.
 *
 * Everything here is pure. {@link layoutAnnotations} returns the moved
 * annotations; nothing is written back into a view unless the caller does it.
 */

/** An orthonormal frame for a view: right and up spanning the screen plane. */
export interface ViewFrame {
  readonly right: Vec3
  readonly up: Vec3
  readonly normal: Vec3
}

export function viewFrame(direction: ViewDirection): ViewFrame {
  const normal = normalize(direction.normal)
  // Gram-Schmidt: right is perpendicular to both, then up is squared up again
  // so a caller's roughly-up vector does not skew the frame.
  const right = normalize(cross(direction.up, normal))
  return { right, up: normalize(cross(normal, right)), normal }
}

/** A model-space point in the view's screen coordinates. */
export function projectToFrame(point: Vec3, frame: ViewFrame): Vec2 {
  return { x: dot(point, frame.right), y: dot(point, frame.up) }
}

/** A screen-space point back in model space, relative to `origin`. */
export function unprojectFromFrame(offset: Vec2, frame: ViewFrame, origin: Vec3): Vec3 {
  return add(add(origin, scale(frame.right, offset.x)), scale(frame.up, offset.y))
}

/** A label's footprint in the view plane, centred on the annotation's text. */
export interface LabelBox {
  readonly annotationId: string
  /** Centre of the label. */
  readonly center: Vec2
  readonly width: number
  readonly height: number
}

export interface LabelMetrics {
  /** Text height in document units when an annotation does not state one. */
  readonly textHeight?: number
  /** Width of one character as a fraction of the height. */
  readonly characterWidth?: number
  /** Blank space kept around every label, in document units. */
  readonly padding?: number
}

const DEFAULT_TEXT_HEIGHT = 3.5
const DEFAULT_CHARACTER_WIDTH = 0.62
const DEFAULT_PADDING = 0.8

/**
 * The box a label occupies. Text is measured as characters times a nominal
 * advance width rather than by a font: PMI is drawn in a single-line technical
 * font at a known height, and being a few percent out simply means labels sit a
 * little further apart than they had to.
 */
export function labelBox(
  annotation: PmiAnnotation,
  frame: ViewFrame,
  metrics: LabelMetrics = {},
): LabelBox {
  const height = annotation.textHeight ?? metrics.textHeight ?? DEFAULT_TEXT_HEIGHT
  const advance = metrics.characterWidth ?? DEFAULT_CHARACTER_WIDTH
  const padding = metrics.padding ?? DEFAULT_PADDING
  const text = formatPmiAnnotation(annotation)
  const lines = text.split('\n')
  const longest = lines.reduce((widest, line) => Math.max(widest, line.length), 0)

  return {
    annotationId: annotation.id,
    center: projectToFrame(annotation.position, frame),
    width: Math.max(1, longest) * height * advance + padding * 2,
    height: lines.length * height + padding * 2,
  }
}

export function labelBoxes(
  annotations: readonly PmiAnnotation[],
  frame: ViewFrame,
  metrics: LabelMetrics = {},
): LabelBox[] {
  return annotations.map((annotation) => labelBox(annotation, frame, metrics))
}

/** Whether two boxes share any area at all. Touching edges do not count. */
export function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
  return (
    Math.abs(a.center.x - b.center.x) < (a.width + b.width) / 2 &&
    Math.abs(a.center.y - b.center.y) < (a.height + b.height) / 2
  )
}

/** Every pair of labels that currently collide, each pair reported once. */
export function overlappingPairs(boxes: readonly LabelBox[]): [string, string][] {
  const pairs: [string, string][] = []
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i] as LabelBox
      const b = boxes[j] as LabelBox
      if (boxesOverlap(a, b)) pairs.push([a.annotationId, b.annotationId])
    }
  }
  return pairs
}

/** A box being pushed around by the separation pass. */
interface MutableLabelBox {
  readonly annotationId: string
  readonly center: { x: number; y: number }
  readonly width: number
  readonly height: number
}

export interface SeparationOptions {
  /** How many separation passes to run. */
  readonly iterations?: number
  /** Fraction of the overlap resolved per pass, per label. */
  readonly relaxation?: number
  /** Labels that must not move — the one the user is dragging, typically. */
  readonly pinned?: readonly string[]
}

/**
 * Pushes overlapping labels apart.
 *
 * Each colliding pair is separated along the axis it overlaps *least*, which is
 * what keeps a row of dimensions in a row instead of scattering it. Both labels
 * of a pair move half the distance, so nothing drifts far from where it was
 * authored, and pinned labels take the whole correction on the other side.
 */
export function separateLabels(
  boxes: readonly LabelBox[],
  options: SeparationOptions = {},
): LabelBox[] {
  const iterations = options.iterations ?? 12
  const relaxation = options.relaxation ?? 0.5
  const pinned = new Set(options.pinned ?? [])
  const working: MutableLabelBox[] = boxes.map((box) => ({
    annotationId: box.annotationId,
    center: { x: box.center.x, y: box.center.y },
    width: box.width,
    height: box.height,
  }))

  for (let pass = 0; pass < iterations; pass += 1) {
    let moved = false

    for (let i = 0; i < working.length; i += 1) {
      for (let j = i + 1; j < working.length; j += 1) {
        const a = working[i] as MutableLabelBox
        const b = working[j] as MutableLabelBox
        if (!boxesOverlap(a, b)) continue

        const dx = b.center.x - a.center.x
        const dy = b.center.y - a.center.y
        const overlapX = (a.width + b.width) / 2 - Math.abs(dx)
        const overlapY = (a.height + b.height) / 2 - Math.abs(dy)

        const aPinned = pinned.has(a.annotationId)
        const bPinned = pinned.has(b.annotationId)
        if (aPinned && bPinned) continue

        // Two labels at exactly the same spot have no direction to separate
        // along, so they are nudged apart on x to break the tie.
        const push = (axis: 'x' | 'y', overlap: number, delta: number): void => {
          const direction = delta === 0 ? 1 : Math.sign(delta)
          const step = overlap * relaxation * direction
          if (aPinned) b.center[axis] += step * 2
          else if (bPinned) a.center[axis] -= step * 2
          else {
            a.center[axis] -= step
            b.center[axis] += step
          }
          moved = true
        }

        if (overlapX < overlapY) push('x', overlapX, dx)
        else push('y', overlapY, dy)
      }
    }
    if (!moved) break
  }
  return working
}

export interface LayoutOptions extends SeparationOptions, LabelMetrics {}

export interface LayoutResult {
  /** The annotations, with any that had to move carrying a new `position`. */
  readonly annotations: readonly PmiAnnotation[]
  /** Ids of the annotations that were moved. */
  readonly moved: readonly string[]
  /** Pairs that still overlapped after the last pass. */
  readonly remaining: readonly [string, string][]
}

/**
 * Lays out a view's annotations so their labels do not overlap when read from
 * that view's direction. Annotations that were already clear come back
 * untouched — identity is preserved, so React can tell what changed.
 */
export function layoutAnnotations(
  annotations: readonly PmiAnnotation[],
  direction: ViewDirection,
  options: LayoutOptions = {},
): LayoutResult {
  const frame = viewFrame(direction)
  const before = labelBoxes(annotations, frame, options)
  const after = separateLabels(before, options)
  const moved: string[] = []

  const laidOut = annotations.map((annotation, index) => {
    const original = before[index] as LabelBox
    const settled = after[index] as LabelBox
    const dx = settled.center.x - original.center.x
    const dy = settled.center.y - original.center.y
    if (dx === 0 && dy === 0) return annotation

    moved.push(annotation.id)
    return {
      ...annotation,
      position: add(
        annotation.position,
        add(scale(frame.right, dx), scale(frame.up, dy)),
      ),
    } as PmiAnnotation
  })

  return { annotations: laidOut, moved, remaining: overlappingPairs(after) }
}

/** Lays out one view's annotations and writes the result back into it. */
export function relaxView(view: PmiView, options: LayoutOptions = {}): LayoutResult {
  const result = layoutAnnotations(view.annotations, view.viewDirection, options)
  view.annotations = [...result.annotations]
  return result
}

/**
 * How far a label sits from the geometry its leader points at, in the view
 * plane. Used to keep a nudged label from wandering away from its feature.
 */
export function leaderLength(annotation: PmiAnnotation, frame: ViewFrame): number {
  const attachment = annotation.leaders?.[0]?.attachment.point
  if (!attachment) return 0
  const delta = subtract(annotation.position, attachment)
  return Math.hypot(dot(delta, frame.right), dot(delta, frame.up))
}
