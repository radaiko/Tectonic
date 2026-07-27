import { useCallback, useReducer, useState } from 'react'
import { FEATURE_TYPES, featureLabel } from '../features/domain/FeatureType'
import type { FeatureType } from '../features/domain/FeatureType'
import { DesignScript, parseScript, runScript, undoScript } from './DesignScript'
import type { ScriptContext, ScriptRunReport, ScriptStep } from './DesignScript'
import { UNIT_NAMES } from './expression'
import { inDisplayUnit } from './ParameterTable'
import type { ParameterJSON, ParameterQuantity, ParameterTable } from './ParameterTable'
import { RULE_ACTION_TYPES, RULE_TRIGGERS } from './RulesEngine'
import type { RuleAction, RuleActionType, RuleJSON, RuleTrigger, RulesEngine } from './RulesEngine'
import './AutomationUI.css'

/**
 * The automation panel: the parameter table, the rule editor and the script
 * runner, behind three tabs.
 *
 * The panel edits the tables it is handed in place — they are the document's,
 * not copies — and tells the host afterwards through `onChange`, which is what
 * triggers a solve and a rebuild. Nothing here rebuilds anything itself.
 */

export type AutomationTab = 'parameters' | 'rules' | 'script'

export interface AutomationPanelProps {
  readonly parameters: ParameterTable
  readonly rules?: RulesEngine
  readonly script?: DesignScript
  /** Everything a script or a rule run needs. Without it, running is disabled. */
  readonly context?: ScriptContext
  readonly initialTab?: AutomationTab
  /** Called after any edit, so the host can re-solve and rebuild. */
  readonly onChange?: () => void
  readonly onRunScript?: (report: ScriptRunReport) => void
}

export function AutomationPanel({
  parameters,
  rules,
  script,
  context,
  initialTab = 'parameters',
  onChange,
  onRunScript,
}: AutomationPanelProps): React.ReactElement {
  const [tab, setTab] = useState<AutomationTab>(initialTab)
  const [, bump] = useReducer((count: number) => count + 1, 0)

  const changed = useCallback(() => {
    bump()
    onChange?.()
  }, [onChange])

  const tabs: readonly { readonly id: AutomationTab; readonly label: string }[] = [
    { id: 'parameters', label: 'Parameters' },
    { id: 'rules', label: 'Rules' },
    { id: 'script', label: 'Script' },
  ]

  return (
    <section className="automation" aria-label="Design automation">
      <div className="automation__tabs" role="tablist" aria-label="Automation sections">
        {tabs.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            className={`automation__tab${tab === entry.id ? ' automation__tab--active' : ''}`}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === 'parameters' ? (
        <ParameterEditor table={parameters} onChange={changed} />
      ) : null}

      {tab === 'rules' ? (
        rules ? (
          <RuleEditor engine={rules} parameters={parameters} context={context} onChange={changed} />
        ) : (
          <p className="automation__empty">This document has no rules engine.</p>
        )
      ) : null}

      {tab === 'script' ? (
        <ScriptRunner
          script={script ?? new DesignScript()}
          context={context}
          onChange={changed}
          onRun={onRunScript}
        />
      ) : null}
    </section>
  )
}

/* -------------------------------------------------------------- parameters */

interface ParameterEditorProps {
  readonly table: ParameterTable
  readonly onChange: () => void
}

/** The parameter table, with a search box that doubles as the browser. */
export function ParameterEditor({ table, onChange }: ParameterEditorProps): React.ReactElement {
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftExpression, setDraftExpression] = useState('')

  // Recomputed every render rather than memoised: the table is mutated in
  // place, so its identity says nothing about whether the rows changed.
  const evaluation = table.evaluate()
  const needle = search.trim().toLowerCase()
  const rows = table.parameters.filter(
    (parameter) =>
      needle.length === 0 ||
      parameter.name.toLowerCase().includes(needle) ||
      parameter.expression.toLowerCase().includes(needle) ||
      parameter.description.toLowerCase().includes(needle),
  )

  const guard = (action: () => void): void => {
    try {
      action()
      setError(null)
      onChange()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    }
  }

  const failureFor = (name: string): string | undefined =>
    evaluation.failures.find((failure) => failure.name === name)?.message

  return (
    <div className="automation__panel">
      <label className="automation__search">
        <span>Search</span>
        <input
          type="search"
          aria-label="Search parameters"
          value={search}
          placeholder="name, expression or note"
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      {table.length === 0 ? (
        <p className="automation__empty">No parameters yet.</p>
      ) : (
        <table className="automation__table">
          <caption className="automation__caption">
            {rows.length} of {table.length} parameter{table.length === 1 ? '' : 's'}
          </caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Expression</th>
              <th scope="col">Value</th>
              <th scope="col">Unit</th>
              <th scope="col">Note</th>
              <th scope="col">
                <span className="automation__visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((parameter) => (
              <ParameterRow
                key={parameter.name}
                parameter={parameter}
                value={evaluation.values[parameter.name]}
                failure={failureFor(parameter.name)}
                onCommit={(expression) => guard(() => table.set(parameter.name, expression))}
                onAnnotate={(changes) => guard(() => table.annotate(parameter.name, changes))}
                onRemove={() => guard(() => void table.remove(parameter.name))}
              />
            ))}
          </tbody>
        </table>
      )}

      <form
        className="automation__add"
        onSubmit={(event) => {
          event.preventDefault()
          guard(() => {
            table.set({ name: draftName, expression: draftExpression })
            setDraftName('')
            setDraftExpression('')
          })
        }}
      >
        <input
          aria-label="New parameter name"
          placeholder="width"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
        />
        <input
          aria-label="New parameter expression"
          placeholder="100mm"
          value={draftExpression}
          onChange={(event) => setDraftExpression(event.target.value)}
        />
        <button type="submit">Add</button>
      </form>

      {error ? (
        <p className="automation__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

interface ParameterRowProps {
  readonly parameter: ParameterJSON
  readonly value: number | undefined
  readonly failure: string | undefined
  readonly onCommit: (expression: string) => void
  readonly onAnnotate: (changes: {
    readonly description?: string
    readonly displayUnit?: string | null
    readonly quantity?: ParameterQuantity
  }) => void
  readonly onRemove: () => void
}

function ParameterRow({
  parameter,
  value,
  failure,
  onCommit,
  onAnnotate,
  onRemove,
}: ParameterRowProps): React.ReactElement {
  const [draft, setDraft] = useState(parameter.expression)

  return (
    <tr className={failure ? 'automation__row automation__row--failed' : 'automation__row'}>
      <th scope="row">{parameter.name}</th>
      <td>
        <input
          aria-label={`${parameter.name} expression`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (draft !== parameter.expression) onCommit(draft)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') setDraft(parameter.expression)
          }}
        />
      </td>
      <td className="automation__value" title={failure ?? undefined}>
        {value === undefined ? '—' : formatValue(inDisplayUnit(value, parameter.displayUnit))}
      </td>
      <td>
        <select
          aria-label={`${parameter.name} unit`}
          value={parameter.displayUnit ?? ''}
          onChange={(event) =>
            onAnnotate({ displayUnit: event.target.value === '' ? null : event.target.value })
          }
        >
          <option value="">base</option>
          {UNIT_NAMES.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          aria-label={`${parameter.name} note`}
          defaultValue={parameter.description}
          onBlur={(event) => onAnnotate({ description: event.target.value })}
        />
      </td>
      <td>
        <button type="button" aria-label={`Delete ${parameter.name}`} onClick={onRemove}>
          ✕
        </button>
      </td>
    </tr>
  )
}

/** Six significant digits, without a trailing run of zeros. */
export function formatValue(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return String(Number(value.toPrecision(6)))
}

/* ------------------------------------------------------------------- rules */

interface RuleEditorProps {
  readonly engine: RulesEngine
  readonly parameters: ParameterTable
  readonly context: ScriptContext | undefined
  readonly onChange: () => void
}

/** If-then rules, built from pickers rather than typed as a whole. */
export function RuleEditor({
  engine,
  parameters,
  context,
  onChange,
}: RuleEditorProps): React.ReactElement {
  const [condition, setCondition] = useState('')
  const [trigger, setTrigger] = useState<RuleTrigger>('parameterChange')
  const [error, setError] = useState<string | null>(null)
  const [lastRun, setLastRun] = useState<string | null>(null)

  const conflicts = engine.validate()

  const guard = (action: () => void): void => {
    try {
      action()
      setError(null)
      onChange()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    }
  }

  return (
    <div className="automation__panel">
      {conflicts.length > 0 ? (
        <ul className="automation__conflicts" aria-label="Rule ordering conflicts">
          {conflicts.map((conflict) => (
            <li key={`${conflict.kind}-${conflict.ruleIds.join('-')}`}>{conflict.message}</li>
          ))}
        </ul>
      ) : null}

      {engine.length === 0 ? (
        <p className="automation__empty">No rules yet.</p>
      ) : (
        <ol className="automation__rules" aria-label="Rules">
          {engine.rules.map((rule, index) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              index={index}
              parameterNames={parameters.names}
              onToggle={() => guard(() => void engine.setEnabled(rule.id, !rule.enabled))}
              onRemove={() => guard(() => void engine.removeRule(rule.id))}
              onMove={(to) => guard(() => void engine.moveRule(rule.id, to))}
              onAddAction={(action) =>
                guard(() => void engine.updateRule(rule.id, { actions: [...rule.actions, action] }))
              }
              onRemoveAction={(actionIndex) =>
                guard(() =>
                  void engine.updateRule(rule.id, {
                    actions: rule.actions.filter((_, at) => at !== actionIndex),
                  }),
                )
              }
            />
          ))}
        </ol>
      )}

      <form
        className="automation__add"
        onSubmit={(event) => {
          event.preventDefault()
          guard(() => {
            engine.addRule({ condition, trigger })
            setCondition('')
          })
        }}
      >
        <select
          aria-label="New rule trigger"
          value={trigger}
          onChange={(event) => setTrigger(event.target.value as RuleTrigger)}
        >
          {RULE_TRIGGERS.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
        <input
          aria-label="New rule condition"
          placeholder="length > 100"
          value={condition}
          onChange={(event) => setCondition(event.target.value)}
        />
        <button type="submit">Add rule</button>
      </form>

      <div className="automation__actions">
        <button
          type="button"
          disabled={!context}
          onClick={() =>
            guard(() => {
              if (!context) return
              const report = engine.run('manual', context)
              setLastRun(
                `${report.fired.length} fired, ${report.applied.length} applied, ${report.failures.length} failed`,
              )
            })
          }
        >
          Run rules
        </button>
        {lastRun ? <span className="automation__status">{lastRun}</span> : null}
      </div>

      {error ? (
        <p className="automation__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

interface RuleRowProps {
  readonly rule: RuleJSON
  readonly index: number
  readonly parameterNames: readonly string[]
  readonly onToggle: () => void
  readonly onRemove: () => void
  readonly onMove: (to: number) => void
  readonly onAddAction: (action: RuleAction) => void
  readonly onRemoveAction: (index: number) => void
}

function RuleRow({
  rule,
  index,
  parameterNames,
  onToggle,
  onRemove,
  onMove,
  onAddAction,
  onRemoveAction,
}: RuleRowProps): React.ReactElement {
  const [building, setBuilding] = useState(false)

  return (
    <li className={`automation__rule${rule.enabled ? '' : ' automation__rule--disabled'}`}>
      <div className="automation__rule-head">
        <label>
          <input
            type="checkbox"
            checked={rule.enabled}
            aria-label={`${rule.name} enabled`}
            onChange={onToggle}
          />
          <span className="automation__rule-name">{rule.name}</span>
        </label>
        <code className="automation__rule-condition">
          on {rule.trigger}: if ({rule.condition})
        </code>
        <button type="button" aria-label={`Move ${rule.name} up`} onClick={() => onMove(index - 1)}>
          ▲
        </button>
        <button type="button" aria-label={`Move ${rule.name} down`} onClick={() => onMove(index + 1)}>
          ▼
        </button>
        <button type="button" aria-label={`Delete ${rule.name}`} onClick={onRemove}>
          ✕
        </button>
      </div>

      <ul className="automation__rule-actions" aria-label={`${rule.name} actions`}>
        {rule.actions.map((action, actionIndex) => (
          <li key={`${action.type}-${actionIndex}`}>
            <code>{describeAction(action)}</code>
            <button
              type="button"
              aria-label={`Remove action ${actionIndex + 1} of ${rule.name}`}
              onClick={() => onRemoveAction(actionIndex)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {building ? (
        <ActionBuilder
          parameterNames={parameterNames}
          onCancel={() => setBuilding(false)}
          onAdd={(action) => {
            onAddAction(action)
            setBuilding(false)
          }}
        />
      ) : (
        <button type="button" onClick={() => setBuilding(true)}>
          Add action
        </button>
      )}
    </li>
  )
}

interface ActionBuilderProps {
  readonly parameterNames: readonly string[]
  readonly onAdd: (action: RuleAction) => void
  readonly onCancel: () => void
}

/** The "then" half of a rule, assembled from a type and two free-text fields. */
function ActionBuilder({ parameterNames, onAdd, onCancel }: ActionBuilderProps): React.ReactElement {
  const [type, setType] = useState<RuleActionType>('suppressFeature')
  const [target, setTarget] = useState('')
  const [value, setValue] = useState('')

  return (
    <div className="automation__builder">
      <select
        aria-label="Action type"
        value={type}
        onChange={(event) => setType(event.target.value as RuleActionType)}
      >
        {RULE_ACTION_TYPES.map((entry) => (
          <option key={entry} value={entry}>
            {entry}
          </option>
        ))}
      </select>

      {type === 'setParameter' ? (
        <select aria-label="Parameter" value={target} onChange={(event) => setTarget(event.target.value)}>
          <option value="">choose…</option>
          {parameterNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      ) : type === 'addFeature' ? (
        <select aria-label="Feature type" value={target} onChange={(event) => setTarget(event.target.value)}>
          <option value="">choose…</option>
          {FEATURE_TYPES.map((entry) => (
            <option key={entry} value={entry}>
              {featureLabel(entry)}
            </option>
          ))}
        </select>
      ) : (
        <input
          aria-label="Action target"
          placeholder="feature name or id"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
        />
      )}

      {type === 'setParameter' || type === 'setMaterial' ? (
        <input
          aria-label="Action value"
          placeholder={type === 'setParameter' ? 'width * 2' : 'Aluminium 6061'}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      ) : null}

      <button
        type="button"
        onClick={() => {
          const action = buildAction(type, target, value)
          if (action) onAdd(action)
        }}
      >
        Add
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}

/** Turns the builder's three fields into an action, or null when incomplete. */
export function buildAction(
  type: RuleActionType,
  target: string,
  value: string,
): RuleAction | null {
  if (target.trim().length === 0) return null
  switch (type) {
    case 'setParameter':
      return value.trim().length === 0
        ? null
        : { type, name: target.trim(), expression: value.trim() }
    case 'setMaterial':
      return value.trim().length === 0
        ? null
        : { type, target: target.trim(), material: value.trim() }
    case 'addFeature':
      return { type, featureType: target.trim() as FeatureType }
    default:
      return { type, feature: target.trim() }
  }
}

export function describeAction(action: RuleAction): string {
  switch (action.type) {
    case 'setParameter':
      return `${action.name} = ${action.expression}`
    case 'setMaterial':
      return `material of ${action.target} = ${action.material}`
    case 'addFeature':
      return `add ${featureLabel(action.featureType)}`
    default:
      return `${action.type}(${action.feature})`
  }
}

/* ------------------------------------------------------------------ script */

interface ScriptRunnerProps {
  readonly script: DesignScript
  readonly context: ScriptContext | undefined
  readonly onChange: () => void
  readonly onRun: ((report: ScriptRunReport) => void) | undefined
}

/** A JSON editor, a run button and the log the run leaves behind. */
export function ScriptRunner({
  script,
  context,
  onChange,
  onRun,
}: ScriptRunnerProps): React.ReactElement {
  const [source, setSource] = useState(() => JSON.stringify(script.operations, null, 2))
  const [steps, setSteps] = useState<readonly ScriptStep[]>([])
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [report, setReport] = useState<ScriptRunReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = (): void => {
    if (!context) return
    let operations
    try {
      operations = parseScript(JSON.parse(source)).operations
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
      return
    }

    const collected: ScriptStep[] = []
    const result = runScript(operations, context, {
      stopOnError: true,
      onProgress: (step, done, total) => {
        collected.push(step)
        setProgress({ done, total })
      },
    })
    setSteps(collected)
    setReport(result)
    setError(result.completed ? null : (result.failures[0]?.message ?? 'Script failed'))
    onRun?.(result)
    onChange()
  }

  return (
    <div className="automation__panel">
      <label className="automation__script-source">
        <span>Operations</span>
        <textarea
          aria-label="Script operations"
          rows={10}
          spellCheck={false}
          value={source}
          onChange={(event) => setSource(event.target.value)}
        />
      </label>

      <div className="automation__actions">
        <button type="button" disabled={!context} onClick={run}>
          Run
        </button>
        <button
          type="button"
          disabled={!context || !report || report.undo.length === 0}
          onClick={() => {
            if (!context || !report) return
            undoScript(report, context)
            setReport(null)
            setSteps([])
            setProgress(null)
            onChange()
          }}
        >
          Undo
        </button>
        {progress ? (
          <progress
            aria-label="Script progress"
            value={progress.done}
            max={Math.max(1, progress.total)}
          />
        ) : null}
      </div>

      {steps.length > 0 ? (
        <ol className="automation__log" aria-label="Script log">
          {steps.map((step) => (
            <li key={step.index} className={`automation__log-${step.status}`}>
              <code>{step.operation.type}</code> — {step.detail}
            </li>
          ))}
        </ol>
      ) : null}

      {error ? (
        <p className="automation__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
