import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { boundingSphere, frameBox, needsReframing } from '../../src/3d/framing'

/** The viewport's starting camera: 50° vertical field of view, looking at the origin. */
function defaultCamera(aspect = 1.15): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 10_000)
  camera.position.set(120, 90, 140)
  return camera
}

/** Whether every corner of `box` survives clipping against the camera's frustum. */
function boxIsVisible(camera: THREE.PerspectiveCamera, box: THREE.Box3): boolean {
  camera.updateMatrixWorld(true)
  const frustum = new THREE.Frustum().setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
  )
  const corner = new THREE.Vector3()
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        if (!frustum.containsPoint(corner.set(x, y, z))) return false
      }
    }
  }
  return true
}

/** Moves a camera onto a framing, the way the viewport does. */
function applyFraming(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  box: THREE.Box3,
): boolean {
  const framing = frameBox(camera, target, box)
  if (!framing) return false
  target.copy(framing.target)
  camera.position.copy(framing.position)
  camera.lookAt(target)
  camera.near = framing.near
  camera.far = framing.far
  camera.updateProjectionMatrix()
  return true
}

describe('frameBox', () => {
  it('leaves an empty model alone rather than throwing the camera away', () => {
    const camera = defaultCamera()
    expect(frameBox(camera, new THREE.Vector3(), new THREE.Box3())).toBeNull()
  })

  /**
   * The regression this module exists for: an extrusion built from a sketch sits
   * at that sketch's coordinates, which are nowhere near the origin the starting
   * camera is aimed at. Before the fix the viewport never framed anything, so the
   * body was outside the frustum — or swallowed the camera whole, which with
   * back-face culling draws nothing at all — and the 3D view came up empty even
   * though the body was in the scene.
   */
  it('brings a body built far from the origin into view', () => {
    const camera = defaultCamera()
    const target = new THREE.Vector3(0, 0, 0)
    // A rectangle dragged in the middle of the sketch, extruded 25mm.
    const box = new THREE.Box3(
      new THREE.Vector3(180, 0, 240),
      new THREE.Vector3(430, 25, 390),
    )

    expect(boxIsVisible(camera, box)).toBe(false)
    expect(applyFraming(camera, target, box)).toBe(true)
    expect(boxIsVisible(camera, box)).toBe(true)
  })

  it('pulls back far enough for a body that engulfs the starting camera', () => {
    const camera = defaultCamera()
    const target = new THREE.Vector3(0, 0, 0)
    const box = new THREE.Box3(
      new THREE.Vector3(-600, -600, -600),
      new THREE.Vector3(600, 600, 600),
    )

    expect(boxIsVisible(camera, box)).toBe(false)
    applyFraming(camera, target, box)
    expect(boxIsVisible(camera, box)).toBe(true)
  })

  it('frames the model on a narrow viewport, where the width is the tighter fit', () => {
    // A tall, narrow panel: fitting the vertical field of view alone would let
    // the model run off the sides.
    const camera = defaultCamera(0.35)
    const target = new THREE.Vector3()
    const box = new THREE.Box3(new THREE.Vector3(-30, 0, -30), new THREE.Vector3(30, 60, 30))

    applyFraming(camera, target, box)
    expect(boxIsVisible(camera, box)).toBe(true)
  })

  it('keeps the direction the camera is already looking from', () => {
    const camera = defaultCamera()
    camera.position.set(0, 0, 200)
    const target = new THREE.Vector3()
    const box = new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10))

    const framing = frameBox(camera, target, box)
    expect(framing).not.toBeNull()
    const direction = (framing as NonNullable<typeof framing>).position
      .clone()
      .sub(framing?.target as THREE.Vector3)
      .normalize()
    expect(direction.x).toBeCloseTo(0)
    expect(direction.y).toBeCloseTo(0)
    expect(direction.z).toBeCloseTo(1)
  })

  it('falls back to a three-quarter view when the camera sits on its own target', () => {
    const camera = defaultCamera()
    camera.position.set(5, 5, 5)
    const target = new THREE.Vector3(5, 5, 5)
    const box = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 10, 10))

    const framing = frameBox(camera, target, box)
    expect(framing).not.toBeNull()
    expect((framing as NonNullable<typeof framing>).position.length()).toBeGreaterThan(0)
    expect(boxIsVisible(camera, box)).toBe(false)
    applyFraming(camera, target, box)
    expect(boxIsVisible(camera, box)).toBe(true)
  })

  it('stands a degenerate body off far enough to be drawn', () => {
    const camera = defaultCamera()
    const target = new THREE.Vector3()
    const point = new THREE.Box3(new THREE.Vector3(3, 3, 3), new THREE.Vector3(3, 3, 3))

    const framing = frameBox(camera, target, point)
    expect(framing).not.toBeNull()
    const distance = (framing as NonNullable<typeof framing>).position.distanceTo(
      framing?.target as THREE.Vector3,
    )
    expect(distance).toBeGreaterThan(1)
    expect((framing as NonNullable<typeof framing>).near).toBeGreaterThan(0)
    expect((framing as NonNullable<typeof framing>).far).toBeGreaterThan(distance)
  })

  it('survives a camera whose aspect ratio has never been measured', () => {
    const camera = defaultCamera()
    // What the camera looks like before the container has been given a size.
    camera.aspect = 0
    const target = new THREE.Vector3()
    const box = new THREE.Box3(new THREE.Vector3(-30, 0, -30), new THREE.Vector3(30, 60, 30))

    const framing = frameBox(camera, target, box)
    expect(framing).not.toBeNull()
    expect(Number.isFinite((framing as NonNullable<typeof framing>).position.x)).toBe(true)

    camera.aspect = 1
    applyFraming(camera, target, box)
    expect(boxIsVisible(camera, box)).toBe(true)
  })
})

describe('boundingSphere', () => {
  it('has nothing to report for an empty model', () => {
    expect(boundingSphere(new THREE.Box3())).toBeNull()
  })

  it('gives a degenerate body a radius to stand off from', () => {
    const point = new THREE.Box3(new THREE.Vector3(2, 2, 2), new THREE.Vector3(2, 2, 2))
    const sphere = boundingSphere(point)
    expect(sphere?.radius).toBeGreaterThanOrEqual(1)
    expect(sphere?.center.toArray()).toEqual([2, 2, 2])
  })

  it('encloses the model it was given', () => {
    const box = new THREE.Box3(new THREE.Vector3(-30, 0, -30), new THREE.Vector3(30, 60, 30))
    const sphere = boundingSphere(box)
    expect(sphere).not.toBeNull()
    const corner = new THREE.Vector3(30, 60, 30)
    expect(corner.distanceTo((sphere as NonNullable<typeof sphere>).center)).toBeLessThanOrEqual(
      (sphere as NonNullable<typeof sphere>).radius + 1e-6,
    )
  })
})

describe('needsReframing', () => {
  const sphere = (x: number, y: number, z: number, radius: number) => ({
    center: new THREE.Vector3(x, y, z),
    radius,
  })

  it('frames a model the camera has never been put on', () => {
    expect(needsReframing(null, sphere(0, 0, 0, 50))).toBe(true)
  })

  /**
   * The reported flow: the starter box is framed, then an extrude adds a plate
   * built at the sketch's coordinates. The part is now several times the size
   * the camera was set up for, so the camera ends up buried in the new body —
   * which, with back-face culling, draws nothing at all.
   */
  it('frames again when a feature adds a body the view has no room for', () => {
    const starterBox = sphere(0, 30, 0, 52)
    const withExtrusion = sphere(71, 25, 40, 160)
    expect(needsReframing(starterBox, withExtrusion)).toBe(true)
  })

  it('leaves the camera alone when a parameter tweak barely moves the model', () => {
    const framed = sphere(0, 30, 0, 100)
    // An extrude depth nudged from 25mm to 27mm.
    expect(needsReframing(framed, sphere(0, 31, 0, 101))).toBe(false)
  })

  it('leaves the camera alone for a rebuild that changes nothing', () => {
    const framed = sphere(12, 30, -4, 88)
    expect(needsReframing(framed, sphere(12, 30, -4, 88))).toBe(false)
  })

  it('frames again when the part is moved out from under the camera', () => {
    const framed = sphere(0, 0, 0, 50)
    // Same size, relocated to a sketch far from the origin.
    expect(needsReframing(framed, sphere(400, 0, 250, 50))).toBe(true)
  })

  it('frames again when the part shrinks to a speck', () => {
    const framed = sphere(0, 0, 0, 200)
    expect(needsReframing(framed, sphere(0, 0, 0, 5))).toBe(true)
  })

  /** End to end: the policy and the maths together put the new body on screen. */
  it('re-frames the extruded part so it is actually visible', () => {
    const camera = defaultCamera()
    const target = new THREE.Vector3()
    const starter = new THREE.Box3(new THREE.Vector3(-30, 0, -30), new THREE.Vector3(30, 60, 30))
    applyFraming(camera, target, starter)

    const framed = boundingSphere(starter)
    // The starter box plus a 240 x 150mm plate extruded 25mm from the sketch.
    const withExtrusion = new THREE.Box3(
      new THREE.Vector3(-49, 0, -35),
      new THREE.Vector3(191, 60, 115),
    )
    const current = boundingSphere(withExtrusion)

    expect(boxIsVisible(camera, withExtrusion)).toBe(false)
    expect(needsReframing(framed, current as NonNullable<typeof current>)).toBe(true)
    applyFraming(camera, target, withExtrusion)
    expect(boxIsVisible(camera, withExtrusion)).toBe(true)
  })
})
