/* tslint:disable */
/* eslint-disable */

/**
 * Adopts a triangle mesh as a body, welding its corners back together.
 *
 * This is how geometry the kernel did not model — an imported file, or a result
 * that came back from the host's own fallback path — re-enters as something the
 * modelling operations will accept.
 */
export function bodyFromMesh(mesh: string): string;

/**
 * Only the material the two bodies share.
 */
export function booleanIntersect(a: string, b: string): string;

/**
 * `target` with `tool` cut away from it.
 */
export function booleanSubtract(target: string, tool: string): string;

/**
 * Everything in either body.
 */
export function booleanUnion(a: string, b: string): string;

/**
 * The body's axis-aligned extent in world space.
 */
export function boundingBox(body: string): string;

/**
 * Cuts the named edges back flat, or every edge when none are named.
 */
export function chamfer(body: string, params: string): string;

/**
 * Sweeps a profile along a straight line into a solid.
 */
export function extrude(params: string): string;

/**
 * Rounds the named edges, or every edge when none are named.
 */
export function fillet(body: string, params: string): string;

/**
 * Whether the body bounds a volume rather than being a loose shell.
 */
export function isSolid(body: string): boolean;

/**
 * Skins a run of cross-sections into a solid.
 */
export function loft(params: string): string;

/**
 * Volume, surface area, centre of mass and inertia, at unit density.
 */
export function massProperties(body: string): string;

/**
 * The backend name the host shows in its UI and logs.
 */
export function name(): string;

/**
 * Sweeps a profile about an axis lying in its own plane.
 */
export function revolve(params: string): string;

/**
 * Hollows a solid, leaving the named faces open.
 */
export function shell(body: string, params: string): string;

/**
 * Reduces a mesh to `ratio` of its triangles, between 0 and 1.
 */
export function simplify(mesh: string, ratio: number): string;

/**
 * Sweeps a profile along a polyline spine.
 */
export function sweep(params: string): string;

/**
 * The face, edge and vertex identifiers a host-side selection can name — the
 * ids [`fillet`], [`chamfer`] and [`shell`] take.
 */
export function topology(body: string): string;

/**
 * Turns a body into renderable triangles. Omitting `params` takes the kernel's
 * default quality.
 */
export function triangulate(body: string, params?: string | null): string;

/**
 * The kernel's version, for the host to show and to check a cached module
 * against.
 */
export function version(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly bodyFromMesh: (a: number, b: number) => [number, number, number, number];
    readonly booleanIntersect: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly booleanSubtract: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly booleanUnion: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly boundingBox: (a: number, b: number) => [number, number, number, number];
    readonly chamfer: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly extrude: (a: number, b: number) => [number, number, number, number];
    readonly fillet: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly isSolid: (a: number, b: number) => [number, number, number];
    readonly loft: (a: number, b: number) => [number, number, number, number];
    readonly massProperties: (a: number, b: number) => [number, number, number, number];
    readonly name: () => [number, number];
    readonly revolve: (a: number, b: number) => [number, number, number, number];
    readonly shell: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly simplify: (a: number, b: number, c: number) => [number, number, number, number];
    readonly sweep: (a: number, b: number) => [number, number, number, number];
    readonly topology: (a: number, b: number) => [number, number, number, number];
    readonly triangulate: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly version: () => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
