import { FeatureType, featureLabel } from '../features/domain/FeatureType'
import type { KernelCapability } from '../kernel/IKernel'
import type { ToolId } from '../sketch/tools/SketchTool'
import { SKETCH_TOOLS } from '../sketch/tools/registry'
import { ToolIcon } from '../sketch/tools/ToolIcon'
import { featureIconName } from './featureIcons'
import type { RibbonCommand, RibbonGroup, RibbonTab } from './shell'

/**
 * What the ribbon offers, derived from what the editor can actually do.
 *
 * Kept out of the editor component and free of React state so it can be read,
 * reasoned about and tested as data: "which commands does the Solid tab offer
 * on a backend that cannot fillet" is a question with an answer you can assert
 * on, rather than something you have to render a viewport to find out.
 *
 * The rule running through all of it: a command that appears here either runs,
 * or says why it will not. Nothing is wired to a no-op that reports success,
 * and nothing that this build genuinely cannot do is quietly left out — a
 * toolset that changes shape depending on the backend is a toolset nobody can
 * learn.
 */

/** The backend capability a feature needs, for the kinds that need one. */
const REQUIRED_CAPABILITY: Partial<Record<FeatureType, KernelCapability>> = {
  [FeatureType.Fillet]: 'fillet',
  [FeatureType.Chamfer]: 'chamfer',
  [FeatureType.Shell]: 'shell',
  [FeatureType.Draft]: 'draft',
  [FeatureType.Hole]: 'hole',
  [FeatureType.Split]: 'split',
  [FeatureType.DirectEdit]: 'directEdit',
  [FeatureType.SplitSurface]: 'split',
}

/** A one-line description of what each command does, for its tooltip. */
const DESCRIPTIONS: Partial<Record<FeatureType, string>> = {
  [FeatureType.Extrude]: 'Push a sketch profile along its normal to make a solid.',
  [FeatureType.Revolve]: 'Spin a sketch profile about an axis.',
  [FeatureType.Sweep]: 'Run a profile along a path.',
  [FeatureType.Loft]: 'Blend between two or more profiles.',
  [FeatureType.Rib]: 'Thicken an open sketch into a supporting web.',
  [FeatureType.Hole]: 'Place a hole from a sketch point.',
  [FeatureType.Pattern]: 'Repeat a feature in a grid or around an axis.',
  [FeatureType.Mirror]: 'Copy a feature across a plane.',
  [FeatureType.Fillet]: 'Round a picked edge.',
  [FeatureType.Chamfer]: 'Cut a flat across a picked edge.',
  [FeatureType.Shell]: 'Hollow a solid, leaving a wall of even thickness.',
  [FeatureType.Draft]: 'Angle a face so a part releases from its mould.',
  [FeatureType.Scale]: 'Resize a body about its centre.',
  [FeatureType.Combine]: 'Join, cut or intersect two bodies.',
  [FeatureType.Split]: 'Cut a body with a plane or a surface.',
  [FeatureType.DirectEdit]: 'Move a face without editing the feature that made it.',
}

export interface ModelRibbonContext {
  /** Whether a sketch is selected, so profile features have something to build. */
  readonly hasSketch: boolean
  /** Whether anything has been built, so modify features have something to act on. */
  readonly hasBodies: boolean
  /** Operations the loaded backend cannot carry out. */
  readonly missingCapabilities: readonly KernelCapability[]
  /** The backend's name, so a blocked command can say which one blocked it. */
  readonly backend: string
  readonly onFeature: (type: FeatureType) => void
  readonly onExport: () => void
  /** Reveals the section controls and starts a half section if none is cutting. */
  readonly onSection: () => void
  readonly sectionActive: boolean
}

/** Builds one command for a feature kind, blocked as the state and backend require. */
function featureCommand(type: FeatureType, context: ModelRibbonContext): RibbonCommand {
  const capability = REQUIRED_CAPABILITY[type]
  const unsupported = capability !== undefined && context.missingCapabilities.includes(capability)
  const description = DESCRIPTIONS[type]

  // Two different facts, kept apart. "Not on this backend" is permanent for the
  // session and worth explaining; "nothing to build from yet" resolves itself as
  // soon as the user draws something.
  const needsProfile = PROFILE_FEATURES.has(type)
  const needsSolid = SOLID_FEATURES.has(type)

  return {
    id: `feature:${type}`,
    label: featureLabel(type),
    icon: featureIconName(type),
    onSelect: () => context.onFeature(type),
    ...(description ? { description } : {}),
    ...(unsupported
      ? { unavailable: `not available on the "${context.backend}" kernel` }
      : {}),
    disabled:
      (needsProfile && !context.hasSketch) || (needsSolid && !context.hasBodies),
  }
}

/** Features that consume a sketch profile, so they need one to be selected. */
const PROFILE_FEATURES = new Set<FeatureType>([
  FeatureType.Extrude,
  FeatureType.Revolve,
  FeatureType.Sweep,
  FeatureType.Loft,
  FeatureType.CutExtrude,
  FeatureType.CutRevolve,
  FeatureType.CutSweep,
  FeatureType.CutLoft,
  FeatureType.Rib,
  FeatureType.Hole,
  FeatureType.BaseFlange,
  FeatureType.ExtrudeSurface,
  FeatureType.RevolveSurface,
  FeatureType.SweepSurface,
  FeatureType.PatchSurface,
])

/** Features that modify existing geometry, so they need something built. */
const SOLID_FEATURES = new Set<FeatureType>([
  FeatureType.Fillet,
  FeatureType.Chamfer,
  FeatureType.Shell,
  FeatureType.Draft,
  FeatureType.Scale,
  FeatureType.Combine,
  FeatureType.Split,
  FeatureType.DirectEdit,
  FeatureType.Pattern,
  FeatureType.Mirror,
  FeatureType.EdgeFlange,
  FeatureType.MiterFlange,
  FeatureType.Hem,
  FeatureType.Jog,
  FeatureType.Unfold,
  FeatureType.Refold,
  FeatureType.OffsetSurface,
  FeatureType.ExtendSurface,
  FeatureType.TrimSurface,
  FeatureType.UntrimSurface,
  FeatureType.KnitSurface,
  FeatureType.SplitSurface,
  FeatureType.ThickenSurface,
  FeatureType.StitchSurface,
  FeatureType.BoundarySurface,
  FeatureType.RuledSurface,
])

function group(
  id: string,
  label: string,
  commands: readonly RibbonCommand[],
): RibbonGroup {
  return { id, label, commands }
}

function features(
  types: readonly FeatureType[],
  context: ModelRibbonContext,
): RibbonCommand[] {
  return types.map((type) => featureCommand(type, context))
}

/**
 * A group of commands this build does not have, stated rather than hidden.
 *
 * The environments behind these — assemblies, mesh editing, construction
 * geometry — exist in the codebase but are not wired into this editor's document
 * or feature tree. Offering them here as buttons that appeared to work would be
 * the worst of the three options; leaving them out entirely would hide the shape
 * of the product. So they are listed, blocked, and each one says what it wants.
 */
function blockedGroup(
  id: string,
  label: string,
  reason: string,
  commands: readonly Omit<RibbonCommand, 'unavailable' | 'onSelect'>[],
): RibbonGroup {
  return {
    id,
    label,
    commands: commands.map((command) => ({ ...command, unavailable: reason })),
  }
}

const NOT_IN_EDITOR = 'not wired into this editor yet'

/** The modelling ribbon: one tab per environment, groups in Fusion's order. */
export function modelWorkspaceTabs(context: ModelRibbonContext): RibbonTab[] {
  const inspectGroup: RibbonGroup = {
    id: 'inspect',
    label: 'Inspect',
    commands: [
      {
        id: 'inspect:section',
        label: 'Section',
        icon: 'section',
        description: 'Cut the model open to see inside it.',
        onSelect: context.onSection,
        active: context.sectionActive,
        disabled: !context.hasBodies,
      },
      {
        id: 'inspect:measure',
        label: 'Measure',
        icon: 'measure',
        description: 'Distance, angle, area and volume between picked geometry.',
        unavailable: NOT_IN_EDITOR,
      },
    ],
  }

  const makeGroup: RibbonGroup = {
    id: 'make',
    label: 'Make',
    commands: [
      {
        id: 'make:export',
        label: 'Export',
        icon: 'export',
        shortcut: 'Ctrl+E',
        description: 'Write the document out as STL, OBJ, STEP, DXF and more.',
        onSelect: context.onExport,
      },
      {
        id: 'make:print',
        label: '3D Print',
        icon: 'make',
        description: 'Send the body straight to a slicer.',
        unavailable: NOT_IN_EDITOR,
      },
    ],
  }

  return [
    {
      id: 'solid',
      label: 'Solid',
      groups: [
        group(
          'create',
          'Create',
          features(
            [
              FeatureType.Extrude,
              FeatureType.Revolve,
              FeatureType.Sweep,
              FeatureType.Loft,
              FeatureType.Rib,
              FeatureType.Hole,
            ],
            context,
          ),
        ),
        group(
          'modify',
          'Modify',
          features(
            [
              FeatureType.Fillet,
              FeatureType.Chamfer,
              FeatureType.Shell,
              FeatureType.Draft,
              FeatureType.Scale,
              FeatureType.Combine,
              FeatureType.Split,
              FeatureType.DirectEdit,
            ],
            context,
          ),
        ),
        group('pattern', 'Pattern', features([FeatureType.Pattern, FeatureType.Mirror], context)),
        blockedGroup('assemble', 'Assemble', NOT_IN_EDITOR, [
          { id: 'assemble:joint', label: 'Joint', icon: 'assemble' },
          { id: 'assemble:component', label: 'Component', icon: 'component' },
        ]),
        blockedGroup('construct', 'Construct', NOT_IN_EDITOR, [
          { id: 'construct:plane', label: 'Offset Plane', icon: 'plane' },
          { id: 'construct:axis', label: 'Axis', icon: 'axis' },
          { id: 'construct:point', label: 'Point', icon: 'point' },
        ]),
        inspectGroup,
        makeGroup,
      ],
    },
    {
      id: 'surface',
      label: 'Surface',
      groups: [
        group(
          'surface-create',
          'Create',
          features(
            [
              FeatureType.ExtrudeSurface,
              FeatureType.RevolveSurface,
              FeatureType.SweepSurface,
              FeatureType.LoftSurface,
              FeatureType.PatchSurface,
              FeatureType.BoundarySurface,
              FeatureType.RuledSurface,
            ],
            context,
          ),
        ),
        group(
          'surface-modify',
          'Modify',
          features(
            [
              FeatureType.OffsetSurface,
              FeatureType.ExtendSurface,
              FeatureType.TrimSurface,
              FeatureType.UntrimSurface,
              FeatureType.KnitSurface,
              FeatureType.StitchSurface,
              FeatureType.SplitSurface,
              FeatureType.ThickenSurface,
            ],
            context,
          ),
        ),
      ],
    },
    {
      id: 'sheet-metal',
      label: 'Sheet Metal',
      groups: [
        group('sm-create', 'Create', features([FeatureType.BaseFlange], context)),
        group(
          'sm-modify',
          'Modify',
          features(
            [
              FeatureType.EdgeFlange,
              FeatureType.MiterFlange,
              FeatureType.Hem,
              FeatureType.Jog,
            ],
            context,
          ),
        ),
        group('sm-flat', 'Flat', features([FeatureType.Unfold, FeatureType.Refold], context)),
      ],
    },
    {
      id: 'mesh',
      label: 'Mesh',
      groups: [],
      placeholder:
        'Mesh editing is built, but it is not part of the parametric document this editor holds — a mesh body has no place in the feature tree yet. Import and export of STL, OBJ and 3MF are on the Make group of the Solid tab.',
    },
    {
      id: 'assemble',
      label: 'Assemble',
      groups: [],
      placeholder:
        'Assemblies, joints and mates are built, but this editor opens a single part document. Nothing here would have a second component to mate to.',
    },
    {
      // No Display group with a Fit command in it. Framing lives on the view
      // cube, which is on screen whatever tab is showing and is where anyone
      // looks for a view command — putting a second button with the same name
      // one tab away would be two controls for one camera move.
      id: 'inspect',
      label: 'Inspect',
      groups: [inspectGroup],
    },
    {
      id: 'utilities',
      label: 'Utilities',
      groups: [
        makeGroup,
        blockedGroup('utilities-addins', 'Add-Ins', NOT_IN_EDITOR, [
          { id: 'utilities:scripts', label: 'Scripts', icon: 'document' },
        ]),
      ],
    },
  ]
}

/* -------------------------------------------------------------------------- */
/* Sketch                                                                      */
/* -------------------------------------------------------------------------- */

/** Which group each drawing tool belongs in, in the order they are offered. */
const SKETCH_GROUPS: readonly { readonly id: string; readonly label: string; readonly tools: readonly ToolId[] }[] = [
  { id: 'sketch-select', label: 'Select', tools: ['select'] },
  {
    id: 'sketch-create',
    label: 'Create',
    tools: ['line', 'rectangle', 'circle', 'arc', 'polygon', 'slot', 'ellipse', 'spline'],
  },
  {
    id: 'sketch-modify',
    label: 'Modify',
    tools: ['trim', 'fillet', 'chamfer', 'offset', 'mirror', 'pattern'],
  },
  { id: 'sketch-constrain', label: 'Constrain', tools: ['dimension'] },
]

export interface SketchRibbonContext {
  readonly activeTool: ToolId
  readonly onSelectTool: (tool: ToolId) => void
}

/**
 * The contextual sketch ribbon.
 *
 * Every tool comes from the sketch tool registry rather than being listed again
 * here, so a tool added to the registry appears in the ribbon with its own label,
 * hint and shortcut already attached. The grouping is the only thing this file
 * decides, because "which of these is a create tool" is a presentation question
 * the registry has no business answering.
 */
export function sketchWorkspaceTabs(context: SketchRibbonContext): RibbonTab[] {
  return [
    {
      id: 'sketch',
      label: 'Sketch',
      groups: SKETCH_GROUPS.map((definition) => ({
        id: definition.id,
        label: definition.label,
        commands: definition.tools.flatMap((toolId): RibbonCommand[] => {
          const tool = SKETCH_TOOLS.find((entry) => entry.id === toolId)
          if (!tool) return []
          return [
            {
              id: `sketch:${tool.id}`,
              label: tool.label,
              iconNode: <ToolIcon tool={tool.id} size={20} />,
              description: tool.hint,
              ...(tool.shortcut ? { shortcut: tool.shortcut } : {}),
              active: tool.id === context.activeTool,
              onSelect: () => context.onSelectTool(tool.id),
            },
          ]
        }),
      })),
    },
  ]
}
