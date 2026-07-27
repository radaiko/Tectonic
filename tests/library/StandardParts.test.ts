import { describe, expect, it } from 'vitest'
import { StubKernel } from '../../src/kernel/StubKernel'
import {
  PART_CATEGORIES,
  STANDARD_PARTS,
  buildStandardPart,
  familiesByCategory,
  findFamily,
  findSize,
  partExtent,
  partMass,
  partSolid,
  partVolume,
  requireFamily,
  requireSize,
  resolveParameters,
  searchParts,
} from '../../src/library/StandardParts'
import { signedArea } from '../../src/library/polygon'
import { LibraryError } from '../../src/library/types'

describe('the standard parts catalogue', () => {
  it('identifies every family uniquely', () => {
    const ids = STANDARD_PARTS.map((family) => family.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('stocks every category', () => {
    for (const category of PART_CATEGORIES) {
      expect(familiesByCategory(category).length).toBeGreaterThan(0)
    }
  })

  it('gives every size a value for every parameter it declares', () => {
    for (const family of STANDARD_PARTS) {
      expect(family.sizes.length).toBeGreaterThan(0)
      for (const size of family.sizes) {
        for (const parameter of family.parameters) {
          expect(
            size.values[parameter.key],
            `${family.id} ${size.size} is missing ${parameter.key}`,
          ).toBeTypeOf('number')
        }
      }
    }
  })

  it('names sizes uniquely inside a family', () => {
    for (const family of STANDARD_PARTS) {
      const names = family.sizes.map((size) => size.size)
      expect(new Set(names).size, family.id).toBe(names.length)
    }
  })
})

describe('building every catalogue size', () => {
  it('produces a recipe that starts with an addition and has volume', () => {
    for (const family of STANDARD_PARTS) {
      for (const size of family.sizes) {
        const solid = partSolid(family, size.size)
        const label = `${family.id} ${size.size}`

        expect(solid.features.length, label).toBeGreaterThan(0)
        expect(solid.features[0]?.op, label).toBe('add')
        expect(partVolume(solid), label).toBeGreaterThan(0)
      }
    }
  })

  it('winds every loop anticlockwise, as the kernel expects', () => {
    for (const family of STANDARD_PARTS) {
      const solid = partSolid(family, (family.sizes[0] as { size: string }).size)
      for (const feature of solid.features) {
        expect(signedArea(feature.profile), `${family.id} ${feature.kind}`).toBeGreaterThan(0)
      }
    }
  })

  it('keeps the subtractions from eating the whole part', () => {
    for (const family of STANDARD_PARTS) {
      for (const size of family.sizes) {
        const solid = partSolid(family, size.size)
        const added = solid.features.filter((feature) => feature.op === 'add')
        expect(partVolume(solid), `${family.id} ${size.size}`).toBeLessThanOrEqual(
          partVolume({ features: added }) + 1e-6,
        )
      }
    }
  })
})

describe('measuring a part', () => {
  it('gets an M8 hex bolt within a few per cent of its catalogue mass', () => {
    // ISO 4014 M8×40 in steel weighs about 22 g.
    const mass = partMass(partSolid(requireFamily('hex-bolt'), 'M8'))

    expect(mass).toBeGreaterThan(0.017)
    expect(mass).toBeLessThan(0.028)
  })

  it('measures a flat washer as the ring it is', () => {
    const solid = partSolid(requireFamily('flat-washer'), 'M8')
    const expected = (Math.PI / 4) * (16 * 16 - 8.4 * 8.4) * 1.6

    expect(partVolume(solid)).toBeCloseTo(expected, 3)
  })

  it('takes the tapped bore out of a hex nut', () => {
    const family = requireFamily('hex-nut')
    const bored = partVolume(partSolid(family, 'M10'))
    const solidHex = partVolume({
      features: partSolid(family, 'M10').features.filter((feature) => feature.op === 'add'),
    })

    expect(bored).toBeLessThan(solidHex)
    expect(bored).toBeGreaterThan(solidHex * 0.5)
  })

  it('reports the extent a bolt occupies about its own axis', () => {
    const extent = partExtent(partSolid(requireFamily('hex-bolt'), 'M10'))

    // 16 mm across the flats, so 9.24 mm to a corner.
    expect(extent.radius).toBeCloseTo(16 / 2 / Math.cos(Math.PI / 6), 3)
    expect(extent.min).toBe(-50)
    expect(extent.max).toBe(6.4)
  })
})

describe('resolveParameters', () => {
  const family = requireFamily('hex-bolt')

  it('starts from the catalogue row', () => {
    expect(resolveParameters(family, 'M8')).toMatchObject({ diameter: 8, pitch: 1.25, length: 40 })
  })

  it('takes an override for a length the table does not list', () => {
    expect(resolveParameters(family, 'M8', { length: 55 }).length).toBe(55)
  })

  it('refuses a parameter the family does not have', () => {
    expect(() => resolveParameters(family, 'M8', { colour: 3 })).toThrow(/no parameter/i)
  })

  it('refuses a value that is not a number', () => {
    expect(() => resolveParameters(family, 'M8', { length: Number.NaN })).toThrow(LibraryError)
  })

  it('refuses a size that is not in the family', () => {
    expect(() => requireSize(family, 'M7')).toThrow(/no size/i)
    expect(findSize(family, 'm8')?.size).toBe('M8')
  })
})

describe('searchParts', () => {
  it('returns everything for an empty query', () => {
    expect(searchParts()).toHaveLength(STANDARD_PARTS.length)
  })

  it('filters by category and standard', () => {
    const found = searchParts({ category: 'bearing', standard: 'ISO' })

    expect(found.length).toBeGreaterThan(0)
    for (const family of found) expect(family.category).toBe('bearing')
  })

  it('matches a size code as well as a name', () => {
    expect(searchParts({ text: '6204' }).map((family) => family.id)).toEqual(['ball-bearing'])
    expect(searchParts({ text: 'nylon' }).map((family) => family.id)).toEqual(['nylock-nut'])
  })

  it('finds nothing for a term no family carries', () => {
    expect(searchParts({ text: 'flux capacitor' })).toHaveLength(0)
  })
})

describe('findFamily', () => {
  it('returns undefined rather than throwing for an unknown id', () => {
    expect(findFamily('turbo-encabulator')).toBeUndefined()
    expect(() => requireFamily('turbo-encabulator')).toThrow(LibraryError)
  })
})

describe('buildStandardPart', () => {
  it('turns a recipe into a solid the kernel can tessellate', async () => {
    const kernel = new StubKernel()
    await kernel.init()

    const shape = await buildStandardPart(kernel, partSolid(requireFamily('hex-bolt'), 'M8'))
    const mesh = await kernel.triangulate(shape)

    expect(mesh.indices.length).toBeGreaterThan(0)
    const bounds = await kernel.boundingBox(shape)
    expect(bounds.max.z).toBeGreaterThan(0)
    expect(bounds.min.z).toBeLessThan(0)
  })

  it('builds one of every family without complaint', async () => {
    const kernel = new StubKernel()
    await kernel.init()

    for (const family of STANDARD_PARTS) {
      const size = (family.sizes[0] as { size: string }).size
      const shape = await buildStandardPart(kernel, partSolid(family, size))
      const mesh = await kernel.triangulate(shape)
      expect(mesh.indices.length, `${family.id} ${size}`).toBeGreaterThan(0)
    }
  })

  it('refuses a recipe that starts by removing material', async () => {
    const kernel = new StubKernel()
    await kernel.init()

    await expect(
      buildStandardPart(kernel, {
        features: [
          {
            kind: 'prism',
            op: 'subtract',
            profile: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
              { x: 1, y: 1 },
            ],
            from: 0,
            to: 1,
          },
        ],
      }),
    ).rejects.toThrow(LibraryError)
    await expect(buildStandardPart(kernel, { features: [] })).rejects.toThrow(/at least one/i)
  })
})
