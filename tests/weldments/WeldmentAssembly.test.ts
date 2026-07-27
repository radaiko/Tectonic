import { describe, expect, it } from 'vitest'
import { StubKernel } from '../../src/kernel/StubKernel'
import { StructuralProfile } from '../../src/weldments/StructuralProfile'
import { StructuralMember, linePath } from '../../src/weldments/StructuralMember'
import {
  WeldmentAssembly,
  buildWeldment,
  findJoints,
  planeSetback,
  resolveTreatments,
} from '../../src/weldments/WeldmentAssembly'
import { planeAt } from '../../src/weldments/geometry'
import type { EndTreatment } from '../../src/weldments/types'
import { WeldmentError } from '../../src/weldments/types'

const SHS = StructuralProfile.fromCatalog('SHS 50x50x4')

function stick(
  from: [number, number, number],
  to: [number, number, number],
  treatments: Partial<Record<'start' | 'end', EndTreatment>> = {},
  name?: string,
): StructuralMember {
  return new StructuralMember({
    profile: SHS,
    path: [
      linePath(
        { x: from[0], y: from[1], z: from[2] },
        { x: to[0], y: to[1], z: to[2] },
      ),
    ],
    treatments,
    ...(name === undefined ? {} : { name }),
  })
}

/** A 1000 × 600 rectangular frame, its four corners meeting end to end. */
function frame(treatment: EndTreatment = 'none'): WeldmentAssembly {
  const both = { start: treatment, end: treatment }
  return new WeldmentAssembly({
    members: [
      stick([0, 0, 0], [1000, 0, 0], both, 'Bottom'),
      stick([1000, 0, 0], [1000, 600, 0], both, 'Right'),
      stick([1000, 600, 0], [0, 600, 0], both, 'Top'),
      stick([0, 600, 0], [0, 0, 0], both, 'Left'),
    ],
  })
}

describe('findJoints', () => {
  it('finds a corner where two ends meet', () => {
    const joints = findJoints(frame().members)

    expect(joints).toHaveLength(4)
    for (const joint of joints) {
      expect(joint.kind).toBe('corner')
      expect(joint.contacts).toHaveLength(2)
      expect(joint.contacts.every((contact) => contact.end !== null)).toBe(true)
    }
  })

  it('finds a tee where an end lands on another member mid-span', () => {
    const run = stick([0, 0, 0], [1000, 0, 0])
    const branch = stick([500, 0, 0], [500, 400, 0])
    const joints = findJoints([run, branch])

    expect(joints).toHaveLength(1)
    expect(joints[0]?.kind).toBe('tee')
    expect(joints[0]?.contacts).toEqual([
      { memberId: branch.id, end: 'start' },
      { memberId: run.id, end: null },
    ])
  })

  it('calls three ends at one point a cross', () => {
    const joints = findJoints([
      stick([0, 0, 0], [100, 0, 0]),
      stick([0, 0, 0], [0, 100, 0]),
      stick([0, 0, 0], [0, 0, 100]),
    ])

    expect(joints).toHaveLength(1)
    expect(joints[0]?.kind).toBe('cross')
    expect(joints[0]?.contacts).toHaveLength(3)
  })

  it('ignores members that never touch', () => {
    expect(findJoints([stick([0, 0, 0], [100, 0, 0]), stick([0, 500, 0], [100, 500, 0])])).toEqual(
      [],
    )
  })

  it('joins ends that are close but not identical', () => {
    const tolerance = 0.5
    const joints = findJoints(
      [stick([0, 0, 0], [100, 0, 0]), stick([100.2, 0, 0], [100.2, 100, 0])],
      tolerance,
    )

    expect(joints).toHaveLength(1)
  })
})

describe('resolveTreatments', () => {
  it('leaves an untreated end uncut', () => {
    const resolved = resolveTreatments(frame().members)

    expect(resolved).toHaveLength(8)
    for (const entry of resolved) {
      expect(entry.plane).toBeNull()
      expect(entry.setback).toBe(0)
      expect(entry.angle).toBe(90)
    }
  })

  it('bisects a right-angled corner at 45 degrees', () => {
    const resolved = resolveTreatments(frame('miter').members)

    for (const entry of resolved) {
      expect(entry.treatment).toBe('miter')
      expect(entry.plane).not.toBeNull()
      expect(entry.angle).toBeCloseTo(45, 6)
    }
  })

  it('bisects a shallow corner at half its included angle', () => {
    const resolved = resolveTreatments([
      stick([0, 0, 0], [100, 0, 0], { end: 'miter' }),
      stick([100, 0, 0], [200, 100, 0], { start: 'miter' }),
    ])
    const cut = resolved.find((entry) => entry.treatment === 'miter' && entry.plane)

    // The members turn through 45°, so the two legs include 135°.
    expect(cut?.angle).toBeCloseTo(67.5, 4)
  })

  it('points the cut plane at the material it keeps', () => {
    const bottom = stick([0, 0, 0], [1000, 0, 0], { end: 'miter' })
    const right = stick([1000, 0, 0], [1000, 600, 0], { start: 'miter' })
    const [cut] = resolveTreatments([bottom, right]).filter(
      (entry) => entry.memberId === bottom.id && entry.plane,
    )

    // Keeping the front means keeping the run back towards the member's body.
    expect(cut?.plane?.origin).toEqual({ x: 1000, y: 0, z: 0 })
    expect(cut?.setback).toBeCloseTo(0, 9)
  })

  it('pulls a mitered corner back by half the gap on each side', () => {
    const resolved = resolveTreatments(frame('miter').members, { gap: 2 })

    for (const entry of resolved) {
      // Half the gap, measured perpendicular to a 45° face.
      expect(entry.setback).toBeCloseTo(1 / Math.sin(Math.PI / 4), 6)
    }
  })

  it('cuts a butt joint square and sets it back by the whole gap', () => {
    const resolved = resolveTreatments(frame('butt').members, { gap: 3 })

    for (const entry of resolved) {
      expect(entry.angle).toBe(90)
      expect(entry.setback).toBeCloseTo(3, 9)
    }
  })

  it('bevels a weld prep off square', () => {
    const [cut] = resolveTreatments(frame('weld-prep').members, { prepAngle: 30 })

    expect(cut?.angle).toBeCloseTo(60, 6)
    expect(cut?.plane).not.toBeNull()
  })

  it('notches a cope against whatever it runs into, with no plane', () => {
    const run = stick([0, 0, 0], [1000, 0, 0])
    const branch = stick([500, 0, 0], [500, 400, 0], { start: 'cope' })
    const cut = resolveTreatments([run, branch]).find(
      (entry) => entry.memberId === branch.id && entry.end === 'start',
    )

    expect(cut?.plane).toBeNull()
    expect(cut?.copeAgainst).toEqual([run.id])
  })

  it('cuts collinear members square, having no bisector to work with', () => {
    const resolved = resolveTreatments([
      stick([0, 0, 0], [100, 0, 0], { end: 'miter' }),
      stick([100, 0, 0], [200, 0, 0], { start: 'miter' }),
    ])

    for (const entry of resolved.filter((candidate) => candidate.plane)) {
      expect(entry.angle).toBe(90)
    }
  })

  it('leaves a treated end alone when it meets nothing', () => {
    const [cut] = resolveTreatments([stick([0, 0, 0], [100, 0, 0], { start: 'miter' })])

    expect(cut?.plane).toBeNull()
    expect(cut?.jointId).toBeNull()
  })

  it('leaves a miter alone at a tee, where no second end is there to bisect', () => {
    const run = stick([0, 0, 0], [1000, 0, 0])
    const branch = stick([500, 0, 0], [500, 400, 0], { start: 'miter' })
    const cut = resolveTreatments([run, branch]).find(
      (entry) => entry.memberId === branch.id && entry.end === 'start',
    )

    expect(cut?.plane).toBeNull()
    expect(cut?.jointId).not.toBeNull()
  })
})

describe('planeSetback', () => {
  it('reports nothing for a plane the axis runs along', () => {
    const plane = planeAt({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })

    expect(planeSetback(plane, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })).toBe(0)
  })
})

describe('WeldmentAssembly', () => {
  it('holds its members and refuses a duplicate', () => {
    const assembly = frame()
    const first = assembly.members[0] as StructuralMember

    expect(assembly.length).toBe(4)
    expect(assembly.get(first.id)).toBe(first)
    expect(() => assembly.add(first)).toThrow(/duplicate/i)
    expect(() => assembly.require('nope')).toThrow(WeldmentError)
  })

  it('removes a member and reports whether it was there', () => {
    const assembly = frame()
    const first = assembly.members[0] as StructuralMember

    expect(assembly.remove(first.id)).toBe(true)
    expect(assembly.remove(first.id)).toBe(false)
    expect(assembly.length).toBe(3)
  })

  it('refuses a negative weld gap', () => {
    expect(() => new WeldmentAssembly({ gap: -1 })).toThrow(WeldmentError)
  })

  it('miters the corners and copes the tees on its own', () => {
    const run = stick([0, 0, 0], [1000, 0, 0])
    const post = stick([1000, 0, 0], [1000, 600, 0])
    const branch = stick([500, 0, 0], [500, 400, 0])
    const assembly = new WeldmentAssembly({ members: [run, post, branch] })

    assembly.applyAutoTreatments()

    expect(run.treatments.end).toBe('miter')
    expect(post.treatments.start).toBe('miter')
    expect(branch.treatments.start).toBe('cope')
    // Nothing meets the far end of the branch, so it stays as cut.
    expect(branch.treatments.end).toBe('none')
  })

  it('shortens the members by what the treatments take off', () => {
    const assembly = frame('butt')
    assembly.gap = 5
    const first = assembly.members[0] as StructuralMember

    expect(assembly.trimmedLength(first.id)).toBeCloseTo(990, 9)
    // 2 × 990 + 2 × 590, at the section's mass per metre.
    expect(assembly.mass).toBeCloseTo(((990 + 590) * 2 / 1000) * SHS.massPerMetre, 6)
  })

  it('never reports a negative length for a member cut away entirely', () => {
    const assembly = new WeldmentAssembly({
      gap: 500,
      members: [
        stick([0, 0, 0], [100, 0, 0], { end: 'butt' }),
        stick([100, 0, 0], [200, 0, 0], { start: 'butt' }),
      ],
    })

    expect(assembly.trimmedLength((assembly.members[0] as StructuralMember).id)).toBe(0)
  })

  it('collapses identical sticks into one cut list row', () => {
    const list = frame('miter').cutList()

    expect(list).toHaveLength(2)
    expect(list.map((row) => row.quantity)).toEqual([2, 2])
    expect(list[0]).toMatchObject({
      profile: 'SHS 50x50x4',
      length: 1000,
      angles: [45, 45],
      totalLength: 2000,
    })
    expect(list[0]?.memberIds).toHaveLength(2)
    expect(list[0]?.mass).toBeCloseTo(2 * SHS.massPerMetre, 2)
  })

  it('keeps differently cut sticks apart in the cut list', () => {
    const assembly = frame()
    ;(assembly.members[0] as StructuralMember).treatments.end = 'miter'
    ;(assembly.members[1] as StructuralMember).treatments.start = 'miter'

    const rows = assembly.cutList()
    expect(rows.filter((row) => row.length === 1000)).toHaveLength(2)
  })

  it('round-trips through JSON', () => {
    const assembly = frame('miter')
    assembly.gap = 2
    assembly.name = 'Table frame'
    const copy = WeldmentAssembly.fromJSON(assembly.toJSON())

    expect(copy.toJSON()).toEqual(assembly.toJSON())
    expect(copy.cutList()).toEqual(assembly.cutList())
    expect(assembly.clone().joints()).toHaveLength(4)
  })
})

describe('buildWeldment', () => {
  it('builds one solid per member', async () => {
    const kernel = new StubKernel()
    await kernel.init()

    const built = await buildWeldment(kernel, frame())

    expect(built).toHaveLength(4)
    for (const entry of built) {
      expect((await kernel.triangulate(entry.shape)).indices.length).toBeGreaterThan(0)
    }
  })

  it('cuts a mitered corner back off the member', async () => {
    const kernel = new StubKernel()
    await kernel.init()

    const square = await buildWeldment(kernel, frame())
    const mitered = await buildWeldment(kernel, frame('miter'))
    const squareBounds = await kernel.boundingBox((square[0] as { shape: never }).shape)
    const miterBounds = await kernel.boundingBox((mitered[0] as { shape: never }).shape)

    expect(miterBounds.max.x).toBeLessThanOrEqual(squareBounds.max.x)
    expect(miterBounds.min.x).toBeGreaterThanOrEqual(squareBounds.min.x)
  })

  it('notches a coped branch around the member it runs into', async () => {
    const kernel = new StubKernel()
    await kernel.init()

    const run = stick([0, 0, 0], [1000, 0, 0])
    const branch = stick([500, 0, 0], [500, 400, 0], { start: 'cope' })
    const built = await buildWeldment(kernel, new WeldmentAssembly({ members: [run, branch] }))
    const notched = built.find((entry) => entry.memberId === branch.id)

    expect(notched).toBeDefined()
    expect((await kernel.triangulate(notched?.shape as never)).indices.length).toBeGreaterThan(0)
  })
})
