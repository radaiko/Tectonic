import { useCallback } from 'react'
import type { Feature } from '../features/domain/Feature'
import type { FeatureParameters, ParameterValue } from '../features/domain/parameters'
import type { ParameterField } from '../features/domain/schema'
import { parameterFields } from '../features/domain/schema'
import type { SelectionItem, SelectionKind } from '../view/selection'
import { EMPTY_SELECTION, selectionIds } from '../view/selection'
import { featureIcon } from './FeatureTreePanel'
import { Icon } from './Icon'
import './FeaturePropertiesPanel.css'

/** A computed read-out the editor puts under the editable parameters. */
export interface ComputedValue {
  readonly label: string
  readonly value: string
}

export interface FeaturePropertiesPanelProps {
  readonly feature: Feature | null
  /** Fired per edit; the editor merges the change and rebuilds. */
  readonly onChange?: (featureId: string, changes: FeatureParameters) => void
  /** Results of the last rebuild — body count, extent, whatever the caller has. */
  readonly computed?: readonly ComputedValue[]
  /**
   * What is picked in the viewport right now. A field that names geometry is
   * filled from this rather than typed — pointing at an edge is how a user says
   * which edge, and `face-3` was never something anyone could be expected to
   * know.
   */
  readonly selection?: readonly SelectionItem[]
  /** Asks the viewport to restrict picking to what the field being filled wants. */
  readonly onPickKindChange?: (kind: SelectionKind | null) => void
  /** The field currently taking picks, so it can read as armed. */
  readonly activePickKey?: string | null
}

/**
 * The parameters of the selected feature, editable in place. Every edit is
 * reported straight away, so the viewport previews the change as it is typed
 * rather than waiting on an apply.
 */
export function FeaturePropertiesPanel({
  feature,
  onChange,
  computed = [],
  selection = EMPTY_SELECTION,
  onPickKindChange,
  activePickKey = null,
}: FeaturePropertiesPanelProps): React.ReactElement {
  const emit = useCallback(
    (key: string, value: ParameterValue) => {
      if (feature) onChange?.(feature.id, { [key]: value })
    },
    [feature, onChange],
  )

  // No heading of its own: the panel this sits in is a tab already called
  // Feature, and a second "Properties" under it would be a title for a title.
  if (!feature) {
    return (
      <div className="properties">
        <p className="properties__empty">
          No feature is selected. Pick one from the browser or the timeline to edit its
          parameters.
        </p>
      </div>
    )
  }

  return (
    <div className="properties">
      <p className="properties__feature">
        <Icon name={featureIcon(feature.featureType)} size={15} />
        {feature.name}
      </p>

      {feature.errorMessage ? (
        <p className="properties__error" role="alert">
          {feature.errorMessage}
        </p>
      ) : null}

      <dl className="properties__fields">
        {parameterFields(feature.featureType).map((field) =>
          field.kind === 'selection' ? (
            <SelectionInput
              key={field.key}
              field={field}
              value={feature.parameters[field.key]}
              selection={selection}
              armed={activePickKey === field.key}
              onArm={(armed) => onPickKindChange?.(armed ? (field.select ?? null) : null)}
              onChange={(value) => emit(field.key, value)}
            />
          ) : (
            <ParameterInput
              key={field.key}
              field={field}
              value={feature.parameters[field.key]}
              onChange={(value) => emit(field.key, value)}
            />
          ),
        )}
      </dl>

      {computed.length > 0 ? (
        <>
          <h3 className="properties__subtitle">Result</h3>
          <dl className="properties__fields properties__fields--readonly">
            {computed.map((entry) => (
              <div className="properties__row" key={entry.label}>
                <dt>{entry.label}</dt>
                <dd>{entry.value}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
    </div>
  )
}

interface SelectionInputProps {
  readonly field: ParameterField
  readonly value: ParameterValue | undefined
  readonly selection: readonly SelectionItem[]
  readonly armed: boolean
  readonly onArm: (armed: boolean) => void
  readonly onChange: (value: ParameterValue) => void
}

/**
 * A parameter filled by pointing at geometry.
 *
 * What is stored is still a list of identifiers — that is what the kernel takes
 * — but the user never sees or types one. They arm the field, pick in the
 * viewport, and press Add; each reference then shows as a chip they can drop.
 */
function SelectionInput({
  field,
  value,
  selection,
  armed,
  onArm,
  onChange,
}: SelectionInputProps): React.ReactElement {
  const multiple = field.multiple !== false
  const current = currentIds(value)
  const kind = field.select ?? 'face'
  const picked = selectionIds(selection, kind)
  const additions = picked.filter((id) => !current.includes(id))

  const commit = (ids: readonly string[]): void => {
    onChange(multiple ? [...ids] : (ids[0] ?? ''))
  }

  return (
    <div className="properties__row properties__row--selection">
      <dt>
        <span id={`param-${field.key}-label`}>{field.label}</span>
      </dt>
      <dd>
        {current.length === 0 ? (
          <p className="properties__empty-field">
            Nothing chosen — every {kind} of the target is used.
          </p>
        ) : (
          <ul className="properties__chips" aria-labelledby={`param-${field.key}-label`}>
            {current.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  className="properties__chip"
                  aria-label={`Remove ${id} from ${field.label}`}
                  onClick={() => commit(current.filter((other) => other !== id))}
                >
                  <span>{id}</span>
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="properties__pick">
          <button
            type="button"
            className="properties__pick-toggle"
            aria-pressed={armed}
            onClick={() => onArm(!armed)}
          >
            {armed ? `Picking ${plural(kind)}…` : `Pick ${plural(kind)}`}
          </button>
          <button
            type="button"
            disabled={additions.length === 0}
            onClick={() =>
              commit(multiple ? [...current, ...additions] : [additions[0] as string])
            }
          >
            {additions.length === 0
              ? `No new ${kind} picked`
              : `Add ${additions.length} ${additions.length === 1 ? kind : plural(kind)}`}
          </button>
          {current.length > 0 ? (
            <button type="button" onClick={() => commit([])}>
              Clear
            </button>
          ) : null}
        </div>
      </dd>
    </div>
  )
}

/**
 * How a selection kind reads in the plural. Only "body" needs telling; adding an
 * "s" to it gave "Pick bodys", which reads as a typo because it is one.
 */
function plural(kind: SelectionKind): string {
  return kind === 'body' ? 'bodies' : `${kind}s`
}

/** The identifiers a selection parameter currently holds, list or single. */
function currentIds(value: ParameterValue | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }
  return typeof value === 'string' && value.length > 0 ? [value] : []
}

interface ParameterInputProps {
  readonly field: ParameterField
  readonly value: ParameterValue | undefined
  readonly onChange: (value: ParameterValue) => void
}

function ParameterInput({ field, value, onChange }: ParameterInputProps): React.ReactElement {
  const label = field.unit ? `${field.label} (${field.unit})` : field.label

  return (
    <div className="properties__row">
      <dt>
        <label htmlFor={`param-${field.key}`}>{label}</label>
      </dt>
      <dd>{control(field, label, value, onChange)}</dd>
    </div>
  )
}

function control(
  field: ParameterField,
  label: string,
  value: ParameterValue | undefined,
  onChange: (value: ParameterValue) => void,
): React.ReactElement {
  const id = `param-${field.key}`

  switch (field.kind) {
    case 'number':
      return (
        <input
          id={id}
          type="number"
          aria-label={label}
          value={typeof value === 'number' ? value : 0}
          step={field.step ?? 1}
          {...(field.min === undefined ? {} : { min: field.min })}
          onChange={(event) => {
            const parsed = Number(event.target.value)
            if (Number.isFinite(parsed)) onChange(parsed)
          }}
        />
      )
    case 'boolean':
      return (
        <input
          id={id}
          type="checkbox"
          aria-label={label}
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
        />
      )
    case 'choice':
      return (
        <select
          id={id}
          aria-label={label}
          value={typeof value === 'string' ? value : (field.options?.[0] ?? '')}
          onChange={(event) => onChange(event.target.value)}
        >
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )
    default:
      return (
        <input
          id={id}
          type="text"
          aria-label={label}
          value={textOf(value)}
          onChange={(event) =>
            onChange(Array.isArray(value) ? parseList(event.target.value) : event.target.value)
          }
        />
      )
  }
}

/** Reference lists (edges, faces, sketches) edit as comma-separated ids. */
function textOf(value: ParameterValue | undefined): string {
  if (Array.isArray(value)) return value.map((item) => String(item)).join(', ')
  return typeof value === 'string' ? value : ''
}

function parseList(text: string): string[] {
  return text
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}
