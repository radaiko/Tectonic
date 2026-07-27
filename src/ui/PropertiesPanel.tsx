import { useMemo, useState } from 'react'
import type {
  PropertyDefinition,
  PropertySchema,
  PropertySet,
  PropertyType,
  PropertyValue,
} from '../domain/Properties'
import {
  PROPERTY_TYPES,
  formatPropertyValue,
  parsePropertyValue,
} from '../domain/Properties'
import './PropertiesPanel.css'

/**
 * The custom-property grid: key on the left, a type-aware input on the right.
 *
 * The panel never mutates the set it is given. Every edit is reported as the
 * whole new value for one property, which keeps the owner of the document in
 * charge of undo and of when a change is worth a redraw — the same contract the
 * feature properties panel works to.
 *
 * A schema is optional. With one, declared properties are listed first even
 * when the entity has not been given a value yet, the input picks its type from
 * the definition, and an `allowedValues` list becomes a dropdown. Without one,
 * the panel works purely from what the set already holds.
 */

export interface PropertiesPanelProps {
  /** Shown above the grid, e.g. the selected part's name. */
  readonly entityName?: string
  readonly properties: PropertySet
  readonly schema?: PropertySchema | undefined
  readonly onChange?: (name: string, value: PropertyValue) => void
  readonly onRemove?: (name: string) => void
  readonly onAdd?: (name: string, value: PropertyValue) => void
  /** Hides the "add property" row for a read-only view. */
  readonly readOnly?: boolean
}

/** One line of the grid: the definition behind it, if any, and the value. */
interface PropertyRow {
  readonly name: string
  readonly type: PropertyType
  readonly definition: PropertyDefinition | undefined
  readonly value: PropertyValue | undefined
}

export function PropertiesPanel({
  entityName,
  properties,
  schema,
  onChange,
  onRemove,
  onAdd,
  readOnly = false,
}: PropertiesPanelProps): React.ReactElement {
  const rows = useMemo(
    () => propertyRows(properties, schema),
    [properties, schema],
  )
  const issues = useMemo(() => schema?.validate(properties) ?? [], [properties, schema])
  const issueByName = new Map(issues.map((issue) => [issue.property, issue.message] as const))

  return (
    <div className="custom-properties">
      <h2 className="custom-properties__title">Custom properties</h2>
      {entityName ? <p className="custom-properties__entity">{entityName}</p> : null}

      {rows.length === 0 ? (
        <p className="custom-properties__empty">No properties on this item yet.</p>
      ) : (
        <dl className="custom-properties__grid" aria-label="Properties">
          {rows.map((row) => (
            <PropertyRowView
              key={row.name}
              row={row}
              issue={issueByName.get(row.name)}
              readOnly={readOnly}
              onChange={onChange}
              onRemove={onRemove}
            />
          ))}
        </dl>
      )}

      {readOnly ? null : <AddPropertyRow onAdd={onAdd} />}
    </div>
  )
}

/**
 * Schema-declared properties first, in declaration order, then whatever else
 * the set carries. A declared property with no value still gets a row so it can
 * be filled in — that is most of the point of declaring it.
 */
export function propertyRows(
  properties: PropertySet,
  schema?: PropertySchema | undefined,
): PropertyRow[] {
  const rows: PropertyRow[] = []
  const seen = new Set<string>()

  for (const definition of schema?.definitions ?? []) {
    seen.add(definition.name)
    rows.push({
      name: definition.name,
      type: definition.type,
      definition,
      value: properties.get(definition.name),
    })
  }

  for (const [name, value] of properties.entries()) {
    if (seen.has(name)) continue
    rows.push({
      name,
      type: properties.typeOf(name) ?? 'string',
      definition: undefined,
      value,
    })
  }
  return rows
}

interface PropertyRowViewProps {
  readonly row: PropertyRow
  readonly issue: string | undefined
  readonly readOnly: boolean
  readonly onChange: ((name: string, value: PropertyValue) => void) | undefined
  readonly onRemove: ((name: string) => void) | undefined
}

function PropertyRowView({
  row,
  issue,
  readOnly,
  onChange,
  onRemove,
}: PropertyRowViewProps): React.ReactElement {
  const label = row.definition?.label ?? row.name
  const classes = [
    'custom-properties__row',
    issue ? 'custom-properties__row--invalid' : '',
    row.definition?.required === true ? 'custom-properties__row--required' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} data-property={row.name} data-type={row.type}>
      <dt title={row.definition?.description ?? undefined}>{label}</dt>
      <dd>
        <PropertyInput
          row={row}
          readOnly={readOnly}
          onChange={(value) => onChange?.(row.name, value)}
        />
        {readOnly || row.value === undefined ? null : (
          <button
            type="button"
            className="custom-properties__remove"
            aria-label={`Remove ${label}`}
            onClick={() => onRemove?.(row.name)}
          >
            ×
          </button>
        )}
        {issue ? (
          <span className="custom-properties__issue" role="alert">
            {issue}
          </span>
        ) : null}
      </dd>
    </div>
  )
}

interface PropertyInputProps {
  readonly row: PropertyRow
  readonly readOnly: boolean
  readonly onChange: (value: PropertyValue) => void
}

function PropertyInput({ row, readOnly, onChange }: PropertyInputProps): React.ReactElement {
  const label = row.definition?.label ?? row.name
  const allowed = row.definition?.allowedValues ?? []

  if (allowed.length > 0 && row.type !== 'list') {
    return (
      <select
        className="custom-properties__input"
        aria-label={label}
        disabled={readOnly}
        value={row.value === undefined ? '' : formatPropertyValue(row.value)}
        onChange={(event) => {
          const parsed = parsePropertyValue(row.type, event.target.value)
          if (parsed !== null) onChange(parsed)
        }}
      >
        <option value="">—</option>
        {allowed.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    )
  }

  if (row.type === 'boolean') {
    return (
      <input
        type="checkbox"
        className="custom-properties__checkbox"
        aria-label={label}
        disabled={readOnly}
        checked={row.value === true}
        onChange={(event) => onChange(event.target.checked)}
      />
    )
  }

  if (row.type === 'number') {
    return (
      <input
        type="number"
        className="custom-properties__input"
        aria-label={label}
        disabled={readOnly}
        value={typeof row.value === 'number' ? String(row.value) : ''}
        onChange={(event) => {
          const parsed = parsePropertyValue('number', event.target.value)
          if (parsed !== null) onChange(parsed)
        }}
      />
    )
  }

  if (row.type === 'date') {
    return (
      <input
        type="date"
        className="custom-properties__input"
        aria-label={label}
        disabled={readOnly}
        value={row.value instanceof Date ? row.value.toISOString().slice(0, 10) : ''}
        onChange={(event) => {
          const parsed = parsePropertyValue('date', event.target.value)
          if (parsed !== null) onChange(parsed)
        }}
      />
    )
  }

  // Strings and lists share the text box; a list splits on commas on the way in.
  return (
    <input
      type="text"
      className="custom-properties__input"
      aria-label={label}
      disabled={readOnly}
      value={row.value === undefined ? '' : formatPropertyValue(row.value)}
      onChange={(event) => {
        const parsed = parsePropertyValue(row.type, event.target.value)
        if (parsed !== null) onChange(parsed)
      }}
    />
  )
}

interface AddPropertyRowProps {
  readonly onAdd: ((name: string, value: PropertyValue) => void) | undefined
}

function AddPropertyRow({ onAdd }: AddPropertyRowProps): React.ReactElement {
  const [name, setName] = useState('')
  const [type, setType] = useState<PropertyType>('string')

  const submit = (): void => {
    const trimmed = name.trim()
    if (trimmed === '') return
    // A new property starts at its type's empty value, so the row appears at
    // once and can be filled in with the same inputs as any other.
    onAdd?.(trimmed, emptyValueFor(type))
    setName('')
  }

  return (
    <div className="custom-properties__add">
      <input
        type="text"
        className="custom-properties__input"
        aria-label="New property name"
        placeholder="Property name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit()
        }}
      />
      <select
        className="custom-properties__input"
        aria-label="New property type"
        value={type}
        onChange={(event) => setType(event.target.value as PropertyType)}
      >
        {PROPERTY_TYPES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <button type="button" className="custom-properties__add-button" onClick={submit}>
        Add
      </button>
    </div>
  )
}

/** What a freshly added property of each type starts out holding. */
export function emptyValueFor(type: PropertyType): PropertyValue {
  switch (type) {
    case 'number':
      return 0
    case 'boolean':
      return false
    case 'date':
      return new Date(0)
    case 'list':
      return []
    case 'string':
      return ''
  }
}
