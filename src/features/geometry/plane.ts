import type { PlaneFrame, Vec3 } from '../../kernel/IKernel'
import type { SketchPlane } from '../../sketch/domain/SketchModel'
import type { Vec2 } from '../../sketch/domain/geometry'

/**
 * World placement of each base sketch plane. The axes are chosen so every frame
 * is right-handed and its normal points along the matching world axis: +Z for
 * XY, +Y for XZ and +X for YZ.
 */
const FRAMES: Record<SketchPlane, Omit<PlaneFrame, 'origin'>> = {
  XY: { xAxis: { x: 1, y: 0, z: 0 }, yAxis: { x: 0, y: 1, z: 0 } },
  XZ: { xAxis: { x: 1, y: 0, z: 0 }, yAxis: { x: 0, y: 0, z: -1 } },
  YZ: { xAxis: { x: 0, y: 1, z: 0 }, yAxis: { x: 0, y: 0, z: 1 } },
}

/** The frame a sketch on `plane` sits on, optionally offset along its normal. */
export function planeFrame(plane: SketchPlane, offset = 0): PlaneFrame {
  const axes = FRAMES[plane]
  const normal = planeNormal(plane)
  return {
    origin: { x: normal.x * offset, y: normal.y * offset, z: normal.z * offset },
    xAxis: axes.xAxis,
    yAxis: axes.yAxis,
  }
}

export function planeNormal(plane: SketchPlane): Vec3 {
  const { xAxis, yAxis } = FRAMES[plane]
  return cross(xAxis, yAxis)
}

/** Lifts a point in sketch coordinates onto the frame, in world space. */
export function toWorld(frame: PlaneFrame, point: Vec2): Vec3 {
  return {
    x: frame.origin.x + frame.xAxis.x * point.x + frame.yAxis.x * point.y,
    y: frame.origin.y + frame.xAxis.y * point.x + frame.yAxis.y * point.y,
    z: frame.origin.z + frame.xAxis.z * point.x + frame.yAxis.z * point.y,
  }
}

/** The frame's normal, i.e. the direction an extrusion on it takes by default. */
export function frameNormal(frame: PlaneFrame): Vec3 {
  return normalize(cross(frame.xAxis, frame.yAxis))
}

/** The same frame shifted along its own normal. */
export function offsetFrame(frame: PlaneFrame, distance: number): PlaneFrame {
  const normal = frameNormal(frame)
  return {
    ...frame,
    origin: {
      x: frame.origin.x + normal.x * distance,
      y: frame.origin.y + normal.y * distance,
      z: frame.origin.z + normal.z * distance,
    },
  }
}

export function scaleVec3(vector: Vec3, factor: number): Vec3 {
  return { x: vector.x * factor, y: vector.y * factor, z: vector.z * factor }
}

export function negateVec3(vector: Vec3): Vec3 {
  return scaleVec3(vector, -1)
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

export function normalize(vector: Vec3): Vec3 {
  const length = Math.hypot(vector.x, vector.y, vector.z)
  return length === 0 ? vector : scaleVec3(vector, 1 / length)
}
