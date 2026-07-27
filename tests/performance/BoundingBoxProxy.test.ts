import { describe, expect, it } from 'vitest'
import { meshBounds, triangleCount } from '../../src/domain/MeshData'
import {
  PROXY_TRIANGLES,
  boundsMesh,
  boxProxy,
  planProxies,
  shouldUseProxy,
} from '../../src/performance/BoundingBoxProxy'
import { cameraAt, componentAt } from '../helpers/components'

describe('boundsMesh', () => {
  it('builds a closed box of twelve triangles', () => {
    const mesh = boundsMesh({ min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 3, z: 4 } })

    expect(triangleCount(mesh)).toBe(PROXY_TRIANGLES)
  })

  it('fills the extent it was given', () => {
    const bounds = { min: { x: -1, y: -2, z: -3 }, max: { x: 1, y: 2, z: 3 } }
    const built = meshBounds(boundsMesh(bounds))

    expect(built.min.x).toBeCloseTo(-1, 12)
    expect(built.max.z).toBeCloseTo(3, 12)
  })

  it('gives a flat plate enough thickness to be visible', () => {
    const plate = { min: { x: 0, y: 0, z: 5 }, max: { x: 10, y: 10, z: 5 } }
    const built = meshBounds(boundsMesh(plate))

    expect(built.max.z - built.min.z).toBeGreaterThan(0)
    expect(built.max.z - built.min.z).toBeLessThan(0.1)
  })

  it('keeps the plate centred on where it actually was', () => {
    const plate = { min: { x: 0, y: 0, z: 5 }, max: { x: 10, y: 10, z: 5 } }
    const built = meshBounds(boundsMesh(plate))

    expect((built.min.z + built.max.z) / 2).toBeCloseTo(5, 12)
  })

  it('gives a point with no extent at all something to draw', () => {
    const point = { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } }

    expect(triangleCount(boundsMesh(point))).toBe(PROXY_TRIANGLES)
  })

  it('winds the box outwards', () => {
    const mesh = boundsMesh({ min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } })

    // The top face's normal should point up, not into the box.
    const upward = mesh.normals.filter((_value, index) => index % 3 === 2 && mesh.normals[index] === 1)
    expect(upward.length).toBeGreaterThan(0)
  })
})

describe('shouldUseProxy', () => {
  it('boxes a component too small to make out', () => {
    expect(shouldUseProxy(componentAt('a', [500, 0, 0]), cameraAt())).toBe(true)
  })

  it('draws a component big enough to see properly', () => {
    expect(shouldUseProxy(componentAt('a', [5, 0, 0]), cameraAt())).toBe(false)
  })

  it('leaves a pinned component alone however small it is', () => {
    const pinned = componentAt('a', [500, 0, 0], { pinned: true })

    expect(shouldUseProxy(pinned, cameraAt())).toBe(false)
  })

  it('will not box a part already cheaper than a box', () => {
    const cheap = componentAt('a', [500, 0, 0], { triangleCount: 12 })

    expect(shouldUseProxy(cheap, cameraAt())).toBe(false)
  })

  it('honours a threshold the caller chose', () => {
    const component = componentAt('a', [5, 0, 0])

    expect(shouldUseProxy(component, cameraAt(), { maxCoverage: 0.9 })).toBe(true)
  })

  it('honours a triangle floor the caller chose', () => {
    const component = componentAt('a', [500, 0, 0], { triangleCount: 100 })

    expect(shouldUseProxy(component, cameraAt(), { minTriangles: 500 })).toBe(false)
  })
})

describe('boxProxy', () => {
  it('names the stand-in after the component', () => {
    const proxy = boxProxy(componentAt('bolt-1', [0, 0, 0], { name: 'M6 bolt' }))

    expect(proxy.name).toBe('M6 bolt (box)')
    expect(proxy.id).toBe('bolt-1')
  })

  it('falls back to the id when the component has no name', () => {
    expect(boxProxy(componentAt('bolt-1', [0, 0, 0])).name).toBe('bolt-1 (box)')
  })

  it('costs a fixed twelve triangles and says what it replaced', () => {
    const proxy = boxProxy(componentAt('a', [0, 0, 0], { triangleCount: 40_000 }))

    expect(proxy.triangleCount).toBe(PROXY_TRIANGLES)
    expect(proxy.replacedTriangles).toBe(40_000)
  })
})

describe('planProxies', () => {
  const scene = [
    componentAt('near', [5, 0, 0], { triangleCount: 5000 }),
    componentAt('far-1', [500, 0, 0], { triangleCount: 5000 }),
    componentAt('far-2', [600, 0, 0], { triangleCount: 5000 }),
  ]

  it('splits the scene into boxed and drawn', () => {
    const plan = planProxies(scene, cameraAt())

    expect(plan.drawn.map((component) => component.id)).toEqual(['near'])
    expect(plan.proxied.map((proxy) => proxy.id)).toEqual(['far-1', 'far-2'])
  })

  it('reports what the substitution saved', () => {
    const plan = planProxies(scene, cameraAt())

    expect(plan.before).toBe(15_000)
    expect(plan.after).toBe(5000 + PROXY_TRIANGLES * 2)
    expect(plan.saved).toBeGreaterThan(0.6)
  })

  it('saves nothing from an empty scene', () => {
    expect(planProxies([], cameraAt())).toMatchObject({ before: 0, after: 0, saved: 0 })
  })

  it('leaves a close-up scene entirely alone', () => {
    const plan = planProxies([componentAt('a', [3, 0, 0])], cameraAt())

    expect(plan.proxied).toHaveLength(0)
    expect(plan.saved).toBe(0)
  })
})
