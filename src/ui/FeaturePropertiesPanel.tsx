import { useCallback } from 'react'
import type { Feature } from '../features/domain/Feature'
import type { FeatureParameters, ParameterValue } from '../features/domain/parameters'
import type { ParameterField } from '../features/domain/schema'
import { parameterFields } from '../features/domain/schema'
import { featureIcon } from './FeatureTreePanel'
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
}: FeaturePropertiesPanelProps): React.ReactElement {
  const emit = useCallback(
    (key: string, value: ParameterValue) => {
      if (feature) onChange?.(feature.id, { [key]: value })
    },
    [feature, onChange],
  )

  if (!feature) {
    return (
      <div className="properties">
        <h2 className="properties__title">Properties</h2>
        <p className="properties__empty">Select a feature to edit its parameters.</p>
      </div>
    )
  }

  return (
    <div className="properties">
      <h2 className="properties__title">Properties</h2>
      <p className="properties__feature">
        <span aria-hidden="true">{featureIcon(feature.featureType)}</span> {feature.name}
      </p>

      {feature.errorMessage ? (
        <p className="properties__error" role="alert">
          {feature.errorMessage}
        </p>
      ) : null}

      <dl className="properties__fields">
        {parameterFields(feature.featureType).map((field) => (
          <ParameterInput
            key={field.key}
            field={field}
            value={feature.parameters[field.key]}
            onChange={(value) => emit(field.key, value)}
          />
        ))}
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
