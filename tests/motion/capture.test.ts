import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FrameSource, RecorderLike, StreamSource } from '../../src/motion/capture'
import {
  DEFAULT_VIDEO_MIME,
  MP4_H264_MIME,
  MP4_MIME,
  VIDEO_FRAME_RATES,
  VIDEO_MIME_CANDIDATES,
  WEBM_VP9_MIME,
  canRecordMp4,
  canRecordVideo,
  captureFrames,
  defaultMimeSupport,
  framesToGif,
  isVideoFrameRate,
  recordMp4,
  recordVideo,
  recordVideoFile,
  supportedVideoMime,
  videoExtension,
} from '../../src/motion/capture'
import { MotionError } from '../../src/motion/types'

/** A canvas stand-in that hands back a fixed image on every read. */
function frameSource(width = 4, height = 2): FrameSource {
  const data = new Uint8ClampedArray(width * height * 4).fill(200)
  return {
    width,
    height,
    getContext: () =>
      ({ getImageData: () => ({ data }) }) as unknown as CanvasRenderingContext2D,
  }
}

/** A recorder that captures one chunk and stops when told. */
class FakeRecorder implements RecorderLike {
  ondataavailable: ((event: { readonly data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  started = false
  stopped = false

  start(): void {
    this.started = true
  }

  stop(): void {
    this.stopped = true
    this.ondataavailable?.({ data: new Blob(['frames']) })
    this.onstop?.()
  }
}

/** A recorder that reports a failure instead of finishing. */
class FailingRecorder implements RecorderLike {
  ondataavailable: ((event: { readonly data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  onerror: ((event: unknown) => void) | null = null

  start(): void {
    // Nothing to do; the failure is raised on stop.
  }

  stop(): void {
    this.onerror?.(new Error('device lost'))
  }
}

/** A canvas that hands out a stream, which is all the recorder path needs. */
const streamSource: StreamSource = { captureStream: () => ({}) as MediaStream }

/** Accepts only the listed types, the way a given browser's recorder would. */
function supports(...accepted: readonly string[]) {
  return (mimeType: string): boolean => accepted.includes(mimeType)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('captureFrames', () => {
  it('draws and reads back every frame of the timeline', async () => {
    const render = vi.fn()
    const frames = await captureFrames(frameSource(), 1, { fps: 4, render })

    // Zero through one second inclusive at four frames a second.
    expect(frames).toHaveLength(5)
    expect(render).toHaveBeenCalledTimes(5)
    expect(frames.map((frame) => frame.time)).toEqual([0, 0.25, 0.5, 0.75, 1])
  })

  it('reports the size of the source on each frame', async () => {
    const frames = await captureFrames(frameSource(8, 6), 0, { render: () => undefined })

    expect(frames[0]).toMatchObject({ width: 8, height: 6, index: 0 })
  })

  it('waits for an asynchronous render before reading the pixels', async () => {
    const order: string[] = []
    await captureFrames(frameSource(), 0, {
      render: async () => {
        order.push('render')
        await Promise.resolve()
        order.push('drawn')
      },
      onFrame: () => order.push('read'),
    })

    expect(order).toEqual(['render', 'drawn', 'read'])
  })

  it('reports progress against the total frame count', async () => {
    const onFrame = vi.fn()
    await captureFrames(frameSource(), 1, { fps: 2, render: () => undefined, onFrame })

    expect(onFrame).toHaveBeenCalledTimes(3)
    expect(onFrame.mock.calls[0]?.[1]).toBe(3)
  })

  it('refuses a source with no 2D context to read from', async () => {
    const source: FrameSource = { width: 1, height: 1, getContext: () => null }

    await expect(captureFrames(source, 1, { render: () => undefined })).rejects.toThrow(MotionError)
  })
})

describe('framesToGif', () => {
  it('encodes the captured frames as a GIF', async () => {
    const frames = await captureFrames(frameSource(), 0.5, { fps: 2, render: () => undefined })
    const gif = framesToGif(frames, { fps: 2 })

    expect(String.fromCharCode(...gif.subarray(0, 6))).toBe('GIF89a')
  })

  it('refuses to encode nothing', () => {
    expect(() => framesToGif([])).toThrow(MotionError)
  })
})

describe('VIDEO_FRAME_RATES', () => {
  it('offers the three standard rates', () => {
    expect(VIDEO_FRAME_RATES).toEqual([24, 30, 60])
  })

  it('recognises a standard rate', () => {
    expect(isVideoFrameRate(30)).toBe(true)
  })

  it('rejects a rate that is not on the list', () => {
    expect(isVideoFrameRate(25)).toBe(false)
  })
})

describe('supportedVideoMime', () => {
  it('prefers MP4 with H.264 when the browser takes it', () => {
    expect(supportedVideoMime(VIDEO_MIME_CANDIDATES, () => true)).toBe(MP4_H264_MIME)
  })

  it('falls through to WebM on a browser that records nothing else', () => {
    expect(supportedVideoMime(VIDEO_MIME_CANDIDATES, supports(DEFAULT_VIDEO_MIME))).toBe(
      DEFAULT_VIDEO_MIME,
    )
  })

  it('prefers VP9 over bare WebM', () => {
    const supported = supports(WEBM_VP9_MIME, DEFAULT_VIDEO_MIME)

    expect(supportedVideoMime(VIDEO_MIME_CANDIDATES, supported)).toBe(WEBM_VP9_MIME)
  })

  it('reports nothing when the browser records nothing', () => {
    expect(supportedVideoMime(VIDEO_MIME_CANDIDATES, () => false)).toBeNull()
  })
})

describe('canRecordMp4', () => {
  it('is true when either MP4 flavour is supported', () => {
    expect(canRecordMp4(supports(MP4_H264_MIME))).toBe(true)
    expect(canRecordMp4(supports(MP4_MIME))).toBe(true)
  })

  it('is false on a WebM-only browser', () => {
    expect(canRecordMp4(supports(WEBM_VP9_MIME))).toBe(false)
  })
})

describe('defaultMimeSupport', () => {
  it('rejects everything when the browser has no MediaRecorder', () => {
    vi.stubGlobal('MediaRecorder', undefined)

    expect(defaultMimeSupport()(MP4_H264_MIME)).toBe(false)
  })

  it('rejects everything when MediaRecorder cannot be asked', () => {
    vi.stubGlobal('MediaRecorder', function MediaRecorderStub() {})

    expect(defaultMimeSupport()(MP4_H264_MIME)).toBe(false)
  })

  it('asks the real MediaRecorder when there is one', () => {
    const isTypeSupported = vi.fn(() => true)
    const stub = function MediaRecorderStub() {}
    stub.isTypeSupported = isTypeSupported
    vi.stubGlobal('MediaRecorder', stub)

    expect(defaultMimeSupport()(MP4_H264_MIME)).toBe(true)
    expect(isTypeSupported).toHaveBeenCalledWith(MP4_H264_MIME)
  })
})

describe('videoExtension', () => {
  it('gives .mp4 to either MP4 flavour', () => {
    expect(videoExtension(MP4_H264_MIME)).toBe('.mp4')
    expect(videoExtension(MP4_MIME)).toBe('.mp4')
  })

  it('gives .webm to everything else', () => {
    expect(videoExtension(WEBM_VP9_MIME)).toBe('.webm')
  })
})

describe('canRecordVideo', () => {
  it('is false without a MediaRecorder', () => {
    vi.stubGlobal('MediaRecorder', undefined)

    expect(canRecordVideo()).toBe(false)
  })

  it('is true once a recorder and a capturable canvas are both present', () => {
    vi.stubGlobal('MediaRecorder', function MediaRecorderStub() {})
    // jsdom's canvas has no `captureStream` at all, so it has to be added
    // rather than spied on.
    Object.defineProperty(HTMLCanvasElement.prototype, 'captureStream', {
      value: () => ({}) as MediaStream,
      configurable: true,
    })

    try {
      expect(canRecordVideo()).toBe(true)
    } finally {
      Reflect.deleteProperty(HTMLCanvasElement.prototype, 'captureStream')
    }
  })
})

describe('recordVideoFile', () => {
  it('records the timeline and reports what came out', async () => {
    const recorder = new FakeRecorder()
    const result = await recordVideoFile(streamSource, 1, {
      fps: 24,
      render: () => undefined,
      createRecorder: () => recorder,
      isTypeSupported: () => true,
    })

    expect(recorder.started).toBe(true)
    expect(recorder.stopped).toBe(true)
    expect(result.mimeType).toBe(MP4_H264_MIME)
    expect(result.extension).toBe('.mp4')
    expect(result.fps).toBe(24)
    expect(result.duration).toBe(1)
    expect(result.frameCount).toBe(25)
  })

  it('draws one frame per instant on the timeline', async () => {
    const render = vi.fn()
    await recordVideoFile(streamSource, 0.5, {
      fps: 24,
      render,
      createRecorder: () => new FakeRecorder(),
      isTypeSupported: () => true,
    })

    expect(render).toHaveBeenCalledTimes(13)
  })

  it('reports progress as it goes', async () => {
    const onProgress = vi.fn()
    await recordVideoFile(streamSource, 1, {
      fps: 24,
      render: () => undefined,
      onProgress,
      createRecorder: () => new FakeRecorder(),
      isTypeSupported: () => true,
    })

    expect(onProgress).toHaveBeenCalledTimes(25)
    expect(onProgress.mock.calls[0]?.[0]).toMatchObject({ frame: 1, total: 25, time: 0 })
    expect(onProgress.mock.lastCall?.[0]).toMatchObject({ frame: 25, fraction: 1, time: 1 })
  })

  it('records at the requested frame rate', async () => {
    const captureStream = vi.fn(() => ({}) as MediaStream)
    await recordVideoFile({ captureStream }, 0, {
      fps: 60,
      render: () => undefined,
      createRecorder: () => new FakeRecorder(),
      isTypeSupported: () => true,
    })

    expect(captureStream).toHaveBeenCalledWith(60)
  })

  it('honours a container the caller named', async () => {
    const result = await recordVideoFile(streamSource, 0, {
      mimeType: WEBM_VP9_MIME,
      render: () => undefined,
      createRecorder: () => new FakeRecorder(),
      isTypeSupported: supports(WEBM_VP9_MIME),
    })

    expect(result.mimeType).toBe(WEBM_VP9_MIME)
    expect(result.extension).toBe('.webm')
  })

  it('refuses a container the browser cannot record rather than substituting one', async () => {
    await expect(
      recordVideoFile(streamSource, 0, {
        mimeType: MP4_H264_MIME,
        render: () => undefined,
        createRecorder: () => new FakeRecorder(),
        isTypeSupported: supports(WEBM_VP9_MIME),
      }),
    ).rejects.toThrow(/cannot record "video\/mp4/)
  })

  it('picks the best available container when none was named', async () => {
    const result = await recordVideoFile(streamSource, 0, {
      render: () => undefined,
      createRecorder: () => new FakeRecorder(),
      isTypeSupported: supports(WEBM_VP9_MIME, DEFAULT_VIDEO_MIME),
    })

    expect(result.mimeType).toBe(WEBM_VP9_MIME)
  })

  it('falls back to the default container when nothing is supported', async () => {
    const result = await recordVideoFile(streamSource, 0, {
      render: () => undefined,
      createRecorder: () => new FakeRecorder(),
      isTypeSupported: () => false,
    })

    expect(result.mimeType).toBe(DEFAULT_VIDEO_MIME)
  })

  it('stops the recorder even when a frame fails to draw', async () => {
    const recorder = new FakeRecorder()
    const failing = recordVideoFile(streamSource, 1, {
      render: () => {
        throw new Error('the scene is gone')
      },
      createRecorder: () => recorder,
      isTypeSupported: () => true,
    })

    await expect(failing).rejects.toThrow('the scene is gone')
    expect(recorder.stopped).toBe(true)
  })

  it('rejects when the recorder reports a failure', async () => {
    await expect(
      recordVideoFile(streamSource, 0, {
        render: () => undefined,
        createRecorder: () => new FailingRecorder(),
        isTypeSupported: () => true,
      }),
    ).rejects.toThrow(MotionError)
  })

  it('explains itself when there is no MediaRecorder to build', async () => {
    vi.stubGlobal('MediaRecorder', undefined)

    await expect(
      recordVideoFile(streamSource, 0, { render: () => undefined, isTypeSupported: () => true }),
    ).rejects.toThrow(/cannot record video from a canvas/)
  })
})

describe('recordVideo', () => {
  it('hands back just the blob, for callers that want only that', async () => {
    const blob = await recordVideo(streamSource, 0, {
      render: () => undefined,
      createRecorder: () => new FakeRecorder(),
      isTypeSupported: () => true,
    })

    expect(blob).toBeInstanceOf(Blob)
    // A Blob lower-cases whatever type it is handed.
    expect(blob.type).toBe(MP4_H264_MIME.toLowerCase())
  })
})

describe('recordMp4', () => {
  it('records H.264 when the browser has it', async () => {
    const result = await recordMp4(streamSource, 0, {
      fps: 30,
      render: () => undefined,
      createRecorder: () => new FakeRecorder(),
      isTypeSupported: supports(MP4_H264_MIME),
    })

    expect(result.mimeType).toBe(MP4_H264_MIME)
    expect(result.extension).toBe('.mp4')
  })

  it('accepts a browser that only admits to bare MP4', async () => {
    const result = await recordMp4(streamSource, 0, {
      render: () => undefined,
      createRecorder: () => new FakeRecorder(),
      isTypeSupported: supports(MP4_MIME),
    })

    expect(result.mimeType).toBe(MP4_MIME)
  })

  it('refuses rather than quietly handing back WebM', async () => {
    await expect(
      recordMp4(streamSource, 0, {
        render: () => undefined,
        createRecorder: () => new FakeRecorder(),
        isTypeSupported: supports(WEBM_VP9_MIME),
      }),
    ).rejects.toThrow(/cannot record MP4/)
  })

  it('records nothing at all when handed no render callback', async () => {
    vi.stubGlobal('MediaRecorder', undefined)

    await expect(recordMp4(streamSource, 0)).rejects.toThrow(MotionError)
  })
})
