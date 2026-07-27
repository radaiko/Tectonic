import type { LengthUnit } from '../domain/Document'
import { MILLIMETRES_PER_UNIT } from '../domain/units'

/**
 * An engineering material: what it weighs, how stiff it is, how it behaves in
 * heat, and what it looks like on the shelf.
 *
 * Units follow the convention every materials datasheet uses, so a number
 * copied out of MatWeb or ASM goes in unchanged: density in g/cm³, moduli and
 * strengths in GPa and MPa, conductivity in W/m·K, expansion in 1/K and
 * specific heat in J/kg·K. Nothing here converts on the way in — the one place
 * a conversion happens is {@link PhysicalMaterial.densityPerCubicUnit}, which
 * the mass-properties code needs because the model is not in centimetres.
 *
 * Missing data is `null`, not zero. A material nobody has measured the thermal
 * expansion of should not claim it does not expand.
 */

export const MATERIAL_CATEGORIES = [
  'metal',
  'plastic',
  'ceramic',
  'wood',
  'glass',
  'rubber',
  'composite',
  'fluid',
  'other',
] as const

export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number]

export const MATERIAL_FINISHES = [
  'matte',
  'gloss',
  'satin',
  'polished',
  'brushed',
  'anodized',
  'painted',
] as const

export type MaterialFinish = (typeof MATERIAL_FINISHES)[number]

/**
 * The second level of the library tree — Metal → Steel, Plastic → Nylon. Free
 * strings are accepted so a user-defined material can invent one, but the
 * built-in library only uses these.
 */
export const MATERIAL_SUBCATEGORIES = [
  'carbon-steel',
  'stainless-steel',
  'tool-steel',
  'alloy-steel',
  'cast-iron',
  'aluminum',
  'titanium',
  'copper',
  'brass',
  'bronze',
  'nickel',
  'magnesium',
  'zinc',
  'lead',
  'precious',
  'refractory',
  'abs',
  'pla',
  'nylon',
  'polycarbonate',
  'acrylic',
  'polyethylene',
  'polypropylene',
  'ptfe',
  'pvc',
  'peek',
  'polystyrene',
  'epoxy',
  'hardwood',
  'softwood',
  'engineered-wood',
  'silicate-glass',
  'technical-ceramic',
  'elastomer',
  'fiber-composite',
  'liquid',
  'gas',
  'other',
] as const

export type MaterialSubcategory = (typeof MATERIAL_SUBCATEGORIES)[number] | string

export function isMaterialCategory(value: unknown): value is MaterialCategory {
  return (MATERIAL_CATEGORIES as readonly string[]).includes(value as string)
}

export function isMaterialFinish(value: unknown): value is MaterialFinish {
  return (MATERIAL_FINISHES as readonly string[]).includes(value as string)
}

/** Every measured property, all optional because datasheets are incomplete. */
export interface MechanicalProperties {
  /** g/cm³. */
  readonly density: number
  /** GPa. */
  readonly youngsModulus?: number | null | undefined
  /** Dimensionless, typically 0.2–0.5. */
  readonly poissonsRatio?: number | null | undefined
  /** MPa. */
  readonly yieldStrength?: number | null | undefined
  /** MPa. */
  readonly ultimateTensileStrength?: number | null | undefined
  /** W/m·K. */
  readonly thermalConductivity?: number | null | undefined
  /** 1/K, i.e. 23e-6 for aluminium. */
  readonly thermalExpansion?: number | null | undefined
  /** J/kg·K. */
  readonly specificHeat?: number | null | undefined
}

/** Every field is nullable so `fromJSON` can pass a miss straight through. */
export interface PhysicalMaterialInit extends MechanicalProperties {
  readonly id?: string | undefined
  readonly name: string
  readonly category?: MaterialCategory | undefined
  readonly subcategory?: MaterialSubcategory | undefined
  /** Hex colour, `#rrggbb`. */
  readonly color?: string | undefined
  readonly finish?: MaterialFinish | undefined
  /** Standard or spec the numbers come from, e.g. "ASM / MatWeb". */
  readonly source?: string | null | undefined
  /** Set on materials the user added rather than ones that ship with the app. */
  readonly custom?: boolean | undefined
  /** Id of the appearance preset the viewport should render this with. */
  readonly appearanceId?: string | null | undefined
}

export interface PhysicalMaterialJSON {
  readonly id: string
  readonly name: string
  readonly category: MaterialCategory
  readonly subcategory: string
  readonly density: number
  readonly youngsModulus: number | null
  readonly poissonsRatio: number | null
  readonly yieldStrength: number | null
  readonly ultimateTensileStrength: number | null
  readonly thermalConductivity: number | null
  readonly thermalExpansion: number | null
  readonly specificHeat: number | null
  readonly color: string
  readonly finish: MaterialFinish
  readonly source: string | null
  readonly custom: boolean
  readonly appearanceId: string | null
}

/** Grey, 1 g/cm³ — what an unassigned body is measured as. */
export const DEFAULT_MATERIAL_COLOR = '#b0b4bb'

export class PhysicalMaterial {
  readonly id: string
  name: string
  category: MaterialCategory
  subcategory: string
  density: number
  youngsModulus: number | null
  poissonsRatio: number | null
  yieldStrength: number | null
  ultimateTensileStrength: number | null
  thermalConductivity: number | null
  thermalExpansion: number | null
  specificHeat: number | null
  color: string
  finish: MaterialFinish
  source: string | null
  readonly custom: boolean
  appearanceId: string | null

  constructor(init: PhysicalMaterialInit) {
    this.id = init.id ?? slugify(init.name)
    this.name = init.name
    this.category = isMaterialCategory(init.category) ? init.category : 'other'
    this.subcategory = init.subcategory ?? 'other'
    this.density = Number.isFinite(init.density) && init.density > 0 ? init.density : 1
    this.youngsModulus = init.youngsModulus ?? null
    this.poissonsRatio = init.poissonsRatio ?? null
    this.yieldStrength = init.yieldStrength ?? null
    this.ultimateTensileStrength = init.ultimateTensileStrength ?? null
    this.thermalConductivity = init.thermalConductivity ?? null
    this.thermalExpansion = init.thermalExpansion ?? null
    this.specificHeat = init.specificHeat ?? null
    this.color = init.color ?? DEFAULT_MATERIAL_COLOR
    this.finish = isMaterialFinish(init.finish) ? init.finish : 'satin'
    this.source = init.source ?? null
    this.custom = init.custom ?? false
    this.appearanceId = init.appearanceId ?? null
  }

  /** kg/m³ — the same density the way a solver wants it. */
  get densityKgPerCubicMetre(): number {
    return this.density * 1000
  }

  /**
   * Mass of one cubic document unit, in grams. Volumes come out of the analysis
   * code in the document's own units cubed, so this is the factor that turns
   * one into a mass without the caller thinking about it.
   */
  densityPerCubicUnit(units: LengthUnit): number {
    const centimetresPerUnit = MILLIMETRES_PER_UNIT[units] / 10
    return this.density * centimetresPerUnit ** 3
  }

  /** Mass in grams of `volume` cubic document units of this material. */
  massOf(volume: number, units: LengthUnit = 'mm'): number {
    return Math.abs(volume) * this.densityPerCubicUnit(units)
  }

  /**
   * Specific stiffness, E/ρ, in GPa·cm³/g — the number that says why an
   * aluminium beam beats a steel one of the same mass. Null without a modulus.
   */
  get specificStiffness(): number | null {
    return this.youngsModulus === null ? null : this.youngsModulus / this.density
  }

  /** Shear modulus from E and ν, when both are known. */
  get shearModulus(): number | null {
    if (this.youngsModulus === null || this.poissonsRatio === null) return null
    return this.youngsModulus / (2 * (1 + this.poissonsRatio))
  }

  /** This material with `changes` applied, as a new instance. */
  with(changes: Partial<PhysicalMaterialInit>): PhysicalMaterial {
    return new PhysicalMaterial({ ...this.toJSON(), ...changes })
  }

  toJSON(): PhysicalMaterialJSON {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      subcategory: this.subcategory,
      density: this.density,
      youngsModulus: this.youngsModulus,
      poissonsRatio: this.poissonsRatio,
      yieldStrength: this.yieldStrength,
      ultimateTensileStrength: this.ultimateTensileStrength,
      thermalConductivity: this.thermalConductivity,
      thermalExpansion: this.thermalExpansion,
      specificHeat: this.specificHeat,
      color: this.color,
      finish: this.finish,
      source: this.source,
      custom: this.custom,
      appearanceId: this.appearanceId,
    }
  }

  /** Reads a material back. Throws only when there is no name to hang it on. */
  static fromJSON(value: unknown): PhysicalMaterial {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('Material must be a JSON object')
    }
    const candidate = value as Record<string, unknown>
    if (typeof candidate.name !== 'string' || candidate.name === '') {
      throw new Error('Material is missing a name')
    }

    return new PhysicalMaterial({
      id: typeof candidate.id === 'string' ? candidate.id : slugify(candidate.name),
      name: candidate.name,
      category: isMaterialCategory(candidate.category) ? candidate.category : 'other',
      subcategory: typeof candidate.subcategory === 'string' ? candidate.subcategory : 'other',
      density: numberOr(candidate.density, 1),
      youngsModulus: nullableNumber(candidate.youngsModulus),
      poissonsRatio: nullableNumber(candidate.poissonsRatio),
      yieldStrength: nullableNumber(candidate.yieldStrength),
      ultimateTensileStrength: nullableNumber(candidate.ultimateTensileStrength),
      thermalConductivity: nullableNumber(candidate.thermalConductivity),
      thermalExpansion: nullableNumber(candidate.thermalExpansion),
      specificHeat: nullableNumber(candidate.specificHeat),
      color: typeof candidate.color === 'string' ? candidate.color : DEFAULT_MATERIAL_COLOR,
      finish: isMaterialFinish(candidate.finish) ? candidate.finish : 'satin',
      source: typeof candidate.source === 'string' ? candidate.source : undefined,
      custom: candidate.custom === true,
      appearanceId: typeof candidate.appearanceId === 'string' ? candidate.appearanceId : undefined,
    })
  }
}

/** "AISI 1018 Steel" → "aisi-1018-steel", so ids read as themselves in a file. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
