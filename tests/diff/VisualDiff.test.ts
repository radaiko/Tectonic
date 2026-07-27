import { describe, expect, it } from 'vitest'
import type { MeshData } from '../../src/domain/MeshData'
import { createEmptyMesh } from '../../src/domain/MeshData'
import type { DiffViewMode, FaceChange } from '../../src/diff/VisualDiff'
import {
  DEFAULT_MATCH_FRACTION,
  DIFF_COLORS,
  DIFF_OPACITY,
  compareBodies,
  describeDiff,
  diffLayers,
  diffScale,
  percentChange,
  placedMesh,
  resolveTolerances,
  sideBySideOffsets,
} from '../../src/diff/VisualDiff'
import { boxMesh } from '../helpers/meshes'

/** The same mesh, shifted — the cheapest way to make a body "move". */
function translated(mesh: MeshData, dx: number, dy = 0, dz = 0): MeshData {
  const positions = mesh.positions.map((value, index) =>
    index % 3 === 0 ? value + dx : index % 3 === 1 ? value + dy : value + dz,
  )
  return { positions, normals: [...mesh.normals], indices: [...mesh.indices] }
}

/**
 * Two triangles sharing an edge, folded by `angle`. Exactly the shape that
 * tells a crease angle above the fold from one below it.
 */
function roofMesh(angle: number): MeshData {
  return {
    positions: [0, 0, 0, 0, 1, 0, -1, 0, 0, Math.cos(angle), 0, Math.sin(angle)],
    normals: [],
    indices: [0, 1, 2, 0, 3, 1],
  }
}

/** How many faces of each kind a comparison found. */
function counts(faces: readonly { readonly change: FaceChange }[]): Record<FaceChange, number> {
  const tally: Record<FaceChange, number> = { added: 0, removed: 0, modified: 0, unchanged: 0 }
  for (const face of faces) tally[face.change] += 1
  return tally
}

describe('diffScale', () => {
  it('measures the diagonal of the box holding both bodies', () => {
    expect(diffScale(boxMesh(3, 4, 12), boxMesh(1, 1, 1))).toBeCloseTo(13, 12)
  })

  it('falls back to one when both bodies are empty', () => {
    expect(diffScale(createEmptyMesh(), createEmptyMesh())).toBe(1)
  })
})

describe('resolveTolerances', () => {
  it('scales the matching window to the size of the model', () => {
    const box = boxMesh(2, 2, 2)
    const resolved = resolveTolerances(box, box)

    expect(resolved.matchTolerance).toBeCloseTo(Math.sqrt(12) * DEFAULT_MATCH_FRACTION, 12)
  })

  it('lets a caller override any of them', () => {
    const box = boxMesh(2, 2, 2)
    const resolved = resolveTolerances(box, box, { matchTolerance: 5, areaTolerance: 0.1 })

    expect(resolved.matchTolerance).toBe(5)
    expect(resolved.areaTolerance).toBe(0.1)
  })
})

describe('compareBodies', () => {
  it('reports an unchanged body as identical', () => {
    const result = compareBodies(boxMesh(2, 3, 4), boxMesh(2, 3, 4))

    expect(result.summary.identical).toBe(true)
    expect(counts(result.faces)).toEqual({ added: 0, removed: 0, modified: 0, unchanged: 6 })
  })

  it('leaves volume and area unchanged for an identical body', () => {
    const result = compareBodies(boxMesh(2, 2, 2), boxMesh(2, 2, 2))

    expect(result.summary.volumeDelta).toBeCloseTo(0, 12)
    expect(result.summary.areaDelta).toBeCloseTo(0, 12)
    expect(result.summary.volumeBefore).toBeCloseTo(8, 12)
  })

  it('calls a face modified when it stays put but changes size', () => {
    // A millimetre of extra height: every face bar the base shifts a little.
    const result = compareBodies(boxMesh(2, 2, 2), boxMesh(2, 2, 2.001))

    expect(counts(result.faces)).toEqual({ added: 0, removed: 0, modified: 5, unchanged: 1 })
    expect(result.summary.identical).toBe(false)
  })

  it('records how far a modified face moved and how much it grew', () => {
    const result = compareBodies(boxMesh(2, 2, 2), boxMesh(2, 2, 2.001))
    const top = result.faces.find((face) => (face.after?.normal.z ?? 0) > 0.99)

    expect(top?.centroidShift).toBeGreaterThan(0)
    expect(result.faces.some((face) => face.areaDelta > 0)).toBe(true)
  })

  it('treats a face that moved beyond the window as removed and added', () => {
    const result = compareBodies(boxMesh(2, 2, 2), boxMesh(2, 2, 4))
    const tally = counts(result.faces)

    // The base never moved; the other five faces have no partner.
    expect(tally.unchanged).toBe(1)
    expect(tally.added).toBe(5)
    expect(tally.removed).toBe(5)
  })

  it('pairs nothing at all when the body moved clear of its old position', () => {
    const box = boxMesh(1, 1, 1)
    const result = compareBodies(box, translated(box, 20))

    expect(counts(result.faces)).toEqual({ added: 6, removed: 6, modified: 0, unchanged: 0 })
    expect(result.summary.facesBefore).toBe(6)
    expect(result.summary.facesAfter).toBe(6)
  })

  it('counts every face as added when there was nothing before', () => {
    const result = compareBodies(createEmptyMesh(), boxMesh(1, 1, 1))

    expect(result.summary.facesAdded).toBe(6)
    expect(result.summary.facesBefore).toBe(0)
    expect(result.summary.volumeBefore).toBe(0)
  })

  it('counts every face as removed when nothing is left', () => {
    const result = compareBodies(boxMesh(1, 1, 1), createEmptyMesh())

    expect(result.summary.facesRemoved).toBe(6)
    expect(result.summary.volumeDelta).toBeCloseTo(-1, 12)
  })

  it('reports the volume and area a change added', () => {
    const result = compareBodies(boxMesh(2, 2, 2), boxMesh(2, 2, 4))

    expect(result.summary.volumeBefore).toBeCloseTo(8, 12)
    expect(result.summary.volumeAfter).toBeCloseTo(16, 12)
    expect(result.summary.volumeDelta).toBeCloseTo(8, 12)
    expect(result.summary.areaDelta).toBeCloseTo(16, 12)
  })

  it('forgives a change smaller than an explicit tolerance', () => {
    const result = compareBodies(boxMesh(2, 2, 2), boxMesh(2, 2, 2.001), {
      tolerance: 0.01,
      areaTolerance: 0.01,
      angleTolerance: 0.01,
    })

    expect(result.summary.identical).toBe(true)
  })

  it('keeps the tolerances it ran with on the result', () => {
    const result = compareBodies(boxMesh(1, 1, 1), boxMesh(1, 1, 1), { matchAngle: 0.5 })

    expect(result.tolerances.matchAngle).toBe(0.5)
  })

  it('orders pairings first, then removals, then additions', () => {
    const result = compareBodies(boxMesh(2, 2, 2), boxMesh(2, 2, 4))
    const changes = result.faces.map((face) => face.change)
    const firstAdded = changes.indexOf('added')
    const lastRemoved = changes.lastIndexOf('removed')

    expect(lastRemoved).toBeLessThan(firstAdded)
  })

  it('passes the crease angle through to the face grouping', () => {
    const roof = roofMesh((5 * Math.PI) / 180)
    const coarse = compareBodies(roof, roof)
    const fine = compareBodies(roof, roof, { creaseAngle: (1 * Math.PI) / 180 })

    // A five-degree fold reads as one surface until the crease angle drops
    // below it, at which point the two halves become separate faces.
    expect(coarse.summary.facesBefore).toBe(1)
    expect(fine.summary.facesBefore).toBe(2)
  })

  it('never pairs one face with two', () => {
    const result = compareBodies(boxMesh(2, 2, 2), boxMesh(2, 2, 2.001))
    const paired = result.faces.filter((face) => face.before !== null && face.after !== null)
    const beforeIds = paired.map((face) => face.before?.index)

    expect(new Set(beforeIds).size).toBe(paired.length)
  })
})

describe('diffLayers', () => {
  const result = compareBodies(boxMesh(2, 2, 2), boxMesh(2, 2, 4))

  it('colours added faces green and removed faces red', () => {
    const layers = diffLayers(result, 'overlay')
    const added = layers.find((layer) => layer.change === 'added')
    const removed = layers.find((layer) => layer.change === 'removed')

    expect(added?.color).toEqual(DIFF_COLORS.added)
    expect(removed?.color).toEqual(DIFF_COLORS.removed)
  })

  it('draws unchanged faces nearly transparent', () => {
    const layers = diffLayers(result, 'overlay')
    const unchanged = layers.find((layer) => layer.change === 'unchanged')

    expect(unchanged?.opacity).toBe(DIFF_OPACITY.unchanged)
    expect(unchanged?.opacity).toBeLessThan(DIFF_OPACITY.added)
  })

  it('draws each surviving face once in overlay', () => {
    const layers = diffLayers(result, 'overlay')

    // Five removed from the old body, five added and one unchanged from the new.
    expect(layers).toHaveLength(11)
  })

  it('drops unchanged faces in difference mode', () => {
    const layers = diffLayers(result, 'difference')

    expect(layers.every((layer) => layer.change !== 'unchanged')).toBe(true)
    expect(layers).toHaveLength(10)
  })

  it('shows only one version in the single-version modes', () => {
    expect(diffLayers(result, 'before').every((layer) => layer.version === 'before')).toBe(true)
    expect(diffLayers(result, 'after').every((layer) => layer.version === 'after')).toBe(true)
  })

  it('shows both versions of every face side by side', () => {
    const layers = diffLayers(result, 'sideBySide')

    expect(layers.filter((layer) => layer.version === 'before')).toHaveLength(6)
    expect(layers.filter((layer) => layer.version === 'after')).toHaveLength(6)
  })

  it('pushes the two versions apart only in side-by-side', () => {
    const apart = diffLayers(result, 'sideBySide')
    const together = diffLayers(result, 'overlay')

    expect(apart.some((layer) => layer.offset.x < 0)).toBe(true)
    expect(apart.some((layer) => layer.offset.x > 0)).toBe(true)
    expect(together.every((layer) => layer.offset.x === 0)).toBe(true)
  })

  it('names layers after the version and the face', () => {
    const layers = diffLayers(result, 'before')

    expect(layers[0]?.name).toMatch(/^Before face \d+$/)
  })

  it('carries real geometry on every layer', () => {
    for (const layer of diffLayers(result, 'overlay')) {
      expect(layer.mesh.indices.length).toBeGreaterThan(0)
      expect(layer.mesh.positions.length).toBe(layer.mesh.normals.length)
    }
  })

  it.each<DiffViewMode>(['overlay', 'sideBySide', 'difference', 'before', 'after'])(
    'produces layers in %s mode',
    (mode) => {
      expect(diffLayers(result, mode).length).toBeGreaterThan(0)
    },
  )
})

describe('sideBySideOffsets', () => {
  it('separates the bodies by their own width plus a gap', () => {
    const result = compareBodies(boxMesh(4, 1, 1), boxMesh(4, 1, 1))
    const offsets = sideBySideOffsets(result, 0.5)

    expect(offsets.after.x).toBeCloseTo(3, 12)
    expect(offsets.before.x).toBeCloseTo(-3, 12)
  })
})

describe('placedMesh', () => {
  const result = compareBodies(boxMesh(2, 2, 2), boxMesh(2, 2, 2))

  it('bakes the offset into the positions', () => {
    const layer = diffLayers(result, 'sideBySide')[0]
    if (!layer) throw new Error('side-by-side produced no layers')
    const placed = placedMesh(layer)

    expect(placed.positions[0]).toBeCloseTo((layer.mesh.positions[0] ?? 0) + layer.offset.x, 12)
  })

  it('hands back the same mesh when there is nothing to move', () => {
    const layer = diffLayers(result, 'overlay')[0]
    if (!layer) throw new Error('overlay produced no layers')

    expect(placedMesh(layer)).toBe(layer.mesh)
  })
})

describe('describeDiff', () => {
  it('says so plainly when nothing changed', () => {
    const result = compareBodies(boxMesh(1, 1, 1), boxMesh(1, 1, 1))

    expect(describeDiff(result.summary)).toBe('No changes')
  })

  it('lists what changed against the new face count', () => {
    const result = compareBodies(boxMesh(2, 2, 2), boxMesh(2, 2, 4))

    expect(describeDiff(result.summary)).toBe('5 added, 5 removed of 6 faces')
  })

  it('keeps the singular for a one-faced body', () => {
    const summary = {
      facesBefore: 0,
      facesAfter: 1,
      facesAdded: 1,
      facesRemoved: 0,
      facesModified: 0,
      facesUnchanged: 0,
      volumeBefore: 0,
      volumeAfter: 0,
      volumeDelta: 0,
      areaBefore: 0,
      areaAfter: 0,
      areaDelta: 0,
      identical: false,
    }

    expect(describeDiff(summary)).toBe('1 added of 1 face')
  })

  it('mentions modified faces', () => {
    const result = compareBodies(boxMesh(2, 2, 2), boxMesh(2, 2, 2.001))

    expect(describeDiff(result.summary)).toContain('5 modified')
  })
})

describe('percentChange', () => {
  it('reports a proportional increase', () => {
    expect(percentChange(8, 16)).toBeCloseTo(100, 12)
  })

  it('reports a decrease as negative', () => {
    expect(percentChange(8, 4)).toBeCloseTo(-50, 12)
  })

  it('calls growth from nothing a hundred per cent', () => {
    expect(percentChange(0, 5)).toBe(100)
  })

  it('reports no change from nothing to nothing', () => {
    expect(percentChange(0, 0)).toBe(0)
  })

  it('measures against the magnitude of a negative start', () => {
    expect(percentChange(-4, -2)).toBeCloseTo(50, 12)
  })
})
