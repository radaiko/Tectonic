import type { GifFrame, GifOptions } from './gif'
import { encodeGif } from './gif'
import type { AnimationFrame } from './JointAnimation'
import { DEFAULT_FPS, animationFrames } from './JointAnimation'
import { MotionError } from './types'

/**
 * Turning a playing animation into a file.
 *
 * Both routes start the same way: pose the model at each frame time, draw it,
 * and read the canvas back. What happens next differs — a GIF is encoded from
 * the pixels here, while a video is recorded from the canvas' own stream by the
 * browser, which is the only way to get a real codec without shipping one.
 */

/** One captured frame's pixels. */
export interface CapturedFrame {
  readonly index: number
  readonly time: number
  readonly width: number
  readonly height: number
  readonly rgba: Uint8ClampedArray
}

/** Anything that can be read back pixel by pixel — a canvas, or a test double. */
export interface FrameSource {
  readonly width: number
  readonly height: number
  getContext(contextId: '2d'): CanvasRenderingContext2D | null
}

export interface CaptureOptions {
  readonly fps?: number
  /** Poses and draws the model at an instant. Awaited before the read-back. */
  readonly render: (time: number) => void | Promise<void>
  /** Called after each frame, for a progress bar. */
  readonly onFrame?: (frame: CapturedFrame, total: number) => void
}

/**
 * Draws and reads back every frame of a run.
 *
 * Frames are captured one at a time and in order rather than in parallel: the
 * render callback poses one shared model, so overlapping two frames would have
 * them fight over it.
 */
export async function captureFrames(
  source: FrameSource,
  duration: number,
  options: CaptureOptions,
): Promise<CapturedFrame[]> {
  const context = source.getContext('2d')
  if (!context) throw new MotionError('Frame capture needs a 2D context to read back from')

  const frames: AnimationFrame[] = animationFrames(duration, options.fps ?? DEFAULT_FPS)
  const captured: CapturedFrame[] = []

  for (const frame of frames) {
    await options.render(frame.time)
    const image = context.getImageData(0, 0, source.width, source.height)
    const shot: CapturedFrame = {
      index: frame.index,
      time: frame.time,
      width: source.width,
      height: source.height,
      rgba: image.data,
    }
    captured.push(shot)
    options.onFrame?.(shot, frames.length)
  }
  return captured
}

/** Captured frames as an animated GIF, timed to match the capture rate. */
export function framesToGif(
  frames: readonly CapturedFrame[],
  options: Omit<GifOptions, 'width' | 'height'> & { readonly fps?: number } = {},
): Uint8Array {
  const first = frames[0]
  if (!first) throw new MotionError('A GIF needs at least one frame')

  const gifFrames: GifFrame[] = frames.map((frame) => ({ rgba: frame.rgba }))
  return encodeGif(gifFrames, {
    width: first.width,
    height: first.height,
    delayMs: options.delayMs ?? Math.round(1000 / (options.fps ?? DEFAULT_FPS)),
    loopCount: options.loopCount ?? 0,
  })
}

/* -------------------------------------------------------------------------- */
/* Video                                                                       */
/* -------------------------------------------------------------------------- */

/** The slice of `MediaRecorder` a capture needs, so a test can stand in for it. */
export interface RecorderLike {
  start(timesliceMs?: number): void
  stop(): void
  ondataavailable: ((event: { readonly data: Blob }) => void) | null
  onstop: (() => void) | null
  onerror: ((event: unknown) => void) | null
}

/** A canvas that can hand out a media stream — `HTMLCanvasElement` does. */
export interface StreamSource {
  captureStream(frameRate?: number): MediaStream
}

export interface VideoOptions {
  readonly fps?: number
  /** Container and codec, e.g. `video/webm;codecs=vp9`. */
  readonly mimeType?: string
  /** Poses and draws the model. Called once per frame, in order. */
  readonly render: (time: number) => void | Promise<void>
  /** Injected so the recorder can be replaced in a test. */
  readonly createRecorder?: (stream: MediaStream, mimeType: string) => RecorderLike
}

export const DEFAULT_VIDEO_MIME = 'video/webm'

/** Whether this browser can record a canvas at all. */
export function canRecordVideo(): boolean {
  return (
    typeof globalThis.MediaRecorder === 'function' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function'
  )
}

/**
 * Records a run straight off the canvas.
 *
 * The recorder samples the live stream, so the render loop has to actually take
 * wall-clock time — the frames are paced by `requestAnimationFrame` rather than
 * drawn as fast as possible, which is exactly the opposite of what the GIF path
 * wants. Callers that need frame-exact output should use {@link captureFrames}.
 */
export async function recordVideo(
  source: StreamSource,
  duration: number,
  options: VideoOptions,
): Promise<Blob> {
  const fps = options.fps ?? DEFAULT_FPS
  const mimeType = options.mimeType ?? DEFAULT_VIDEO_MIME
  const create =
    options.createRecorder ??
    ((stream: MediaStream, type: string) => {
      if (typeof globalThis.MediaRecorder !== 'function') {
        throw new MotionError('This browser cannot record video from a canvas')
      }
      return new MediaRecorder(stream, { mimeType: type }) as unknown as RecorderLike
    })

  const recorder = create(source.captureStream(fps), mimeType)
  const chunks: Blob[] = []

  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
    recorder.onerror = () => reject(new MotionError('Recording failed'))
  })

  recorder.start()
  for (const frame of animationFrames(duration, fps)) {
    await options.render(frame.time)
    await nextFrame()
  }
  recorder.stop()
  return finished
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve())
    else setTimeout(resolve, 0)
  })
}
