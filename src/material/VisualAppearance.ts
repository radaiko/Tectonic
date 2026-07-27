import type { RgbColor } from '../io/types'

/**
 * How a material looks, expressed the way a physically-based renderer wants it:
 * a base colour plus metallic and roughness, with the optional extras — opacity,
 * texture and normal maps, emission and a clearcoat layer — that the glTF and
 * three.js standard materials both understand.
 *
 * Keeping this separate from {@link PhysicalMaterial} is deliberate. The same
 * 6061 aluminium is brushed on one part and anodised black on the next, and the
 * mass of both is identical; tying colour to density would make one of those a
 * different material.
 *
 * Colours are linear RGB in 0..1 — the same {@link RgbColor} the export
 * pipelines already speak, so an appearance drops straight into a glTF material
 * without a conversion step.
 */

export interface VisualAppearanceInit {
  readonly id?: string | undefined
  readonly name?: string | undefined
  readonly baseColor?: RgbColor | undefined
  readonly metallic?: number | undefined
  readonly roughness?: number | undefined
  readonly opacity?: number | undefined
  /** URL or data URL of the albedo texture. */
  readonly textureMap?: string | null | undefined
  readonly normalMap?: string | null | undefined
  readonly emissionColor?: RgbColor | null | undefined
  readonly emissionIntensity?: number | undefined
  readonly clearcoat?: number | undefined
  readonly clearcoatRoughness?: number | undefined
}

export interface VisualAppearanceJSON {
  readonly id: string
  readonly name: string
  readonly baseColor: RgbColor
  readonly metallic: number
  readonly roughness: number
  readonly opacity: number
  readonly textureMap: string | null
  readonly normalMap: string | null
  readonly emissionColor: RgbColor | null
  readonly emissionIntensity: number
  readonly clearcoat: number
  readonly clearcoatRoughness: number
}

export const DEFAULT_BASE_COLOR: RgbColor = { r: 0.69, g: 0.71, b: 0.73 }

export class VisualAppearance {
  readonly id: string
  name: string
  baseColor: RgbColor
  metallic: number
  roughness: number
  opacity: number
  textureMap: string | null
  normalMap: string | null
  emissionColor: RgbColor | null
  emissionIntensity: number
  clearcoat: number
  clearcoatRoughness: number

  constructor(init: VisualAppearanceInit = {}) {
    this.name = init.name ?? 'Appearance'
    this.id = init.id ?? this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    this.baseColor = clampColor(init.baseColor ?? DEFAULT_BASE_COLOR)
    this.metallic = clamp01(init.metallic ?? 0)
    this.roughness = clamp01(init.roughness ?? 0.5)
    this.opacity = clamp01(init.opacity ?? 1)
    this.textureMap = init.textureMap ?? null
    this.normalMap = init.normalMap ?? null
    this.emissionColor = init.emissionColor ? clampColor(init.emissionColor) : null
    this.emissionIntensity = Math.max(0, init.emissionIntensity ?? 0)
    this.clearcoat = clamp01(init.clearcoat ?? 0)
    this.clearcoatRoughness = clamp01(init.clearcoatRoughness ?? 0.1)
  }

  /** True when the surface needs a transparent draw pass. */
  get isTransparent(): boolean {
    return this.opacity < 1
  }

  get isEmissive(): boolean {
    return this.emissionColor !== null && this.emissionIntensity > 0
  }

  /** `#rrggbb` of the base colour, for swatches and the material browser. */
  get hex(): string {
    return rgbToHex(this.baseColor)
  }

  with(changes: VisualAppearanceInit): VisualAppearance {
    return new VisualAppearance({ ...this.toJSON(), ...changes })
  }

  toJSON(): VisualAppearanceJSON {
    return {
      id: this.id,
      name: this.name,
      baseColor: this.baseColor,
      metallic: this.metallic,
      roughness: this.roughness,
      opacity: this.opacity,
      textureMap: this.textureMap,
      normalMap: this.normalMap,
      emissionColor: this.emissionColor,
      emissionIntensity: this.emissionIntensity,
      clearcoat: this.clearcoat,
      clearcoatRoughness: this.clearcoatRoughness,
    }
  }

  static fromJSON(value: unknown): VisualAppearance {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return new VisualAppearance()
    }
    const candidate = value as Record<string, unknown>
    return new VisualAppearance({
      id: typeof candidate.id === 'string' ? candidate.id : undefined,
      name: typeof candidate.name === 'string' ? candidate.name : undefined,
      baseColor: colorFromJSON(candidate.baseColor),
      metallic: numberOrUndefined(candidate.metallic),
      roughness: numberOrUndefined(candidate.roughness),
      opacity: numberOrUndefined(candidate.opacity),
      textureMap: typeof candidate.textureMap === 'string' ? candidate.textureMap : null,
      normalMap: typeof candidate.normalMap === 'string' ? candidate.normalMap : null,
      emissionColor: colorFromJSON(candidate.emissionColor) ?? null,
      emissionIntensity: numberOrUndefined(candidate.emissionIntensity),
      clearcoat: numberOrUndefined(candidate.clearcoat),
      clearcoatRoughness: numberOrUndefined(candidate.clearcoatRoughness),
    })
  }

  /** An appearance built from one hex colour, everything else left at default. */
  static fromHex(hex: string, name = 'Custom'): VisualAppearance {
    return new VisualAppearance({ name, baseColor: hexToRgb(hex) })
  }
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function clampColor(color: RgbColor): RgbColor {
  return { r: clamp01(color.r), g: clamp01(color.g), b: clamp01(color.b) }
}

/** `#rrggbb` or `#rgb` to linear-ish 0..1 RGB. Unreadable text gives mid grey. */
export function hexToRgb(hex: string): RgbColor {
  const clean = hex.trim().replace(/^#/, '')
  const expanded =
    clean.length === 3
      ? clean
          .split('')
          .map((character) => character + character)
          .join('')
      : clean

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return { r: 0.5, g: 0.5, b: 0.5 }
  return {
    r: Number.parseInt(expanded.slice(0, 2), 16) / 255,
    g: Number.parseInt(expanded.slice(2, 4), 16) / 255,
    b: Number.parseInt(expanded.slice(4, 6), 16) / 255,
  }
}

export function rgbToHex(color: RgbColor): string {
  const channel = (value: number): string =>
    Math.round(clamp01(value) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`
}

function colorFromJSON(value: unknown): RgbColor | undefined {
  if (typeof value === 'string') return hexToRgb(value)
  if (typeof value !== 'object' || value === null) return undefined
  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.r !== 'number' ||
    typeof candidate.g !== 'number' ||
    typeof candidate.b !== 'number'
  ) {
    return undefined
  }
  return clampColor({ r: candidate.r, g: candidate.g, b: candidate.b })
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}
