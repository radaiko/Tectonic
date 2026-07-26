import { describe, expect, it } from 'vitest'
import { DEFAULT_TOOL_SETTINGS } from '../../../src/sketch/tools/SketchTool'
import type { ToolId, ToolSettings } from '../../../src/sketch/tools/SketchTool'
import {
  SKETCH_TOOLS,
  createTool,
  toolDefinition,
  withNumericSetting,
} from '../../../src/sketch/tools/registry'

describe('toolDefinition', () => {
  it('finds every registered tool by id', () => {
    for (const entry of SKETCH_TOOLS) {
      expect(toolDefinition(entry.id).label).toBe(entry.label)
    }
  })

  it('falls back to Select for an id that is not registered', () => {
    expect(toolDefinition('nonesuch' as ToolId).id).toBe('select')
  })
})

describe('createTool', () => {
  it('builds an instance for every registered tool', () => {
    for (const entry of SKETCH_TOOLS) {
      expect(createTool(entry.id)).toBeDefined()
    }
  })
})

describe('withNumericSetting', () => {
  const cases: ReadonlyArray<[keyof ToolSettings, number]> = [
    ['filletRadius', 2],
    ['chamferDistance', 3],
    ['offsetDistance', 4],
    ['polygonSides', 8],
    ['patternCount', 5],
    ['patternSpacing', 12],
    ['patternAngle', 45],
  ]

  it.each(cases)('writes %s without touching the rest', (key, value) => {
    const next = withNumericSetting(DEFAULT_TOOL_SETTINGS, key, value)

    expect(next[key]).toBe(value)
    expect({ ...next, [key]: DEFAULT_TOOL_SETTINGS[key] }).toEqual(DEFAULT_TOOL_SETTINGS)
  })

  it('leaves the settings alone for a key that is not numeric', () => {
    expect(withNumericSetting(DEFAULT_TOOL_SETTINGS, 'patternMode', 1)).toBe(DEFAULT_TOOL_SETTINGS)
    expect(withNumericSetting(DEFAULT_TOOL_SETTINGS, 'isConstruction', 1)).toBe(
      DEFAULT_TOOL_SETTINGS,
    )
  })
})
