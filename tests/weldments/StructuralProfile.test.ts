import { describe, expect, it } from 'vitest'
import { PROFILE_KINDS, STRUCTURAL_PROFILES } from '../../src/library/StructuralProfiles'
import { signedArea } from '../../src/library/polygon'
import {
  StructuralProfile,
  alignmentOffset,
  placeSection,
  profileArea,
  profileCentroid,
  sectionExtent,
} from '../../src/weldments/StructuralProfile'
import { MEMBER_ALIGNMENTS, WeldmentError } from '../../src/weldments/types'

const IPE200 = StructuralProfile.fromCatalog('IPE 200')

describe('baseSection', () => {
  it('winds every kind anticlockwise about the bounding box centre', () => {
    for (const kind of PROFILE_KINDS) {
      const entry = STRUCTURAL_PROFILES.find((candidate) => candidate.kind === kind)
      const profile = StructuralProfile.fromTable(entry as never).section()

      expect(signedArea(profile.points), kind).toBeGreaterThan(0)
      const extent = sectionExtent(profile)
      const centroidOfBox = boxCentre(profile.points)
      expect(centroidOfBox.x, kind).toBeCloseTo(0, 9)
      expect(centroidOfBox.y, kind).toBeCloseTo(0, 9)
      expect(extent.width, kind).toBeGreaterThan(0)
    }
  })

  it('draws an I beam as twelve corners spanning the full section', () => {
    const profile = IPE200.section()
    const extent = sectionExtent(profile)

    expect(profile.points).toHaveLength(12)
    expect(extent).toEqual({ width: 100, height: 200 })
    expect(profile.holes).toBeUndefined()
  })

  it('measures within a few per cent of the published area', () => {
    // Our polygon has no root fillets, so it comes out slightly light.
    const measured = profileArea(IPE200.section())
    expect(measured).toBeGreaterThan(IPE200.area * 0.9)
    expect(measured).toBeLessThan(IPE200.area)
  })

  it('bores a rectangular tube with a clockwise hole', () => {
    const profile = StructuralProfile.fromCatalog('SHS 50x50x4').section()

    expect(signedArea(profile.points)).toBeGreaterThan(0)
    expect(signedArea(profile.holes?.[0] ?? [])).toBeLessThan(0)
    expect(profileArea(profile)).toBeCloseTo(50 * 50 - 42 * 42, 6)
  })

  it('bores a round tube at the segment count it is given', () => {
    const profile = StructuralProfile.fromCatalog('CHS 60.3x3.2').section(16)

    expect(profile.points).toHaveLength(16)
    expect(profile.holes?.[0]).toHaveLength(16)
  })

  it('puts a channel web on the left and the flanges to the right', () => {
    const points = StructuralProfile.fromCatalog('UPN 100').section().points

    expect(points).toHaveLength(8)
    // The web spans the full depth at the far left of the section.
    expect(Math.min(...points.map((point) => point.x))).toBeCloseTo(-25, 9)
    expect(sectionExtent({ points })).toEqual({ width: 50, height: 100 })
  })

  it('puts an angle heel at the bottom left', () => {
    const points = StructuralProfile.fromCatalog('L 100x50x8').section().points

    expect(points).toHaveLength(6)
    expect(points[0]).toEqual({ x: -25, y: -50 })
    expect(sectionExtent({ points })).toEqual({ width: 50, height: 100 })
  })

  it('hangs a tee stem below its table', () => {
    const points = StructuralProfile.fromCatalog('T 50').section().points
    const bottom = points.filter((point) => point.y === -25)

    expect(points).toHaveLength(8)
    expect(bottom.map((point) => point.x)).toEqual([-3, 3])
  })
})

describe('profileCentroid', () => {
  it('sits on the axis of a doubly symmetric section', () => {
    const centroid = IPE200.centroid()

    expect(centroid.x).toBeCloseTo(0, 9)
    expect(centroid.y).toBeCloseTo(0, 9)
  })

  it('pulls towards the web of a channel', () => {
    expect(StructuralProfile.fromCatalog('UPN 200').centroid().x).toBeLessThan(0)
  })

  it('pulls towards the heel of an unequal angle', () => {
    const centroid = StructuralProfile.fromCatalog('L 100x50x8').centroid()

    expect(centroid.x).toBeLessThan(0)
    expect(centroid.y).toBeLessThan(0)
  })

  it('ignores the bore of a tube, which is symmetric anyway', () => {
    const centroid = profileCentroid(StructuralProfile.fromCatalog('RHS 100x50x5').section())

    expect(centroid.x).toBeCloseTo(0, 9)
    expect(centroid.y).toBeCloseTo(0, 9)
  })

  it('falls back to the mean of a degenerate loop', () => {
    expect(
      profileCentroid({
        points: [
          { x: 0, y: 0 },
          { x: 2, y: 0 },
        ],
      }),
    ).toEqual({ x: 1, y: 0 })
  })
})

describe('alignmentOffset', () => {
  const section = IPE200.section()

  it('leaves a centred section where it is', () => {
    expect(alignmentOffset(section, 'center')).toEqual({ x: 0, y: 0 })
  })

  it('puts each named corner of the box onto the path', () => {
    expect(alignmentOffset(section, 'top-left')).toEqual({ x: 50, y: -100 })
    expect(alignmentOffset(section, 'bottom-right')).toEqual({ x: -50, y: 100 })
    expect(alignmentOffset(section, 'top')).toEqual({ x: 0, y: -100 })
    expect(alignmentOffset(section, 'bottom')).toEqual({ x: 0, y: 100 })
    expect(alignmentOffset(section, 'left')).toEqual({ x: 50, y: 0 })
    expect(alignmentOffset(section, 'right')).toEqual({ x: -50, y: 0 })
    expect(alignmentOffset(section, 'top-right')).toEqual({ x: -50, y: -100 })
    expect(alignmentOffset(section, 'bottom-left')).toEqual({ x: 50, y: 100 })
  })

  it('cancels the centroid of an unequal angle', () => {
    const profile = StructuralProfile.fromCatalog('L 100x50x8').section()
    const offset = alignmentOffset(profile, 'centroid')
    const centroid = profileCentroid(placeSection(profile, { alignment: 'centroid' }))

    expect(offset.x).toBeGreaterThan(0)
    expect(centroid.x).toBeCloseTo(0, 9)
    expect(centroid.y).toBeCloseTo(0, 9)
  })

  it('handles every alignment the editor offers', () => {
    for (const alignment of MEMBER_ALIGNMENTS) {
      expect(alignmentOffset(section, alignment)).toBeDefined()
    }
  })
})

describe('placeSection', () => {
  it('aligns, then turns, then offsets', () => {
    const placed = placeSection(
      { points: [{ x: 1, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 2 }, { x: 1, y: 2 }] },
      { alignment: 'center', rotation: 90, offset: { x: 10, y: 0 } },
    )

    // The box is centred on (2, 1), so `center` shifts nothing; a quarter turn
    // takes (1, 0) to (0, 1), and the offset then slides it along +X.
    expect(placed.points[0]?.x).toBeCloseTo(10, 9)
    expect(placed.points[0]?.y).toBeCloseTo(1, 9)
  })

  it('carries the holes with the outer loop', () => {
    const placed = StructuralProfile.fromCatalog('SHS 50x50x4').placedSection({
      alignment: 'bottom',
      segments: 8,
    })

    expect(placed.holes).toHaveLength(1)
    expect(sectionExtent(placed)).toEqual({ width: 50, height: 50 })
    // `bottom` puts the underside of the section on the path.
    expect(Math.min(...placed.points.map((point) => point.y))).toBeCloseTo(0, 9)
  })

  it('leaves a section alone when nothing is asked of it', () => {
    expect(placeSection(IPE200.section())).toEqual(IPE200.section())
  })
})

describe('StructuralProfile', () => {
  it('carries the catalogue row through unchanged', () => {
    expect(IPE200).toMatchObject({
      name: 'IPE 200',
      kind: 'i-beam',
      standard: 'EN',
      series: 'IPE',
      area: 2850,
    })
    expect(IPE200.massPerMetre).toBeCloseTo(22.4, 1)
    expect(IPE200.extent()).toEqual({ width: 100, height: 200 })
  })

  it('computes the area of a custom profile from its own polygon', () => {
    const bar = new StructuralProfile({
      name: 'Bar 30x10',
      kind: 'flat-bar',
      dimensions: {
        height: 10,
        width: 30,
        webThickness: 10,
        flangeThickness: 10,
        rootRadius: 0,
      },
    })

    expect(bar.area).toBeCloseTo(300, 9)
    expect(bar.standard).toBe('generic')
    expect(bar.series).toBe('Bar 30x10')
  })

  it('takes a density other than steel', () => {
    const aluminium = StructuralProfile.fromCatalog('SHS 50x50x4', 2.7e-6)

    expect(aluminium.area).toBeCloseTo(50 * 50 - 42 * 42, 6)
    expect(aluminium.massPerMetre).toBeCloseTo(aluminium.area * 1000 * 2.7e-6, 6)
    expect(aluminium.massPerMetre).toBeLessThan(StructuralProfile.fromCatalog('SHS 50x50x4').massPerMetre)
  })

  it('round-trips through JSON', () => {
    const copy = StructuralProfile.fromJSON(IPE200.toJSON())

    expect(copy.toJSON()).toEqual(IPE200.toJSON())
    expect(copy.section()).toEqual(IPE200.section())
  })

  it('refuses a nameless or unknown profile', () => {
    expect(() =>
      new StructuralProfile({
        name: '  ',
        kind: 'flat-bar',
        dimensions: dims({ height: 5, width: 20 }),
      }),
    ).toThrow(/needs a name/i)
    expect(() =>
      new StructuralProfile({
        name: 'Odd',
        kind: 'hexagon' as never,
        dimensions: dims({ height: 5, width: 20 }),
      }),
    ).toThrow(WeldmentError)
  })

  it('refuses dimensions that cannot make a section', () => {
    expect(() =>
      new StructuralProfile({
        name: 'Bad',
        kind: 'i-beam',
        dimensions: dims({ height: 0, width: 20 }),
      }),
    ).toThrow(/positive height and width/i)
    expect(() =>
      new StructuralProfile({
        name: 'Bad',
        kind: 'i-beam',
        dimensions: dims({ height: 100, width: 50, webThickness: 0 }),
      }),
    ).toThrow(/positive wall/i)
    expect(() =>
      new StructuralProfile({
        name: 'Bad',
        kind: 'i-beam',
        dimensions: dims({ height: 100, width: 10, webThickness: 20 }),
      }),
    ).toThrow(/thicker than/i)
    expect(() =>
      new StructuralProfile({
        name: 'Bad',
        kind: 'i-beam',
        dimensions: dims({ height: 20, width: 100, flangeThickness: 15 }),
      }),
    ).toThrow(/no web/i)
    expect(() =>
      new StructuralProfile({
        name: 'Bad',
        kind: 'round-tube',
        dimensions: dims({ height: 40, width: 40, webThickness: 25, flangeThickness: 25 }),
      }),
    ).toThrow(/bore/i)
    expect(() =>
      new StructuralProfile({
        name: 'Bad',
        kind: 'angle',
        dimensions: dims({ height: 40, width: 40, webThickness: 40, flangeThickness: 40 }),
      }),
    ).toThrow(/leg/i)
  })
})

function dims(overrides: Partial<Record<string, number>>): {
  height: number
  width: number
  webThickness: number
  flangeThickness: number
  rootRadius: number
} {
  return {
    height: 100,
    width: 50,
    webThickness: 5,
    flangeThickness: 8,
    rootRadius: 0,
    ...overrides,
  } as never
}

function boxCentre(points: readonly { x: number; y: number }[]): { x: number; y: number } {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  }
}
