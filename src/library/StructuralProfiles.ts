import { LibraryError, STEEL_DENSITY } from './types'
import type { PartStandard } from './types'

/**
 * The shape families a structural member can be swept from. The kind decides
 * how {@link ProfileTableEntry}'s dimensions are read, so every table row of a
 * given kind is describable by the same five numbers.
 */
export const PROFILE_KINDS = [
  'i-beam',
  'channel',
  'angle',
  'tee',
  'rectangular-tube',
  'round-tube',
  'flat-bar',
] as const
export type ProfileKind = (typeof PROFILE_KINDS)[number]

/**
 * One row of a steel shape table, in millimetres.
 *
 * The five dimensions are deliberately shared across every kind rather than
 * split into a union — a table stays a flat grid that way, and the section
 * generators in `weldments/` are the only code that needs to know which of them
 * a given kind actually uses:
 *
 * - `i-beam`, `channel` — `height` × `width` overall, `webThickness` the web,
 *   `flangeThickness` the flanges.
 * - `angle` — `height` is the long leg, `width` the short one, `webThickness`
 *   the leg thickness (`flangeThickness` repeats it).
 * - `tee` — `height` × `width` overall, `webThickness` the stem,
 *   `flangeThickness` the table.
 * - `rectangular-tube` — `height` × `width` outside, both thicknesses the wall.
 * - `round-tube` — `height` and `width` are the outside diameter, both
 *   thicknesses the wall.
 * - `flat-bar` — `width` × `height`, where `height` is the bar thickness.
 */
export interface ProfileTableEntry {
  /** Catalogue name, e.g. "IPE 200". Unique across the whole library. */
  readonly name: string
  readonly kind: ProfileKind
  readonly standard: PartStandard
  /** Family the row belongs to, e.g. "IPE" or "SHS" — what the browser groups on. */
  readonly series: string
  readonly height: number
  readonly width: number
  readonly webThickness: number
  readonly flangeThickness: number
  /** Fillet between web and flange. Zero for cold-formed and flat sections. */
  readonly rootRadius: number
  /** Cross-sectional area in mm², as published rather than as our polygon measures. */
  readonly area: number
}

/* -------------------------------------------------------------------------- */
/* Table builders                                                              */
/* -------------------------------------------------------------------------- */

const CM2 = 100

/**
 * A hot-rolled I or H section. `area` comes from the standard because the root
 * fillets our polygon section ignores are worth several percent of it.
 */
function iBeam(
  name: string,
  standard: PartStandard,
  series: string,
  [height, width, webThickness, flangeThickness, rootRadius, areaCm2]: readonly [
    number,
    number,
    number,
    number,
    number,
    number,
  ],
): ProfileTableEntry {
  return {
    name,
    kind: 'i-beam',
    standard,
    series,
    height,
    width,
    webThickness,
    flangeThickness,
    rootRadius,
    area: areaCm2 * CM2,
  }
}

function channel(
  name: string,
  standard: PartStandard,
  series: string,
  [height, width, webThickness, flangeThickness, rootRadius, areaCm2]: readonly [
    number,
    number,
    number,
    number,
    number,
    number,
  ],
): ProfileTableEntry {
  return {
    name,
    kind: 'channel',
    standard,
    series,
    height,
    width,
    webThickness,
    flangeThickness,
    rootRadius,
    area: areaCm2 * CM2,
  }
}

function angle(
  name: string,
  standard: PartStandard,
  series: string,
  [height, width, thickness, rootRadius, areaCm2]: readonly [number, number, number, number, number],
): ProfileTableEntry {
  return {
    name,
    kind: 'angle',
    standard,
    series,
    height,
    width,
    webThickness: thickness,
    flangeThickness: thickness,
    rootRadius,
    area: areaCm2 * CM2,
  }
}

function tee(
  name: string,
  standard: PartStandard,
  series: string,
  [height, width, thickness, rootRadius, areaCm2]: readonly [number, number, number, number, number],
): ProfileTableEntry {
  return {
    name,
    kind: 'tee',
    standard,
    series,
    height,
    width,
    webThickness: thickness,
    flangeThickness: thickness,
    rootRadius,
    area: areaCm2 * CM2,
  }
}

/**
 * A cold-formed hollow section. Unlike the rolled shapes the area is computed —
 * a square tube is a rectangle minus a rectangle to well within the corner
 * radii, so publishing the number again would only invite it to drift.
 */
function hollow(
  name: string,
  standard: PartStandard,
  series: string,
  height: number,
  width: number,
  wall: number,
): ProfileTableEntry {
  return {
    name,
    kind: 'rectangular-tube',
    standard,
    series,
    height,
    width,
    webThickness: wall,
    flangeThickness: wall,
    rootRadius: 0,
    area: height * width - (height - 2 * wall) * (width - 2 * wall),
  }
}

function round(
  name: string,
  standard: PartStandard,
  series: string,
  diameter: number,
  wall: number,
): ProfileTableEntry {
  const bore = diameter - 2 * wall
  return {
    name,
    kind: 'round-tube',
    standard,
    series,
    height: diameter,
    width: diameter,
    webThickness: wall,
    flangeThickness: wall,
    rootRadius: 0,
    area: (Math.PI / 4) * (diameter * diameter - bore * bore),
  }
}

function flat(width: number, thickness: number): ProfileTableEntry {
  return {
    name: `Flat ${width}x${thickness}`,
    kind: 'flat-bar',
    standard: 'DIN',
    series: 'Flat',
    height: thickness,
    width,
    webThickness: thickness,
    flangeThickness: thickness,
    rootRadius: 0,
    area: width * thickness,
  }
}

/* -------------------------------------------------------------------------- */
/* Tables — DIN EN 10365 / 10056 / 10219, AISC shape tables, ASME B36.10       */
/* -------------------------------------------------------------------------- */

/** European narrow-flange I beams, DIN 1025-5 / EN 10365. */
const IPE: readonly ProfileTableEntry[] = (
  [
    ['IPE 80', [80, 46, 3.8, 5.2, 5, 7.64]],
    ['IPE 100', [100, 55, 4.1, 5.7, 7, 10.3]],
    ['IPE 120', [120, 64, 4.4, 6.3, 7, 13.2]],
    ['IPE 140', [140, 73, 4.7, 6.9, 7, 16.4]],
    ['IPE 160', [160, 82, 5.0, 7.4, 9, 20.1]],
    ['IPE 180', [180, 91, 5.3, 8.0, 9, 23.9]],
    ['IPE 200', [200, 100, 5.6, 8.5, 12, 28.5]],
    ['IPE 220', [220, 110, 5.9, 9.2, 12, 33.4]],
    ['IPE 240', [240, 120, 6.2, 9.8, 15, 39.1]],
    ['IPE 270', [270, 135, 6.6, 10.2, 15, 45.9]],
    ['IPE 300', [300, 150, 7.1, 10.7, 15, 53.8]],
    ['IPE 330', [330, 160, 7.5, 11.5, 18, 62.6]],
    ['IPE 360', [360, 170, 8.0, 12.7, 18, 72.7]],
    ['IPE 400', [400, 180, 8.6, 13.5, 21, 84.5]],
    ['IPE 450', [450, 190, 9.4, 14.6, 21, 98.8]],
    ['IPE 500', [500, 200, 10.2, 16.0, 21, 116.0]],
    ['IPE 550', [550, 210, 11.1, 17.2, 24, 134.0]],
    ['IPE 600', [600, 220, 12.0, 19.0, 24, 156.0]],
  ] as const
).map(([name, dims]) => iBeam(name, 'EN', 'IPE', dims))

/** Wide-flange light series, EN 10365. */
const HEA: readonly ProfileTableEntry[] = (
  [
    ['HE 100 A', [96, 100, 5.0, 8.0, 12, 21.2]],
    ['HE 120 A', [114, 120, 5.0, 8.0, 12, 25.3]],
    ['HE 140 A', [133, 140, 5.5, 8.5, 12, 31.4]],
    ['HE 160 A', [152, 160, 6.0, 9.0, 15, 38.8]],
    ['HE 180 A', [171, 180, 6.0, 9.5, 15, 45.3]],
    ['HE 200 A', [190, 200, 6.5, 10.0, 18, 53.8]],
    ['HE 220 A', [210, 220, 7.0, 11.0, 18, 64.3]],
    ['HE 240 A', [230, 240, 7.5, 12.0, 21, 76.8]],
    ['HE 260 A', [250, 260, 7.5, 12.5, 24, 86.8]],
    ['HE 280 A', [270, 280, 8.0, 13.0, 24, 97.3]],
    ['HE 300 A', [290, 300, 8.5, 14.0, 27, 112.5]],
    ['HE 320 A', [310, 300, 9.0, 15.5, 27, 124.4]],
    ['HE 340 A', [330, 300, 9.5, 16.5, 27, 133.5]],
    ['HE 360 A', [350, 300, 10.0, 17.5, 27, 142.8]],
    ['HE 400 A', [390, 300, 11.0, 19.0, 27, 159.0]],
  ] as const
).map(([name, dims]) => iBeam(name, 'EN', 'HE-A', dims))

/** Wide-flange standard series, EN 10365. */
const HEB: readonly ProfileTableEntry[] = (
  [
    ['HE 100 B', [100, 100, 6.0, 10.0, 12, 26.0]],
    ['HE 120 B', [120, 120, 6.5, 11.0, 12, 34.0]],
    ['HE 140 B', [140, 140, 7.0, 12.0, 12, 43.0]],
    ['HE 160 B', [160, 160, 8.0, 13.0, 15, 54.3]],
    ['HE 180 B', [180, 180, 8.5, 14.0, 15, 65.3]],
    ['HE 200 B', [200, 200, 9.0, 15.0, 18, 78.1]],
    ['HE 220 B', [220, 220, 9.5, 16.0, 18, 91.0]],
    ['HE 240 B', [240, 240, 10.0, 17.0, 21, 106.0]],
    ['HE 260 B', [260, 260, 10.0, 17.5, 24, 118.4]],
    ['HE 280 B', [280, 280, 10.5, 18.0, 24, 131.4]],
    ['HE 300 B', [300, 300, 11.0, 19.0, 27, 149.1]],
    ['HE 320 B', [320, 300, 11.5, 20.5, 27, 161.3]],
    ['HE 340 B', [340, 300, 12.0, 21.5, 27, 170.9]],
    ['HE 360 B', [360, 300, 12.5, 22.5, 27, 180.6]],
    ['HE 400 B', [400, 300, 13.5, 24.0, 27, 197.8]],
  ] as const
).map(([name, dims]) => iBeam(name, 'EN', 'HE-B', dims))

/** Wide-flange heavy series, EN 10365. */
const HEM: readonly ProfileTableEntry[] = (
  [
    ['HE 100 M', [120, 106, 12.0, 20.0, 12, 53.2]],
    ['HE 120 M', [140, 126, 12.5, 21.0, 12, 66.4]],
    ['HE 140 M', [160, 146, 13.0, 22.0, 12, 80.6]],
    ['HE 160 M', [180, 166, 14.0, 23.0, 15, 97.1]],
    ['HE 180 M', [200, 186, 14.5, 24.0, 15, 113.3]],
    ['HE 200 M', [220, 206, 15.0, 25.0, 18, 131.3]],
    ['HE 220 M', [240, 226, 15.5, 26.0, 18, 149.4]],
    ['HE 240 M', [270, 248, 18.0, 32.0, 21, 199.6]],
    ['HE 260 M', [290, 268, 18.0, 32.5, 24, 219.6]],
    ['HE 300 M', [340, 310, 21.0, 39.0, 27, 303.1]],
  ] as const
).map(([name, dims]) => iBeam(name, 'EN', 'HE-M', dims))

/** AISC wide-flange shapes, converted from the imperial manual. */
const W_SHAPES: readonly ProfileTableEntry[] = (
  [
    ['W8x10', [200, 100, 4.3, 5.2, 0, 19.1]],
    ['W8x31', [203, 203, 7.2, 11.0, 0, 58.9]],
    ['W10x22', [258, 146, 6.1, 9.1, 0, 41.9]],
    ['W12x26', [310, 165, 5.8, 9.7, 0, 49.4]],
    ['W12x50', [310, 205, 9.4, 16.3, 0, 94.2]],
    ['W14x30', [352, 171, 6.9, 9.8, 0, 57.1]],
    ['W16x40', [407, 178, 7.7, 12.8, 0, 76.1]],
    ['W18x50', [457, 190, 9.0, 14.5, 0, 94.8]],
    ['W21x62', [533, 209, 10.2, 15.6, 0, 118.0]],
    ['W24x76', [608, 228, 11.2, 17.3, 0, 145.0]],
  ] as const
).map(([name, dims]) => iBeam(name, 'AISC', 'W', dims))

/** AISC American standard (S) beams — tapered flanges, taken as parallel here. */
const S_SHAPES: readonly ProfileTableEntry[] = (
  [
    ['S3x5.7', [76.2, 59.2, 4.32, 6.6, 0, 10.8]],
    ['S4x7.7', [101.6, 67.6, 4.42, 6.86, 0, 14.5]],
    ['S6x12.5', [152.4, 84.6, 5.84, 7.75, 0, 23.6]],
    ['S8x18.4', [203.2, 101.6, 6.86, 8.51, 0, 34.8]],
    ['S10x25.4', [254, 118.4, 7.9, 9.09, 0, 48.1]],
    ['S12x31.8', [304.8, 132.6, 8.86, 10.8, 0, 60.1]],
  ] as const
).map(([name, dims]) => iBeam(name, 'AISC', 'S', dims))

/** Tapered-flange channels, DIN 1026-1. */
const UPN: readonly ProfileTableEntry[] = (
  [
    ['UPN 50', [50, 38, 5.0, 7.0, 7.0, 7.12]],
    ['UPN 65', [65, 42, 5.5, 7.5, 7.5, 9.03]],
    ['UPN 80', [80, 45, 6.0, 8.0, 8.0, 11.0]],
    ['UPN 100', [100, 50, 6.0, 8.5, 8.5, 13.5]],
    ['UPN 120', [120, 55, 7.0, 9.0, 9.0, 17.0]],
    ['UPN 140', [140, 60, 7.0, 10.0, 10.0, 20.4]],
    ['UPN 160', [160, 65, 7.5, 10.5, 10.5, 24.0]],
    ['UPN 180', [180, 70, 8.0, 11.0, 11.0, 28.0]],
    ['UPN 200', [200, 75, 8.5, 11.5, 11.5, 32.2]],
    ['UPN 220', [220, 80, 9.0, 12.5, 12.5, 37.4]],
    ['UPN 240', [240, 85, 9.5, 13.0, 13.0, 42.3]],
    ['UPN 260', [260, 90, 10.0, 14.0, 14.0, 48.3]],
    ['UPN 300', [300, 100, 10.0, 16.0, 16.0, 58.8]],
  ] as const
).map(([name, dims]) => channel(name, 'DIN', 'UPN', dims))

/** Parallel-flange channels, DIN 1026-2. */
const UPE: readonly ProfileTableEntry[] = (
  [
    ['UPE 80', [80, 50, 4.0, 7.0, 10, 10.1]],
    ['UPE 100', [100, 55, 4.5, 7.5, 10, 12.5]],
    ['UPE 120', [120, 60, 5.0, 8.0, 12, 15.4]],
    ['UPE 140', [140, 65, 5.0, 9.0, 12, 18.4]],
    ['UPE 160', [160, 70, 5.5, 9.5, 12, 21.7]],
    ['UPE 180', [180, 75, 5.5, 10.5, 12, 25.1]],
    ['UPE 200', [200, 80, 6.0, 11.0, 13, 29.0]],
    ['UPE 220', [220, 85, 6.5, 12.0, 13, 33.9]],
    ['UPE 240', [240, 90, 7.0, 12.5, 15, 38.5]],
    ['UPE 270', [270, 95, 7.5, 13.5, 15, 44.8]],
    ['UPE 300', [300, 100, 9.5, 15.0, 15, 56.6]],
  ] as const
).map(([name, dims]) => channel(name, 'DIN', 'UPE', dims))

/** AISC American standard channels. */
const C_SHAPES: readonly ProfileTableEntry[] = (
  [
    ['C3x4.1', [76.2, 35.8, 4.32, 6.93, 0, 7.78]],
    ['C4x5.4', [101.6, 40.1, 4.57, 7.52, 0, 10.2]],
    ['C6x8.2', [152.4, 48.8, 5.08, 8.71, 0, 15.5]],
    ['C8x11.5', [203.2, 57.4, 5.59, 9.9, 0, 21.7]],
    ['C10x15.3', [254, 66.0, 6.1, 11.1, 0, 29.0]],
    ['C12x20.7', [304.8, 74.7, 7.11, 12.7, 0, 39.2]],
  ] as const
).map(([name, dims]) => channel(name, 'AISC', 'C', dims))

/** Equal-leg angles, EN 10056-1. */
const L_EQUAL: readonly ProfileTableEntry[] = (
  [
    ['L 20x20x3', [20, 20, 3, 3.5, 1.12]],
    ['L 25x25x3', [25, 25, 3, 3.5, 1.42]],
    ['L 25x25x4', [25, 25, 4, 3.5, 1.85]],
    ['L 30x30x3', [30, 30, 3, 5, 1.74]],
    ['L 30x30x4', [30, 30, 4, 5, 2.27]],
    ['L 40x40x4', [40, 40, 4, 6, 3.08]],
    ['L 40x40x5', [40, 40, 5, 6, 3.79]],
    ['L 50x50x5', [50, 50, 5, 7, 4.80]],
    ['L 50x50x6', [50, 50, 6, 7, 5.69]],
    ['L 60x60x6', [60, 60, 6, 8, 6.91]],
    ['L 60x60x8', [60, 60, 8, 8, 9.03]],
    ['L 70x70x7', [70, 70, 7, 9, 9.40]],
    ['L 80x80x8', [80, 80, 8, 10, 12.3]],
    ['L 90x90x9', [90, 90, 9, 11, 15.5]],
    ['L 100x100x10', [100, 100, 10, 12, 19.2]],
    ['L 120x120x12', [120, 120, 12, 13, 27.5]],
    ['L 150x150x15', [150, 150, 15, 16, 43.0]],
  ] as const
).map(([name, dims]) => angle(name, 'EN', 'L equal', dims))

/** Unequal-leg angles, EN 10056-1. The long leg is `height`. */
const L_UNEQUAL: readonly ProfileTableEntry[] = (
  [
    ['L 30x20x3', [30, 20, 3, 4, 1.42]],
    ['L 40x20x4', [40, 20, 4, 4, 2.21]],
    ['L 40x25x4', [40, 25, 4, 4, 2.46]],
    ['L 50x30x5', [50, 30, 5, 5, 3.78]],
    ['L 60x30x5', [60, 30, 5, 6, 4.29]],
    ['L 60x40x5', [60, 40, 5, 6, 4.79]],
    ['L 65x50x5', [65, 50, 5, 6.5, 5.54]],
    ['L 70x50x6', [70, 50, 6, 7, 6.89]],
    ['L 75x50x6', [75, 50, 6, 7, 7.19]],
    ['L 80x40x6', [80, 40, 6, 7, 6.89]],
    ['L 80x60x7', [80, 60, 7, 8, 9.38]],
    ['L 100x50x8', [100, 50, 8, 9, 11.5]],
    ['L 100x65x7', [100, 65, 7, 10, 11.2]],
    ['L 100x75x8', [100, 75, 8, 10, 13.5]],
    ['L 120x80x8', [120, 80, 8, 11, 15.5]],
    ['L 150x90x10', [150, 90, 10, 12, 23.2]],
  ] as const
).map(([name, dims]) => angle(name, 'EN', 'L unequal', dims))

/** Rolled T sections, EN 10055. */
const TEE: readonly ProfileTableEntry[] = (
  [
    ['T 20', [20, 20, 3, 1.5, 1.12]],
    ['T 25', [25, 25, 3.5, 2, 1.64]],
    ['T 30', [30, 30, 4, 2, 2.26]],
    ['T 35', [35, 35, 4.5, 2.5, 2.97]],
    ['T 40', [40, 40, 5, 2.5, 3.77]],
    ['T 50', [50, 50, 6, 3, 5.66]],
    ['T 60', [60, 60, 7, 3.5, 7.94]],
    ['T 70', [70, 70, 8, 4, 10.6]],
    ['T 80', [80, 80, 9, 4.5, 13.6]],
  ] as const
).map(([name, dims]) => tee(name, 'EN', 'T', dims))

/** Square hollow sections, EN 10219. */
const SHS: readonly ProfileTableEntry[] = (
  [
    [20, 2],
    [25, 2],
    [30, 2.5],
    [40, 3],
    [40, 4],
    [50, 3],
    [50, 4],
    [60, 4],
    [60, 5],
    [70, 5],
    [80, 5],
    [80, 6],
    [100, 5],
    [100, 6],
    [100, 8],
    [120, 6],
    [150, 8],
    [200, 10],
  ] as const
).map(([size, wall]) => hollow(`SHS ${size}x${size}x${wall}`, 'EN', 'SHS', size, size, wall))

/** Rectangular hollow sections, EN 10219. */
const RHS: readonly ProfileTableEntry[] = (
  [
    [40, 20, 2],
    [50, 25, 3],
    [50, 30, 3],
    [60, 40, 3],
    [60, 40, 4],
    [80, 40, 4],
    [80, 40, 5],
    [100, 50, 4],
    [100, 50, 5],
    [100, 60, 5],
    [120, 60, 5],
    [120, 80, 6],
    [150, 100, 6],
    [200, 100, 8],
  ] as const
).map(([height, width, wall]) =>
  hollow(`RHS ${height}x${width}x${wall}`, 'EN', 'RHS', height, width, wall),
)

/** Circular hollow sections, EN 10219. */
const CHS: readonly ProfileTableEntry[] = (
  [
    [21.3, 2.3],
    [26.9, 2.3],
    [33.7, 2.6],
    [42.4, 2.6],
    [48.3, 3.2],
    [60.3, 3.2],
    [76.1, 3.2],
    [88.9, 4.0],
    [114.3, 4.0],
    [139.7, 5.0],
    [168.3, 5.0],
    [219.1, 6.3],
  ] as const
).map(([diameter, wall]) => round(`CHS ${diameter}x${wall}`, 'EN', 'CHS', diameter, wall))

/** Welded and seamless steel pipe, ASME B36.10, by nominal size and schedule. */
const PIPE: readonly ProfileTableEntry[] = (
  [
    ['1/2"', 40, 21.3, 2.77],
    ['3/4"', 40, 26.7, 2.87],
    ['1"', 40, 33.4, 3.38],
    ['1-1/4"', 40, 42.2, 3.56],
    ['1-1/2"', 40, 48.3, 3.68],
    ['2"', 40, 60.3, 3.91],
    ['3"', 40, 88.9, 5.49],
    ['4"', 40, 114.3, 6.02],
    ['2"', 80, 60.3, 5.54],
    ['4"', 80, 114.3, 8.56],
    ['6"', 80, 168.3, 10.97],
  ] as const
).map(([nominal, schedule, diameter, wall]) =>
  round(`Pipe ${nominal} Sch ${schedule}`, 'ANSI', 'Pipe', diameter, wall),
)

/** Hot-rolled flat bar, DIN 1017. */
const FLAT_BAR: readonly ProfileTableEntry[] = (
  [
    [20, 3],
    [20, 5],
    [25, 4],
    [25, 5],
    [30, 5],
    [30, 8],
    [40, 5],
    [40, 8],
    [40, 10],
    [50, 6],
    [50, 10],
    [60, 8],
    [60, 10],
    [80, 10],
    [100, 10],
    [100, 12],
    [120, 12],
    [150, 15],
  ] as const
).map(([width, thickness]) => flat(width, thickness))

/**
 * Every structural shape the library knows, as one flat table. Kept embedded in
 * the bundle rather than fetched, so a weldment can be rebuilt with no network
 * and a .tectonic file never depends on a catalogue that has moved on.
 */
export const STRUCTURAL_PROFILES: readonly ProfileTableEntry[] = [
  ...IPE,
  ...HEA,
  ...HEB,
  ...HEM,
  ...W_SHAPES,
  ...S_SHAPES,
  ...UPN,
  ...UPE,
  ...C_SHAPES,
  ...L_EQUAL,
  ...L_UNEQUAL,
  ...TEE,
  ...SHS,
  ...RHS,
  ...CHS,
  ...PIPE,
  ...FLAT_BAR,
]

const BY_NAME = new Map(STRUCTURAL_PROFILES.map((entry) => [entry.name.toLowerCase(), entry]))

/* -------------------------------------------------------------------------- */
/* Queries                                                                     */
/* -------------------------------------------------------------------------- */

/** The row with this name, matched case-insensitively, or undefined. */
export function findProfile(name: string): ProfileTableEntry | undefined {
  return BY_NAME.get(name.trim().toLowerCase())
}

/** The row with this name, or a {@link LibraryError} naming what was asked for. */
export function requireProfile(name: string): ProfileTableEntry {
  const entry = findProfile(name)
  if (!entry) throw new LibraryError(`No structural profile named "${name}"`)
  return entry
}

export function profilesByKind(kind: ProfileKind): readonly ProfileTableEntry[] {
  return STRUCTURAL_PROFILES.filter((entry) => entry.kind === kind)
}

export function profilesByStandard(standard: PartStandard): readonly ProfileTableEntry[] {
  return STRUCTURAL_PROFILES.filter((entry) => entry.standard === standard)
}

export function profilesBySeries(series: string): readonly ProfileTableEntry[] {
  const wanted = series.trim().toLowerCase()
  return STRUCTURAL_PROFILES.filter((entry) => entry.series.toLowerCase() === wanted)
}

/** The series names, in the order the table lists them — what a picker groups on. */
export function profileSeries(): readonly string[] {
  return [...new Set(STRUCTURAL_PROFILES.map((entry) => entry.series))]
}

export interface ProfileQuery {
  /** Substring of the name or series, matched case-insensitively. */
  readonly text?: string
  readonly kind?: ProfileKind
  readonly standard?: PartStandard
  readonly series?: string
  /** Overall depth bounds, in millimetres. */
  readonly minHeight?: number
  readonly maxHeight?: number
}

/** Filters the table by every field the query sets. An empty query matches all. */
export function searchProfiles(query: ProfileQuery = {}): readonly ProfileTableEntry[] {
  const text = query.text?.trim().toLowerCase() ?? ''
  const series = query.series?.trim().toLowerCase()

  return STRUCTURAL_PROFILES.filter((entry) => {
    if (query.kind && entry.kind !== query.kind) return false
    if (query.standard && entry.standard !== query.standard) return false
    if (series !== undefined && entry.series.toLowerCase() !== series) return false
    if (query.minHeight !== undefined && entry.height < query.minHeight) return false
    if (query.maxHeight !== undefined && entry.height > query.maxHeight) return false
    if (text.length === 0) return true
    return (
      entry.name.toLowerCase().includes(text) || entry.series.toLowerCase().includes(text)
    )
  })
}

/** Mass of one metre of the profile, in kilograms. */
export function profileMassPerMetre(
  entry: ProfileTableEntry,
  density = STEEL_DENSITY,
): number {
  return entry.area * 1000 * density
}
