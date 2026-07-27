import { useMemo, useState } from 'react'
import type { AppearanceLibrary } from './AppearanceLibrary'
import { APPEARANCE_GROUPS } from './AppearanceLibrary'
import type { MaterialLibrary } from './MaterialLibrary'
import type { MaterialCategory, PhysicalMaterial } from './PhysicalMaterial'
import { MATERIAL_CATEGORIES, MATERIAL_FINISHES } from './PhysicalMaterial'
import type { VisualAppearance } from './VisualAppearance'
import { rgbToHex } from './VisualAppearance'
import './MaterialUI.css'

/**
 * The material browser, editor and appearance picker.
 *
 * The browser is a search box, a category filter and a list; the swatch on each
 * row is the preview — a colour chip is honest about what the viewport will do
 * and costs nothing, where a rendered thumbnail would need a WebGL context this
 * panel has no business owning.
 *
 * Nothing here mutates the libraries it is given. Assignments and edits are
 * reported to the caller, which owns the document and therefore owns undo.
 */

export interface MaterialBrowserProps {
  readonly library: MaterialLibrary
  /** The entity the assignment would apply to, shown in the header. */
  readonly targetName?: string
  readonly selectedId?: string | null
  readonly onSelect?: (material: PhysicalMaterial) => void
  readonly onAssign?: (material: PhysicalMaterial) => void
  readonly onToggleFavorite?: (material: PhysicalMaterial) => void
}

export function MaterialBrowser({
  library,
  targetName,
  selectedId = null,
  onSelect,
  onAssign,
  onToggleFavorite,
}: MaterialBrowserProps): React.ReactElement {
  const [text, setText] = useState('')
  const [category, setCategory] = useState<MaterialCategory | 'all'>('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  const results = useMemo(
    () =>
      library.search({
        text,
        ...(category === 'all' ? {} : { category }),
        favoritesOnly,
      }),
    [library, text, category, favoritesOnly],
  )

  return (
    <div className="material-browser">
      <header className="material-browser__header">
        <h2 className="material-browser__title">Materials</h2>
        {targetName ? <p className="material-browser__target">{targetName}</p> : null}
      </header>

      <div className="material-browser__filters">
        <input
          type="search"
          className="material-browser__search"
          aria-label="Search materials"
          placeholder="Search materials"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <select
          className="material-browser__category"
          aria-label="Filter by category"
          value={category}
          onChange={(event) => setCategory(event.target.value as MaterialCategory | 'all')}
        >
          <option value="all">All categories</option>
          {MATERIAL_CATEGORIES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <label className="material-browser__favorites">
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={(event) => setFavoritesOnly(event.target.checked)}
          />
          Favourites
        </label>
      </div>

      {results.length === 0 ? (
        <p className="material-browser__empty">No material matches that.</p>
      ) : (
        <ul className="material-browser__list" aria-label="Material results">
          {results.map((material) => (
            <li
              key={material.id}
              className={[
                'material-row',
                material.id === selectedId ? 'material-row--selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-material-id={material.id}
            >
              <span
                className="material-row__swatch"
                style={{ background: material.color }}
                aria-hidden="true"
              />
              <button
                type="button"
                className="material-row__name"
                aria-pressed={material.id === selectedId}
                onClick={() => onSelect?.(material)}
                onDoubleClick={() => onAssign?.(material)}
              >
                {material.name}
              </button>
              <span className="material-row__density">{material.density.toFixed(2)} g/cm³</span>
              {onToggleFavorite ? (
                <button
                  type="button"
                  className="material-row__favorite"
                  aria-label={`${library.isFavorite(material.id) ? 'Unfavourite' : 'Favourite'} ${material.name}`}
                  aria-pressed={library.isFavorite(material.id)}
                  onClick={() => onToggleFavorite(material)}
                >
                  {library.isFavorite(material.id) ? '★' : '☆'}
                </button>
              ) : null}
              {onAssign ? (
                <button
                  type="button"
                  className="material-row__assign"
                  onClick={() => onAssign(material)}
                >
                  Assign
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** One editable number on the material editor. */
interface NumericField {
  readonly key:
    | 'density'
    | 'youngsModulus'
    | 'poissonsRatio'
    | 'yieldStrength'
    | 'ultimateTensileStrength'
    | 'thermalConductivity'
    | 'thermalExpansion'
    | 'specificHeat'
  readonly label: string
  readonly unit: string
}

export const MATERIAL_FIELDS: readonly NumericField[] = [
  { key: 'density', label: 'Density', unit: 'g/cm³' },
  { key: 'youngsModulus', label: "Young's modulus", unit: 'GPa' },
  { key: 'poissonsRatio', label: "Poisson's ratio", unit: '' },
  { key: 'yieldStrength', label: 'Yield strength', unit: 'MPa' },
  { key: 'ultimateTensileStrength', label: 'Tensile strength', unit: 'MPa' },
  { key: 'thermalConductivity', label: 'Thermal conductivity', unit: 'W/m·K' },
  { key: 'thermalExpansion', label: 'Thermal expansion', unit: '1/K' },
  { key: 'specificHeat', label: 'Specific heat', unit: 'J/kg·K' },
]

export interface MaterialEditorProps {
  readonly material: PhysicalMaterial | null
  readonly onChange?: (id: string, changes: Record<string, unknown>) => void
  readonly onDelete?: (material: PhysicalMaterial) => void
}

/**
 * Edits one material's physical and visual properties. Built-in materials are
 * editable too — the library copies them into the user's materials on the first
 * change, so the shipped data is never quietly rewritten.
 */
export function MaterialEditor({
  material,
  onChange,
  onDelete,
}: MaterialEditorProps): React.ReactElement {
  if (!material) {
    return (
      <div className="material-editor">
        <h2 className="material-editor__title">Material</h2>
        <p className="material-editor__empty">Select a material to edit it.</p>
      </div>
    )
  }

  const emit = (changes: Record<string, unknown>): void => onChange?.(material.id, changes)

  return (
    <div className="material-editor" data-material-id={material.id}>
      <h2 className="material-editor__title">Material</h2>

      <label className="material-editor__row">
        <span>Name</span>
        <input
          type="text"
          aria-label="Material name"
          value={material.name}
          onChange={(event) => emit({ name: event.target.value })}
        />
      </label>

      <label className="material-editor__row">
        <span>Category</span>
        <select
          aria-label="Material category"
          value={material.category}
          onChange={(event) => emit({ category: event.target.value })}
        >
          {MATERIAL_CATEGORIES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <label className="material-editor__row">
        <span>Finish</span>
        <select
          aria-label="Material finish"
          value={material.finish}
          onChange={(event) => emit({ finish: event.target.value })}
        >
          {MATERIAL_FINISHES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <label className="material-editor__row">
        <span>Colour</span>
        <input
          type="color"
          aria-label="Material colour"
          value={material.color}
          onChange={(event) => emit({ color: event.target.value })}
        />
      </label>

      <dl className="material-editor__fields">
        {MATERIAL_FIELDS.map((field) => (
          <div className="material-editor__field" key={field.key}>
            <dt>{field.label}</dt>
            <dd>
              <input
                type="number"
                aria-label={field.label}
                value={material[field.key] === null ? '' : String(material[field.key])}
                onChange={(event) => {
                  const raw = event.target.value
                  const parsed = raw === '' ? null : Number(raw)
                  // An unreadable half-typed number is left alone rather than
                  // written through as NaN.
                  if (parsed !== null && !Number.isFinite(parsed)) return
                  emit({ [field.key]: parsed })
                }}
              />
              {field.unit ? <span className="material-editor__unit">{field.unit}</span> : null}
            </dd>
          </div>
        ))}
      </dl>

      {material.custom && onDelete ? (
        <button
          type="button"
          className="material-editor__delete"
          onClick={() => onDelete(material)}
        >
          Delete material
        </button>
      ) : null}
    </div>
  )
}

export interface AppearancePickerProps {
  readonly library: AppearanceLibrary
  readonly selectedId?: string | null
  readonly onSelect?: (appearance: VisualAppearance) => void
  /** Fired when the custom colour swatch changes, with `#rrggbb`. */
  readonly onCustomColor?: (hex: string) => void
}

/** The preset appearances, grouped, with a colour well for a one-off tint. */
export function AppearancePicker({
  library,
  selectedId = null,
  onSelect,
  onCustomColor,
}: AppearancePickerProps): React.ReactElement {
  const selected = selectedId === null ? null : library.get(selectedId)

  return (
    <div className="appearance-picker">
      <h2 className="appearance-picker__title">Appearance</h2>

      {APPEARANCE_GROUPS.map((group) => {
        const entries = library.byGroup(group)
        if (entries.length === 0) return null
        return (
          <section className="appearance-picker__group" key={group} aria-label={group}>
            <h3 className="appearance-picker__group-title">{group}</h3>
            <ul className="appearance-picker__swatches">
              {entries.map((appearance) => (
                <li key={appearance.id}>
                  <button
                    type="button"
                    className={[
                      'appearance-swatch',
                      appearance.id === selectedId ? 'appearance-swatch--selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{ background: rgbToHex(appearance.baseColor) }}
                    title={appearance.name}
                    aria-label={appearance.name}
                    aria-pressed={appearance.id === selectedId}
                    data-appearance-id={appearance.id}
                    onClick={() => onSelect?.(appearance)}
                  />
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      <label className="appearance-picker__custom">
        <span>Custom colour</span>
        <input
          type="color"
          aria-label="Custom appearance colour"
          value={selected ? selected.hex : '#b0b4bb'}
          onChange={(event) => onCustomColor?.(event.target.value)}
        />
      </label>
    </div>
  )
}
