import type { SectionAxis, SectionState } from '../view/section'
import {
  SECTION_MODES,
  flipSectionAxis,
  sectionAxes,
  sectionModeLabel,
  setSectionMode,
  setSectionOffset,
} from '../view/section'
import { Icon } from './Icon'
import './SectionControls.css'

/**
 * Cutting the model open to see inside it.
 *
 * All the state transitions live in `view/section`; this only renders them, so
 * the modes the UI offers and the planes the viewport clips against can never
 * be two different lists. The offset sliders show exactly the axes the current
 * mode cuts on — a half section has one, an octant three — because an offset for
 * an axis nothing is cut on is a control that does nothing.
 */
export interface SectionControlsProps {
  readonly section: SectionState
  readonly onChange: (section: SectionState) => void
  /** How far the sliders reach, in world units. Sized to the model by the caller. */
  readonly extent?: number
}

const DEFAULT_EXTENT = 100

/**
 * A step the cut lands on round numbers with.
 *
 * A hundredth of the extent is about the right feel but is rarely a number
 * anyone would choose — a 132 mm reach gives steps of 1.32, so every position
 * the slider can take is a fraction. Rounding down to the nearest power of ten
 * keeps the feel and makes the offsets readable.
 */
function sliderStep(extent: number): number {
  const rough = Math.max(extent / 100, 1e-3)
  return 10 ** Math.floor(Math.log10(rough))
}

export function SectionControls({
  section,
  onChange,
  extent = DEFAULT_EXTENT,
}: SectionControlsProps): React.ReactElement {
  const axes = sectionAxes(section.mode)

  return (
    // No heading of its own: this is rendered inside a browser section already
    // called Section, and the caller that is not the browser wants the controls,
    // not a second title for them.
    <div className="section">
      <select
        className="section__mode"
        aria-label="Section mode"
        value={section.mode}
        onChange={(event) =>
          onChange(setSectionMode(section, event.target.value as SectionState['mode']))
        }
      >
        {SECTION_MODES.map((mode) => (
          <option key={mode} value={mode}>
            {sectionModeLabel(mode)}
          </option>
        ))}
      </select>

      {axes.map((axis: SectionAxis) => (
        <div className="section__axis" key={axis}>
          <label htmlFor={`section-${axis}`}>{axis.toUpperCase()}</label>
          <input
            id={`section-${axis}`}
            type="range"
            min={-extent}
            max={extent}
            step={sliderStep(extent)}
            value={section.offsets[axis]}
            onChange={(event) =>
              onChange(setSectionOffset(section, axis, Number(event.target.value)))
            }
          />
          <button
            type="button"
            className="section__flip"
            aria-pressed={section.flipped[axis]}
            aria-label={`Flip ${axis.toUpperCase()} section`}
            onClick={() => onChange(flipSectionAxis(section, axis))}
          >
            <Icon name="mirror" size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
