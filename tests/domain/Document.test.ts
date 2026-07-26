import { describe, expect, it } from 'vitest'
import { countBodies, createBody, createDocument, createPart } from '../../src/domain/Document'
import { createEmptyMesh, triangleCount, vertexCount } from '../../src/domain/MeshData'

const NOW = '2026-07-26T12:00:00.000Z'

describe('createDocument', () => {
  it('stamps created and modified with the same timestamp', () => {
    const document = createDocument({ now: NOW })

    expect(document.metadata.created).toBe(NOW)
    expect(document.metadata.modified).toBe(NOW)
  })

  it('falls back to the wall clock when no timestamp is supplied', () => {
    const document = createDocument()

    expect(Number.isNaN(Date.parse(document.metadata.created))).toBe(false)
  })
})

describe('countBodies', () => {
  it('is zero for an empty document', () => {
    expect(countBodies(createDocument({ now: NOW }))).toBe(0)
  })

  it('sums bodies across every part', () => {
    const document = {
      ...createDocument({ now: NOW }),
      parts: [
        createPart('p1', 'Part 1', [
          createBody('b1', 'Body 1', createEmptyMesh()),
          createBody('b2', 'Body 2', createEmptyMesh()),
        ]),
        createPart('p2', 'Part 2', [createBody('b3', 'Body 3', createEmptyMesh())]),
        createPart('p3', 'Part 3'),
      ],
    }

    expect(countBodies(document)).toBe(3)
  })
})

describe('mesh helpers', () => {
  it('reports counts for an empty mesh', () => {
    const mesh = createEmptyMesh()

    expect(vertexCount(mesh)).toBe(0)
    expect(triangleCount(mesh)).toBe(0)
  })

  it('derives counts from the flat arrays', () => {
    const mesh = {
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0],
      normals: [],
      indices: [0, 1, 2, 0, 2, 3],
    }

    expect(vertexCount(mesh)).toBe(4)
    expect(triangleCount(mesh)).toBe(2)
  })
})
