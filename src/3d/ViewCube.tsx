import { useMemo, useRef } from 'react'
import type { CameraOrientation } from '../view/camera'
import { STANDARD_VIEWS, nearestStandardView, orientationFor, standardViewLabel } from '../view/camera'
import type { StandardView } from '../view/types'
import type { ProjectedFace, ViewCubeRegion } from '../view/viewCube'
import { orientationForRegion, paintOrder, pickRegion, projectViewCube } from '../view/viewCube'
import './ViewCube.css'

/**
 * The orientation widget in the corner of the 3D view.
 *
 * All the geometry comes from `view/viewCube`, which projects a labelled unit
 * cube and answers which of its 26 regions a point lands on. This component only
 * turns that into SVG and back — which is why the cube can be tested without a
 * renderer, and why what is drawn and what is clickable cannot drift apart:
 * they are the same projection.
 */
export interface ViewCubeProps {
  /** Where the camera is now, so the cube shows the same attitude the model has. */
  readonly orientation: CameraOrientation
  /** A region was clicked. The orientation is the one the camera should take. */
  readonly onSelect: (orientation: CameraOrientation, regionId: string) => void
  /** Half-width of the cube in SVG units. The viewBox is sized from it. */
  readonly size?: number
}

/** Room around the cube for its longest diagonal, plus a little air. */
const MARGIN = 1.45
/** How near a click has to fall to a corner or edge for it to win over a face. */
const HOTSPOT_RADIUS = 0.28

/** The named views worth a button of their own: the six faces plus isometric. */
const QUICK_VIEWS: readonly StandardView[] = STANDARD_VIEWS.filter(
  (view) => view !== 'dimetric' && view !== 'trimetric',
)

export function ViewCube({ orientation, onSelect, size = 1 }: ViewCubeProps): React.ReactElement {
  const svgRef = useRef<SVGSVGElement>(null)
  const cube = useMemo(() => projectViewCube(orientation, size), [orientation, size])
  const faces = useMemo(() => paintOrder(cube), [cube])
  const current = nearestStandardView(orientation.eye)

  const extent = size * MARGIN

  /**
   * Turns a click into a region.
   *
   * The pointer is put into the cube's own coordinates through the SVG's
   * bounding box rather than through `getScreenCTM`, which jsdom does not
   * implement — and the box is all this needs, the viewBox being square and
   * centred.
   */
  const regionAt = (clientX: number, clientY: number): ViewCubeRegion | null => {
    const svg = svgRef.current
    if (!svg) return null
    const box = svg.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) return null
    const x = ((clientX - box.left) / box.width - 0.5) * 2 * extent
    const y = ((clientY - box.top) / box.height - 0.5) * 2 * extent
    return pickRegion(cube, x, y, HOTSPOT_RADIUS * size)
  }

  return (
    <div className="viewcube">
      <svg
        ref={svgRef}
        className="viewcube__svg"
        viewBox={`${-extent} ${-extent} ${extent * 2} ${extent * 2}`}
        role="img"
        aria-label={`View cube, currently ${standardViewLabel(current)}`}
        onClick={(event) => {
          const region = regionAt(event.clientX, event.clientY)
          if (region) onSelect(orientationForRegion(region), region.id)
        }}
      >
        {faces.map((face) => (
          <CubeFace key={face.regionId} face={face} active={face.regionId === current} />
        ))}
        {cube.hotspots.map((hotspot) => (
          <circle
            key={hotspot.regionId}
            className={`viewcube__hotspot viewcube__hotspot--${hotspot.kind}`}
            cx={hotspot.center.x}
            cy={hotspot.center.y}
            r={HOTSPOT_RADIUS * size * 0.5}
          />
        ))}
      </svg>

      {/* The cube is the quick way to a nearby view; these are the reliable way
          to an exact one, and the only way for anyone not using a pointer. */}
      <div className="viewcube__views" role="group" aria-label="Standard views">
        {QUICK_VIEWS.map((view) => (
          <button
            key={view}
            type="button"
            className="viewcube__view"
            aria-pressed={view === current}
            onClick={() => onSelect(orientationFor(view), view)}
          >
            {standardViewLabel(view)}
          </button>
        ))}
      </div>
    </div>
  )
}

interface CubeFaceProps {
  readonly face: ProjectedFace
  readonly active: boolean
}

function CubeFace({ face, active }: CubeFaceProps): React.ReactElement {
  return (
    <g className={`viewcube__face${active ? ' viewcube__face--active' : ''}`}>
      <polygon points={face.points.map((point) => `${point.x},${point.y}`).join(' ')} />
      <text
        x={face.points.reduce((total, point) => total + point.x, 0) / face.points.length}
        y={face.points.reduce((total, point) => total + point.y, 0) / face.points.length}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {face.label}
      </text>
    </g>
  )
}
