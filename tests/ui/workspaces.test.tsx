import { describe, expect, it, vi } from 'vitest'
import { FeatureType, featureLabel } from '../../src/features/domain/FeatureType'
import type { RibbonCommand, RibbonTab } from '../../src/ui/shell'
import { modelWorkspaceTabs, sketchWorkspaceTabs } from '../../src/ui/workspaces'
import type { ModelRibbonContext } from '../../src/ui/workspaces'

/**
 * The ribbon's contents are plain data, which is the point: "what does this
 * build offer on a backend that cannot fillet" is a question with an answer you
 * can assert on, without rendering a viewport to find it out.
 */
function context(overrides: Partial<ModelRibbonContext> = {}): ModelRibbonContext {
  return {
    hasSketch: true,
    hasBodies: true,
    missingCapabilities: [],
    backend: 'stub',
    onFeature: vi.fn(),
    onCreateSketch: vi.fn(),
    canCreateSketch: false,
    createSketchHint: 'Select an origin plane or a planar face first',
    onExport: vi.fn(),
    onSection: vi.fn(),
    sectionActive: false,
    ...overrides,
  }
}

const commands = (tabs: readonly RibbonTab[]): RibbonCommand[] =>
  tabs.flatMap((tab) => tab.groups.flatMap((group) => [...group.commands]))

const find = (tabs: readonly RibbonTab[], label: string): RibbonCommand | undefined =>
  commands(tabs).find((command) => command.label === label)

describe('the modelling ribbon', () => {
  it('offers one tab per environment, in the order a part is built', () => {
    expect(modelWorkspaceTabs(context()).map((tab) => tab.id)).toEqual([
      'solid',
      'surface',
      'sheet-metal',
      'mesh',
      'assemble',
      'inspect',
      'utilities',
    ])
  })

  it('groups the Solid tab the way a modeller works', () => {
    const solid = modelWorkspaceTabs(context()).find((tab) => tab.id === 'solid')

    expect(solid?.groups.map((group) => group.label)).toEqual([
      'Create',
      'Modify',
      'Pattern',
      'Assemble',
      'Construct',
      'Inspect',
      'Make',
    ])
  })

  it('every command either runs or says why it will not', () => {
    for (const command of commands(modelWorkspaceTabs(context()))) {
      const runnable = command.onSelect !== undefined
      const blocked = command.unavailable !== undefined
      // Never both, and never neither: a button wired to nothing and offered as
      // working is the one outcome this file exists to prevent.
      expect(runnable !== blocked).toBe(true)
    }
  })

  it('marks a command the backend cannot carry out, naming the backend', () => {
    const tabs = modelWorkspaceTabs(context({ missingCapabilities: ['fillet'], backend: 'stub' }))

    expect(find(tabs, 'Fillet')?.unavailable).toMatch(/"stub"/)
    // Only the capability that is actually missing.
    expect(find(tabs, 'Chamfer')?.unavailable).toBeUndefined()
  })

  it('leaves a blocked command in place rather than hiding it', () => {
    const withAll = modelWorkspaceTabs(context())
    const withNone = modelWorkspaceTabs(
      context({ missingCapabilities: ['fillet', 'chamfer', 'shell', 'draft', 'hole', 'split', 'directEdit'] }),
    )

    // A toolset that changes shape with the backend is a toolset nobody can
    // learn, so the same commands are there either way.
    expect(commands(withNone).map((c) => c.label)).toEqual(commands(withAll).map((c) => c.label))
  })

  it('disables profile features until there is a sketch to build from', () => {
    const tabs = modelWorkspaceTabs(context({ hasSketch: false }))

    expect(find(tabs, featureLabel(FeatureType.Extrude))?.disabled).toBe(true)
    expect(find(tabs, featureLabel(FeatureType.Revolve))?.disabled).toBe(true)
  })

  it('disables modify features until something has been built', () => {
    const tabs = modelWorkspaceTabs(context({ hasBodies: false }))

    expect(find(tabs, featureLabel(FeatureType.Shell))?.disabled).toBe(true)
    expect(find(tabs, 'Section')?.disabled).toBe(true)
    // Creating still works: that is how the first body gets made.
    expect(find(tabs, featureLabel(FeatureType.Extrude))?.disabled).toBe(false)
  })

  it('runs the real handler when a feature command is chosen', () => {
    const onFeature = vi.fn()
    const tabs = modelWorkspaceTabs(context({ onFeature }))

    find(tabs, featureLabel(FeatureType.Extrude))?.onSelect?.()

    expect(onFeature).toHaveBeenCalledWith(FeatureType.Extrude)
  })

  it('reports the section command as pressed while a cut is standing', () => {
    expect(find(modelWorkspaceTabs(context({ sectionActive: true })), 'Section')?.active).toBe(true)
    expect(find(modelWorkspaceTabs(context()), 'Section')?.active).toBe(false)
  })

  it('explains an environment this editor does not hold instead of leaving it blank', () => {
    const tabs = modelWorkspaceTabs(context())

    for (const id of ['mesh', 'assemble']) {
      const tab = tabs.find((candidate) => candidate.id === id)
      expect(tab?.groups).toHaveLength(0)
      expect(tab?.placeholder).toBeTruthy()
    }
  })
})

describe('the sketch ribbon', () => {
  it('is one tab of grouped drawing tools', () => {
    const [sketch] = sketchWorkspaceTabs({ activeTool: 'select', onSelectTool: vi.fn() })

    expect(sketch?.id).toBe('sketch')
    expect(sketch?.groups.map((group) => group.label)).toEqual([
      'Select',
      'Create',
      'Modify',
      'Constrain',
    ])
  })

  it('takes each tool’s label, hint and shortcut from the registry', () => {
    const tabs = sketchWorkspaceTabs({ activeTool: 'select', onSelectTool: vi.fn() })
    const line = find(tabs, 'Line')

    expect(line?.shortcut).toBe('L')
    expect(line?.description).toMatch(/chain segments/)
  })

  it('marks the tool that has the pointer, and only that one', () => {
    const tabs = sketchWorkspaceTabs({ activeTool: 'circle', onSelectTool: vi.fn() })

    expect(find(tabs, 'Circle')?.active).toBe(true)
    expect(find(tabs, 'Line')?.active).toBe(false)
  })

  it('asks for the tool that was chosen', () => {
    const onSelectTool = vi.fn()
    const tabs = sketchWorkspaceTabs({ activeTool: 'select', onSelectTool })

    find(tabs, 'Rectangle')?.onSelect?.()

    expect(onSelectTool).toHaveBeenCalledWith('rectangle')
  })
})
