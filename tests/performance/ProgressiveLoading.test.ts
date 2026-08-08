import { describe, expect, it, vi } from 'vitest'
import type { MeshData } from '../../src/domain/MeshData'
import { DEFAULT_LOD_LEVELS } from '../../src/performance/LevelOfDetail'
import type { LoadStage, ProgressiveProgress } from '../../src/performance/ProgressiveLoading'
import {
  DEFAULT_BATCH_SIZE,
  OFFSCREEN_PENALTY,
  PINNED_PRIORITY,
  orderByPriority,
  priorityOf,
  progressiveStages,
  runProgressiveLoad,
} from '../../src/performance/ProgressiveLoading'
import { SelectiveLoader } from '../../src/performance/SelectiveLoading'
import { cameraAt, componentAt } from '../helpers/components'
import { triangleMesh } from '../helpers/meshes'

/** A camera at the origin looking down +X — everything below is placed along it. */
const CAMERA = cameraAt([0, 0, 0], [1, 0, 0])

/** Near and large, far and small, and one behind the camera. */
const NEAR = componentAt('near', [10, 0, 0], { size: 8 })
const FAR = componentAt('far', [500, 0, 0], { size: 1 })
const BEHIND = componentAt('behind', [-50, 0, 0], { size: 8 })

describe('priorityOf', () => {
  it('scores a component by how much screen it covers', () => {
    expect(priorityOf(NEAR, CAMERA).priority).toBeGreaterThan(priorityOf(FAR, CAMERA).priority)
  })

  it('reports the coverage it scored on', () => {
    const entry = priorityOf(NEAR, CAMERA)

    expect(entry.coverage).toBeGreaterThan(0)
    expect(entry.priority).toBe(entry.coverage)
  })

  it('puts a pinned component above everything visible', () => {
    const pinned = componentAt('pinned', [500, 0, 0], { size: 1, pinned: true })

    expect(priorityOf(pinned, CAMERA).priority).toBe(PINNED_PRIORITY)
    expect(PINNED_PRIORITY).toBeGreaterThan(priorityOf(NEAR, CAMERA).priority)
  })

  it('puts what is behind the camera below everything in front of it', () => {
    expect(priorityOf(BEHIND, CAMERA).priority).toBe(OFFSCREEN_PENALTY)
    expect(OFFSCREEN_PENALTY).toBeLessThan(priorityOf(FAR, CAMERA).priority)
  })

  it('pins ahead of the offscreen penalty even when behind the camera', () => {
    const pinned = componentAt('pinned', [-50, 0, 0], { size: 8, pinned: true })

    expect(priorityOf(pinned, CAMERA).priority).toBe(PINNED_PRIORITY)
  })

  it('carries the level of detail the component is worth', () => {
    expect(priorityOf(FAR, CAMERA).level.detail).toBeLessThan(
      priorityOf(NEAR, CAMERA).level.detail,
    )
  })

  it('hands back the component it scored', () => {
    expect(priorityOf(NEAR, CAMERA).component).toBe(NEAR)
  })
})

describe('orderByPriority', () => {
  it('puts the biggest thing on screen first', () => {
    const order = orderByPriority([FAR, BEHIND, NEAR], CAMERA)

    expect(order.map((entry) => entry.component.id)).toEqual(['near', 'far', 'behind'])
  })

  it('breaks ties on id, so the same scene always plans the same way', () => {
    const twins = [
      componentAt('zulu', [10, 0, 0], { size: 2 }),
      componentAt('alpha', [10, 0, 0], { size: 2 }),
      componentAt('mike', [10, 0, 0], { size: 2 }),
    ]

    expect(orderByPriority(twins, CAMERA).map((entry) => entry.component.id)).toEqual([
      'alpha',
      'mike',
      'zulu',
    ])
  })

  it('leaves the input untouched', () => {
    const components = [FAR, NEAR]

    orderByPriority(components, CAMERA)

    expect(components.map((component) => component.id)).toEqual(['far', 'near'])
  })

  it('handles an empty assembly', () => {
    expect(orderByPriority([], CAMERA)).toEqual([])
  })
})

describe('progressiveStages', () => {
  it('loads the most detailed level before the least', () => {
    const details = progressiveStages([NEAR, FAR], CAMERA).map((stage) => stage.detail)

    expect(details).toEqual([...details].sort((left, right) => right - left))
    expect(new Set(details).size).toBeGreaterThan(1)
  })

  it('covers every component exactly once', () => {
    const components = [NEAR, FAR, BEHIND]
    const stages = progressiveStages(components, CAMERA)
    const staged = stages.flatMap((stage) => stage.components.map((component) => component.id))

    expect(staged.sort()).toEqual(['behind', 'far', 'near'])
  })

  it('chops a level into batches of the requested size', () => {
    const many = Array.from({ length: 7 }, (_, index) =>
      componentAt(`part-${index}`, [10, 0, 0], { size: 8 }),
    )

    const stages = progressiveStages(many, CAMERA, { batchSize: 3 })

    expect(stages.map((stage) => stage.components.length)).toEqual([3, 3, 1])
  })

  it('treats a non-positive batch size as one at a time', () => {
    const many = Array.from({ length: 3 }, (_, index) =>
      componentAt(`part-${index}`, [10, 0, 0], { size: 8 }),
    )

    const stages = progressiveStages(many, CAMERA, { batchSize: 0 })

    expect(stages).toHaveLength(3)
  })

  it('leaves out what the camera cannot see when asked to', () => {
    const stages = progressiveStages([NEAR, BEHIND], CAMERA, { skipOffscreen: true })
    const staged = stages.flatMap((stage) => stage.components.map((component) => component.id))

    expect(staged).not.toContain('behind')
    expect(staged).toContain('near')
  })

  it('includes what the camera cannot see by default', () => {
    const staged = progressiveStages([NEAR, BEHIND], CAMERA).flatMap((stage) =>
      stage.components.map((component) => component.id),
    )

    expect(staged).toContain('behind')
  })

  it('carries each level’s detail on its stages', () => {
    const stages = progressiveStages([NEAR], CAMERA)

    expect(stages[0]?.detail).toBe(
      DEFAULT_LOD_LEVELS.find((level) => level.name === stages[0]?.name)?.detail,
    )
  })

  it('produces nothing for an empty assembly', () => {
    expect(progressiveStages([], CAMERA)).toEqual([])
  })

  it('defaults to the documented batch size', () => {
    expect(DEFAULT_BATCH_SIZE).toBe(32)
  })
})

describe('runProgressiveLoad', () => {
  function loaderOf(fetch?: (id: string) => Promise<MeshData>): SelectiveLoader {
    return new SelectiveLoader({ fetch: fetch ?? (async () => triangleMesh()) })
  }

  it('loads every staged component', async () => {
    const loader = loaderOf()

    const result = await runProgressiveLoad(loader, [NEAR, FAR], CAMERA)

    expect([...result.loaded].sort()).toEqual(['far', 'near'])
    expect(result.failed).toEqual([])
  })

  it('loads in stage order, most visible first', async () => {
    const order: string[] = []
    const loader = loaderOf(async (id) => {
      order.push(id)
      return triangleMesh()
    })

    await runProgressiveLoad(loader, [FAR, NEAR], CAMERA, { batchSize: 1 })

    expect(order[0]).toBe('near')
  })

  it('reports progress after each stage', async () => {
    const seen: ProgressiveProgress[] = []
    const loader = loaderOf()

    const result = await runProgressiveLoad(loader, [NEAR, FAR], CAMERA, {
      batchSize: 1,
      onStage: (_stage, progress) => seen.push(progress),
    })

    expect(seen).toHaveLength(result.stages.length)
    expect(seen.at(-1)?.fraction).toBe(1)
  })

  it('numbers the stages from one', async () => {
    const seen: ProgressiveProgress[] = []
    const loader = loaderOf()

    await runProgressiveLoad(loader, [NEAR, FAR], CAMERA, {
      batchSize: 1,
      onStage: (_stage, progress) => seen.push(progress),
    })

    expect(seen.map((progress) => progress.stage)).toEqual(
      seen.map((_progress, index) => index + 1),
    )
    expect(seen.every((progress) => progress.stageCount === seen.length)).toBe(true)
  })

  it('hands the stage itself to the callback', async () => {
    const seen: LoadStage[] = []
    const loader = loaderOf()

    await runProgressiveLoad(loader, [NEAR], CAMERA, {
      onStage: (stage) => seen.push(stage),
    })

    expect(seen[0]?.components.map((component) => component.id)).toEqual(['near'])
  })

  it('carries on past a component that will not load', async () => {
    const loader = loaderOf(async (id) => {
      if (id === 'far') throw new Error('unreadable')
      return triangleMesh()
    })

    const result = await runProgressiveLoad(loader, [NEAR, FAR], CAMERA)

    expect(result.loaded).toEqual(['near'])
    expect(result.failed).toEqual(['far'])
  })

  it('reports the failure to the caller', async () => {
    const onError = vi.fn()
    const loader = loaderOf(async (id) => {
      if (id === 'far') throw new Error('unreadable')
      return triangleMesh()
    })

    await runProgressiveLoad(loader, [NEAR, FAR], CAMERA, { onError })

    expect(onError).toHaveBeenCalledExactlyOnceWith('far', expect.any(Error))
  })

  it('counts a failure towards progress but not towards loaded', async () => {
    const seen: ProgressiveProgress[] = []
    const loader = loaderOf(async () => {
      throw new Error('unreadable')
    })

    await runProgressiveLoad(loader, [NEAR], CAMERA, {
      onStage: (_stage, progress) => seen.push(progress),
    })

    expect(seen.at(-1)).toMatchObject({ loaded: 0, fraction: 1 })
  })

  it('reports a complete run for an empty assembly', async () => {
    const loader = loaderOf()

    const result = await runProgressiveLoad(loader, [], CAMERA)

    expect(result).toEqual({ stages: [], loaded: [], failed: [] })
  })

  it('returns the stages it ran', async () => {
    const loader = loaderOf()

    const result = await runProgressiveLoad(loader, [NEAR, FAR], CAMERA)

    expect(result.stages).toEqual(progressiveStages([NEAR, FAR], CAMERA))
  })
})
