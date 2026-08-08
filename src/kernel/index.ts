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
  KernelCapability,
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
export {
  isBRepKernel,
  KERNEL_CAPABILITIES,
  KernelError,
  kernelSupports,
  missingCapabilities,
  UnsupportedOperationError,
  WORLD_XY,
} from './IKernel'
export { StubKernel, toBufferGeometry, toMeshData } from './StubKernel'
// The OpenCascade kernel is deliberately absent from this barrel as a value:
// importing it eagerly would pull the WASM module into the main bundle. Reach it
// through `createKernel`, which imports it on demand.
export type { OpenCascadeKernel } from './OpenCascadeKernel'
// The Rust kernel is absent as a value for the same reason: `createKernel`
// imports it on demand so its WASM binary stays out of the main bundle.
export type { RustKernel } from './RustKernel'
export type {
  RustLoadOptions,
  RustWasmExports,
  RustWasmInput,
  RustWasmModule,
} from './rust/RustWasm'
export { loadedRustKernel, loadRustKernel, resetRustKernel, rustError } from './rust/RustWasm'
export type { CreateKernelOptions, KernelBackend } from './createKernel'
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
export type {
  EdgeFingerprint,
  EdgeReference,
  EdgeSurvey,
  FaceFingerprint,
  FaceReference,
  FaceSurvey,
  ReferenceResolution,
  ResolvedList,
  TopologyReference,
} from './references'
export {
  edgeReference,
  faceReference,
  fingerprintFace,
  isResolved,
  resolveEdge,
  resolveEdges,
  resolveFace,
  resolveFaces,
  surveyEdgeInfo,
  surveyEdges,
  surveyFaceInfo,
  surveyFaces,
  surveyMeshEdges,
  surveyMeshFaces,
} from './references'
export type { TranslatedIds } from './vocabulary'
export { translateEdgeIds, translateFaceIds } from './vocabulary'
