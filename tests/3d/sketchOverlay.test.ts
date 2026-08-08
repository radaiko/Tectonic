import { describe, expect, it } from 'vitest'
import { buildSketchOverlays, resolveOverlayFrame } from '../../src/3d/sketchOverlay'
import type { Body } from '../../src/domain/Document'
import { faceReference, surveyMeshFaces } from '../../src/kernel/references'
import { meshTopology } from '../../src/kernel/topology'
import { buildLine, buildRectangle } from '../../src/sketch/domain/builders'
import { SketchModel } from '../../src/sketch/domain/SketchModel'
import { projectFaceBoundary } from '../../src/sketch/domain/projection'
import { faceSupport, originPlaneSupport } from '../../src/sketch/domain/SketchSupport'
import { boxMesh } from '../helpers/meshes'

/**
 * A sketch is only usable in 3D if it is *drawn* in 3D. These cover the data the
 * viewport draws from: where each sketch lands, what styling its curves ask for,
 * and — just as important — what happens to a sketch whose support has gone.
 */

const box = (id = 'body-1'): Body => ({ id, name: 'Base', mesh: boxMesh(20, 10, 6) })

/** The +Z face of the box, which is what a face-attached sketch here sits on. */
function topFace(body: Body): string {
  const face = meshTopology(body.mesh).faces.find((candidate) => candidate.normal.z > 0.99)
  if (!face) throw new Error('the box has no +Z face')
  return face.id
}

describe('sketch overlays', () => {
  it('lifts a sketch on the XY plane onto the world XY plane', () => {
    const sketch = new SketchModel({ name: 'Base', support: originPlaneSupport('XY') })
    buildLine(sketch, { x: 0, y: 0 }, { x: 10, y: 4 })

    const { overlays } = buildSketchOverlays([sketch], [])

    expect(overlays).toHaveLength(1)
    const curve = overlays[0]?.curves[0]
    expect(curve?.points).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 4, z: 0 },
    ])
    expect(curve?.construction).toBe(false)
  })

  it('lifts a sketch on the XZ plane out of the world XY plane', () => {
    const sketch = new SketchModel({ name: 'Side', support: originPlaneSupport('XZ') })
    buildLine(sketch, { x: 0, y: 0 }, { x: 0, y: 5 })

    const { overlays } = buildSketchOverlays([sketch], [])

    // XZ's own Y axis runs along world −Z, so five up the sketch is five down
    // the model. Getting this wrong would draw every side sketch in the floor.
    expect(overlays[0]?.curves[0]?.points[1]).toEqual({ x: 0, y: 0, z: -5 })
  })

  it('lands a face-attached sketch on that face', () => {
    const body = box()
    const faceId = topFace(body)
    const support = faceSupport(
      body.id,
      faceId,
      0,
      faceReference(surveyMeshFaces(body.mesh), faceId)?.fingerprint,
    )
    const sketch = new SketchModel({ name: 'On the top', support })
    buildLine(sketch, { x: 0, y: 0 }, { x: 1, y: 0 })

    const { overlays, problems } = buildSketchOverlays([sketch], [body])

    expect(problems).toEqual([])
    // The box is 6 tall, so its top face — and everything drawn on it — is at
    // z = 6 rather than on the ground plane.
    for (const point of overlays[0]?.curves[0]?.points ?? []) {
      expect(point.z).toBeCloseTo(6, 6)
    }
  })

  it('marks construction curves so the viewport can draw them differently', () => {
    const body = box()
    const faceId = topFace(body)
    const sketch = new SketchModel({
      name: 'On the top',
      support: faceSupport(body.id, faceId),
    })
    const placed = resolveOverlayFrame(sketch, [body])
    expect(placed.status).toBe('ok')
    if (placed.status !== 'ok') return
    projectFaceBoundary(sketch, body.mesh, faceId, placed.frame)
    buildRectangle(sketch, { x: -2, y: -2 }, { x: 2, y: 2 })

    const { overlays } = buildSketchOverlays([sketch], [body])
    const curves = overlays[0]?.curves ?? []

    expect(curves.some((curve) => curve.construction)).toBe(true)
    expect(curves.some((curve) => !curve.construction)).toBe(true)
  })

  it('reports a hidden sketch as hidden rather than leaving it out', () => {
    const sketch = new SketchModel({ name: 'Base', support: originPlaneSupport('XY') })
    sketch.visible = false
    buildLine(sketch, { x: 0, y: 0 }, { x: 1, y: 1 })

    const { overlays } = buildSketchOverlays([sketch], [])

    // Still in the document, still in the list, drawn by nobody. The viewport
    // reads the flag; the browser goes on showing the row it toggles.
    expect(overlays).toHaveLength(1)
    expect(overlays[0]?.visible).toBe(false)
  })

  it('says which sketch cannot be placed rather than silently dropping it', () => {
    const stranded = new SketchModel({
      name: 'Orphan',
      support: faceSupport('body-gone', 'face-0'),
    })

    const { overlays, problems } = buildSketchOverlays([stranded], [box()])

    expect(overlays).toEqual([])
    expect(problems).toHaveLength(1)
    expect(problems[0]?.name).toBe('Orphan')
    expect(problems[0]?.reason).toContain('body-gone')
  })

  it('draws a rectangle once, not once per edge as well', () => {
    const sketch = new SketchModel({ name: 'Base', support: originPlaneSupport('XY') })
    buildRectangle(sketch, { x: 0, y: 0 }, { x: 10, y: 5 })

    const { overlays } = buildSketchOverlays([sketch], [])

    // The rectangle owns its four lines; drawing both would put two coincident
    // polylines over every edge and pick unpredictably between them.
    expect(overlays[0]?.curves).toHaveLength(1)
  })

  it('has nothing to draw for a document with no sketches', () => {
    expect(buildSketchOverlays([], [box()])).toEqual({ overlays: [], problems: [] })
  })
})
