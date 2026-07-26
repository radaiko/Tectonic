/**
 * Feature parameters are plain JSON: whatever a feature needs, in a form that
 * round-trips through the .tectonic format without a schema per feature kind.
 * The readers below are the only supported way to pull typed values back out.
 */
export type ParameterValue =
  | string
  | number
  | boolean
  | null
  | readonly ParameterValue[]
  | { readonly [key: string]: ParameterValue }

export type FeatureParameters = Readonly<Record<string, ParameterValue>>

export function readNumber(
  parameters: FeatureParameters,
  key: string,
  fallback: number,
): number {
  const value = parameters[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function readString(
  parameters: FeatureParameters,
  key: string,
  fallback: string,
): string {
  const value = parameters[key]
  return typeof value === 'string' ? value : fallback
}

export function readBoolean(
  parameters: FeatureParameters,
  key: string,
  fallback: boolean,
): boolean {
  const value = parameters[key]
  return typeof value === 'boolean' ? value : fallback
}

/** Reads a string parameter constrained to a known set, falling back if not. */
export function readChoice<T extends string>(
  parameters: FeatureParameters,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = parameters[key]
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

export function readStringArray(parameters: FeatureParameters, key: string): string[] {
  const value = parameters[key]
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

/** Reads a reference that may legitimately be absent, e.g. a target body id. */
export function readOptionalString(
  parameters: FeatureParameters,
  key: string,
): string | null {
  const value = parameters[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

export interface Vector3Value {
  readonly x: number
  readonly y: number
  readonly z: number
}

export function readVector3(
  parameters: FeatureParameters,
  key: string,
  fallback: Vector3Value,
): Vector3Value {
  const value = parameters[key]
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return fallback
  const candidate = value as Record<string, ParameterValue>
  return {
    x: typeof candidate.x === 'number' ? candidate.x : fallback.x,
    y: typeof candidate.y === 'number' ? candidate.y : fallback.y,
    z: typeof candidate.z === 'number' ? candidate.z : fallback.z,
  }
}

export interface Vector2Value {
  readonly x: number
  readonly y: number
}

export function readVector2(
  parameters: FeatureParameters,
  key: string,
  fallback: Vector2Value,
): Vector2Value {
  const value = parameters[key]
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return fallback
  const candidate = value as Record<string, ParameterValue>
  return {
    x: typeof candidate.x === 'number' ? candidate.x : fallback.x,
    y: typeof candidate.y === 'number' ? candidate.y : fallback.y,
  }
}

/** Deep copy, so a feature never shares parameter objects with its caller. */
export function cloneParameters(parameters: FeatureParameters): FeatureParameters {
  return JSON.parse(JSON.stringify(parameters)) as FeatureParameters
}
