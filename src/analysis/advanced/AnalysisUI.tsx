import type { ColorScale } from './types'
import { bandHistogram } from './types'
import type { CurvatureCombResult } from './CurvatureComb'
import { curvatureScale } from './CurvatureComb'
import type { ZebraResult } from './ZebraStripes'
import { groupDiscontinuities } from './ZebraStripes'
import type { DraftHeatMap } from './DraftHeatMap'
import { draftScale } from './DraftHeatMap'
import type { WallThicknessMap } from './WallThicknessMap'
import { thicknessScale } from './WallThicknessMap'
import type { RadiusReport } from './MinimumRadius'
import { describeRadiusReport } from './MinimumRadius'
import './AnalysisUI.css'

/**
 * The analysis panel and its viewport overlay.
 *
 * Each analysis is a checkbox, a summary and a legend. The legend is the part
 * that matters: a heat map is meaningless without the scale beside it, so the
 * panel renders one for every analysis that is switched on, with the counts
 * that fell in each band.
 */

export const ADVANCED_ANALYSES = ['curvature', 'zebra', 'draft', 'thickness', 'radius'] as const
export type AdvancedAnalysis = (typeof ADVANCED_ANALYSES)[number]

export const ANALYSIS_LABELS: Readonly<Record<AdvancedAnalysis, string>> = {
  curvature: 'Curvature comb',
  zebra: 'Zebra stripes',
  draft: 'Draft angle',
  thickness: 'Wall thickness',
  radius: 'Minimum radius',
}

export const ANALYSIS_HINTS: Readonly<Record<AdvancedAnalysis, string>> = {
  curvature: 'Spikes on selected edges',
  zebra: 'Reflection continuity',
  draft: 'Faces against the pull direction',
  thickness: 'Material between opposing walls',
  radius: 'Tightest radius in the selection',
}

/** Whatever has been computed so far; anything absent simply is not shown. */
export interface AnalysisResults {
  readonly curvature?: CurvatureCombResult
  readonly zebra?: ZebraResult
  readonly draft?: DraftHeatMap
  readonly thickness?: WallThicknessMap
  readonly radius?: RadiusReport
}

export interface AnalysisPanelProps {
  readonly active: readonly AdvancedAnalysis[]
  readonly results?: AnalysisResults
  readonly onToggle?: (analysis: AdvancedAnalysis, enabled: boolean) => void
  /** Precision for the numbers in the summaries. */
  readonly precision?: number
}

export function AnalysisPanel({
  active,
  results = {},
  onToggle,
  precision = 3,
}: AnalysisPanelProps): React.ReactElement {
  const enabled = new Set(active)

  return (
    <div className="analysis-panel">
      <h2 className="analysis-panel__title">Analysis</h2>

      <ul className="analysis-panel__toggles">
        {ADVANCED_ANALYSES.map((analysis) => (
          <li key={analysis} className="analysis-toggle">
            <input
              id={`analysis-${analysis}`}
              type="checkbox"
              checked={enabled.has(analysis)}
              onChange={(event) => onToggle?.(analysis, event.target.checked)}
            />
            <label className="analysis-toggle__label" htmlFor={`analysis-${analysis}`}>
              {ANALYSIS_LABELS[analysis]}
            </label>
            <span className="analysis-toggle__hint">{ANALYSIS_HINTS[analysis]}</span>
          </li>
        ))}
      </ul>

      <div className="analysis-panel__results">
        {enabled.has('curvature') && results.curvature ? (
          <CurvatureResult result={results.curvature} precision={precision} />
        ) : null}
        {enabled.has('zebra') && results.zebra ? <ZebraResultBlock result={results.zebra} /> : null}
        {enabled.has('draft') && results.draft ? (
          <DraftResult result={results.draft} precision={precision} />
        ) : null}
        {enabled.has('thickness') && results.thickness ? (
          <ThicknessResult result={results.thickness} precision={precision} />
        ) : null}
        {enabled.has('radius') && results.radius ? (
          <RadiusResult result={results.radius} precision={precision} />
        ) : null}
      </div>
    </div>
  )
}

export interface ColorScaleLegendProps {
  readonly scale: ColorScale
  /** How many readings landed in each band, keyed by band id. */
  readonly counts?: ReadonlyMap<string, number>
}

/** The scale beside a heat map, without which the colours mean nothing. */
export function ColorScaleLegend({ scale, counts }: ColorScaleLegendProps): React.ReactElement {
  return (
    <ul className="analysis-legend" aria-label={`${scale.label} legend`}>
      {scale.bands.map((band) => (
        <li key={band.id} className="analysis-legend__row" data-band={band.id}>
          <span
            className="analysis-legend__swatch"
            style={{ background: band.color }}
            aria-hidden="true"
          />
          <span className="analysis-legend__label">{band.label}</span>
          <span className="analysis-legend__range">{formatRange(band.min, band.max, scale.unit)}</span>
          {counts ? <span className="analysis-legend__count">{counts.get(band.id) ?? 0}</span> : null}
        </li>
      ))}
    </ul>
  )
}

/** "≥ 3°", "< 0°" or "1–3°" — a band's bounds, written the way a legend reads. */
export function formatRange(min: number, max: number, unit: string): string {
  const lowOpen = !Number.isFinite(min)
  const highOpen = !Number.isFinite(max)
  if (lowOpen && highOpen) return 'all'
  if (lowOpen) return `< ${trim(max)}${unit}`
  if (highOpen) return `≥ ${trim(min)}${unit}`
  return `${trim(min)}–${trim(max)}${unit}`
}

export interface AnalysisOverlayProps {
  readonly active: readonly AdvancedAnalysis[]
  readonly results?: AnalysisResults
  readonly precision?: number
}

/**
 * The headline number for each running analysis, drawn over the viewport.
 *
 * Deliberately one line each: the panel carries the detail, the overlay is what
 * the user reads while spinning the model.
 */
export function AnalysisOverlay({
  active,
  results = {},
  precision = 3,
}: AnalysisOverlayProps): React.ReactElement | null {
  const lines = overlayLines(active, results, precision)
  if (lines.length === 0) return null

  return (
    <div className="analysis-overlay" aria-label="Analysis readout">
      {lines.map((line) => (
        <div key={line.analysis} className="analysis-overlay__line">
          <span className="analysis-overlay__name">{ANALYSIS_LABELS[line.analysis]}</span>
          <span className="analysis-overlay__value">{line.value}</span>
        </div>
      ))}
    </div>
  )
}

export interface OverlayLine {
  readonly analysis: AdvancedAnalysis
  readonly value: string
}

/** The overlay's contents, separated out so it can be checked without a DOM. */
export function overlayLines(
  active: readonly AdvancedAnalysis[],
  results: AnalysisResults,
  precision = 3,
): OverlayLine[] {
  const enabled = new Set(active)
  const lines: OverlayLine[] = []

  if (enabled.has('curvature') && results.curvature) {
    lines.push({
      analysis: 'curvature',
      value: `R min ${formatRadius(results.curvature.minimumRadius, precision)}`,
    })
  }
  if (enabled.has('zebra') && results.zebra) {
    const grouped = groupDiscontinuities(results.zebra.discontinuities)
    lines.push({
      analysis: 'zebra',
      value: `${grouped.position.length} G0 · ${grouped.tangent.length} G1 · ${grouped.curvature.length} G2`,
    })
  }
  if (enabled.has('draft') && results.draft) {
    lines.push({
      analysis: 'draft',
      value:
        results.draft.undercuts.length === 0
          ? 'no undercuts'
          : `${results.draft.undercuts.length} undercut faces`,
    })
  }
  if (enabled.has('thickness') && results.thickness) {
    const { statistics } = results.thickness
    lines.push({
      analysis: 'thickness',
      value:
        statistics.count === 0
          ? 'no readings'
          : `${statistics.min.toFixed(precision)}–${statistics.max.toFixed(precision)} mm`,
    })
  }
  if (enabled.has('radius') && results.radius) {
    lines.push({
      analysis: 'radius',
      value: formatRadius(results.radius.minimum, precision),
    })
  }
  return lines
}

function CurvatureResult({
  result,
  precision,
}: {
  readonly result: CurvatureCombResult
  readonly precision: number
}): React.ReactElement {
  const scale = curvatureScale()
  return (
    <section className="analysis-result" aria-label="Curvature comb results">
      <h3 className="analysis-result__heading">{ANALYSIS_LABELS.curvature}</h3>
      <dl className="analysis-result__stats">
        <dt>Samples</dt>
        <dd>{result.samples.length}</dd>
        <dt>Min radius</dt>
        <dd>{formatRadius(result.minimumRadius, precision)}</dd>
        <dt>Max curvature</dt>
        <dd>{result.statistics.max.toFixed(precision)}</dd>
        <dt>Inflections</dt>
        <dd>{result.inflections.length}</dd>
      </dl>
      <ColorScaleLegend
        scale={scale}
        counts={bandHistogram(scale, result.samples.map((sample) => sample.curvature))}
      />
    </section>
  )
}

function ZebraResultBlock({ result }: { readonly result: ZebraResult }): React.ReactElement {
  const grouped = groupDiscontinuities(result.discontinuities)
  return (
    <section className="analysis-result" aria-label="Zebra stripe results">
      <h3 className="analysis-result__heading">{ANALYSIS_LABELS.zebra}</h3>
      <dl className="analysis-result__stats">
        <dt>Position breaks</dt>
        <dd>{grouped.position.length}</dd>
        <dt>Tangent breaks</dt>
        <dd>{grouped.tangent.length}</dd>
        <dt>Curvature breaks</dt>
        <dd>{grouped.curvature.length}</dd>
        <dt>Stripe density</dt>
        <dd>{result.density}</dd>
      </dl>
      {result.tangentContinuous ? null : (
        <p className="analysis-result__warning">Surfaces do not meet smoothly.</p>
      )}
    </section>
  )
}

function DraftResult({
  result,
  precision,
}: {
  readonly result: DraftHeatMap
  readonly precision: number
}): React.ReactElement {
  const scale = draftScale()
  return (
    <section className="analysis-result" aria-label="Draft angle results">
      <h3 className="analysis-result__heading">{ANALYSIS_LABELS.draft}</h3>
      <dl className="analysis-result__stats">
        <dt>Faces</dt>
        <dd>{result.faces.length}</dd>
        <dt>Min angle</dt>
        <dd>{result.statistics.min.toFixed(precision)}°</dd>
        <dt>Undercut area</dt>
        <dd>{result.areaByBand.undercut.toFixed(precision)}</dd>
      </dl>
      <ColorScaleLegend
        scale={scale}
        counts={bandHistogram(scale, result.faces.map((face) => face.angle))}
      />
      {result.mouldable ? null : (
        <p className="analysis-result__warning">
          {result.undercuts.length} face(s) undercut the pull direction.
        </p>
      )}
    </section>
  )
}

function ThicknessResult({
  result,
  precision,
}: {
  readonly result: WallThicknessMap
  readonly precision: number
}): React.ReactElement {
  const scale = thicknessScale({ target: result.target, tolerance: result.tolerance })
  const measured = result.samples
    .map((sample) => sample.thickness)
    .filter((value): value is number => value !== null)

  return (
    <section className="analysis-result" aria-label="Wall thickness results">
      <h3 className="analysis-result__heading">{ANALYSIS_LABELS.thickness}</h3>
      <dl className="analysis-result__stats">
        <dt>Target</dt>
        <dd>
          {result.target} ± {result.tolerance}
        </dd>
        <dt>Min</dt>
        <dd>{result.statistics.count === 0 ? '—' : result.statistics.min.toFixed(precision)}</dd>
        <dt>Max</dt>
        <dd>{result.statistics.count === 0 ? '—' : result.statistics.max.toFixed(precision)}</dd>
        <dt>Unmeasured</dt>
        <dd>{result.unmeasured.length}</dd>
      </dl>
      <ColorScaleLegend scale={scale} counts={bandHistogram(scale, measured)} />
    </section>
  )
}

function RadiusResult({
  result,
  precision,
}: {
  readonly result: RadiusReport
  readonly precision: number
}): React.ReactElement {
  return (
    <section className="analysis-result" aria-label="Minimum radius results">
      <h3 className="analysis-result__heading">{ANALYSIS_LABELS.radius}</h3>
      <p className="analysis-result__stats">{describeRadiusReport(result, precision)}</p>
      {result.machinable ? null : (
        <p className="analysis-result__warning">
          {result.violations.length} reading(s) tighter than the tool.
        </p>
      )}
    </section>
  )
}

function formatRadius(radius: number, precision: number): string {
  return Number.isFinite(radius) ? radius.toFixed(precision) : '∞'
}

function trim(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}
