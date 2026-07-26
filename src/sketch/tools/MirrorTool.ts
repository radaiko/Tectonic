import { copyEntities, reflectPoint } from '../domain/transform'
import type { SketchPointerEvent, ToolContext, ToolId, ToolResult } from './SketchTool'
import { BaseTool } from './SketchTool'
import { liveSelection, pickLine } from './toolSupport'

/** Select the geometry first, then click the line to mirror it about. */
export class MirrorTool extends BaseTool {
  readonly id: ToolId = 'mirror'

  override onPointerDown(event: SketchPointerEvent, context: ToolContext): ToolResult | null {
    const { model } = context
    const line = pickLine(context, event.world)
    const sources = liveSelection(model, context.selection).filter((id) => id !== line?.id)

    if (sources.length === 0) return { error: 'Select the entities to mirror first' }
    if (!line) return { error: 'Pick a mirror line' }

    const start = { ...model.requirePoint(line.startPointId) }
    const end = { ...model.requirePoint(line.endPointId) }
    const created = copyEntities(model, sources, (point) => reflectPoint(point, start, end))

    return {
      changed: true,
      done: true,
      createdEntityIds: created.map((entity) => entity.id),
      status: `Mirrored ${sources.length} entit${sources.length === 1 ? 'y' : 'ies'}`,
    }
  }
}
