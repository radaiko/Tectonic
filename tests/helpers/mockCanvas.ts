/**
 * Recording stand-in for CanvasRenderingContext2D. jsdom has no 2D context, and
 * the renderer's observable output *is* its command stream, so tests assert on
 * the recorded calls and property assignments.
 */
export interface RecordedCall {
  readonly method: string
  readonly args: readonly unknown[]
}

const METHODS = [
  'save',
  'restore',
  'setTransform',
  'resetTransform',
  'scale',
  'translate',
  'rotate',
  'clearRect',
  'fillRect',
  'strokeRect',
  'beginPath',
  'closePath',
  'moveTo',
  'lineTo',
  'arc',
  'ellipse',
  'rect',
  'quadraticCurveTo',
  'bezierCurveTo',
  'stroke',
  'fill',
  'setLineDash',
  'fillText',
  'strokeText',
] as const

const PROPERTIES = [
  'fillStyle',
  'strokeStyle',
  'lineWidth',
  'lineCap',
  'lineJoin',
  'font',
  'textAlign',
  'textBaseline',
  'globalAlpha',
] as const

export class CanvasRecorder {
  readonly calls: RecordedCall[] = []
  readonly assignments: { name: string; value: unknown }[] = []
  readonly context: CanvasRenderingContext2D

  constructor() {
    const target: Record<string, unknown> = {}

    for (const method of METHODS) {
      target[method] = (...args: unknown[]): void => {
        this.calls.push({ method, args })
      }
    }
    target.measureText = (text: string): TextMetrics =>
      ({ width: text.length * 6 }) as TextMetrics

    for (const property of PROPERTIES) {
      let current: unknown = ''
      Object.defineProperty(target, property, {
        get: () => current,
        set: (value: unknown) => {
          current = value
          this.assignments.push({ name: property, value })
        },
      })
    }

    this.context = target as unknown as CanvasRenderingContext2D
  }

  callsTo(method: string): RecordedCall[] {
    return this.calls.filter((call) => call.method === method)
  }

  countOf(method: string): number {
    return this.callsTo(method).length
  }

  /** Every value assigned to a context property, in order. */
  valuesOf(property: string): unknown[] {
    return this.assignments.filter((entry) => entry.name === property).map((entry) => entry.value)
  }

  textsDrawn(): string[] {
    return this.callsTo('fillText').map((call) => String(call.args[0]))
  }
}

const recorders = new WeakMap<HTMLCanvasElement, CanvasRecorder>()
let mostRecent: CanvasRecorder | null = null

/**
 * Teaches jsdom's `<canvas>` to hand out a recording 2D context, so components
 * that draw can be rendered in tests (and stop logging "not implemented").
 * One recorder per canvas element, so repeated renders accumulate on it.
 */
export function installCanvas2dMock(): void {
  function getContext(this: HTMLCanvasElement, kind: string): unknown {
    if (kind !== '2d') return null
    let recorder = recorders.get(this)
    if (!recorder) {
      recorder = new CanvasRecorder()
      recorders.set(this, recorder)
    }
    mostRecent = recorder
    return recorder.context
  }

  HTMLCanvasElement.prototype.getContext = getContext as unknown as typeof
    HTMLCanvasElement.prototype.getContext
}

export function canvasRecorderFor(canvas: HTMLCanvasElement): CanvasRecorder | undefined {
  return recorders.get(canvas)
}

export function latestCanvasRecorder(): CanvasRecorder | null {
  return mostRecent
}
