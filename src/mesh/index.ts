export {
  MESH_ELEMENTS,
  MeshError,
  boundaryEdges,
  boundaryLoops,
  buildTopology,
  cornersOf,
  edgeKey,
  nonManifoldEdges,
  parseEdgeKey,
} from './types'
export type { EdgeKey, MeshElement, MeshTopology } from './types'

export {
  MESH_IMPORT_FORMATS,
  decimateMesh,
  fillHoles,
  importMesh,
  importObj,
  meshFormatFromName,
  orientNormals,
  remesh,
  removeDegenerateTriangles,
  repairMesh,
  signedVolume,
  smoothMesh,
  validateMesh,
  weldVertices,
} from './MeshImport'
export type {
  ImportedMesh,
  MeshImportFormat,
  MeshImportOptions,
  MeshValidation,
  RepairOptions,
  RepairReport,
  ValidationOptions,
} from './MeshImport'

export {
  DEFAULT_SHARP_ANGLE,
  facetGroups,
  isWatertight,
  meshToSolid,
  sharpEdgeSegments,
  sharpFeatureEdges,
} from './MeshToSolid'
export type { MeshToSolidOptions, MeshToSolidResult } from './MeshToSolid'

export {
  EMPTY_SELECTION,
  MESH_BOOLEANS,
  bevelEdge,
  bridgeLoops,
  createSelection,
  deleteFaces,
  extrudeFaces,
  faceArea,
  fillHole,
  growFaceSelection,
  isSelectionEmpty,
  meshBoolean,
  nearestVertex,
  rotateSelection,
  scaleSelection,
  selectedVertices,
  selectionCenter,
  selectionNormal,
  splitEdge,
  translateSelection,
} from './MeshEdit'
export type { MeshBoolean, MeshSelection } from './MeshEdit'

export { MeshEditor, NUDGE_STEP } from './MeshEditor'
export type { MeshEditorProps } from './MeshEditor'
