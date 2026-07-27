import { createFeature, nextFeatureName } from '../features/domain/factory'
import type { FeatureParameters, ParameterValue } from '../features/domain/parameters'
import type { FeatureType } from '../features/domain/FeatureType'
import { isFeatureType } from '../features/domain/FeatureType'
import { FeatureTree } from '../features/FeatureTree'
import { isDimensional } from '../sketch/domain/Constraint'
import { SketchModel } from '../sketch/domain/SketchModel'

/**
 * The vocabulary shared by everything in an assembly that follows something
 * outside itself: a derived part following another part, a linked component
 * following a file on disk, an in-context part following a neighbour's faces.
 *
 * All three answer the same three questions — what am I following, is it still
 * what I was built against, and what did I change on top of it — so the states,
 * the edit list and the revision stamp live here rather than three times over.
 */

export class DerivationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DerivationError'
  }
}

export const DerivationKind = {
  /** A part built from another part in this document. */
  Derived: 'derived',
  /** A component built from an external .tectonic file. */
  Linked: 'linked',
  /** A part modelled against neighbouring components' geometry. */
  InContext: 'inContext',
} as const

export type DerivationKind = (typeof DerivationKind)[keyof typeof DerivationKind]

export const DERIVATION_KINDS: readonly DerivationKind[] = Object.values(DerivationKind)

export const LinkState = {
  /** Rebuilt against the source as it stands now. */
  InSync: 'inSync',
  /** The source has moved on since the last rebuild. */
  OutOfDate: 'outOfDate',
  /** The source is gone — a deleted part, a missing file, a removed face. */
  Broken: 'broken',
  /** The link was deliberately cut; the geometry is the part's own now. */
  Independent: 'independent',
} as const

export type LinkState = (typeof LinkState)[keyof typeof LinkState]

export const LINK_STATES: readonly LinkState[] = Object.values(LinkState)

export const UpdatePolicy = {
  /** Only ever updates when the user says so. */
  Manual: 'manual',
  /** Flags the change and waits to be asked. */
  Prompt: 'prompt',
  /** Follows the source as soon as it moves. */
  Auto: 'auto',
} as const

export type UpdatePolicy = (typeof UpdatePolicy)[keyof typeof UpdatePolicy]

export const UPDATE_POLICIES: readonly UpdatePolicy[] = Object.values(UpdatePolicy)

export function isUpdatePolicy(value: unknown): value is UpdatePolicy {
  return typeof value === 'string' && (UPDATE_POLICIES as readonly string[]).includes(value)
}

/** What every derived thing shows in the assembly tree. */
export interface DerivedComponentInfo {
  readonly id: string
  readonly name: string
  readonly kind: DerivationKind
  /** What it follows: a part id, a file path, or a component id. */
  readonly source: string
  readonly state: LinkState
  /** Revision of the source the current geometry was built against. */
  readonly sourceRevision: string | null
}

/* -------------------------------------------------------------------- edits */

/**
 * A change a derived part applies on top of what it inherited. Kept as data,
 * not as a rebuilt tree, so the derivation survives the source being edited:
 * the source is re-read and these are replayed over it.
 */
export type DerivedEdit =
  | { readonly type: 'suppressFeature'; readonly featureId: string }
  | { readonly type: 'unsuppressFeature'; readonly featureId: string }
  | { readonly type: 'removeFeature'; readonly featureId: string }
  | { readonly type: 'renameFeature'; readonly featureId: string; readonly name: string }
  | {
      readonly type: 'setFeatureParameter'
      readonly featureId: string
      readonly key: string
      readonly value: ParameterValue
    }
  | {
      readonly type: 'addFeature'
      readonly featureType: FeatureType
      readonly name?: string
      readonly sketchId?: string | null
      readonly parameters?: FeatureParameters
    }
  | {
      readonly type: 'setDimension'
      readonly sketchId: string
      readonly constraintId: string
      readonly value: number
    }

export const DERIVED_EDIT_TYPES: readonly DerivedEdit['type'][] = [
  'suppressFeature',
  'unsuppressFeature',
  'removeFeature',
  'renameFeature',
  'setFeatureParameter',
  'addFeature',
  'setDimension',
]

/** The modelling state a derivation copies: the history and the sketches. */
export interface ModelSnapshot {
  readonly tree: FeatureTree
  readonly sketches: readonly SketchModel[]
}

export function cloneSnapshot(snapshot: ModelSnapshot): ModelSnapshot {
  return {
    tree: snapshot.tree.clone(),
    sketches: snapshot.sketches.map((sketch) => sketch.clone()),
  }
}

export function emptySnapshot(): ModelSnapshot {
  return { tree: new FeatureTree(), sketches: [] }
}

export interface EditFailure {
  readonly edit: DerivedEdit
  readonly message: string
}

export interface ApplyEditsResult {
  readonly snapshot: ModelSnapshot
  readonly applied: readonly DerivedEdit[]
  readonly failures: readonly EditFailure[]
}

/**
 * Replays a derivation's edits over a copy of the source. An edit whose target
 * has gone is reported and skipped: the source moving on is normal, and one
 * stale reference must not cost the user every other change they made.
 */
export function applyEdits(
  source: ModelSnapshot,
  edits: readonly DerivedEdit[],
): ApplyEditsResult {
  const snapshot = cloneSnapshot(source)
  const applied: DerivedEdit[] = []
  const failures: EditFailure[] = []

  for (const edit of edits) {
    try {
      applyEdit(snapshot, edit)
      applied.push(edit)
    } catch (error) {
      failures.push({ edit, message: error instanceof Error ? error.message : String(error) })
    }
  }

  return { snapshot, applied, failures }
}

function applyEdit(snapshot: ModelSnapshot, edit: DerivedEdit): void {
  switch (edit.type) {
    case 'suppressFeature':
      if (!snapshot.tree.suppressFeature(edit.featureId)) {
        throw new DerivationError(`No feature "${edit.featureId}" to suppress`)
      }
      return

    case 'unsuppressFeature':
      if (!snapshot.tree.getFeature(edit.featureId)) {
        throw new DerivationError(`No feature "${edit.featureId}" to unsuppress`)
      }
      snapshot.tree.unsuppressFeature(edit.featureId)
      return

    case 'removeFeature':
      if (snapshot.tree.removeFeature(edit.featureId).length === 0) {
        throw new DerivationError(`No feature "${edit.featureId}" to remove`)
      }
      return

    case 'renameFeature':
      if (!snapshot.tree.renameFeature(edit.featureId, edit.name)) {
        throw new DerivationError(`Cannot rename "${edit.featureId}" to "${edit.name}"`)
      }
      return

    case 'setFeatureParameter': {
      const feature = snapshot.tree.getFeature(edit.featureId)
      if (!feature) throw new DerivationError(`No feature "${edit.featureId}"`)
      feature.setParameters({ [edit.key]: edit.value })
      return
    }

    case 'addFeature': {
      if (!isFeatureType(edit.featureType)) {
        throw new DerivationError(`Unknown feature type "${String(edit.featureType)}"`)
      }
      snapshot.tree.addFeature(
        createFeature(edit.featureType, {
          name: edit.name ?? nextFeatureName(edit.featureType, snapshot.tree.features),
          sketchId: edit.sketchId ?? null,
          parameters: edit.parameters ?? {},
        }),
      )
      return
    }

    case 'setDimension': {
      const sketch = snapshot.sketches.find((candidate) => candidate.id === edit.sketchId)
      if (!sketch) throw new DerivationError(`No sketch "${edit.sketchId}"`)
      const constraint = sketch.constraints.get(edit.constraintId)
      if (!constraint || !isDimensional(constraint)) {
        throw new DerivationError(`No dimension "${edit.constraintId}" in ${sketch.name}`)
      }
      constraint.value = edit.value
      return
    }
  }
}

/* ---------------------------------------------------------------- revisions */

/**
 * A stamp for "the source as it was when this was last rebuilt".
 *
 * A content hash rather than a counter: a source can be edited by anything —
 * another derivation, a file reload, an undo — and none of those would think to
 * bump a version number, but all of them change what the content hashes to.
 */
export function revisionOf(value: unknown): string {
  return hashString(JSON.stringify(value ?? null))
}

export function snapshotRevision(snapshot: ModelSnapshot): string {
  return revisionOf({
    tree: snapshot.tree.toJSON(),
    sketches: snapshot.sketches.map((sketch) => sketch.toJSON()),
  })
}

/** djb2 — small, stable across runs, and good enough to spot a change. */
export function hashString(text: string): string {
  let hash = 5381
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(index)) | 0
  }
  return (hash >>> 0).toString(36)
}

/** The state a link is in, given what it was built against and what is there now. */
export function linkStateFor(
  builtAgainst: string | null,
  current: string | null,
  independent = false,
): LinkState {
  if (independent) return LinkState.Independent
  if (current === null) return LinkState.Broken
  if (builtAgainst === null || builtAgainst !== current) return LinkState.OutOfDate
  return LinkState.InSync
}
