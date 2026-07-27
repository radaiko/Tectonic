export type {
  BoundingBox,
  BoxParams,
  ChamferParams,
  DeleteFaceParams,
  DraftParams,
  ExtrudeParams,
  ExtrudeSide,
  FilletParams,
  HoleKind,
  HoleParams,
  IBRepKernel,
  IKernel,
  LoftParams,
  MassProperties,
  LoftSection,
  MoveFaceParams,
  OffsetFaceParams,
  PlaneFrame,
  Profile,
  RevolveAxis,
  RevolveParams,
  ShapeHandle,
  ShellParams,
  SplitKeep,
  SplitParams,
  SweepOrientation,
  SweepParams,
  TessellationParams,
  Topology,
  TransformParams,
  Vec2,
  Vec3,
} from './IKernel'
export { isBRepKernel, KernelError, WORLD_XY } from './IKernel'
export { StubKernel, toBufferGeometry, toMeshData } from './StubKernel'
// The OpenCascade kernel is deliberately absent from this barrel as a value:
// importing it eagerly would pull the WASM module into the main bundle. Reach it
// through `createKernel`, which imports it on demand.
export type { OpenCascadeKernel } from './OpenCascadeKernel'
export type { CreateKernelOptions } from './createKernel'
export { createKernel } from './createKernel'
export type {
  KernelLoadListener,
  KernelLoadPhase,
  KernelLoadProgress,
  WasmLoadOptions,
} from './wasm/WasmLoader'
export {
  loadedOpenCascade,
  loadOpenCascade,
  OCCT_WASM_URL,
  openCascadeProgress,
  resetOpenCascade,
} from './wasm/WasmLoader'
export { csgIntersect, csgSubtract, csgUnion } from './csg'
export type {
  MeshTopology,
  TopologyEdge,
  TopologyFace,
  TopologyVertex,
} from './topology'
export { faceVertexIds, facesById, meshTopology } from './topology'
