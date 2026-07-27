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

/** Frame rates the export UI offers. Any positive number still works. */
export const VIDEO_FRAME_RATES = [24, 30, 60] as const

export type VideoFrameRate = (typeof VIDEO_FRAME_RATES)[number]

export function isVideoFrameRate(value: number): value is VideoFrameRate {
  return (VIDEO_FRAME_RATES as readonly number[]).includes(value)
}

/**
 * MP4 with H.264 baseline, level 3.0 — the codec string Chrome and Safari
 * expect, and the combination that plays back essentially everywhere. Some
 * builds only admit to the bare `video/mp4`, so that is tried too.
 */
export const MP4_H264_MIME = 'video/mp4;codecs=avc1.42E01E'
export const MP4_MIME = 'video/mp4'
export const WEBM_VP9_MIME = 'video/webm;codecs=vp9'
export const DEFAULT_VIDEO_MIME = 'video/webm'

/**
 * What to try, best first.
 *
 * MP4/H.264 leads because it is the one a recipient can drop into anything.
 * Firefox records WebM only, so the list falls through to it rather than
 * failing — a file that plays is worth more than a container the user asked
 * for and cannot open.
 */
export const VIDEO_MIME_CANDIDATES: readonly string[] = [
  MP4_H264_MIME,
  MP4_MIME,
  WEBM_VP9_MIME,
  DEFAULT_VIDEO_MIME,
]

/** Tests whether the browser's `MediaRecorder` accepts a container and codec. */
export type MimeSupportTest = (mimeType: string) => boolean

/** The real check, or a rejection of everything when there is no recorder. */
export function defaultMimeSupport(): MimeSupportTest {
  const recorder = globalThis.MediaRecorder
  if (typeof recorder !== 'function' || typeof recorder.isTypeSupported !== 'function') {
    return () => false
  }
  return (mimeType: string) => recorder.isTypeSupported(mimeType)
}

/** The first candidate this browser will record, or `null` for none of them. */
export function supportedVideoMime(
  candidates: readonly string[] = VIDEO_MIME_CANDIDATES,
  isSupported: MimeSupportTest = defaultMimeSupport(),
): string | null {
  return candidates.find((candidate) => isSupported(candidate)) ?? null
}

/** Whether this browser can produce an MP4 rather than falling back to WebM. */
export function canRecordMp4(isSupported: MimeSupportTest = defaultMimeSupport()): boolean {
  return isSupported(MP4_H264_MIME) || isSupported(MP4_MIME)
}

/** The extension that goes with a recorded container. */
export function videoExtension(mimeType: string): string {
  return mimeType.startsWith(MP4_MIME) ? '.mp4' : '.webm'
}

/** How far along a recording is, for a progress bar. */
export interface RecordingProgress {
  readonly frame: number
  readonly total: number
  /** Animation time of the frame just drawn, in seconds. */
  readonly time: number
  /** 0..1. */
  readonly fraction: number
}

export interface VideoOptions {
  readonly fps?: number
  /**
   * Container and codec. Omit to take the best one this browser supports;
   * naming one that it does not support is an error rather than a silent
   * downgrade, because a caller who asked for MP4 needs to know it got WebM.
   */
  readonly mimeType?: string
  /** Poses and draws the model. Called once per frame, in order. */
  readonly render: (time: number) => void | Promise<void>
  /** Called after each frame is drawn. */
  readonly onProgress?: (progress: RecordingProgress) => void
  /** Injected so the recorder can be replaced in a test. */
  readonly createRecorder?: (stream: MediaStream, mimeType: string) => RecorderLike
  /** Injected so codec support can be simulated in a test. */
  readonly isTypeSupported?: MimeSupportTest
}

/** A finished recording, with everything a download needs. */
export interface VideoResult {
  readonly blob: Blob
  /** What was actually recorded, which may not be what was asked for. */
  readonly mimeType: string
  readonly extension: string
  readonly fps: number
  readonly duration: number
  readonly frameCount: number
}

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
 *
 * Resolves with the blob alone for the sake of the callers that predate the
 * richer result; {@link recordVideoFile} is the same recording with the codec
 * and frame count attached.
 */
export async function recordVideo(
  source: StreamSource,
  duration: number,
  options: VideoOptions,
): Promise<Blob> {
  return (await recordVideoFile(source, duration, options)).blob
}

/**
 * Records a run and reports what came out.
 *
 * Frames are enumerated up front from the timeline, so the progress callback
 * can say "17 of 240" rather than counting blindly, and so the frame count on
 * the result is the number actually drawn.
 */
export async function recordVideoFile(
  source: StreamSource,
  duration: number,
  options: VideoOptions,
): Promise<VideoResult> {
  const fps = options.fps ?? DEFAULT_FPS
  const isSupported = options.isTypeSupported ?? defaultMimeSupport()
  const mimeType = chooseMime(options.mimeType, isSupported)
  const create = options.createRecorder ?? createMediaRecorder

  const recorder = create(source.captureStream(fps), mimeType)
  const chunks: Blob[] = []

  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
    recorder.onerror = () => reject(new MotionError('Recording failed'))
  })

  const frames = animationFrames(duration, fps)
  recorder.start()
  try {
    for (const frame of frames) {
      await options.render(frame.time)
      options.onProgress?.({
        frame: frame.index + 1,
        total: frames.length,
        time: frame.time,
        fraction: (frame.index + 1) / frames.length,
      })
      await nextFrame()
    }
  } finally {
    // Stop even if a frame threw, so the recorder is never left running and
    // the promise above always settles.
    recorder.stop()
  }

  return {
    blob: await finished,
    mimeType,
    extension: videoExtension(mimeType),
    fps,
    duration,
    frameCount: frames.length,
  }
}

/**
 * Records an MP4, or says why it cannot.
 *
 * Unlike {@link recordVideoFile} this refuses to fall back: the whole point of
 * asking for MP4 is the container, so quietly handing back WebM would break
 * whatever the file was destined for.
 */
export async function recordMp4(
  source: StreamSource,
  duration: number,
  options: Omit<VideoOptions, 'mimeType'> = { render: () => undefined },
): Promise<VideoResult> {
  const isSupported = options.isTypeSupported ?? defaultMimeSupport()
  const mimeType = supportedVideoMime([MP4_H264_MIME, MP4_MIME], isSupported)
  if (mimeType === null) {
    throw new MotionError('This browser cannot record MP4; try WebM instead')
  }
  return recordVideoFile(source, duration, { ...options, mimeType })
}

/**
 * The container to record in: the caller's choice if the browser takes it, and
 * otherwise the best available. A named type that is not supported fails here
 * rather than producing a file the caller did not ask for.
 */
function chooseMime(requested: string | undefined, isSupported: MimeSupportTest): string {
  if (requested !== undefined) {
    if (!isSupported(requested)) {
      throw new MotionError(`This browser cannot record "${requested}"`)
    }
    return requested
  }
  const best = supportedVideoMime(VIDEO_MIME_CANDIDATES, isSupported)
  // No support test at all means no MediaRecorder to ask; the default is what
  // the recorder below will fail on, with a clearer message.
  return best ?? DEFAULT_VIDEO_MIME
}

function createMediaRecorder(stream: MediaStream, mimeType: string): RecorderLike {
  if (typeof globalThis.MediaRecorder !== 'function') {
    throw new MotionError('This browser cannot record video from a canvas')
  }
  return new MediaRecorder(stream, { mimeType }) as unknown as RecorderLike
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve())
    else setTimeout(resolve, 0)
  })
}
