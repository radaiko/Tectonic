import { ArcTool } from './ArcTool'
import { ChamferTool } from './ChamferTool'
import { CircleTool } from './CircleTool'
import { DimensionTool } from './DimensionTool'
import { EllipseTool } from './EllipseTool'
import { FilletTool } from './FilletTool'
import { LineTool } from './LineTool'
import { MirrorTool } from './MirrorTool'
import { OffsetTool } from './OffsetTool'
import { PatternTool } from './PatternTool'
import { PolygonTool } from './PolygonTool'
import { RectangleTool } from './RectangleTool'
import { SelectTool } from './SelectTool'
import { SlotTool } from './SlotTool'
import { SplineTool } from './SplineTool'
import { TrimTool } from './TrimTool'
import type { SketchTool, ToolId, ToolSettings } from './SketchTool'

/** A tool as the toolbar needs it: how to show it and how to build it. */
export interface ToolDefinition {
  readonly id: ToolId
  readonly label: string
  /** Single glyph for the toolbar button. */
  readonly icon: string
  readonly hint: string
  /** Settings the options panel offers while this tool is active. */
  readonly options: readonly ToolOption[]
  readonly create: () => SketchTool
}

export interface ToolOption {
  readonly key: keyof ToolSettings
  readonly label: string
  readonly kind: 'number' | 'patternMode'
  readonly min?: number
  readonly step?: number
}

const NUMBER = 'number' as const

export const SKETCH_TOOLS: readonly ToolDefinition[] = [
  {
    id: 'select',
    label: 'Select',
    icon: '⬉',
    hint: 'Pick, box-select and drag geometry',
    options: [],
    create: () => new SelectTool(),
  },
  {
    id: 'line',
    label: 'Line',
    icon: '⁄',
    hint: 'Click to chain segments, Esc to end',
    options: [],
    create: () => new LineTool(),
  },
  {
    id: 'circle',
    label: 'Circle',
    icon: '○',
    hint: 'Drag from the centre to the radius',
    options: [],
    create: () => new CircleTool(),
  },
  {
    id: 'arc',
    label: 'Arc',
    icon: '◠',
    hint: 'Two endpoints, then a point on the arc',
    options: [],
    create: () => new ArcTool(),
  },
  {
    id: 'rectangle',
    label: 'Rectangle',
    icon: '▭',
    hint: 'Drag corner to corner, Alt for centred',
    options: [],
    create: () => new RectangleTool(),
  },
  {
    id: 'slot',
    label: 'Slot',
    icon: '⬭',
    hint: 'Two centres, then the width',
    options: [],
    create: () => new SlotTool(),
  },
  {
    id: 'polygon',
    label: 'Polygon',
    icon: '⬡',
    hint: 'Centre, then the circumscribed radius',
    options: [{ key: 'polygonSides', label: 'Sides', kind: NUMBER, min: 3, step: 1 }],
    create: () => new PolygonTool('regular'),
  },
  {
    id: 'ellipse',
    label: 'Ellipse',
    icon: '⬮',
    hint: 'Centre, major axis, then the minor radius',
    options: [],
    create: () => new EllipseTool(),
  },
  {
    id: 'spline',
    label: 'Spline',
    icon: '∿',
    hint: 'Click control points, double click to finish',
    options: [],
    create: () => new SplineTool(),
  },
  {
    id: 'trim',
    label: 'Trim',
    icon: '✂',
    hint: 'Click a stretch to cut, Shift to extend',
    options: [],
    create: () => new TrimTool(),
  },
  {
    id: 'fillet',
    label: 'Fillet',
    icon: '◜',
    hint: 'Pick two lines to round their corner',
    options: [{ key: 'filletRadius', label: 'Radius', kind: NUMBER, min: 0, step: 0.5 }],
    create: () => new FilletTool(),
  },
  {
    id: 'chamfer',
    label: 'Chamfer',
    icon: '◺',
    hint: 'Pick two lines to cut their corner',
    options: [{ key: 'chamferDistance', label: 'Distance', kind: NUMBER, min: 0, step: 0.5 }],
    create: () => new ChamferTool(),
  },
  {
    id: 'dimension',
    label: 'Dimension',
    icon: '↔',
    hint: 'Pick geometry to drive it with a value',
    options: [],
    create: () => new DimensionTool(),
  },
  {
    id: 'mirror',
    label: 'Mirror',
    icon: '⇄',
    hint: 'Select geometry, then pick the mirror line',
    options: [],
    create: () => new MirrorTool(),
  },
  {
    id: 'pattern',
    label: 'Pattern',
    icon: '▦',
    hint: 'Select geometry, then pick the direction or centre',
    options: [
      { key: 'patternMode', label: 'Mode', kind: 'patternMode' },
      { key: 'patternCount', label: 'Count', kind: NUMBER, min: 2, step: 1 },
      { key: 'patternSpacing', label: 'Spacing', kind: NUMBER, min: 0, step: 1 },
      { key: 'patternAngle', label: 'Angle', kind: NUMBER, step: 5 },
    ],
    create: () => new PatternTool(),
  },
  {
    id: 'offset',
    label: 'Offset',
    icon: '⧉',
    hint: 'Click a curve on the side to offset towards',
    options: [{ key: 'offsetDistance', label: 'Distance', kind: NUMBER, min: 0, step: 0.5 }],
    create: () => new OffsetTool(),
  },
]

const BY_ID = new Map(SKETCH_TOOLS.map((definition) => [definition.id, definition]))

export function toolDefinition(id: ToolId): ToolDefinition {
  return BY_ID.get(id) ?? (SKETCH_TOOLS[0] as ToolDefinition)
}

export function createTool(id: ToolId): SketchTool {
  return toolDefinition(id).create()
}

/**
 * Writes one numeric tool setting. Spelled out per key so the settings object
 * keeps its precise type instead of widening to a string-indexed record.
 */
export function withNumericSetting(
  settings: ToolSettings,
  key: keyof ToolSettings,
  value: number,
): ToolSettings {
  switch (key) {
    case 'filletRadius':
      return { ...settings, filletRadius: value }
    case 'chamferDistance':
      return { ...settings, chamferDistance: value }
    case 'offsetDistance':
      return { ...settings, offsetDistance: value }
    case 'polygonSides':
      return { ...settings, polygonSides: value }
    case 'patternCount':
      return { ...settings, patternCount: value }
    case 'patternSpacing':
      return { ...settings, patternSpacing: value }
    case 'patternAngle':
      return { ...settings, patternAngle: value }
    default:
      return settings
  }
}
