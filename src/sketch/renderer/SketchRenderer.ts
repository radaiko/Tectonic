import type { Constraint } from '../domain/Constraint'
import { isDimensional } from '../domain/Constraint'
import type { SketchEntity } from '../domain/SketchEntity'
import type { SketchModel } from '../domain/SketchModel'
import type { Vec2 } from '../domain/geometry'
import { TAU, angleOf, midpoint, normalize, scale as scaleVec, sub } from '../domain/geometry'
import { arcAngles, tessellate } from '../domain/query'
import type { SnapCandidate } from '../snapping/SnapSystem'
import type { SketchView } from './view'
import { screenToWorld, worldToScreen } from './view'

/** Palette shared by the canvas renderer and the surrounding React chrome. */
export const SKETCH_COLORS = {
  background: '#14171a',
  grid: '#22272c',
  gridMajor: '#2c3238',
  axisX: '#b4574f',
  axisY: '#5f9450',
  geometry: '#dfe5ea',
  point: '#dfe5ea',
  construction: '#7d8892',
  selected: '#4d9bd9',
  hovered: '#8fc6ee',
  underConstrained: '#d99341',
  snap: '#4dd98f',
  dimension: '#c9a227',
  constraintIcon: '#8d99a4',
  preview: '#4d9bd9',
} as const

/** Rubber-band overlay a tool wants drawn on top of the sketch. */
export type PreviewShape =
  | { readonly kind: 'polyline'; readonly points: readonly Vec2[]; readonly closed?: boolean }
  | { readonly kind: 'circle'; readonly center: Vec2; readonly radius: number }
  | {
      readonly kind: 'arc'
      readonly center: Vec2
      readonly radius: number
      readonly startAngle: number
      readonly endAngle: number
      readonly clockwise: boolean
    }
  | { readonly kind: 'box'; readonly from: Vec2; readonly to: Vec2 }

export interface RenderOptions {
  readonly view: SketchView
  readonly devicePixelRatio?: number
  readonly showGrid?: boolean
  readonly showConstraints?: boolean
  readonly showDimensions?: boolean
  readonly selectedEntityIds?: readonly string[]
  readonly hoveredEntityId?: string | null
  readonly underConstrainedEntityIds?: readonly string[]
  readonly snap?: SnapCandidate | null
  readonly preview?: PreviewShape | null
}

/** Where a dimension label ended up, so the UI can put an input box on it. */
export interface DimensionLabel {
  readonly constraintId: string
  readonly text: string
  /** Screen-space centre of the label, in CSS pixels. */
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface RenderLayout {
  readonly dimensionLabels: DimensionLabel[]
}

const GEOMETRY_WIDTH = 1.5
const EMPHASIS_WIDTH = 2.5
const CONSTRUCTION_DASH = [5, 4]
const POINT_RADIUS = 3
const LABEL_HEIGHT = 14
const MIN_GRID_PIXELS = 4

/** Badge text drawn next to a constrained entity. */
export const CONSTRAINT_ICONS: Readonly<Record<string, string>> = {
  coincident: '•',
  horizontal: 'H',
  vertical: 'V',
  parallel: '∥',
  perpendicular: '⊥',
  tangent: 'T',
  concentric: '◎',
  collinear: '≡',
  equal: '=',
  midpoint: '◆',
  symmetric: '⇄',
  fix: '▣',
}

/**
 * Draws a SketchModel onto a 2D canvas. Stateless apart from the context — the
 * caller owns the view transform, selection and tool preview, which keeps the
 * renderer usable from React, from tests and (later) from an offscreen export.
 */
export class SketchRenderer {
  constructor(private readonly ctx: CanvasRenderingContext2D) {}

  render(model: SketchModel, options: RenderOptions): RenderLayout {
    const { ctx } = this
    const { view } = options
    const ratio = options.devicePixelRatio ?? 1

    ctx.save()
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    ctx.clearRect(0, 0, view.width, view.height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    if (options.showGrid !== false) this.drawGrid(model, view)
    this.drawAxes(view)

    const selected = new Set(options.selectedEntityIds ?? [])
    const underConstrained = new Set(options.underConstrainedEntityIds ?? [])
    for (const entity of model.entities.values()) {
      this.drawEntity(model, entity, view, {
        selected: selected.has(entity.id),
        hovered: options.hoveredEntityId === entity.id,
        underConstrained: underConstrained.has(entity.id),
      })
    }

    if (options.showConstraints !== false) this.drawConstraintIcons(model, view)
    const dimensionLabels =
      options.showDimensions === false ? [] : this.drawDimensions(model, view)

    if (options.preview) this.drawPreview(options.preview, view)
    if (options.snap) this.drawSnap(options.snap, view)

    ctx.restore()
    return { dimensionLabels }
  }

  /* ---------------------------------------------------------------------- */

  private drawGrid(model: SketchModel, view: SketchView): void {
    const spacing = model.gridSpacing
    if (spacing <= 0 || spacing * view.scale < MIN_GRID_PIXELS) return

    const { ctx } = this
    const topLeft = screenToWorld(view, { x: 0, y: 0 })
    const bottomRight = screenToWorld(view, { x: view.width, y: view.height })
    const firstX = Math.floor(topLeft.x / spacing) * spacing
    const lastX = Math.ceil(bottomRight.x / spacing) * spacing
    const firstY = Math.floor(bottomRight.y / spacing) * spacing
    const lastY = Math.ceil(topLeft.y / spacing) * spacing

    ctx.save()
    ctx.lineWidth = 1
    ctx.setLineDash([])
    for (let x = firstX; x <= lastX; x += spacing) {
      const major = Math.abs(Math.round(x / spacing) % 10) === 0
      ctx.strokeStyle = major ? SKETCH_COLORS.gridMajor : SKETCH_COLORS.grid
      const screenX = worldToScreen(view, { x, y: 0 }).x
      ctx.beginPath()
      ctx.moveTo(screenX, 0)
      ctx.lineTo(screenX, view.height)
      ctx.stroke()
    }
    for (let y = firstY; y <= lastY; y += spacing) {
      const major = Math.abs(Math.round(y / spacing) % 10) === 0
      ctx.strokeStyle = major ? SKETCH_COLORS.gridMajor : SKETCH_COLORS.grid
      const screenY = worldToScreen(view, { x: 0, y }).y
      ctx.beginPath()
      ctx.moveTo(0, screenY)
      ctx.lineTo(view.width, screenY)
      ctx.stroke()
    }
    ctx.restore()
  }

  private drawAxes(view: SketchView): void {
    const { ctx } = this
    const origin = worldToScreen(view, { x: 0, y: 0 })

    ctx.save()
    ctx.setLineDash([])
    ctx.lineWidth = 1.25

    ctx.strokeStyle = SKETCH_COLORS.axisX
    ctx.beginPath()
    ctx.moveTo(0, origin.y)
    ctx.lineTo(view.width, origin.y)
    ctx.stroke()
    this.drawArrowHead({ x: view.width - 12, y: origin.y }, 0, SKETCH_COLORS.axisX)

    ctx.strokeStyle = SKETCH_COLORS.axisY
    ctx.beginPath()
    ctx.moveTo(origin.x, 0)
    ctx.lineTo(origin.x, view.height)
    ctx.stroke()
    this.drawArrowHead({ x: origin.x, y: 12 }, -Math.PI / 2, SKETCH_COLORS.axisY)

    ctx.font = '11px system-ui, sans-serif'
    ctx.fillStyle = SKETCH_COLORS.axisX
    ctx.fillText('X', view.width - 20, origin.y - 12)
    ctx.fillStyle = SKETCH_COLORS.axisY
    ctx.fillText('Y', origin.x + 14, 16)
    ctx.restore()
  }

  private drawArrowHead(tip: Vec2, angle: number, color: string): void {
    const { ctx } = this
    const size = 7
    ctx.save()
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(tip.x + Math.cos(angle) * size, tip.y + Math.sin(angle) * size)
    ctx.lineTo(
      tip.x + Math.cos(angle + 2.4) * size,
      tip.y + Math.sin(angle + 2.4) * size,
    )
    ctx.lineTo(
      tip.x + Math.cos(angle - 2.4) * size,
      tip.y + Math.sin(angle - 2.4) * size,
    )
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  /* ---------------------------------------------------------------------- */

  private drawEntity(
    model: SketchModel,
    entity: SketchEntity,
    view: SketchView,
    state: { selected: boolean; hovered: boolean; underConstrained: boolean },
  ): void {
    const { ctx } = this
    const color = state.selected
      ? SKETCH_COLORS.selected
      : state.hovered
        ? SKETCH_COLORS.hovered
        : state.underConstrained
          ? SKETCH_COLORS.underConstrained
          : entity.isConstruction
            ? SKETCH_COLORS.construction
            : SKETCH_COLORS.geometry

    ctx.save()
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = state.selected || state.hovered ? EMPHASIS_WIDTH : GEOMETRY_WIDTH
    ctx.setLineDash(entity.isConstruction ? CONSTRUCTION_DASH : [])

    if (entity.type === 'point') {
      const at = worldToScreen(view, entity)
      ctx.beginPath()
      ctx.arc(at.x, at.y, state.selected || state.hovered ? POINT_RADIUS + 1 : POINT_RADIUS, 0, TAU)
      ctx.fill()
      ctx.restore()
      return
    }

    if (entity.type === 'circle') {
      const center = worldToScreen(view, model.requirePoint(entity.centerPointId))
      ctx.beginPath()
      ctx.arc(center.x, center.y, entity.radius * view.scale, 0, TAU)
      ctx.stroke()
      ctx.restore()
      return
    }

    if (entity.type === 'arc') {
      const center = worldToScreen(view, model.requirePoint(entity.centerPointId))
      const { startAngle, endAngle, clockwise } = arcAngles(model, entity)
      ctx.beginPath()
      // Screen Y is flipped, so a world CCW sweep runs CW on the canvas.
      ctx.arc(center.x, center.y, entity.radius * view.scale, -startAngle, -endAngle, !clockwise)
      ctx.stroke()
      ctx.restore()
      return
    }

    const outline = tessellate(model, entity)
    if (outline.length >= 2) {
      ctx.beginPath()
      outline.forEach((position, index) => {
        const at = worldToScreen(view, position)
        if (index === 0) ctx.moveTo(at.x, at.y)
        else ctx.lineTo(at.x, at.y)
      })
      ctx.stroke()
    }
    ctx.restore()
  }

  /* ---------------------------------------------------------------------- */

  private drawConstraintIcons(model: SketchModel, view: SketchView): void {
    const { ctx } = this
    const perEntity = new Map<string, string[]>()

    for (const constraint of model.constraints.values()) {
      if (isDimensional(constraint)) continue
      const icon = CONSTRAINT_ICONS[constraint.type]
      if (!icon) continue
      for (const entityId of constraint.entityIds) {
        if (!model.entities.has(entityId)) continue
        const icons = perEntity.get(entityId)
        if (icons) icons.push(icon)
        else perEntity.set(entityId, [icon])
      }
    }

    ctx.save()
    ctx.setLineDash([])
    ctx.font = '10px system-ui, sans-serif'
    ctx.fillStyle = SKETCH_COLORS.constraintIcon
    for (const [entityId, icons] of perEntity) {
      const entity = model.requireEntity(entityId)
      const anchor = worldToScreen(view, entityAnchor(model, entity))
      icons.forEach((icon, index) => {
        ctx.fillText(icon, anchor.x + 10 + index * 11, anchor.y - 11)
      })
    }
    ctx.restore()
  }

  /* ---------------------------------------------------------------------- */

  private drawDimensions(model: SketchModel, view: SketchView): DimensionLabel[] {
    const { ctx } = this
    const labels: DimensionLabel[] = []

    ctx.save()
    ctx.setLineDash([])
    ctx.font = '11px system-ui, sans-serif'
    ctx.lineWidth = 1

    for (const constraint of model.constraints.values()) {
      if (!isDimensional(constraint)) continue
      const placement = dimensionPlacement(model, constraint)
      if (!placement) continue

      const text = formatDimension(constraint.type, constraint.value)
      const at = worldToScreen(view, placement.anchor)
      const position = { x: at.x + placement.offset.x, y: at.y + placement.offset.y }
      const width = ctx.measureText(text).width + 8

      ctx.strokeStyle = SKETCH_COLORS.dimension
      ctx.beginPath()
      ctx.moveTo(at.x, at.y)
      ctx.lineTo(position.x, position.y)
      ctx.stroke()

      ctx.fillStyle = SKETCH_COLORS.background
      ctx.fillRect(position.x - width / 2, position.y - LABEL_HEIGHT / 2, width, LABEL_HEIGHT)
      ctx.fillStyle = SKETCH_COLORS.dimension
      ctx.fillText(text, position.x, position.y)

      labels.push({
        constraintId: constraint.id,
        text,
        x: position.x,
        y: position.y,
        width,
        height: LABEL_HEIGHT,
      })
    }

    ctx.restore()
    return labels
  }

  /* ---------------------------------------------------------------------- */

  private drawPreview(preview: PreviewShape, view: SketchView): void {
    const { ctx } = this
    ctx.save()
    ctx.strokeStyle = SKETCH_COLORS.preview
    ctx.lineWidth = 1.25
    ctx.setLineDash([4, 3])

    switch (preview.kind) {
      case 'polyline': {
        if (preview.points.length >= 2) {
          ctx.beginPath()
          preview.points.forEach((point, index) => {
            const at = worldToScreen(view, point)
            if (index === 0) ctx.moveTo(at.x, at.y)
            else ctx.lineTo(at.x, at.y)
          })
          if (preview.closed) ctx.closePath()
          ctx.stroke()
        }
        break
      }
      case 'circle': {
        const center = worldToScreen(view, preview.center)
        ctx.beginPath()
        ctx.arc(center.x, center.y, preview.radius * view.scale, 0, TAU)
        ctx.stroke()
        break
      }
      case 'arc': {
        const center = worldToScreen(view, preview.center)
        ctx.beginPath()
        ctx.arc(
          center.x,
          center.y,
          preview.radius * view.scale,
          -preview.startAngle,
          -preview.endAngle,
          !preview.clockwise,
        )
        ctx.stroke()
        break
      }
      case 'box': {
        const from = worldToScreen(view, preview.from)
        const to = worldToScreen(view, preview.to)
        ctx.strokeRect(
          Math.min(from.x, to.x),
          Math.min(from.y, to.y),
          Math.abs(to.x - from.x),
          Math.abs(to.y - from.y),
        )
        break
      }
    }
    ctx.restore()
  }

  private drawSnap(snap: SnapCandidate, view: SketchView): void {
    const { ctx } = this
    const at = worldToScreen(view, snap.point)
    const size = 5

    ctx.save()
    ctx.setLineDash([])
    ctx.strokeStyle = SKETCH_COLORS.snap
    ctx.fillStyle = SKETCH_COLORS.snap
    ctx.lineWidth = 1.5
    ctx.beginPath()

    switch (snap.type) {
      case 'center':
      case 'quadrant':
        ctx.arc(at.x, at.y, size, 0, TAU)
        break
      case 'midpoint':
        ctx.moveTo(at.x, at.y - size)
        ctx.lineTo(at.x + size, at.y)
        ctx.lineTo(at.x, at.y + size)
        ctx.lineTo(at.x - size, at.y)
        ctx.closePath()
        break
      case 'intersection':
        ctx.moveTo(at.x - size, at.y - size)
        ctx.lineTo(at.x + size, at.y + size)
        ctx.moveTo(at.x + size, at.y - size)
        ctx.lineTo(at.x - size, at.y + size)
        break
      default:
        ctx.rect(at.x - size, at.y - size, size * 2, size * 2)
        break
    }
    ctx.stroke()

    ctx.font = '10px system-ui, sans-serif'
    ctx.fillText(snap.label, at.x + 26, at.y - 12)
    ctx.restore()
  }
}

/* -------------------------------------------------------------------------- */

/** Representative point used to hang badges off an entity. */
export function entityAnchor(model: SketchModel, entity: SketchEntity): Vec2 {
  switch (entity.type) {
    case 'point':
      return { x: entity.x, y: entity.y }
    case 'line':
      return midpoint(model.requirePoint(entity.startPointId), model.requirePoint(entity.endPointId))
    case 'circle':
    case 'arc':
    case 'ellipse':
      return { ...model.requirePoint(entity.centerPointId) }
    case 'slot':
      return midpoint(
        model.requirePoint(entity.center1PointId),
        model.requirePoint(entity.center2PointId),
      )
    default: {
      const outline = tessellate(model, entity)
      if (outline.length === 0) return { x: 0, y: 0 }
      const total = outline.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), {
        x: 0,
        y: 0,
      })
      return { x: total.x / outline.length, y: total.y / outline.length }
    }
  }
}

interface DimensionPlacement {
  readonly anchor: Vec2
  /** Screen-space nudge that keeps the label clear of the geometry. */
  readonly offset: Vec2
}

function dimensionPlacement(
  model: SketchModel,
  constraint: Constraint,
): DimensionPlacement | null {
  switch (constraint.type) {
    case 'distance': {
      const a = model.getEntity(constraint.pointId1)
      const b = model.getEntity(constraint.pointId2)
      if (a?.type !== 'point' || b?.type !== 'point') return null
      return { anchor: midpoint(a, b), offset: perpendicularOffset(sub(b, a), 18) }
    }
    case 'length': {
      const line = model.getEntity(constraint.lineId)
      if (line?.type !== 'line') return null
      const start = model.requirePoint(line.startPointId)
      const end = model.requirePoint(line.endPointId)
      return { anchor: midpoint(start, end), offset: perpendicularOffset(sub(end, start), 18) }
    }
    case 'angle': {
      const first = model.getEntity(constraint.lineId1)
      if (first?.type !== 'line') return null
      const start = model.requirePoint(first.startPointId)
      const end = model.requirePoint(first.endPointId)
      return { anchor: midpoint(start, end), offset: { x: 0, y: -28 } }
    }
    case 'radius':
    case 'diameter': {
      const entity = model.getEntity(constraint.circleId)
      if (entity?.type !== 'circle' && entity?.type !== 'arc') return null
      return { anchor: { ...model.requirePoint(entity.centerPointId) }, offset: { x: 24, y: -18 } }
    }
    default:
      return null
  }
}

function perpendicularOffset(direction: Vec2, pixels: number): Vec2 {
  const unit = normalize(direction)
  // Screen Y is flipped, so the world perpendicular (-y, x) becomes (y, x).
  const perpendicular = { x: unit.y, y: unit.x }
  const nudged = scaleVec(perpendicular, pixels)
  return angleOf(unit) === 0 ? { x: 0, y: -pixels } : nudged
}

export function formatNumber(value: number): string {
  return String(Number(value.toFixed(3)))
}

export function formatDimension(type: string, value: number): string {
  switch (type) {
    case 'radius':
      return `R${formatNumber(value)}`
    case 'diameter':
      return `⌀${formatNumber(value)}`
    case 'angle':
      return `${formatNumber(value)}°`
    default:
      return formatNumber(value)
  }
}
