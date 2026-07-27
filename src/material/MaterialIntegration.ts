import type { MassProperties } from '../analysis/MassProperties'
import { massProperties } from '../analysis/MassProperties'
import type { PartCatalog, PartDefinition } from '../assembly/AssemblyFeatures'
import type { LengthUnit, Part } from '../domain/Document'
import type { MeshData } from '../domain/MeshData'
import { mergeMeshes } from '../domain/MeshData'
import type { MaterialSpec } from '../io/types'
import type { AppearanceLibrary } from './AppearanceLibrary'
import type { MaterialLibrary } from './MaterialLibrary'
import type { PhysicalMaterial } from './PhysicalMaterial'
import { VisualAppearance, hexToRgb } from './VisualAppearance'

/**
 * Where the materials library meets the rest of the app.
 *
 * Three things need a material and none of them should have to know how the
 * library is organised: mass properties want a density in the document's units,
 * the viewport and the mesh exporters want a PBR material, and the BOM wants a
 * name and a per-instance mass. Each of those is one function here.
 *
 * **Mass is in grams.** Densities are published in g/cm³, so a volume in cubic
 * document units multiplied by {@link PhysicalMaterial.densityPerCubicUnit}
 * comes out in grams. {@link formatMass} is what turns that into something to
 * put on a drawing.
 */

/** What one entity has been assigned. Either half can stand on its own. */
export interface MaterialAssignment {
  readonly materialId: string | null
  /** Overrides the material's own appearance for this entity. */
  readonly appearanceId: string | null
}

export type MaterialAssignmentsJSON = Readonly<Record<string, MaterialAssignment>>

/**
 * Which material each part, body or face is made of, keyed by entity id.
 *
 * Assignments live beside the model for the same reason custom properties do: a
 * body rebuilt by the feature tree keeps the material somebody chose for it.
 */
export class MaterialAssignments {
  readonly #assignments = new Map<string, MaterialAssignment>()

  get size(): number {
    return this.#assignments.size
  }

  entityIds(): string[] {
    return [...this.#assignments.keys()]
  }

  get(entityId: string): MaterialAssignment | undefined {
    return this.#assignments.get(entityId)
  }

  materialIdFor(entityId: string): string | null {
    return this.#assignments.get(entityId)?.materialId ?? null
  }

  appearanceIdFor(entityId: string): string | null {
    return this.#assignments.get(entityId)?.appearanceId ?? null
  }

  assign(entityId: string, materialId: string | null): this {
    const current = this.#assignments.get(entityId)
    this.#assignments.set(entityId, {
      materialId,
      appearanceId: current?.appearanceId ?? null,
    })
    return this
  }

  assignAppearance(entityId: string, appearanceId: string | null): this {
    const current = this.#assignments.get(entityId)
    this.#assignments.set(entityId, {
      materialId: current?.materialId ?? null,
      appearanceId,
    })
    return this
  }

  clear(entityId: string): boolean {
    return this.#assignments.delete(entityId)
  }

  /**
   * The material for an entity, falling back through the ids given — a face to
   * its body, a body to its part — and finally to the library's default.
   */
  resolve(library: MaterialLibrary, ...entityIds: readonly string[]): PhysicalMaterial {
    for (const entityId of entityIds) {
      const materialId = this.materialIdFor(entityId)
      if (materialId === null) continue
      const material = library.get(materialId)
      if (material) return material
    }
    return library.resolve(null)
  }

  toJSON(): MaterialAssignmentsJSON {
    const json: Record<string, MaterialAssignment> = {}
    for (const [entityId, assignment] of this.#assignments) {
      if (assignment.materialId === null && assignment.appearanceId === null) continue
      json[entityId] = assignment
    }
    return json
  }

  static fromJSON(value: unknown): MaterialAssignments {
    const assignments = new MaterialAssignments()
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return assignments

    for (const [entityId, entry] of Object.entries(value as Record<string, unknown>)) {
      if (typeof entry === 'string') {
        assignments.assign(entityId, entry)
        continue
      }
      if (typeof entry !== 'object' || entry === null) continue
      const candidate = entry as Record<string, unknown>
      assignments.assign(
        entityId,
        typeof candidate.materialId === 'string' ? candidate.materialId : null,
      )
      if (typeof candidate.appearanceId === 'string') {
        assignments.assignAppearance(entityId, candidate.appearanceId)
      }
    }
    return assignments
  }
}

/* ------------------------------------------------------------ mass properties */

/** Mass properties of a mesh made of a material. Mass and inertia are in grams. */
export function massPropertiesOf(
  mesh: MeshData,
  material: PhysicalMaterial,
  units: LengthUnit = 'mm',
): MassProperties {
  return massProperties(mesh, { density: material.densityPerCubicUnit(units) })
}

/** Mass in grams of a mesh made of a material. */
export function massOf(
  mesh: MeshData,
  material: PhysicalMaterial,
  units: LengthUnit = 'mm',
): number {
  return massPropertiesOf(mesh, material, units).mass
}

/**
 * A mass in grams as text, stepped up to kilograms or tonnes once the number
 * stops being readable — which is what a title block or a BOM column wants.
 */
export function formatMass(grams: number, precision = 2): string {
  const magnitude = Math.abs(grams)
  if (magnitude >= 1e6) return `${(grams / 1e6).toFixed(precision)} t`
  if (magnitude >= 1000) return `${(grams / 1000).toFixed(precision)} kg`
  if (magnitude < 1 && magnitude > 0) return `${(grams * 1000).toFixed(precision)} mg`
  return `${grams.toFixed(precision)} g`
}

/* ------------------------------------------------------------------- rendering */

/** The appearance an entity renders with: its override, else its material's. */
export function appearanceFor(
  material: PhysicalMaterial,
  appearances: AppearanceLibrary,
  overrideId: string | null = null,
): VisualAppearance {
  if (overrideId !== null) {
    const override = appearances.get(overrideId)
    if (override) return override
  }
  if (material.appearanceId !== null) {
    const preset = appearances.get(material.appearanceId)
    // The material's own colour wins over the preset's, so two 6061 parts with
    // different swatches do not render identically.
    if (preset) return preset.with({ baseColor: hexToRgb(material.color) })
  }
  return new VisualAppearance({
    id: `material:${material.id}`,
    name: material.name,
    baseColor: hexToRgb(material.color),
    metallic: material.category === 'metal' ? 1 : 0,
    roughness: roughnessOf(material),
    opacity: material.category === 'glass' ? 0.25 : 1,
  })
}

/** A rough guess at roughness from the material's stated finish. */
function roughnessOf(material: PhysicalMaterial): number {
  switch (material.finish) {
    case 'polished':
      return 0.08
    case 'gloss':
      return 0.15
    case 'brushed':
      return 0.34
    case 'satin':
      return 0.45
    case 'anodized':
      return 0.4
    case 'painted':
      return 0.35
    case 'matte':
      return 0.8
  }
}

/** The material as the mesh exporters want it — glTF, OBJ and 3MF all take this. */
export function toMaterialSpec(
  material: PhysicalMaterial,
  appearance?: VisualAppearance,
): MaterialSpec {
  const visual = appearance ?? VisualAppearance.fromHex(material.color, material.name)
  return {
    name: material.name,
    color: visual.baseColor,
    opacity: visual.opacity,
    metallic: visual.metallic,
    roughness: visual.roughness,
  }
}

/* ------------------------------------------------------------------------ BOM */

export interface PartCatalogOptions {
  readonly units?: LengthUnit
  /** Used when a part has no assignment of its own. */
  readonly defaultMaterialId?: string | null
}

/**
 * A {@link PartCatalog} for `billOfMaterials`, with the material name and the
 * per-instance mass filled in from the assignments.
 *
 * A part's mass is the mass of every body it owns, taken together, so a
 * multi-body part weighs what it actually weighs. Parts whose bodies are empty
 * come through with a zero mass rather than being left out — a line missing
 * from a BOM is worse than a line reading 0 g.
 */
export function materialPartCatalog(
  parts: readonly Part[],
  assignments: MaterialAssignments,
  library: MaterialLibrary,
  options: PartCatalogOptions = {},
): PartCatalog {
  const units = options.units ?? 'mm'
  const catalog = new Map<string, PartDefinition>()

  for (const part of parts) {
    const materialId =
      assignments.materialIdFor(part.id) ?? options.defaultMaterialId ?? null
    const material = library.resolve(materialId)

    // Bodies can carry their own material, so each is weighed separately and
    // only merged when they agree — which is the common case and much cheaper.
    let mass = 0
    const uniform: MeshData[] = []
    for (const body of part.bodies) {
      const bodyMaterialId = assignments.materialIdFor(body.id)
      if (bodyMaterialId === null) {
        uniform.push(body.mesh)
        continue
      }
      mass += massOf(body.mesh, library.resolve(bodyMaterialId), units)
    }
    if (uniform.length > 0) mass += massOf(mergeMeshes(uniform), material, units)

    catalog.set(part.id, {
      id: part.id,
      name: part.name,
      material: material.name,
      mass,
    })
  }
  return catalog
}
