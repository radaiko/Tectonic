export {
  DEFAULT_MATERIAL_COLOR,
  MATERIAL_CATEGORIES,
  MATERIAL_FINISHES,
  MATERIAL_SUBCATEGORIES,
  PhysicalMaterial,
  isMaterialCategory,
  isMaterialFinish,
  slugify,
} from './PhysicalMaterial'
export type {
  MaterialCategory,
  MaterialFinish,
  MaterialSubcategory,
  MechanicalProperties,
  PhysicalMaterialInit,
  PhysicalMaterialJSON,
} from './PhysicalMaterial'

export {
  DEFAULT_MATERIAL_ID,
  MaterialLibrary,
  builtInMaterialCount,
  builtInMaterials,
} from './MaterialLibrary'
export type {
  MaterialLibraryJSON,
  MaterialQuery,
  MaterialTreeNode,
  PropertyRange,
} from './MaterialLibrary'

export {
  DEFAULT_BASE_COLOR,
  VisualAppearance,
  clamp01,
  clampColor,
  hexToRgb,
  rgbToHex,
} from './VisualAppearance'
export type { VisualAppearanceInit, VisualAppearanceJSON } from './VisualAppearance'

export {
  APPEARANCE_GROUPS,
  APPEARANCE_PRESET_IDS,
  AppearanceLibrary,
  DEFAULT_APPEARANCE_ID,
} from './AppearanceLibrary'
export type { AppearanceGroup } from './AppearanceLibrary'

export {
  MaterialAssignments,
  appearanceFor,
  formatMass,
  massOf,
  massPropertiesOf,
  materialPartCatalog,
  toMaterialSpec,
} from './MaterialIntegration'
export type {
  MaterialAssignment,
  MaterialAssignmentsJSON,
  PartCatalogOptions,
} from './MaterialIntegration'

export { AppearancePicker, MATERIAL_FIELDS, MaterialBrowser, MaterialEditor } from './MaterialUI'
export type {
  AppearancePickerProps,
  MaterialBrowserProps,
  MaterialEditorProps,
} from './MaterialUI'
