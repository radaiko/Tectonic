import { describe, expect, it } from 'vitest'
import {
  PROFILE_KINDS,
  STRUCTURAL_PROFILES,
  findProfile,
  profileMassPerMetre,
  profileSeries,
  profilesByKind,
  profilesBySeries,
  profilesByStandard,
  requireProfile,
  searchProfiles,
} from '../../src/library/StructuralProfiles'
import { LibraryError } from '../../src/library/types'

describe('the structural profile table', () => {
  it('names every profile uniquely', () => {
    const names = STRUCTURAL_PROFILES.map((entry) => entry.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('gives every entry a known kind and positive dimensions', () => {
    for (const entry of STRUCTURAL_PROFILES) {
      expect(PROFILE_KINDS).toContain(entry.kind)
      expect(entry.height).toBeGreaterThan(0)
      expect(entry.width).toBeGreaterThan(0)
      expect(entry.webThickness).toBeGreaterThan(0)
      expect(entry.flangeThickness).toBeGreaterThan(0)
      expect(entry.area).toBeGreaterThan(0)
    }
  })

  it('covers every kind the weldment generator can sweep', () => {
    for (const kind of PROFILE_KINDS) {
      expect(profilesByKind(kind).length).toBeGreaterThan(0)
    }
  })
})

describe('findProfile', () => {
  it('matches a catalogue name regardless of case or padding', () => {
    expect(findProfile('  ipe 200 ')?.name).toBe('IPE 200')
  })

  it('returns nothing for a name that is not in the table', () => {
    expect(findProfile('IPE 999')).toBeUndefined()
    expect(() => requireProfile('IPE 999')).toThrow(LibraryError)
  })
})

describe('the published dimensions', () => {
  it('agrees with DIN 1025-5 for IPE 200', () => {
    const entry = requireProfile('IPE 200')

    expect(entry).toMatchObject({
      kind: 'i-beam',
      series: 'IPE',
      height: 200,
      width: 100,
      webThickness: 5.6,
      flangeThickness: 8.5,
    })
    // The standard lists 28.5 cm² and 22.4 kg/m.
    expect(entry.area).toBeCloseTo(2850, 6)
    expect(profileMassPerMetre(entry)).toBeCloseTo(22.4, 1)
  })

  it('computes a hollow section area from its wall', () => {
    const entry = requireProfile('SHS 40x40x3')
    expect(entry.area).toBeCloseTo(40 * 40 - 34 * 34, 6)
  })

  it('computes a round section area from its bore', () => {
    const entry = requireProfile('CHS 48.3x3.2')
    // EN 10219 lists 4.53 cm² for this size.
    expect(entry.area).toBeCloseTo(453, 0)
  })

  it('reads a flat bar as width by thickness', () => {
    const entry = requireProfile('Flat 40x10')
    expect(entry.width).toBe(40)
    expect(entry.height).toBe(10)
    expect(entry.area).toBe(400)
  })

  it('scales the mass with the density it is given', () => {
    const entry = requireProfile('Flat 100x10')
    expect(profileMassPerMetre(entry, 2.7e-6)).toBeCloseTo(2.7, 5)
  })
})

describe('searchProfiles', () => {
  it('returns the whole table for an empty query', () => {
    expect(searchProfiles()).toHaveLength(STRUCTURAL_PROFILES.length)
  })

  it('filters by kind, standard and series together', () => {
    const found = searchProfiles({ kind: 'channel', standard: 'DIN', series: 'UPE' })

    expect(found.length).toBeGreaterThan(0)
    for (const entry of found) expect(entry.series).toBe('UPE')
  })

  it('matches text against the name and the series', () => {
    expect(searchProfiles({ text: 'IPE 3', series: 'IPE' }).map((entry) => entry.name)).toEqual([
      'IPE 300',
      'IPE 330',
      'IPE 360',
    ])
    // A substring is a substring: "Pipe 3" matches a search for "ipe 3" too.
    expect(searchProfiles({ text: 'ipe 3' }).map((entry) => entry.name)).toContain(
      'Pipe 3" Sch 40',
    )
    expect(searchProfiles({ text: 'he-m' }).length).toBe(profilesBySeries('HE-M').length)
  })

  it('bounds the search by depth', () => {
    const found = searchProfiles({ series: 'IPE', minHeight: 200, maxHeight: 300 })

    expect(found.map((entry) => entry.height)).toEqual([200, 220, 240, 270, 300])
  })

  it('rejects everything when the bounds cross', () => {
    expect(searchProfiles({ minHeight: 500, maxHeight: 100 })).toHaveLength(0)
  })
})

describe('grouping', () => {
  it('lists the series in table order without repeats', () => {
    const series = profileSeries()

    expect(series[0]).toBe('IPE')
    expect(new Set(series).size).toBe(series.length)
  })

  it('groups by standard', () => {
    expect(profilesByStandard('AISC').every((entry) => entry.standard === 'AISC')).toBe(true)
    expect(profilesByStandard('AISC').length).toBeGreaterThan(0)
  })

  it('matches a series case-insensitively', () => {
    expect(profilesBySeries('shs')).toEqual(profilesBySeries('SHS'))
  })
})
