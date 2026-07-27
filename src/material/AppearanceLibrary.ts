import type { VisualAppearanceInit } from './VisualAppearance'
import { VisualAppearance, hexToRgb } from './VisualAppearance'

/**
 * The appearance presets that ship with the app.
 *
 * The numbers are the usual physically-based starting points: a bare metal is
 * fully metallic and gets its character from roughness alone (0.1 polished,
 * ~0.35 brushed, ~0.6 cast), a painted or plastic surface is not metallic at
 * all and often carries a clearcoat, and glass is a low-roughness dielectric
 * with the opacity doing the work. They are meant to look right immediately and
 * to be a sane base for a user-tuned appearance, not to be a measured BRDF.
 */

interface PresetSpec extends VisualAppearanceInit {
  readonly id: string
  readonly name: string
  /** Groups the presets in the picker. */
  readonly group: AppearanceGroup
}

export const APPEARANCE_GROUPS = [
  'metal',
  'plastic',
  'glass',
  'rubber',
  'wood',
  'composite',
  'paint',
] as const

export type AppearanceGroup = (typeof APPEARANCE_GROUPS)[number]

const PRESETS: readonly PresetSpec[] = [
  // ------------------------------------------------------------------ metal
  { id: 'steel-polished', name: 'Steel, polished', group: 'metal', baseColor: hexToRgb('#c7ccd1'), metallic: 1, roughness: 0.08 },
  { id: 'steel-brushed', name: 'Steel, brushed', group: 'metal', baseColor: hexToRgb('#b6bbc1'), metallic: 1, roughness: 0.34 },
  { id: 'steel-satin', name: 'Steel, satin', group: 'metal', baseColor: hexToRgb('#aeb3b9'), metallic: 1, roughness: 0.45 },
  { id: 'steel-cast', name: 'Steel, cast', group: 'metal', baseColor: hexToRgb('#8c9096'), metallic: 1, roughness: 0.68 },
  { id: 'steel-painted', name: 'Steel, painted', group: 'paint', baseColor: hexToRgb('#2f4f7f'), metallic: 0, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.15 },
  { id: 'stainless-polished', name: 'Stainless, polished', group: 'metal', baseColor: hexToRgb('#d2d6da'), metallic: 1, roughness: 0.06 },
  { id: 'stainless-brushed', name: 'Stainless, brushed', group: 'metal', baseColor: hexToRgb('#c2c7cc'), metallic: 1, roughness: 0.3 },
  { id: 'aluminum-brushed', name: 'Aluminium, brushed', group: 'metal', baseColor: hexToRgb('#d6d9dc'), metallic: 1, roughness: 0.32 },
  { id: 'aluminum-polished', name: 'Aluminium, polished', group: 'metal', baseColor: hexToRgb('#e3e6e8'), metallic: 1, roughness: 0.09 },
  { id: 'aluminum-anodized-black', name: 'Aluminium, anodised black', group: 'metal', baseColor: hexToRgb('#2b2d30'), metallic: 1, roughness: 0.4 },
  { id: 'aluminum-anodized-red', name: 'Aluminium, anodised red', group: 'metal', baseColor: hexToRgb('#8c1d1d'), metallic: 1, roughness: 0.38 },
  { id: 'aluminum-anodized-blue', name: 'Aluminium, anodised blue', group: 'metal', baseColor: hexToRgb('#1d3f8c'), metallic: 1, roughness: 0.38 },
  { id: 'aluminum-cast', name: 'Aluminium, cast', group: 'metal', baseColor: hexToRgb('#b3b7ba'), metallic: 1, roughness: 0.66 },
  { id: 'copper-polished', name: 'Copper, polished', group: 'metal', baseColor: hexToRgb('#b87333'), metallic: 1, roughness: 0.12 },
  { id: 'brass-polished', name: 'Brass, polished', group: 'metal', baseColor: hexToRgb('#c9a227'), metallic: 1, roughness: 0.14 },
  { id: 'bronze-satin', name: 'Bronze, satin', group: 'metal', baseColor: hexToRgb('#8c6239'), metallic: 1, roughness: 0.36 },
  { id: 'titanium-satin', name: 'Titanium, satin', group: 'metal', baseColor: hexToRgb('#a9aab0'), metallic: 1, roughness: 0.4 },
  { id: 'gold-polished', name: 'Gold, polished', group: 'metal', baseColor: hexToRgb('#d4af37'), metallic: 1, roughness: 0.07 },
  { id: 'zinc-galvanized', name: 'Zinc, galvanised', group: 'metal', baseColor: hexToRgb('#a8adb3'), metallic: 1, roughness: 0.55 },

  // ---------------------------------------------------------------- plastic
  { id: 'plastic-glossy-white', name: 'Plastic, glossy white', group: 'plastic', baseColor: hexToRgb('#f2f3f4'), metallic: 0, roughness: 0.12, clearcoat: 0.8, clearcoatRoughness: 0.05 },
  { id: 'plastic-glossy-black', name: 'Plastic, glossy black', group: 'plastic', baseColor: hexToRgb('#17191c'), metallic: 0, roughness: 0.12, clearcoat: 0.8, clearcoatRoughness: 0.05 },
  { id: 'plastic-matte-white', name: 'Plastic, matte white', group: 'plastic', baseColor: hexToRgb('#e8e9ea'), metallic: 0, roughness: 0.75 },
  { id: 'plastic-matte-black', name: 'Plastic, matte black', group: 'plastic', baseColor: hexToRgb('#1d1f22'), metallic: 0, roughness: 0.78 },
  { id: 'plastic-textured', name: 'Plastic, textured', group: 'plastic', baseColor: hexToRgb('#3c4046'), metallic: 0, roughness: 0.9 },
  { id: 'abs-natural', name: 'ABS, natural', group: 'plastic', baseColor: hexToRgb('#ddd8cc'), metallic: 0, roughness: 0.55 },
  { id: 'nylon-natural', name: 'Nylon, natural', group: 'plastic', baseColor: hexToRgb('#e6e2d6'), metallic: 0, roughness: 0.6 },
  { id: 'ptfe-white', name: 'PTFE, white', group: 'plastic', baseColor: hexToRgb('#f4f4f2'), metallic: 0, roughness: 0.5 },

  // ------------------------------------------------------------------ glass
  { id: 'glass-clear', name: 'Glass, clear', group: 'glass', baseColor: hexToRgb('#dff0f5'), metallic: 0, roughness: 0.02, opacity: 0.18 },
  { id: 'glass-frosted', name: 'Glass, frosted', group: 'glass', baseColor: hexToRgb('#e6eef1'), metallic: 0, roughness: 0.55, opacity: 0.4 },
  { id: 'glass-tinted', name: 'Glass, tinted', group: 'glass', baseColor: hexToRgb('#5c7a80'), metallic: 0, roughness: 0.05, opacity: 0.35 },
  { id: 'acrylic-clear', name: 'Acrylic, clear', group: 'glass', baseColor: hexToRgb('#eaf3f6'), metallic: 0, roughness: 0.04, opacity: 0.25 },

  // ----------------------------------------------------------------- rubber
  { id: 'rubber-black', name: 'Rubber, black', group: 'rubber', baseColor: hexToRgb('#191a1c'), metallic: 0, roughness: 0.92 },
  { id: 'rubber-grey', name: 'Rubber, grey', group: 'rubber', baseColor: hexToRgb('#4a4d51'), metallic: 0, roughness: 0.9 },
  { id: 'silicone-translucent', name: 'Silicone, translucent', group: 'rubber', baseColor: hexToRgb('#e2dfd8'), metallic: 0, roughness: 0.6, opacity: 0.7 },

  // ------------------------------------------------------------------- wood
  { id: 'wood-oak', name: 'Wood, oak', group: 'wood', baseColor: hexToRgb('#b08a56'), metallic: 0, roughness: 0.62 },
  { id: 'wood-maple', name: 'Wood, maple', group: 'wood', baseColor: hexToRgb('#d8bd92'), metallic: 0, roughness: 0.6 },
  { id: 'wood-walnut', name: 'Wood, walnut', group: 'wood', baseColor: hexToRgb('#5c4030'), metallic: 0, roughness: 0.58 },
  { id: 'wood-pine', name: 'Wood, pine', group: 'wood', baseColor: hexToRgb('#dcc79b'), metallic: 0, roughness: 0.68 },
  { id: 'wood-varnished', name: 'Wood, varnished', group: 'wood', baseColor: hexToRgb('#8a5a2b'), metallic: 0, roughness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.08 },

  // -------------------------------------------------------------- composite
  { id: 'carbon-fiber', name: 'Carbon fibre', group: 'composite', baseColor: hexToRgb('#1a1c1f'), metallic: 0.1, roughness: 0.28, clearcoat: 0.85, clearcoatRoughness: 0.06 },
  { id: 'carbon-fiber-matte', name: 'Carbon fibre, matte', group: 'composite', baseColor: hexToRgb('#202226'), metallic: 0.1, roughness: 0.72 },
  { id: 'fiberglass', name: 'Fibreglass', group: 'composite', baseColor: hexToRgb('#cfd3cf'), metallic: 0, roughness: 0.45 },

  // ------------------------------------------------------------------ paint
  { id: 'paint-gloss-red', name: 'Paint, gloss red', group: 'paint', baseColor: hexToRgb('#a01f1f'), metallic: 0, roughness: 0.15, clearcoat: 0.9, clearcoatRoughness: 0.05 },
  { id: 'paint-gloss-white', name: 'Paint, gloss white', group: 'paint', baseColor: hexToRgb('#f5f6f7'), metallic: 0, roughness: 0.15, clearcoat: 0.9, clearcoatRoughness: 0.05 },
  { id: 'paint-matte-grey', name: 'Paint, matte grey', group: 'paint', baseColor: hexToRgb('#6b7076'), metallic: 0, roughness: 0.85 },
  { id: 'powder-coat-black', name: 'Powder coat, black', group: 'paint', baseColor: hexToRgb('#232528'), metallic: 0, roughness: 0.7 },
]

/** The default appearance for a body nobody has assigned anything to. */
export const DEFAULT_APPEARANCE_ID = 'steel-satin'

/**
 * The preset appearances plus whatever the user has added, in one lookup.
 *
 * Presets are built lazily on first access and cached, so a document that never
 * opens the appearance picker does not pay for forty-odd objects.
 */
export class AppearanceLibrary {
  readonly #custom = new Map<string, VisualAppearance>()
  #presets: Map<string, VisualAppearance> | null = null

  get #builtIn(): Map<string, VisualAppearance> {
    if (this.#presets === null) {
      this.#presets = new Map(
        PRESETS.map((spec) => [spec.id, new VisualAppearance(spec)] as const),
      )
    }
    return this.#presets
  }

  /** Every appearance, presets first, then custom ones in insertion order. */
  get all(): VisualAppearance[] {
    return [...this.#builtIn.values(), ...this.#custom.values()]
  }

  get presets(): VisualAppearance[] {
    return [...this.#builtIn.values()]
  }

  get customAppearances(): VisualAppearance[] {
    return [...this.#custom.values()]
  }

  get size(): number {
    return this.#builtIn.size + this.#custom.size
  }

  /** A custom appearance shadows a preset of the same id. */
  get(id: string): VisualAppearance | undefined {
    return this.#custom.get(id) ?? this.#builtIn.get(id)
  }

  /** The appearance, or the default one when the id is unknown. */
  resolve(id: string | null | undefined): VisualAppearance {
    if (id) {
      const found = this.get(id)
      if (found) return found
    }
    return this.get(DEFAULT_APPEARANCE_ID) as VisualAppearance
  }

  byGroup(group: AppearanceGroup): VisualAppearance[] {
    const ids = new Set(PRESETS.filter((spec) => spec.group === group).map((spec) => spec.id))
    return this.presets.filter((appearance) => ids.has(appearance.id))
  }

  /** The group a preset belongs to, or null for a custom appearance. */
  groupOf(id: string): AppearanceGroup | null {
    return PRESETS.find((spec) => spec.id === id)?.group ?? null
  }

  add(appearance: VisualAppearance): VisualAppearance {
    this.#custom.set(appearance.id, appearance)
    return appearance
  }

  /** Only custom appearances can be removed — the presets always ship. */
  remove(id: string): boolean {
    return this.#custom.delete(id)
  }

  search(query: string): VisualAppearance[] {
    const needle = query.trim().toLowerCase()
    if (needle === '') return this.all
    return this.all.filter(
      (appearance) =>
        appearance.name.toLowerCase().includes(needle) ||
        appearance.id.includes(needle),
    )
  }

  /** Only the custom appearances are written; presets come from the build. */
  toJSON(): { readonly custom: readonly ReturnType<VisualAppearance['toJSON']>[] } {
    return { custom: this.customAppearances.map((appearance) => appearance.toJSON()) }
  }

  static fromJSON(value: unknown): AppearanceLibrary {
    const library = new AppearanceLibrary()
    if (typeof value !== 'object' || value === null) return library
    const candidate = value as Record<string, unknown>
    const custom = Array.isArray(candidate.custom) ? candidate.custom : []
    for (const entry of custom) library.add(VisualAppearance.fromJSON(entry))
    return library
  }
}

/** The ids of every preset, for tests and for the picker's default ordering. */
export const APPEARANCE_PRESET_IDS: readonly string[] = PRESETS.map((spec) => spec.id)
