import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Mate } from '../assembly/Mate'
import type { JointAnimation, Keyframe } from './JointAnimation'
import { AnimationPlayback, DEFAULT_FPS } from './JointAnimation'
import type { Easing, JointChannel } from './types'
import { EASINGS, channelUnit, channelsOf } from './types'
import './AnimationUI.css'

/**
 * The timeline panel: transport, tracks and keys.
 *
 * The panel drives one {@link AnimationPlayback} and reports the playhead
 * outwards through `onTimeChange` — it never poses the assembly itself. That
 * keeps the solve where it belongs, in the host, and means the same panel serves
 * a viewport, a capture and a headless run without knowing which it is feeding.
 */

export const EXPORT_FORMATS = ['gif', 'video', 'gltf'] as const
export type AnimationExportFormat = (typeof EXPORT_FORMATS)[number]

/** The speeds the transport offers, as multiples of real time. */
export const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2, 4] as const

export interface AnimationPanelProps {
  readonly animation: JointAnimation
  /** The mates that can be keyed. Only the joints among them are offered. */
  readonly joints?: readonly Mate[]
  readonly fps?: number
  /** Called on every playhead move — play, scrub, step or stop. */
  readonly onTimeChange?: (time: number) => void
  /** Called after any edit to the animation. */
  readonly onChange?: () => void
  readonly onExport?: (format: AnimationExportFormat) => void
}

interface Selection {
  readonly mateId: string
  readonly channel: JointChannel
  readonly time: number
}

export function AnimationPanel({
  animation,
  joints = [],
  fps = DEFAULT_FPS,
  onTimeChange,
  onChange,
  onExport,
}: AnimationPanelProps): React.ReactElement {
  const playback = useMemo(() => new AnimationPlayback(animation), [animation])
  const [time, setTime] = useState(playback.time)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [revision, bump] = useState(0)

  const moveTo = useCallback(
    (next: number) => {
      setTime(next)
      onTimeChange?.(next)
    },
    [onTimeChange],
  )

  const edited = useCallback(() => {
    bump((count) => count + 1)
    onChange?.()
  }, [onChange])

  // The transport advances on the host's frame clock; a paused panel schedules
  // nothing at all rather than idling in a timer.
  const lastStamp = useRef(0)
  useEffect(() => {
    if (!playing) return undefined

    let handle = 0
    lastStamp.current = 0
    const step = (stamp: number): void => {
      const previous = lastStamp.current || stamp
      lastStamp.current = stamp
      moveTo(playback.advance((stamp - previous) / 1000))
      if (!playback.playing) setPlaying(false)
      else handle = requestAnimationFrame(step)
    }
    handle = requestAnimationFrame(step)
    return () => cancelAnimationFrame(handle)
  }, [playing, playback, moveTo])

  const duration = animation.duration
  const tracks = animation.tracks
  const keyableJoints = joints.filter((mate) => channelsOf(mate.type).length > 0)

  const setPlayState = (next: boolean): void => {
    if (next) playback.play()
    else playback.pause()
    setPlaying(next)
  }

  const handleStop = (): void => {
    playback.stop()
    setPlaying(false)
    moveTo(playback.time)
  }

  const handleReverse = (): void => {
    playback.reverse()
    bump((count) => count + 1)
  }

  const handleScrub = (fraction: number): void => {
    moveTo(playback.scrub(fraction))
  }

  const handleStep = (frames: number): void => {
    moveTo(playback.seek(playback.time + frames / fps))
  }

  const handleKeyHere = (mateId: string, channel: JointChannel): void => {
    const previous = animation.valueAt(mateId, channel, time) ?? 0
    animation.addKeyframe(mateId, channel, { time, value: previous, easing: 'linear' })
    setSelection({ mateId, channel, time })
    edited()
  }

  const handleDeleteKey = (): void => {
    if (!selection) return
    animation.removeKeyframe(selection.mateId, selection.channel, selection.time)
    setSelection(null)
    edited()
  }

  const selectedKey: Keyframe | undefined = selection
    ? animation.keyframes(selection.mateId, selection.channel).find((k) => k.time === selection.time)
    : undefined

  return (
    <section className="motion" aria-label="Animation timeline" data-revision={revision}>
      <header className="motion__transport">
        <button
          type="button"
          className="motion__button"
          onClick={() => setPlayState(!playing)}
          aria-pressed={playing}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" className="motion__button" onClick={handleStop}>
          Stop
        </button>
        <button
          type="button"
          className="motion__button"
          onClick={handleReverse}
          aria-pressed={playback.reversed}
        >
          Reverse
        </button>
        <button type="button" className="motion__button" onClick={() => handleStep(-1)}>
          ◀ Frame
        </button>
        <button type="button" className="motion__button" onClick={() => handleStep(1)}>
          Frame ▶
        </button>

        <label className="motion__speed">
          Speed
          <select
            value={speed}
            onChange={(event) => {
              const next = Number(event.target.value)
              playback.speed = next
              setSpeed(next)
            }}
          >
            {PLAYBACK_SPEEDS.map((option) => (
              <option key={option} value={option}>
                {option}×
              </option>
            ))}
          </select>
        </label>

        <label className="motion__loop">
          <input
            type="checkbox"
            checked={playback.loop}
            onChange={(event) => {
              playback.loop = event.target.checked
              bump((count) => count + 1)
            }}
          />
          Loop
        </label>

        <output className="motion__readout">
          {time.toFixed(2)} / {duration.toFixed(2)} s
        </output>
      </header>

      <input
        className="motion__scrubber"
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={duration > 0 ? time / duration : 0}
        aria-label="Playhead"
        onChange={(event) => handleScrub(Number(event.target.value))}
      />

      <div className="motion__tracks">
        {tracks.length === 0 ? (
          <p className="motion__empty">No joints are animated yet.</p>
        ) : (
          tracks.map((track) => (
            <div className="motion__track" key={`${track.mateId}:${track.channel}`}>
              <span className="motion__track-name">
                {nameOf(joints, track.mateId)} · {track.channel}
              </span>
              <div className="motion__lane" role="group" aria-label={`${track.channel} keys`}>
                {track.keyframes.map((keyframe) => {
                  const active =
                    selection?.mateId === track.mateId &&
                    selection.channel === track.channel &&
                    selection.time === keyframe.time
                  return (
                    <button
                      key={keyframe.time}
                      type="button"
                      className={`motion__key${active ? ' motion__key--active' : ''}`}
                      style={{ left: `${duration > 0 ? (keyframe.time / duration) * 100 : 0}%` }}
                      title={`${keyframe.time.toFixed(2)} s — ${keyframe.value.toFixed(2)} ${channelUnit(track.channel)}`}
                      aria-label={`Key at ${keyframe.time.toFixed(2)} seconds`}
                      onClick={() =>
                        setSelection({
                          mateId: track.mateId,
                          channel: track.channel,
                          time: keyframe.time,
                        })
                      }
                    />
                  )
                })}
                <span
                  className="motion__playhead"
                  style={{ left: `${duration > 0 ? (time / duration) * 100 : 0}%` }}
                />
              </div>
              <button
                type="button"
                className="motion__button motion__button--small"
                onClick={() => handleKeyHere(track.mateId, track.channel)}
              >
                + Key
              </button>
            </div>
          ))
        )}
      </div>

      {selectedKey && selection ? (
        <div className="motion__inspector">
          <label>
            Time
            <input
              type="number"
              step={0.05}
              min={0}
              value={selectedKey.time}
              onChange={(event) => {
                const moved = animation.moveKeyframe(
                  selection.mateId,
                  selection.channel,
                  selection.time,
                  Number(event.target.value),
                )
                if (moved) setSelection({ ...selection, time: moved.time })
                edited()
              }}
            />
          </label>
          <label>
            Value ({channelUnit(selection.channel)})
            <input
              type="number"
              step={0.5}
              value={selectedKey.value}
              onChange={(event) => {
                animation.addKeyframe(selection.mateId, selection.channel, {
                  ...selectedKey,
                  value: Number(event.target.value),
                })
                edited()
              }}
            />
          </label>
          <label>
            Easing
            <select
              value={selectedKey.easing}
              onChange={(event) => {
                animation.addKeyframe(selection.mateId, selection.channel, {
                  ...selectedKey,
                  easing: event.target.value as Easing,
                })
                edited()
              }}
            >
              {EASINGS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="motion__button" onClick={handleDeleteKey}>
            Delete key
          </button>
        </div>
      ) : null}

      {keyableJoints.length > 0 ? (
        <div className="motion__add" role="group" aria-label="Add track">
          {keyableJoints.map((mate) =>
            channelsOf(mate.type).map((channel) => (
              <button
                key={`${mate.id}:${channel}`}
                type="button"
                className="motion__button motion__button--small"
                onClick={() => handleKeyHere(mate.id, channel)}
              >
                {mate.name} · {channel}
              </button>
            )),
          )}
        </div>
      ) : null}

      {onExport ? (
        <footer className="motion__export" role="group" aria-label="Export animation">
          <button type="button" className="motion__button" onClick={() => onExport('gif')}>
            Export GIF
          </button>
          <button type="button" className="motion__button" onClick={() => onExport('video')}>
            Export video
          </button>
          <button type="button" className="motion__button" onClick={() => onExport('gltf')}>
            Export glTF
          </button>
        </footer>
      ) : null}
    </section>
  )
}

function nameOf(joints: readonly Mate[], mateId: string): string {
  return joints.find((mate) => mate.id === mateId)?.name ?? mateId
}
