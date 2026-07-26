import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { ThreeViewport } from '../3d/ThreeViewport'
import type { MeshData } from '../domain/MeshData'
import { triangleCount } from '../domain/MeshData'
import { StubKernel } from '../kernel/StubKernel'
import type { Vec2 } from '../sketch/domain/geometry'
import { newId } from '../sketch/domain/ids'
import { Button } from '../ui/Button'
import { createBaseFlange, contourChain } from './BaseFlange'
import { chainProfile } from './bend'
import type { FlatPattern } from './FlatPattern'
import { flatPattern, flatPatternToDXF, flatPatternToSVG } from './FlatPattern'
import { SheetMetalParameters } from './SheetMetalParameters'
import { SheetMetalPart } from './SheetMetalPart'
import { SheetMetalError } from './types'
import './SheetMetalEditor.css'

const DEG = Math.PI / 180

/** Blank space left around a preview, as a fraction of its longer side. */
const PREVIEW_MARGIN = 0.08

/** One bend of the part, as the flange table lists it. */
export interface FlangeRow {
  readonly id: string
  /** Length of the flat run after the bend. */
  readonly length: number
  /** Turn angle in degrees; positive folds one way, negative the other. */
  readonly angle: number
}

export interface ExportedFile {
  readonly name: string
  readonly content: string
  readonly mimeType: string
}

export interface SheetMetalEditorProps {
  readonly name?: string
  readonly material?: string
  readonly thickness?: number
  readonly innerRadius?: number
  readonly kFactor?: number
  /** Length of the run before the first bend. */
  readonly baseLength?: number
  /** How far the section is swept — the width of the sheet. */
  readonly width?: number
  readonly flanges?: readonly FlangeRow[]
  /** Called whenever the part changes and can still be built. */
  readonly onChange?: (part: SheetMetalPart) => void
  /** Receives an exported flat pattern. Defaults to a browser download. */
  readonly onExport?: (file: ExportedFile) => void
  readonly onClose?: () => void
}

export function createFlangeRow(length = 20, angle = 90): FlangeRow {
  return { id: newId(), length, angle }
}

/**
 * The cross-section of a part described by a base run and a list of bends: each
 * flange turns by its own angle and then runs on for its own length.
 */
export function contourPoints(baseLength: number, flanges: readonly FlangeRow[]): Vec2[] {
  if (!(baseLength > 0)) throw new SheetMetalError('The base of the part needs a positive length')

  const points: Vec2[] = [{ x: 0, y: 0 }]
  let heading = 0
  let cursor: Vec2 = { x: baseLength, y: 0 }
  points.push(cursor)

  for (const flange of flanges) {
    if (!(flange.length > 0)) throw new SheetMetalError('A flange needs a positive length')
    if (!(Math.abs(flange.angle) > 0) || Math.abs(flange.angle) >= 180) {
      throw new SheetMetalError('A flange angle must be between 0 and 180 degrees')
    }
    heading += flange.angle
    cursor = {
      x: cursor.x + Math.cos(heading * DEG) * flange.length,
      y: cursor.y + Math.sin(heading * DEG) * flange.length,
    }
    points.push(cursor)
  }
  return points
}

export interface SheetMetalPartInput {
  readonly name?: string
  readonly parameters: SheetMetalParameters
  readonly baseLength: number
  readonly width: number
  readonly flanges: readonly FlangeRow[]
}

/** The part the editor is describing, as a sheet metal model. */
export function buildSheetMetalPart(input: SheetMetalPartInput): SheetMetalPart {
  return new SheetMetalPart({
    ...(input.name === undefined ? {} : { name: input.name }),
    parameters: input.parameters,
    base: createBaseFlange({
      profileKind: 'open',
      points: contourPoints(input.baseLength, input.flanges),
      width: input.width,
    }),
  })
}

/**
 * The sheet metal environment: material settings and a table of bends on the
 * left, the folded part or its flat pattern in the middle, and the section the
 * part is folded from alongside.
 *
 * Everything on screen is derived from one model, so the section, the solid and
 * the flat pattern can never show three different parts.
 */
export function SheetMetalEditor({
  name = 'Sheet Metal Part',
  material: initialMaterial = 'Steel',
  thickness: initialThickness = 1,
  innerRadius: initialRadius = 1,
  kFactor: initialKFactor = 0.33,
  baseLength: initialBaseLength = 40,
  width: initialWidth = 60,
  flanges: initialFlanges,
  onChange,
  onExport,
  onClose,
}: SheetMetalEditorProps): React.ReactElement {
  const [material, setMaterial] = useState(initialMaterial)
  const [thickness, setThickness] = useState(initialThickness)
  const [innerRadius, setInnerRadius] = useState(initialRadius)
  const [kFactor, setKFactor] = useState(initialKFactor)
  const [baseLength, setBaseLength] = useState(initialBaseLength)
  const [width, setWidth] = useState(initialWidth)
  const [flanges, setFlanges] = useState<readonly FlangeRow[]>(
    () => initialFlanges ?? [createFlangeRow()],
  )
  const [view, setView] = useState<'folded' | 'flat'>('folded')
  const [meshes, setMeshes] = useState<readonly MeshData[]>([])

  const kernel = useMemo(() => new StubKernel(), [])

  // One model drives every view; a setting the material rejects leaves the last
  // good part on screen with the reason shown above it.
  const built = useMemo(() => {
    try {
      const parameters = new SheetMetalParameters({
        material,
        thickness,
        innerRadius,
        kFactor,
      })
      const part = buildSheetMetalPart({ name, parameters, baseLength, width, flanges })
      return { part, pattern: flatPattern(part), error: null as string | null }
    } catch (cause) {
      return {
        part: null,
        pattern: null,
        error: cause instanceof Error ? cause.message : String(cause),
      }
    }
  }, [baseLength, flanges, innerRadius, kFactor, material, name, thickness, width])

  const part = built.part
  const pattern = built.pattern

  useEffect(() => {
    if (part) onChange?.(part)
  }, [onChange, part])

  // The folded solid, tessellated for the viewport. A newer build wins.
  useEffect(() => {
    if (!part) return
    let current = true
    void part
      .build(kernel)
      .then(async (shape) => {
        const mesh = await kernel.triangulate(shape)
        kernel.dispose(shape)
        if (current) setMeshes([mesh])
      })
      .catch(() => {
        if (current) setMeshes([])
      })
    return () => {
      current = false
    }
  }, [kernel, part])

  const section = useMemo(() => {
    if (!part) return null
    try {
      const chain = contourChain(part.base, part.parameters)
      return chainProfile(chain.steps, part.parameters, chain.options)
    } catch {
      return null
    }
  }, [part])

  const updateFlange = useCallback((id: string, changes: Partial<FlangeRow>) => {
    setFlanges((rows) => rows.map((row) => (row.id === id ? { ...row, ...changes } : row)))
  }, [])

  const removeFlange = useCallback((id: string) => {
    setFlanges((rows) => rows.filter((row) => row.id !== id))
  }, [])

  const addFlange = useCallback(() => {
    setFlanges((rows) => [...rows, createFlangeRow()])
  }, [])

  const exportPattern = useCallback(
    (format: 'dxf' | 'svg') => {
      if (!pattern) return
      const file: ExportedFile =
        format === 'dxf'
          ? {
              name: `${name}.dxf`,
              content: flatPatternToDXF(pattern),
              mimeType: 'application/dxf',
            }
          : {
              name: `${name}.svg`,
              content: flatPatternToSVG(pattern),
              mimeType: 'image/svg+xml',
            }
      if (onExport) onExport(file)
      else downloadFile(file)
    },
    [name, onExport, pattern],
  )

  const triangles = meshes.reduce((total, mesh) => total + triangleCount(mesh), 0)
  const outerRadius = innerRadius + thickness

  return (
    <div className="sheet-metal">
      <header className="sheet-metal__bar">
        <span className="sheet-metal__brand">Sheet Metal</span>
        <span className="sheet-metal__doc">{name}</span>
        <div className="sheet-metal__spacer" />
        <div className="sheet-metal__views" role="group" aria-label="Preview">
          <Button
            variant={view === 'folded' ? 'primary' : 'ghost'}
            aria-pressed={view === 'folded'}
            onClick={() => setView('folded')}
          >
            Folded
          </Button>
          <Button
            variant={view === 'flat' ? 'primary' : 'ghost'}
            aria-pressed={view === 'flat'}
            onClick={() => setView('flat')}
          >
            Flat Pattern
          </Button>
        </div>
        <Button onClick={() => exportPattern('dxf')} disabled={!pattern}>
          Export DXF
        </Button>
        <Button onClick={() => exportPattern('svg')} disabled={!pattern}>
          Export SVG
        </Button>
        {onClose ? (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        ) : null}
      </header>

      {built.error ? (
        <p className="sheet-metal__error" role="alert">
          {built.error}
        </p>
      ) : null}

      <div className="sheet-metal__body">
        <aside className="sheet-metal__panel">
          <h2 className="sheet-metal__title">Material</h2>
          <label className="sheet-metal__field">
            <span>Material</span>
            <input
              type="text"
              value={material}
              onChange={(event) => setMaterial(event.target.value)}
            />
          </label>
          <NumberField label="Thickness" value={thickness} step={0.1} onChange={setThickness} />
          <NumberField label="Inner radius" value={innerRadius} step={0.1} onChange={setInnerRadius} />
          <NumberField label="K-factor" value={kFactor} step={0.01} onChange={setKFactor} />

          <p className="sheet-metal__radius" data-testid="bend-radius">
            Outer radius {format(innerRadius)} + {format(thickness)} = {format(outerRadius)}
          </p>

          <h2 className="sheet-metal__title">Shape</h2>
          <NumberField label="Base length" value={baseLength} step={1} onChange={setBaseLength} />
          <NumberField label="Width" value={width} step={1} onChange={setWidth} />

          <h2 className="sheet-metal__title">Flanges</h2>
          <table className="sheet-metal__table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Length</th>
                <th scope="col">Angle</th>
                <th scope="col">
                  <span className="sheet-metal__hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {flanges.map((flange, index) => (
                <tr key={flange.id} data-flange-id={flange.id}>
                  <td>{index + 1}</td>
                  <td>
                    <input
                      type="number"
                      aria-label={`Flange ${index + 1} length`}
                      value={flange.length}
                      step={1}
                      onChange={(event) =>
                        updateFlange(flange.id, { length: Number(event.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      aria-label={`Flange ${index + 1} angle`}
                      value={flange.angle}
                      step={5}
                      onChange={(event) =>
                        updateFlange(flange.id, { angle: Number(event.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="sheet-metal__remove"
                      aria-label={`Delete flange ${index + 1}`}
                      onClick={() => removeFlange(flange.id)}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {flanges.length === 0 ? <p className="sheet-metal__empty">No bends — a flat plate.</p> : null}
          <Button onClick={addFlange}>Add flange</Button>
        </aside>

        {/* Both previews stay mounted so switching does not rebuild the scene. */}
        <section className="sheet-metal__viewport" hidden={view !== 'folded'}>
          <ThreeViewport meshes={meshes} />
        </section>
        <section className="sheet-metal__viewport" hidden={view !== 'flat'}>
          {pattern ? (
            <FlatPatternView pattern={pattern} />
          ) : (
            <p className="sheet-metal__empty">The flat pattern needs a part that can be built.</p>
          )}
        </section>

        <aside className="sheet-metal__panel sheet-metal__panel--right">
          <h2 className="sheet-metal__title">Section</h2>
          <ProfileView points={section} />

          <h2 className="sheet-metal__title">Developed</h2>
          <dl className="sheet-metal__stats">
            <div>
              <dt>Bends</dt>
              <dd>{pattern?.bendLines.length ?? 0}</dd>
            </div>
            <div>
              <dt>Flat length</dt>
              <dd>{format(pattern?.bounds.width ?? 0)}</dd>
            </div>
            <div>
              <dt>Flat width</dt>
              <dd>{format(pattern?.bounds.height ?? 0)}</dd>
            </div>
            <div>
              <dt>Triangles</dt>
              <dd>{triangles.toLocaleString()}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  )
}

interface NumberFieldProps {
  readonly label: string
  readonly value: number
  readonly step?: number
  readonly onChange: (value: number) => void
}

function NumberField({ label, value, step = 1, onChange }: NumberFieldProps): React.ReactElement {
  return (
    <label className="sheet-metal__field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

/** The folded cross-section, drawn as one closed loop. */
function ProfileView({ points }: { readonly points: readonly Vec2[] | null }): React.ReactElement {
  const panZoom = usePanZoom()
  if (!points || points.length < 3) {
    return <p className="sheet-metal__empty">No section to show.</p>
  }

  return (
    <svg
      className="sheet-metal__preview"
      data-testid="section-preview"
      viewBox={viewBoxOf(points)}
      preserveAspectRatio="xMidYMid meet"
      {...panZoom.handlers}
    >
      <g transform={panZoom.transform} data-testid="section-transform">
        <polygon className="sheet-metal__section" points={pointList(points)} />
      </g>
    </svg>
  )
}

/** The flat pattern: outline, holes and reliefs cut, bend lines dashed. */
function FlatPatternView({ pattern }: { readonly pattern: FlatPattern }): React.ReactElement {
  const panZoom = usePanZoom()
  return (
    <svg
      className="sheet-metal__flat"
      data-testid="flat-pattern"
      viewBox={viewBoxOf(pattern.outline)}
      preserveAspectRatio="xMidYMid meet"
      {...panZoom.handlers}
    >
      <g transform={panZoom.transform} data-testid="flat-transform">
        <polygon className="sheet-metal__outline" points={pointList(pattern.outline)} />
        {pattern.holes.map((hole, index) => (
          <polygon key={`hole-${index}`} className="sheet-metal__hole" points={pointList(hole)} />
        ))}
        {pattern.reliefs.map((relief, index) => (
          <polygon
            key={`relief-${index}`}
            className="sheet-metal__relief"
            points={pointList(relief.loop)}
          />
        ))}
        {pattern.bendLines.map((bend) => (
          <line
            key={`${bend.featureId}-${bend.index}`}
            className={`sheet-metal__bend sheet-metal__bend--${bend.direction}`}
            data-testid="bend-line"
            x1={bend.start.x}
            y1={bend.start.y}
            x2={bend.end.x}
            y2={bend.end.y}
          />
        ))}
      </g>
    </svg>
  )
}

interface PanZoom {
  readonly transform: string
  readonly handlers: {
    readonly onPointerDown: (event: ReactPointerEvent<SVGSVGElement>) => void
    readonly onPointerMove: (event: ReactPointerEvent<SVGSVGElement>) => void
    readonly onPointerUp: (event: ReactPointerEvent<SVGSVGElement>) => void
    readonly onPointerCancel: (event: ReactPointerEvent<SVGSVGElement>) => void
    readonly onWheel: (event: ReactWheelEvent<SVGSVGElement>) => void
  }
}

/**
 * Pan and zoom for a preview, driven by pointer events so a finger, a pen and a
 * mouse all work the same way — two fingers pinch, one drags.
 */
function usePanZoom(): PanZoom {
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinchDistance = useRef<number | null>(null)

  const onPointerDown = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    pinchDistance.current = null
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }, [])

  const onPointerMove = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    const previous = pointers.current.get(event.pointerId)
    if (!previous) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    const touches = [...pointers.current.values()]
    if (touches.length >= 2) {
      const [first, second] = touches as [{ x: number; y: number }, { x: number; y: number }]
      const spread = Math.hypot(first.x - second.x, first.y - second.y)
      const last = pinchDistance.current
      pinchDistance.current = spread
      if (last && last > 0 && spread > 0) {
        setZoom((current) => clampZoom(current * (spread / last)))
      }
      return
    }

    setPan((current) => ({
      x: current.x + (event.clientX - previous.x),
      y: current.y + (event.clientY - previous.y),
    }))
  }, [])

  const endPointer = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId)
    pinchDistance.current = null
  }, [])

  const onWheel = useCallback((event: ReactWheelEvent<SVGSVGElement>) => {
    setZoom((current) => clampZoom(current * (event.deltaY < 0 ? 1.1 : 1 / 1.1)))
  }, [])

  return {
    transform: `translate(${format(pan.x)} ${format(pan.y)}) scale(${format(zoom)})`,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onWheel,
    },
  }
}

function clampZoom(value: number): number {
  return Math.min(20, Math.max(0.1, value))
}

function viewBoxOf(points: readonly Vec2[]): string {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }
  if (!Number.isFinite(minX)) return '0 0 1 1'

  const margin = Math.max(maxX - minX, maxY - minY) * PREVIEW_MARGIN || 1
  return [
    format(minX - margin),
    format(minY - margin),
    format(maxX - minX + margin * 2),
    format(maxY - minY + margin * 2),
  ].join(' ')
}

function pointList(points: readonly Vec2[]): string {
  return points.map((point) => `${format(point.x)},${format(point.y)}`).join(' ')
}

function format(value: number): string {
  return (Math.round(value * 1e4) / 1e4).toString()
}

/** Hands a generated file to the browser. Silently skipped where there is none. */
function downloadFile(file: ExportedFile): void {
  if (typeof URL.createObjectURL !== 'function') return
  const url = URL.createObjectURL(new Blob([file.content], { type: file.mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  URL.revokeObjectURL(url)
}
