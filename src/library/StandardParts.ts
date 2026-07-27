import type { IKernel, ShapeHandle, Vec2 } from '../kernel/IKernel'
import {
  centroid,
  counterClockwise,
  discSegmentPoints,
  obroundPoints,
  rectanglePoints,
  regularPolygonAcrossFlats,
  signedArea,
  toothedPoints,
} from './polygon'
import { LibraryError, STEEL_DENSITY } from './types'
import type { PartStandard } from './types'

/** The shelves of the hardware catalogue. */
export const PART_CATEGORIES = [
  'bolt',
  'nut',
  'washer',
  'screw',
  'bearing',
  'pin',
  'key',
] as const
export type PartCategory = (typeof PART_CATEGORIES)[number]

/* -------------------------------------------------------------------------- */
/* Geometry description                                                        */
/* -------------------------------------------------------------------------- */

export type BooleanOp = 'add' | 'subtract'

/**
 * A body of revolution about the part's Z axis. The profile is given in the
 * half-plane as `{ x: radius, y: axial }`, which is how a fastener is
 * dimensioned in the first place.
 */
export interface RevolveFeature {
  readonly kind: 'revolve'
  readonly op: BooleanOp
  readonly profile: readonly Vec2[]
}

/** A profile in XY swept along Z, from `from` to `to`. */
export interface PrismFeature {
  readonly kind: 'prism'
  readonly op: BooleanOp
  readonly profile: readonly Vec2[]
  readonly from: number
  readonly to: number
}

export type PartFeature = RevolveFeature | PrismFeature

/**
 * A part as a recipe rather than a mesh: an ordered list of solids to add and
 * subtract. Nothing is tessellated until a kernel is handed the recipe, so a
 * catalogue of thousands of sizes costs only its parameter tables.
 */
export interface PartSolid {
  readonly features: readonly PartFeature[]
}

export type PartValues = Readonly<Record<string, number>>

export interface PartParameter {
  readonly key: string
  readonly label: string
  readonly unit: 'mm' | 'deg' | ''
  /** Whether the size table drives this, or the user is expected to set it. */
  readonly driven?: boolean
}

/** One catalogue size: the parameter values that make an M8, a 6204, a 5×5 key. */
export interface PartSize {
  readonly size: string
  readonly values: PartValues
}

export interface PartFamily {
  readonly id: string
  readonly name: string
  readonly category: PartCategory
  readonly standard: PartStandard
  readonly description: string
  readonly parameters: readonly PartParameter[]
  readonly sizes: readonly PartSize[]
  /**
   * Where the part's origin sits, so an assembly knows what it is mating to.
   * Fasteners put z = 0 on the bearing face, with the head above and the shank
   * below; rings and bearings start at z = 0 and run up.
   */
  readonly origin: string
  readonly build: (values: PartValues) => PartSolid
}

/* -------------------------------------------------------------------------- */
/* Recipe helpers                                                              */
/* -------------------------------------------------------------------------- */

function revolve(profile: readonly Vec2[], op: BooleanOp = 'add'): RevolveFeature {
  return { kind: 'revolve', op, profile: counterClockwise(profile) }
}

function prism(
  profile: readonly Vec2[],
  from: number,
  to: number,
  op: BooleanOp = 'add',
): PrismFeature {
  return {
    kind: 'prism',
    op,
    profile: counterClockwise(profile),
    from: Math.min(from, to),
    to: Math.max(from, to),
  }
}

/** A plain cylinder about the Z axis, between two heights. */
function cylinder(radius: number, from: number, to: number, op: BooleanOp = 'add'): RevolveFeature {
  return revolve(
    [
      { x: 0, y: from },
      { x: radius, y: from },
      { x: radius, y: to },
      { x: 0, y: to },
    ],
    op,
  )
}

/** A ring about the Z axis — a washer, a bearing race, a spacer. */
function annulus(
  innerRadius: number,
  outerRadius: number,
  from: number,
  to: number,
  op: BooleanOp = 'add',
): RevolveFeature {
  return revolve(
    [
      { x: innerRadius, y: from },
      { x: outerRadius, y: from },
      { x: outerRadius, y: to },
      { x: innerRadius, y: to },
    ],
    op,
  )
}

/**
 * The shank of a fastener, hanging below the bearing face: full diameter for
 * the plain length, then the thread drawn at its pitch diameter, which is what
 * a cosmetic thread looks like and what a clearance check should see.
 */
function shank(diameter: number, length: number, threadLength: number, pitch: number): RevolveFeature {
  const radius = diameter / 2
  const threaded = Math.max(0, Math.min(threadLength, length))
  const threadRadius = Math.max(0.1, radius - 0.6495 * pitch)

  if (threaded >= length) return cylinder(threadRadius, -length, 0)
  return revolve([
    { x: 0, y: -length },
    { x: threadRadius, y: -length },
    { x: threadRadius, y: -length + threaded },
    { x: radius, y: -length + threaded },
    { x: radius, y: 0 },
    { x: 0, y: 0 },
  ])
}

/** A hexagon socket sunk into the top of a head. */
function hexSocket(acrossFlats: number, top: number, depth: number): PrismFeature {
  return prism(regularPolygonAcrossFlats(acrossFlats, 6), top - depth, top + 0.01, 'subtract')
}

/** A dome, as a quarter-ellipse revolved — a button or pan head. */
function dome(radius: number, height: number, segments = 8): Vec2[] {
  const points: Vec2[] = [{ x: 0, y: 0 }]
  for (let index = 0; index <= segments; index += 1) {
    const phi = (index / segments) * (Math.PI / 2)
    points.push({ x: Math.cos(phi) * radius, y: Math.sin(phi) * height })
  }
  return points
}

function value(values: PartValues, key: string): number {
  const found = values[key]
  if (found === undefined || !Number.isFinite(found)) {
    throw new LibraryError(`Missing parameter "${key}"`)
  }
  return found
}

/* -------------------------------------------------------------------------- */
/* Parameter definitions                                                       */
/* -------------------------------------------------------------------------- */

const MM = (key: string, label: string, driven = true): PartParameter => ({
  key,
  label,
  unit: 'mm',
  driven,
})

const THREAD = [
  MM('diameter', 'Nominal diameter'),
  MM('pitch', 'Thread pitch'),
  MM('length', 'Shank length', false),
  MM('threadLength', 'Threaded length', false),
]

/**
 * Coarse metric thread sizes, with the head, nut and washer dimensions that go
 * with them. Every metric family below picks the columns it needs out of this,
 * so an M8 hex bolt and an M8 washer can never disagree about what M8 means.
 */
const METRIC = [
  // d, pitch, hexAF, headHeight, nutHeight, socketAF, defaultLength, threadLength
  [3, 0.5, 5.5, 2.0, 2.4, 2.5, 16, 12],
  [4, 0.7, 7, 2.8, 3.2, 3, 20, 14],
  [5, 0.8, 8, 3.5, 4.7, 4, 25, 16],
  [6, 1.0, 10, 4.0, 5.2, 5, 30, 18],
  [8, 1.25, 13, 5.3, 6.8, 6, 40, 22],
  [10, 1.5, 16, 6.4, 8.4, 8, 50, 26],
  [12, 1.75, 18, 7.5, 10.8, 10, 60, 30],
  [16, 2.0, 24, 10.0, 14.8, 14, 80, 38],
  [20, 2.5, 30, 12.5, 18.0, 17, 100, 46],
  [24, 3.0, 36, 15.0, 21.5, 19, 120, 54],
] as const

/** Washer dimensions by nominal bolt size, ISO 7089. */
const WASHERS = [
  // d, inner, outer, thickness
  [3, 3.2, 7, 0.5],
  [4, 4.3, 9, 0.8],
  [5, 5.3, 10, 1.0],
  [6, 6.4, 12, 1.6],
  [8, 8.4, 16, 1.6],
  [10, 10.5, 20, 2.0],
  [12, 13, 24, 2.5],
  [16, 17, 30, 3.0],
  [20, 21, 37, 3.0],
  [24, 25, 44, 4.0],
] as const

function metricSizes(
  pick: (row: (typeof METRIC)[number]) => PartValues,
): readonly PartSize[] {
  return METRIC.map((row) => ({ size: `M${row[0]}`, values: pick(row) }))
}

function washerSizes(pick: (row: (typeof WASHERS)[number]) => PartValues): readonly PartSize[] {
  return WASHERS.map((row) => ({ size: `M${row[0]}`, values: pick(row) }))
}

/* -------------------------------------------------------------------------- */
/* Bolts                                                                       */
/* -------------------------------------------------------------------------- */

const HEX_BOLT: PartFamily = {
  id: 'hex-bolt',
  name: 'Hex head bolt',
  category: 'bolt',
  standard: 'ISO',
  description: 'ISO 4014 / DIN 931 partially threaded hexagon head bolt.',
  origin: 'Bearing face of the head at z = 0; head above, shank below.',
  parameters: [...THREAD, MM('headAcrossFlats', 'Across flats'), MM('headHeight', 'Head height')],
  sizes: metricSizes((row) => ({
    diameter: row[0],
    pitch: row[1],
    headAcrossFlats: row[2],
    headHeight: row[3],
    length: row[6],
    threadLength: row[7],
  })),
  build: (values) => ({
    features: [
      prism(
        regularPolygonAcrossFlats(value(values, 'headAcrossFlats'), 6),
        0,
        value(values, 'headHeight'),
      ),
      shank(
        value(values, 'diameter'),
        value(values, 'length'),
        value(values, 'threadLength'),
        value(values, 'pitch'),
      ),
    ],
  }),
}

const SOCKET_HEAD_CAP: PartFamily = {
  id: 'socket-head-cap-screw',
  name: 'Socket head cap screw',
  category: 'bolt',
  standard: 'ISO',
  description: 'ISO 4762 / DIN 912 hexagon socket head cap screw.',
  origin: 'Bearing face of the head at z = 0; head above, shank below.',
  parameters: [
    ...THREAD,
    MM('headDiameter', 'Head diameter'),
    MM('headHeight', 'Head height'),
    MM('socketAcrossFlats', 'Socket size'),
  ],
  sizes: metricSizes((row) => ({
    diameter: row[0],
    pitch: row[1],
    // ISO 4762 heads run 1.5 d across and one diameter tall.
    headDiameter: Math.round(row[0] * 1.5 * 10) / 10,
    headHeight: row[0],
    socketAcrossFlats: row[5],
    length: row[6],
    threadLength: row[7],
  })),
  build: (values) => ({
    features: [
      cylinder(value(values, 'headDiameter') / 2, 0, value(values, 'headHeight')),
      hexSocket(
        value(values, 'socketAcrossFlats'),
        value(values, 'headHeight'),
        value(values, 'headHeight') * 0.6,
      ),
      shank(
        value(values, 'diameter'),
        value(values, 'length'),
        value(values, 'threadLength'),
        value(values, 'pitch'),
      ),
    ],
  }),
}

const BUTTON_HEAD: PartFamily = {
  id: 'button-head-screw',
  name: 'Button head screw',
  category: 'bolt',
  standard: 'ISO',
  description: 'ISO 7380 hexagon socket button head screw.',
  origin: 'Bearing face of the head at z = 0; head above, shank below.',
  parameters: [
    ...THREAD,
    MM('headDiameter', 'Head diameter'),
    MM('headHeight', 'Head height'),
    MM('socketAcrossFlats', 'Socket size'),
  ],
  sizes: (
    [
      [3, 0.5, 5.7, 1.65, 2, 10, 10],
      [4, 0.7, 7.6, 2.2, 2.5, 12, 12],
      [5, 0.8, 9.5, 2.75, 3, 16, 16],
      [6, 1.0, 10.5, 3.3, 4, 20, 18],
      [8, 1.25, 14, 4.4, 5, 25, 22],
      [10, 1.5, 17.5, 5.5, 6, 30, 26],
      [12, 1.75, 21, 6.6, 8, 35, 30],
    ] as const
  ).map(([d, pitch, headDiameter, headHeight, socket, length, threadLength]) => ({
    size: `M${d}`,
    values: {
      diameter: d,
      pitch,
      headDiameter,
      headHeight,
      socketAcrossFlats: socket,
      length,
      threadLength,
    },
  })),
  build: (values) => ({
    features: [
      revolve(dome(value(values, 'headDiameter') / 2, value(values, 'headHeight'))),
      hexSocket(
        value(values, 'socketAcrossFlats'),
        value(values, 'headHeight') * 0.9,
        value(values, 'headHeight') * 0.5,
      ),
      shank(
        value(values, 'diameter'),
        value(values, 'length'),
        value(values, 'threadLength'),
        value(values, 'pitch'),
      ),
    ],
  }),
}

const COUNTERSUNK: PartFamily = {
  id: 'countersunk-screw',
  name: 'Countersunk socket screw',
  category: 'bolt',
  standard: 'ISO',
  description: 'ISO 10642 hexagon socket countersunk head screw, 90° head.',
  origin: 'Where the cone meets the shank at z = 0; head above, shank below.',
  parameters: [
    ...THREAD,
    MM('headDiameter', 'Head diameter'),
    MM('headHeight', 'Head height'),
    MM('socketAcrossFlats', 'Socket size'),
    { key: 'headAngle', label: 'Head angle', unit: 'deg' },
  ],
  sizes: (
    [
      [3, 0.5, 6.72, 1.86, 2, 12, 12],
      [4, 0.7, 8.96, 2.48, 2.5, 16, 14],
      [5, 0.8, 11.2, 3.1, 3, 20, 16],
      [6, 1.0, 13.44, 3.72, 4, 25, 18],
      [8, 1.25, 17.92, 4.96, 5, 30, 22],
      [10, 1.5, 22.4, 6.2, 6, 40, 26],
      [12, 1.75, 26.88, 7.44, 8, 50, 30],
    ] as const
  ).map(([d, pitch, headDiameter, headHeight, socket, length, threadLength]) => ({
    size: `M${d}`,
    values: {
      diameter: d,
      pitch,
      headDiameter,
      headHeight,
      socketAcrossFlats: socket,
      headAngle: 90,
      length,
      threadLength,
    },
  })),
  build: (values) => ({
    features: [
      revolve([
        { x: 0, y: 0 },
        { x: value(values, 'diameter') / 2, y: 0 },
        { x: value(values, 'headDiameter') / 2, y: value(values, 'headHeight') },
        { x: 0, y: value(values, 'headHeight') },
      ]),
      hexSocket(
        value(values, 'socketAcrossFlats'),
        value(values, 'headHeight'),
        value(values, 'headHeight') * 0.6,
      ),
      shank(
        value(values, 'diameter'),
        value(values, 'length'),
        value(values, 'threadLength'),
        value(values, 'pitch'),
      ),
    ],
  }),
}

/* -------------------------------------------------------------------------- */
/* Nuts                                                                        */
/* -------------------------------------------------------------------------- */

/** Tapped bore, drawn at the pitch diameter like every other cosmetic thread. */
function tappedBore(diameter: number, pitch: number, from: number, to: number): RevolveFeature {
  return cylinder(Math.max(0.1, diameter / 2 - 0.6495 * pitch), from - 0.01, to + 0.01, 'subtract')
}

const HEX_NUT: PartFamily = {
  id: 'hex-nut',
  name: 'Hex nut',
  category: 'nut',
  standard: 'ISO',
  description: 'ISO 4032 / DIN 934 hexagon nut.',
  origin: 'Bearing face at z = 0, nut above.',
  parameters: [
    MM('diameter', 'Nominal diameter'),
    MM('pitch', 'Thread pitch'),
    MM('acrossFlats', 'Across flats'),
    MM('height', 'Height'),
  ],
  sizes: metricSizes((row) => ({
    diameter: row[0],
    pitch: row[1],
    acrossFlats: row[2],
    height: row[4],
  })),
  build: (values) => ({
    features: [
      prism(regularPolygonAcrossFlats(value(values, 'acrossFlats'), 6), 0, value(values, 'height')),
      tappedBore(value(values, 'diameter'), value(values, 'pitch'), 0, value(values, 'height')),
    ],
  }),
}

const NYLOCK_NUT: PartFamily = {
  id: 'nylock-nut',
  name: 'Nylon insert lock nut',
  category: 'nut',
  standard: 'ISO',
  description: 'ISO 7040 / DIN 985 prevailing torque nut with a nylon collar.',
  origin: 'Bearing face at z = 0, nut above with the collar on top.',
  parameters: [
    MM('diameter', 'Nominal diameter'),
    MM('pitch', 'Thread pitch'),
    MM('acrossFlats', 'Across flats'),
    MM('height', 'Hexagon height'),
    MM('collarHeight', 'Collar height'),
  ],
  sizes: metricSizes((row) => ({
    diameter: row[0],
    pitch: row[1],
    acrossFlats: row[2],
    height: row[4],
    collarHeight: Math.round(row[4] * 0.45 * 10) / 10,
  })),
  build: (values) => {
    const height = value(values, 'height')
    const collar = value(values, 'collarHeight')
    return {
      features: [
        prism(regularPolygonAcrossFlats(value(values, 'acrossFlats'), 6), 0, height),
        // The collar is round and sits inside the hexagon's inscribed circle.
        cylinder(value(values, 'acrossFlats') / 2, height, height + collar),
        // The insert is not tapped, so only the hexagon is bored through.
        tappedBore(value(values, 'diameter'), value(values, 'pitch'), 0, height),
        cylinder(value(values, 'diameter') / 2, height, height + collar + 0.01, 'subtract'),
      ],
    }
  },
}

const FLANGE_NUT: PartFamily = {
  id: 'flange-nut',
  name: 'Flange nut',
  category: 'nut',
  standard: 'DIN',
  description: 'DIN 6923 hexagon nut with a conical bearing flange.',
  origin: 'Underside of the flange at z = 0.',
  parameters: [
    MM('diameter', 'Nominal diameter'),
    MM('pitch', 'Thread pitch'),
    MM('acrossFlats', 'Across flats'),
    MM('height', 'Hexagon height'),
    MM('flangeDiameter', 'Flange diameter'),
    MM('flangeHeight', 'Flange height'),
  ],
  sizes: metricSizes((row) => ({
    diameter: row[0],
    pitch: row[1],
    acrossFlats: row[2],
    height: row[4],
    flangeDiameter: Math.round(row[2] * 1.35 * 10) / 10,
    flangeHeight: Math.round(row[0] * 0.28 * 10) / 10,
  })),
  build: (values) => {
    const flangeHeight = value(values, 'flangeHeight')
    const height = value(values, 'height')
    return {
      features: [
        revolve([
          { x: 0, y: 0 },
          { x: value(values, 'flangeDiameter') / 2, y: 0 },
          { x: value(values, 'flangeDiameter') / 2, y: flangeHeight * 0.4 },
          { x: value(values, 'acrossFlats') / 2, y: flangeHeight },
          { x: 0, y: flangeHeight },
        ]),
        prism(
          regularPolygonAcrossFlats(value(values, 'acrossFlats'), 6),
          flangeHeight,
          flangeHeight + height,
        ),
        tappedBore(
          value(values, 'diameter'),
          value(values, 'pitch'),
          0,
          flangeHeight + height,
        ),
      ],
    }
  },
}

const WING_NUT: PartFamily = {
  id: 'wing-nut',
  name: 'Wing nut',
  category: 'nut',
  standard: 'DIN',
  description: 'DIN 315 wing nut, tightened by hand.',
  origin: 'Bearing face at z = 0, body and wings above.',
  parameters: [
    MM('diameter', 'Nominal diameter'),
    MM('pitch', 'Thread pitch'),
    MM('bodyDiameter', 'Body diameter'),
    MM('bodyHeight', 'Body height'),
    MM('wingSpan', 'Across the wings'),
    MM('wingThickness', 'Wing thickness'),
    MM('wingHeight', 'Wing height'),
  ],
  sizes: METRIC.slice(0, 7).map((row) => ({
    size: `M${row[0]}`,
    values: {
      diameter: row[0],
      pitch: row[1],
      bodyDiameter: row[2],
      bodyHeight: row[4] * 1.4,
      wingSpan: row[2] * 2.6,
      wingThickness: row[0] * 0.5,
      wingHeight: row[0] * 1.8,
    },
  })),
  build: (values) => {
    const bodyHeight = value(values, 'bodyHeight')
    const wingHeight = value(values, 'wingHeight')
    return {
      features: [
        cylinder(value(values, 'bodyDiameter') / 2, 0, bodyHeight),
        prism(
          rectanglePoints(value(values, 'wingSpan'), value(values, 'wingThickness')),
          bodyHeight * 0.35,
          bodyHeight * 0.35 + wingHeight,
        ),
        tappedBore(
          value(values, 'diameter'),
          value(values, 'pitch'),
          0,
          bodyHeight * 0.35 + wingHeight,
        ),
      ],
    }
  },
}

/* -------------------------------------------------------------------------- */
/* Washers                                                                     */
/* -------------------------------------------------------------------------- */

const FLAT_WASHER: PartFamily = {
  id: 'flat-washer',
  name: 'Flat washer',
  category: 'washer',
  standard: 'ISO',
  description: 'ISO 7089 plain washer, product grade A.',
  origin: 'Underside at z = 0.',
  parameters: [
    MM('diameter', 'Nominal bolt size'),
    MM('innerDiameter', 'Inside diameter'),
    MM('outerDiameter', 'Outside diameter'),
    MM('thickness', 'Thickness'),
  ],
  sizes: washerSizes((row) => ({
    diameter: row[0],
    innerDiameter: row[1],
    outerDiameter: row[2],
    thickness: row[3],
  })),
  build: (values) => ({
    features: [
      annulus(
        value(values, 'innerDiameter') / 2,
        value(values, 'outerDiameter') / 2,
        0,
        value(values, 'thickness'),
      ),
    ],
  }),
}

const SPRING_WASHER: PartFamily = {
  id: 'spring-washer',
  name: 'Spring washer',
  category: 'washer',
  standard: 'DIN',
  description: 'DIN 127 B split spring lock washer, drawn as a coned ring.',
  origin: 'Inner edge of the underside at z = 0.',
  parameters: [
    MM('diameter', 'Nominal bolt size'),
    MM('innerDiameter', 'Inside diameter'),
    MM('outerDiameter', 'Outside diameter'),
    MM('thickness', 'Section thickness'),
    MM('lift', 'Free height above flat'),
  ],
  sizes: washerSizes((row) => ({
    diameter: row[0],
    innerDiameter: row[1],
    outerDiameter: row[0] * 1.75,
    thickness: Math.round(row[0] * 0.25 * 10) / 10,
    lift: Math.round(row[0] * 0.22 * 10) / 10,
  })),
  build: (values) => {
    const thickness = value(values, 'thickness')
    const lift = value(values, 'lift')
    return {
      features: [
        revolve([
          { x: value(values, 'innerDiameter') / 2, y: 0 },
          { x: value(values, 'outerDiameter') / 2, y: lift },
          { x: value(values, 'outerDiameter') / 2, y: lift + thickness },
          { x: value(values, 'innerDiameter') / 2, y: thickness },
        ]),
      ],
    }
  },
}

const LOCK_WASHER: PartFamily = {
  id: 'lock-washer',
  name: 'External tooth lock washer',
  category: 'washer',
  standard: 'DIN',
  description: 'DIN 6797 A serrated lock washer with external teeth.',
  origin: 'Underside at z = 0.',
  parameters: [
    MM('diameter', 'Nominal bolt size'),
    MM('innerDiameter', 'Inside diameter'),
    MM('outerDiameter', 'Outside diameter'),
    MM('thickness', 'Thickness'),
    { key: 'teeth', label: 'Teeth', unit: '' },
  ],
  sizes: washerSizes((row) => ({
    diameter: row[0],
    innerDiameter: row[1],
    outerDiameter: row[2],
    thickness: Math.max(0.4, Math.round(row[3] * 0.6 * 10) / 10),
    teeth: row[0] < 6 ? 8 : row[0] < 12 ? 10 : 12,
  })),
  build: (values) => ({
    features: [
      prism(
        toothedPoints(
          value(values, 'outerDiameter') / 2,
          value(values, 'outerDiameter') / 2 - value(values, 'diameter') * 0.25,
          Math.round(value(values, 'teeth')),
        ),
        0,
        value(values, 'thickness'),
      ),
      cylinder(value(values, 'innerDiameter') / 2, -0.01, value(values, 'thickness') + 0.01, 'subtract'),
    ],
  }),
}

/* -------------------------------------------------------------------------- */
/* Screws                                                                      */
/* -------------------------------------------------------------------------- */

/** A slotted pan head, with the drive slot already taken out of it. */
function panHead(headDiameter: number, headHeight: number, slotWidth: number): PartFeature[] {
  return [
    revolve([
      { x: 0, y: 0 },
      { x: headDiameter / 2, y: 0 },
      { x: headDiameter / 2, y: headHeight * 0.45 },
      { x: headDiameter * 0.35, y: headHeight },
      { x: 0, y: headHeight },
    ]),
    prism(
      rectanglePoints(headDiameter * 1.1, slotWidth),
      headHeight * 0.45,
      headHeight + 0.01,
      'subtract',
    ),
  ]
}

const MACHINE_SCREW: PartFamily = {
  id: 'machine-screw',
  name: 'Slotted pan head machine screw',
  category: 'screw',
  standard: 'ISO',
  description: 'ISO 1580 slotted pan head machine screw, fully threaded.',
  origin: 'Bearing face of the head at z = 0; head above, shank below.',
  parameters: [
    ...THREAD,
    MM('headDiameter', 'Head diameter'),
    MM('headHeight', 'Head height'),
    MM('slotWidth', 'Slot width'),
  ],
  sizes: METRIC.slice(0, 7).map((row) => ({
    size: `M${row[0]}`,
    values: {
      diameter: row[0],
      pitch: row[1],
      headDiameter: Math.round(row[0] * 1.9 * 10) / 10,
      headHeight: Math.round(row[0] * 0.6 * 10) / 10,
      slotWidth: Math.round(row[0] * 0.18 * 10) / 10,
      length: row[6] / 2,
      threadLength: row[6] / 2,
    },
  })),
  build: (values) => ({
    features: [
      ...panHead(
        value(values, 'headDiameter'),
        value(values, 'headHeight'),
        value(values, 'slotWidth'),
      ),
      shank(
        value(values, 'diameter'),
        value(values, 'length'),
        value(values, 'threadLength'),
        value(values, 'pitch'),
      ),
    ],
  }),
}

const SELF_TAPPING_SCREW: PartFamily = {
  id: 'self-tapping-screw',
  name: 'Self-tapping screw',
  category: 'screw',
  standard: 'ISO',
  description: 'ISO 1481 slotted pan head tapping screw with a tapered point.',
  origin: 'Bearing face of the head at z = 0; head above, shank below.',
  parameters: [
    MM('diameter', 'Nominal diameter'),
    MM('pitch', 'Thread pitch'),
    MM('length', 'Shank length', false),
    MM('headDiameter', 'Head diameter'),
    MM('headHeight', 'Head height'),
    MM('slotWidth', 'Slot width'),
    MM('pointLength', 'Point length'),
  ],
  sizes: (
    [
      [2.2, 0.8, 9.5, 4.2, 1.6, 0.5],
      [2.9, 1.1, 13, 5.6, 2.1, 0.8],
      [3.5, 1.3, 16, 6.9, 2.5, 1.0],
      [3.9, 1.3, 19, 7.5, 2.8, 1.0],
      [4.2, 1.4, 22, 8.2, 3.1, 1.2],
      [4.8, 1.6, 25, 9.5, 3.6, 1.2],
      [5.5, 1.8, 32, 10.9, 4.1, 1.6],
      [6.3, 1.8, 38, 12.5, 4.6, 1.6],
    ] as const
  ).map(([d, pitch, length, headDiameter, headHeight, slotWidth]) => ({
    size: `ST${d}`,
    values: {
      diameter: d,
      pitch,
      length,
      headDiameter,
      headHeight,
      slotWidth,
      pointLength: d * 2,
    },
  })),
  build: (values) => {
    const diameter = value(values, 'diameter')
    const length = value(values, 'length')
    const point = Math.min(value(values, 'pointLength'), length)
    const threadRadius = Math.max(0.1, diameter / 2 - 0.6495 * value(values, 'pitch'))
    return {
      features: [
        ...panHead(
          value(values, 'headDiameter'),
          value(values, 'headHeight'),
          value(values, 'slotWidth'),
        ),
        revolve([
          { x: 0, y: -length },
          { x: threadRadius, y: -length + point },
          { x: threadRadius, y: 0 },
          { x: 0, y: 0 },
        ]),
      ],
    }
  },
}

const SET_SCREW: PartFamily = {
  id: 'set-screw',
  name: 'Socket set screw',
  category: 'screw',
  standard: 'ISO',
  description: 'ISO 4026 hexagon socket set screw with a flat point.',
  origin: 'Top face at z = 0, screw below.',
  parameters: [
    MM('diameter', 'Nominal diameter'),
    MM('pitch', 'Thread pitch'),
    MM('length', 'Length', false),
    MM('socketAcrossFlats', 'Socket size'),
    MM('socketDepth', 'Socket depth'),
  ],
  sizes: METRIC.slice(0, 8).map((row) => ({
    size: `M${row[0]}`,
    values: {
      diameter: row[0],
      pitch: row[1],
      length: row[0] * 1.5,
      socketAcrossFlats: Math.max(1.5, row[5] * 0.6),
      socketDepth: row[0] * 0.5,
    },
  })),
  build: (values) => {
    const length = value(values, 'length')
    return {
      features: [
        cylinder(
          Math.max(0.1, value(values, 'diameter') / 2 - 0.6495 * value(values, 'pitch')),
          -length,
          0,
        ),
        hexSocket(value(values, 'socketAcrossFlats'), 0, value(values, 'socketDepth')),
      ],
    }
  },
}

/* -------------------------------------------------------------------------- */
/* Bearings                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Rings and a rolling-element band, rather than individual balls or rollers.
 * A library bearing is placed, clearance-checked and drawn — none of which the
 * true element geometry changes — so the recipe stays a body of revolution.
 */
function raceFeatures(
  bore: number,
  outside: number,
  width: number,
  ringFraction: number,
  bandFraction: number,
): PartFeature[] {
  const inner = bore / 2
  const outer = outside / 2
  const ring = (outer - inner) * ringFraction
  const band = width * bandFraction
  return [
    annulus(outer - ring, outer, 0, width),
    annulus(inner, inner + ring, 0, width),
    annulus(inner + ring, outer - ring, (width - band) / 2, (width + band) / 2),
  ]
}

const BEARING_PARAMETERS: readonly PartParameter[] = [
  MM('bore', 'Bore diameter'),
  MM('outside', 'Outside diameter'),
  MM('width', 'Width'),
]

function bearingSizes(
  rows: readonly (readonly [string, number, number, number])[],
): readonly PartSize[] {
  return rows.map(([size, bore, outside, width]) => ({
    size,
    values: { bore, outside, width },
  }))
}

const BALL_BEARING: PartFamily = {
  id: 'ball-bearing',
  name: 'Deep groove ball bearing',
  category: 'bearing',
  standard: 'ISO',
  description: 'ISO 15 deep groove ball bearing, 6000 / 6200 / 6300 series.',
  origin: 'One face at z = 0, bearing above, axis along Z.',
  parameters: BEARING_PARAMETERS,
  sizes: bearingSizes([
    ['6000', 10, 26, 8],
    ['6001', 12, 28, 8],
    ['6002', 15, 32, 9],
    ['6003', 17, 35, 10],
    ['6004', 20, 42, 12],
    ['6005', 25, 47, 12],
    ['6006', 30, 55, 13],
    ['6200', 10, 30, 9],
    ['6201', 12, 32, 10],
    ['6202', 15, 35, 11],
    ['6203', 17, 40, 12],
    ['6204', 20, 47, 14],
    ['6205', 25, 52, 15],
    ['6206', 30, 62, 16],
    ['6300', 10, 35, 11],
    ['6302', 15, 42, 13],
    ['6304', 20, 52, 15],
    ['6306', 30, 72, 19],
  ]),
  build: (values) => ({
    features: raceFeatures(
      value(values, 'bore'),
      value(values, 'outside'),
      value(values, 'width'),
      0.3,
      0.55,
    ),
  }),
}

const ROLLER_BEARING: PartFamily = {
  id: 'roller-bearing',
  name: 'Cylindrical roller bearing',
  category: 'bearing',
  standard: 'ISO',
  description: 'NU 2 series cylindrical roller bearing.',
  origin: 'One face at z = 0, bearing above, axis along Z.',
  parameters: BEARING_PARAMETERS,
  sizes: bearingSizes([
    ['NU204', 20, 47, 14],
    ['NU205', 25, 52, 15],
    ['NU206', 30, 62, 16],
    ['NU207', 35, 72, 17],
    ['NU208', 40, 80, 18],
    ['NU210', 50, 90, 20],
  ]),
  build: (values) => ({
    features: raceFeatures(
      value(values, 'bore'),
      value(values, 'outside'),
      value(values, 'width'),
      0.28,
      0.8,
    ),
  }),
}

const THRUST_BEARING: PartFamily = {
  id: 'thrust-bearing',
  name: 'Thrust ball bearing',
  category: 'bearing',
  standard: 'ISO',
  description: 'ISO 104 single direction thrust ball bearing, 511 series.',
  origin: 'Housing washer face at z = 0, shaft washer on top.',
  parameters: BEARING_PARAMETERS,
  sizes: bearingSizes([
    ['51100', 10, 24, 9],
    ['51101', 12, 26, 9],
    ['51102', 15, 28, 9],
    ['51103', 17, 30, 9],
    ['51104', 20, 35, 10],
    ['51105', 25, 42, 11],
    ['51106', 30, 47, 11],
    ['51108', 40, 60, 13],
  ]),
  build: (values) => {
    const bore = value(values, 'bore') / 2
    const outer = value(values, 'outside') / 2
    const height = value(values, 'width')
    const washer = height * 0.32
    return {
      features: [
        annulus(bore, outer, 0, washer),
        annulus(bore, outer, height - washer, height),
        // The ball band, drawn as a ring at the pitch radius.
        annulus(bore + (outer - bore) * 0.25, outer - (outer - bore) * 0.25, washer, height - washer),
      ],
    }
  },
}

const NEEDLE_BEARING: PartFamily = {
  id: 'needle-bearing',
  name: 'Needle roller bearing',
  category: 'bearing',
  standard: 'ISO',
  description: 'HK series drawn cup needle roller bearing.',
  origin: 'One face at z = 0, bearing above, axis along Z.',
  parameters: BEARING_PARAMETERS,
  sizes: bearingSizes([
    ['HK0808', 8, 12, 8],
    ['HK1010', 10, 14, 10],
    ['HK1210', 12, 16, 10],
    ['HK1512', 15, 21, 12],
    ['HK2020', 20, 26, 20],
    ['HK2516', 25, 32, 16],
  ]),
  build: (values) => {
    const bore = value(values, 'bore') / 2
    const outer = value(values, 'outside') / 2
    const width = value(values, 'width')
    const shell = (outer - bore) * 0.25
    return {
      features: [
        annulus(outer - shell, outer, 0, width),
        annulus(bore, outer - shell, width * 0.08, width * 0.92),
      ],
    }
  },
}

/* -------------------------------------------------------------------------- */
/* Pins                                                                        */
/* -------------------------------------------------------------------------- */

const DOWEL_PIN: PartFamily = {
  id: 'dowel-pin',
  name: 'Dowel pin',
  category: 'pin',
  standard: 'ISO',
  description: 'ISO 2338 parallel dowel pin with chamfered ends.',
  origin: 'One end at z = 0, pin above, axis along Z.',
  parameters: [MM('diameter', 'Diameter'), MM('length', 'Length', false), MM('chamfer', 'Chamfer')],
  sizes: (
    [
      [2, 10],
      [3, 16],
      [4, 20],
      [5, 24],
      [6, 30],
      [8, 40],
      [10, 50],
      [12, 60],
      [16, 80],
      [20, 100],
    ] as const
  ).map(([diameter, length]) => ({
    size: `${diameter}×${length}`,
    values: { diameter, length, chamfer: Math.round(diameter * 0.12 * 100) / 100 },
  })),
  build: (values) => {
    const radius = value(values, 'diameter') / 2
    const length = value(values, 'length')
    const chamfer = Math.min(value(values, 'chamfer'), radius / 2, length / 2)
    return {
      features: [
        revolve([
          { x: 0, y: 0 },
          { x: radius - chamfer, y: 0 },
          { x: radius, y: chamfer },
          { x: radius, y: length - chamfer },
          { x: radius - chamfer, y: length },
          { x: 0, y: length },
        ]),
      ],
    }
  },
}

const CLEVIS_PIN: PartFamily = {
  id: 'clevis-pin',
  name: 'Clevis pin',
  category: 'pin',
  standard: 'ISO',
  description: 'ISO 2341 clevis pin with a head and a split-pin groove.',
  origin: 'Underside of the head at z = 0; head above, shank below.',
  parameters: [
    MM('diameter', 'Shank diameter'),
    MM('length', 'Shank length', false),
    MM('headDiameter', 'Head diameter'),
    MM('headHeight', 'Head height'),
    MM('grooveOffset', 'Groove from the tip'),
  ],
  sizes: (
    [
      [3, 16],
      [4, 20],
      [5, 25],
      [6, 30],
      [8, 40],
      [10, 50],
      [12, 60],
      [16, 80],
      [20, 100],
    ] as const
  ).map(([diameter, length]) => ({
    size: `${diameter}×${length}`,
    values: {
      diameter,
      length,
      headDiameter: Math.round(diameter * 1.6 * 10) / 10,
      headHeight: Math.round(diameter * 0.35 * 10) / 10,
      grooveOffset: Math.round(diameter * 0.8 * 10) / 10,
    },
  })),
  build: (values) => {
    const radius = value(values, 'diameter') / 2
    const length = value(values, 'length')
    const groove = Math.min(value(values, 'grooveOffset'), length / 2)
    const grooveWidth = Math.max(0.4, radius * 0.25)
    return {
      features: [
        cylinder(value(values, 'headDiameter') / 2, 0, value(values, 'headHeight')),
        cylinder(radius, -length, 0),
        annulus(
          radius - grooveWidth,
          radius + 0.01,
          -length + groove,
          -length + groove + grooveWidth,
          'subtract',
        ),
      ],
    }
  },
}

const COTTER_PIN: PartFamily = {
  id: 'cotter-pin',
  name: 'Split cotter pin',
  category: 'pin',
  standard: 'ISO',
  description: 'ISO 1234 split pin, drawn as its folded double-leg section.',
  origin: 'Underside of the eye at z = 0, legs below, eye above.',
  parameters: [
    MM('diameter', 'Nominal diameter'),
    MM('length', 'Leg length', false),
    MM('eyeWidth', 'Eye width'),
    MM('eyeHeight', 'Eye height'),
  ],
  sizes: (
    [
      [1, 10],
      [1.2, 16],
      [1.6, 20],
      [2, 25],
      [2.5, 32],
      [3.2, 40],
      [4, 50],
      [5, 63],
      [6.3, 80],
      [8, 100],
    ] as const
  ).map(([diameter, length]) => ({
    size: `${diameter}×${length}`,
    values: {
      diameter,
      length,
      eyeWidth: Math.round(diameter * 2.2 * 10) / 10,
      eyeHeight: Math.round(diameter * 0.9 * 10) / 10,
    },
  })),
  build: (values) => {
    const diameter = value(values, 'diameter')
    const eyeHeight = value(values, 'eyeHeight')
    return {
      features: [
        // Two legs side by side make an obround section twice as wide as thick.
        prism(obroundPoints(diameter * 2, diameter), -value(values, 'length'), 0),
        prism(obroundPoints(value(values, 'eyeWidth'), diameter), 0, eyeHeight),
      ],
    }
  },
}

/* -------------------------------------------------------------------------- */
/* Keys                                                                        */
/* -------------------------------------------------------------------------- */

/** Shaft-to-key sizes from DIN 6885-1, shared by the parallel and taper keys. */
const KEY_SIZES = [
  // shaftFrom, shaftTo, width, height, length
  [6, 8, 2, 2, 10],
  [8, 10, 3, 3, 12],
  [10, 12, 4, 4, 14],
  [12, 17, 5, 5, 18],
  [17, 22, 6, 6, 22],
  [22, 30, 8, 7, 28],
  [30, 38, 10, 8, 36],
  [38, 44, 12, 8, 45],
  [44, 50, 14, 9, 50],
  [50, 58, 16, 10, 56],
  [58, 65, 18, 11, 63],
  [65, 75, 20, 12, 70],
] as const

const PARALLEL_KEY: PartFamily = {
  id: 'parallel-key',
  name: 'Parallel key',
  category: 'key',
  standard: 'DIN',
  description: 'DIN 6885 form A parallel key with rounded ends.',
  origin: 'Underside at z = 0; the key runs along X.',
  parameters: [
    MM('width', 'Width b'),
    MM('height', 'Height h'),
    MM('length', 'Length', false),
    MM('shaftFrom', 'Shaft from'),
    MM('shaftTo', 'Shaft to'),
  ],
  sizes: KEY_SIZES.map(([shaftFrom, shaftTo, width, height, length]) => ({
    size: `${width}×${height}×${length}`,
    values: { width, height, length, shaftFrom, shaftTo },
  })),
  build: (values) => ({
    features: [
      prism(
        obroundPoints(value(values, 'length'), value(values, 'width')),
        0,
        value(values, 'height'),
      ),
    ],
  }),
}

const TAPER_KEY: PartFamily = {
  id: 'taper-key',
  name: 'Taper key',
  category: 'key',
  standard: 'DIN',
  description: 'DIN 6886 taper key, 1:100 on the top face.',
  origin: 'Thin end at the origin; the key runs along X, width along Z.',
  parameters: [
    MM('width', 'Width b'),
    MM('height', 'Height h at the thick end'),
    MM('length', 'Length', false),
    { key: 'taper', label: 'Taper (1 : n)', unit: '' },
  ],
  sizes: KEY_SIZES.map(([, , width, height, length]) => ({
    size: `${width}×${height}×${length}`,
    values: { width, height, length, taper: 100 },
  })),
  build: (values) => {
    // Extruded across its width, so the taper shows in the swept profile
    // instead of needing a drafted sweep.
    const length = value(values, 'length')
    const height = value(values, 'height')
    const thin = Math.max(0.1, height - length / value(values, 'taper'))
    return {
      features: [
        prism(
          [
            { x: 0, y: 0 },
            { x: length, y: 0 },
            { x: length, y: height },
            { x: 0, y: thin },
          ],
          0,
          value(values, 'width'),
        ),
      ],
    }
  },
}

const WOODRUFF_KEY: PartFamily = {
  id: 'woodruff-key',
  name: 'Woodruff key',
  category: 'key',
  standard: 'DIN',
  description: 'DIN 6888 Woodruff key, a segment of a disc.',
  origin: 'Centre of the chord at the origin; the key runs along X, width along Z.',
  parameters: [
    MM('width', 'Width b'),
    MM('height', 'Height h'),
    MM('discDiameter', 'Disc diameter'),
  ],
  sizes: (
    [
      [1, 1.4, 4],
      [1.5, 2.6, 7],
      [2, 2.6, 7],
      [2, 3.7, 10],
      [3, 5, 13],
      [4, 6.5, 16],
      [5, 7.5, 19],
      [6, 9, 22],
      [8, 11, 28],
      [10, 13, 32],
    ] as const
  ).map(([width, height, discDiameter]) => ({
    size: `${width}×${height}`,
    values: { width, height, discDiameter },
  })),
  build: (values) => ({
    features: [
      prism(
        discSegmentPoints(value(values, 'discDiameter'), value(values, 'height')),
        0,
        value(values, 'width'),
      ),
    ],
  }),
}

/* -------------------------------------------------------------------------- */
/* The catalogue                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Every hardware family the library knows. Embedded in the bundle as parameter
 * tables — a size is a row of numbers, not a mesh — so the whole catalogue costs
 * a few kilobytes and any size in it can be rebuilt exactly.
 */
export const STANDARD_PARTS: readonly PartFamily[] = [
  HEX_BOLT,
  SOCKET_HEAD_CAP,
  BUTTON_HEAD,
  COUNTERSUNK,
  HEX_NUT,
  NYLOCK_NUT,
  FLANGE_NUT,
  WING_NUT,
  FLAT_WASHER,
  SPRING_WASHER,
  LOCK_WASHER,
  MACHINE_SCREW,
  SELF_TAPPING_SCREW,
  SET_SCREW,
  BALL_BEARING,
  ROLLER_BEARING,
  THRUST_BEARING,
  NEEDLE_BEARING,
  DOWEL_PIN,
  CLEVIS_PIN,
  COTTER_PIN,
  PARALLEL_KEY,
  TAPER_KEY,
  WOODRUFF_KEY,
]

const FAMILIES_BY_ID = new Map(STANDARD_PARTS.map((family) => [family.id, family]))

export function findFamily(id: string): PartFamily | undefined {
  return FAMILIES_BY_ID.get(id)
}

export function requireFamily(id: string): PartFamily {
  const family = findFamily(id)
  if (!family) throw new LibraryError(`No standard part family "${id}"`)
  return family
}

export function familiesByCategory(category: PartCategory): readonly PartFamily[] {
  return STANDARD_PARTS.filter((family) => family.category === category)
}

export function findSize(family: PartFamily, size: string): PartSize | undefined {
  const wanted = size.trim().toLowerCase()
  return family.sizes.find((entry) => entry.size.toLowerCase() === wanted)
}

export function requireSize(family: PartFamily, size: string): PartSize {
  const entry = findSize(family, size)
  if (!entry) throw new LibraryError(`"${family.name}" has no size "${size}"`)
  return entry
}

export interface PartQuery {
  /** Substring of the family name, description or a size, case-insensitively. */
  readonly text?: string
  readonly category?: PartCategory
  readonly standard?: PartStandard
}

export function searchParts(query: PartQuery = {}): readonly PartFamily[] {
  const text = query.text?.trim().toLowerCase() ?? ''
  return STANDARD_PARTS.filter((family) => {
    if (query.category && family.category !== query.category) return false
    if (query.standard && family.standard !== query.standard) return false
    if (text.length === 0) return true
    return (
      family.name.toLowerCase().includes(text) ||
      family.id.includes(text) ||
      family.description.toLowerCase().includes(text) ||
      family.sizes.some((size) => size.size.toLowerCase().includes(text))
    )
  })
}

/**
 * A size's values with any overrides applied — how "an M8 hex bolt, but 55 long"
 * is expressed without inventing a new catalogue entry for it.
 */
export function resolveParameters(
  family: PartFamily,
  size: string,
  overrides: PartValues = {},
): PartValues {
  const known = new Set(family.parameters.map((parameter) => parameter.key))
  const resolved: Record<string, number> = { ...requireSize(family, size).values }

  for (const [key, override] of Object.entries(overrides)) {
    if (!known.has(key)) throw new LibraryError(`"${family.name}" has no parameter "${key}"`)
    if (!Number.isFinite(override)) throw new LibraryError(`Parameter "${key}" needs a number`)
    resolved[key] = override
  }
  return resolved
}

/** The recipe for one part at one size. */
export function partSolid(
  family: PartFamily,
  size: string,
  overrides: PartValues = {},
): PartSolid {
  return family.build(resolveParameters(family, size, overrides))
}

/* -------------------------------------------------------------------------- */
/* Measuring and building                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Volume of a recipe, in mm³, taken from the polygons themselves: prisms by
 * area × height, revolutions by Pappus's theorem. Exact for the polygons we
 * hand the kernel, which is what makes a mass estimate available before
 * anything is tessellated.
 */
export function partVolume(solid: PartSolid): number {
  let volume = 0
  for (const feature of solid.features) {
    const area = Math.abs(signedArea(feature.profile))
    const contribution =
      feature.kind === 'prism'
        ? area * (feature.to - feature.from)
        : 2 * Math.PI * Math.abs(centroid(feature.profile).x) * area
    volume += feature.op === 'add' ? contribution : -contribution
  }
  return Math.max(0, volume)
}

/** Mass of a part in kilograms, at the given density in kg/mm³. */
export function partMass(solid: PartSolid, density = STEEL_DENSITY): number {
  return partVolume(solid) * density
}

/** Axis-aligned extent of a recipe, in the part's own space. */
export function partExtent(solid: PartSolid): {
  readonly radius: number
  readonly min: number
  readonly max: number
} {
  let radius = 0
  let min = Infinity
  let max = -Infinity

  for (const feature of solid.features) {
    if (feature.op === 'subtract') continue
    for (const point of feature.profile) {
      if (feature.kind === 'revolve') {
        radius = Math.max(radius, Math.abs(point.x))
        min = Math.min(min, point.y)
        max = Math.max(max, point.y)
      } else {
        radius = Math.max(radius, Math.hypot(point.x, point.y))
      }
    }
    if (feature.kind === 'prism') {
      min = Math.min(min, feature.from)
      max = Math.max(max, feature.to)
    }
  }
  return {
    radius,
    min: Number.isFinite(min) ? min : 0,
    max: Number.isFinite(max) ? max : 0,
  }
}

/**
 * Turns a recipe into a solid. Features are applied in order, so a subtraction
 * only ever removes what has already been added — which is why every family
 * lists its bores and sockets after the body they go through.
 */
export async function buildStandardPart(
  kernel: IKernel,
  solid: PartSolid,
): Promise<ShapeHandle> {
  const [first, ...rest] = solid.features
  if (!first) throw new LibraryError('A part needs at least one feature')
  if (first.op === 'subtract') throw new LibraryError('A part cannot start with a subtraction')

  let shape = await buildFeature(kernel, first)
  for (const feature of rest) {
    const tool = await buildFeature(kernel, feature)
    shape =
      feature.op === 'add'
        ? await kernel.booleanUnion(shape, tool)
        : await kernel.booleanSubtract(shape, tool)
  }
  return shape
}

async function buildFeature(kernel: IKernel, feature: PartFeature): Promise<ShapeHandle> {
  if (feature.kind === 'prism') {
    return kernel.extrude({
      profile: { points: feature.profile },
      distance: Math.max(1e-6, feature.to - feature.from),
      plane: {
        origin: { x: 0, y: 0, z: feature.from },
        xAxis: { x: 1, y: 0, z: 0 },
        yAxis: { x: 0, y: 1, z: 0 },
      },
    })
  }
  // The profile lives in the XZ half-plane, so the revolve axis is the plane's
  // local +Y — which is world +Z, the part's own axis.
  return kernel.revolve({
    profile: { points: feature.profile },
    axis: { origin: { x: 0, y: 0 }, direction: { x: 0, y: 1 } },
    angle: 360,
    plane: {
      origin: { x: 0, y: 0, z: 0 },
      xAxis: { x: 1, y: 0, z: 0 },
      yAxis: { x: 0, y: 0, z: 1 },
    },
  })
}
