/** Raised when a library entry cannot be found, built or configured. */
export class LibraryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LibraryError'
  }
}

/**
 * The publishing body a catalogue entry follows. Sizes are dimensionally
 * identical across several of these — an ISO 4014 bolt and its DIN 931
 * equivalent share a head — so the standard is recorded per entry rather than
 * driving the geometry.
 */
export const PART_STANDARDS = ['DIN', 'ISO', 'EN', 'ANSI', 'AISC', 'generic'] as const
export type PartStandard = (typeof PART_STANDARDS)[number]

/** Density of structural and fastener steel, in kg/mm³. */
export const STEEL_DENSITY = 7.85e-6
