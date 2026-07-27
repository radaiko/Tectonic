import type { LodLevel, LodOptions } from './LevelOfDetail'
import { DEFAULT_LOD_LEVELS, levelForComponent } from './LevelOfDetail'
import type { SelectiveLoader } from './SelectiveLoading'
import type { PerformanceComponent, Viewpoint } from './types'
import { isBehind, screenCoverage } from './types'

/**
 * Showing something immediately, then making it right.
 *
 * Waiting for an entire assembly before drawing anything means a blank
 * viewport for as long as the slowest part takes. Loading in priority order
 * instead — biggest on screen first, then outwards — puts a recognisable model
 * up in the first fraction of a second and refines it while the user is
 * already orbiting it.
 *
 * Priority is screen coverage, with two adjustments: anything pinned goes
 * first regardless, and anything behind the camera goes last, because it costs
 * the same to load and cannot be seen. Ties break on id so a plan is
 * reproducible — the same scene and camera always produce the same order,
 * which makes the whole thing testable and cacheable.
 */

/** A component's place in the queue. */
export interface LoadPriority {
  readonly component: PerformanceComponent
  /** Higher loads sooner. */
  readonly priority: number
  readonly coverage: number
  /** The level of detail this component is worth at its current size. */
  readonly level: LodLevel
}

/** Pinned components sort above everything the camera can see. */
export const PINNED_PRIORITY = 1000
/** Anything out of view sorts below everything in it. */
export const OFFSCREEN_PENALTY = -1

/** What a component is worth loading right now. */
export function priorityOf(
  component: PerformanceComponent,
  viewpoint: Viewpoint,
  options: LodOptions = {},
): LoadPriority {
  const coverage = screenCoverage(component, viewpoint)
  const level = levelForComponent(component, viewpoint, options)
  const priority =
    component.pinned === true
      ? PINNED_PRIORITY
      : isBehind(component, viewpoint)
        ? OFFSCREEN_PENALTY
        : coverage

  return { component, priority, coverage, level }
}

/** Every component, most worth loading first. */
export function orderByPriority(
  components: readonly PerformanceComponent[],
  viewpoint: Viewpoint,
  options: LodOptions = {},
): LoadPriority[] {
  return components
    .map((component) => priorityOf(component, viewpoint, options))
    .sort((left, right) =>
      left.priority !== right.priority
        ? right.priority - left.priority
        : left.component.id.localeCompare(right.component.id),
    )
}

/** One round of loading. */
export interface LoadStage {
  /** What this pass is for, e.g. `full` or `low`. */
  readonly name: string
  readonly components: readonly PerformanceComponent[]
  /** Detail the pass loads at, 0..1. */
  readonly detail: number
}

export interface ProgressiveOptions extends LodOptions {
  /** Components per stage. Smaller means a first frame sooner. */
  readonly batchSize?: number
  /** Leave out what the camera cannot see. */
  readonly skipOffscreen?: boolean
}

export const DEFAULT_BATCH_SIZE = 32

/**
 * Splits the work into stages.
 *
 * Components are grouped by the level of detail they deserve, most detailed
 * first, and each group is then chopped into batches. Grouping before batching
 * is what makes the first frame useful: it fills in the handful of parts that
 * dominate the view before touching the hundreds that occupy a few pixels
 * each.
 */
export function progressiveStages(
  components: readonly PerformanceComponent[],
  viewpoint: Viewpoint,
  options: ProgressiveOptions = {},
): LoadStage[] {
  const batchSize = Math.max(1, options.batchSize ?? DEFAULT_BATCH_SIZE)
  const levels = options.levels ?? DEFAULT_LOD_LEVELS
  const ordered = orderByPriority(components, viewpoint, options).filter(
    (entry) => options.skipOffscreen !== true || entry.priority >= 0,
  )

  const stages: LoadStage[] = []
  for (const level of levels) {
    const inLevel = ordered.filter((entry) => entry.level === level)
    for (let start = 0; start < inLevel.length; start += batchSize) {
      stages.push({
        name: level.name,
        components: inLevel.slice(start, start + batchSize).map((entry) => entry.component),
        detail: level.detail,
      })
    }
  }
  return stages
}

/** How far through a progressive load the viewport is. */
export interface ProgressiveProgress {
  readonly stage: number
  readonly stageCount: number
  readonly loaded: number
  readonly total: number
  /** 0..1. */
  readonly fraction: number
}

export interface RunOptions extends ProgressiveOptions {
  /** Called after each stage lands, so the viewport can redraw. */
  readonly onStage?: (stage: LoadStage, progress: ProgressiveProgress) => void
  /** Called when a component cannot be loaded. The run carries on regardless. */
  readonly onError?: (componentId: string, error: Error) => void
}

/** What a completed run managed. */
export interface ProgressiveResult {
  readonly stages: readonly LoadStage[]
  readonly loaded: readonly string[]
  readonly failed: readonly string[]
}

/**
 * Runs a progressive load against a loader, one stage at a time.
 *
 * Stages are sequential on purpose even though the loader parallelises within
 * them: the point is that the viewport gets a chance to redraw between them.
 * Firing everything at once would deliver the same geometry in the same total
 * time and show the user nothing until the end.
 *
 * A component that fails is reported and skipped. One unreadable part should
 * not stop the other nine hundred from appearing.
 */
export async function runProgressiveLoad(
  loader: Pick<SelectiveLoader, 'load'>,
  components: readonly PerformanceComponent[],
  viewpoint: Viewpoint,
  options: RunOptions = {},
): Promise<ProgressiveResult> {
  const stages = progressiveStages(components, viewpoint, options)
  const total = stages.reduce((count, stage) => count + stage.components.length, 0)
  const loaded: string[] = []
  const failed: string[] = []

  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index] as LoadStage
    await Promise.all(
      stage.components.map(async (component) => {
        try {
          await loader.load(component.id)
          loaded.push(component.id)
        } catch (error) {
          failed.push(component.id)
          options.onError?.(
            component.id,
            error instanceof Error ? error : new Error(String(error)),
          )
        }
      }),
    )

    const done = loaded.length + failed.length
    options.onStage?.(stage, {
      stage: index + 1,
      stageCount: stages.length,
      loaded: loaded.length,
      total,
      fraction: total > 0 ? done / total : 1,
    })
  }
  return { stages, loaded, failed }
}
