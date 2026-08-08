import type { EdgeSurvey, FaceSurvey, ReferenceResolution, ResolvedList } from './references'
import { fingerprintFace, isResolved, resolveEdge, resolveFace } from './references'

/**
 * Pairing the two vocabularies one solid's faces and edges are named in.
 *
 * A viewport pick can only name a face by its triangles, so it produces one of
 * `kernel/topology`'s derived names — `face-3`, `edge-7`. A B-Rep backend's own
 * operations take the geometry-hashed ids it issues itself. The two describe the
 * same solid and share no identifiers, which is why a picked face used to have
 * to be re-cut on a tessellation instead of reaching the exact operation.
 *
 * Both sides can be surveyed into the same {@link FaceSurvey} shape, and a
 * survey is enough to match on: a face is identified with a face by lying in the
 * same plane at the same size, which is exactly what
 * {@link resolveFace} already decides for a reference that outlived an edit.
 * So the pairing is that same question asked across backends rather than across
 * time, and it inherits the property that matters — when no single face can be
 * shown to be the one meant, that is reported, never guessed at.
 *
 * Where the two genuinely disagree it says so. A cylinder is one B-Rep face and
 * a fan of tessellated strips, so a picked strip names no B-Rep face and the
 * caller is told which selection could not be carried across.
 */

/** Ids in the target vocabulary, and a reason for each that could not be paired. */
export type TranslatedIds = ResolvedList

export function translateFaceIds(
  meshSurvey: readonly FaceSurvey[],
  brepSurvey: readonly FaceSurvey[],
  ids: readonly string[],
): TranslatedIds {
  return translate(ids, brepSurvey, meshSurvey, 'face', (face) =>
    resolveFace(brepSurvey, { id: face.id, fingerprint: fingerprintFace(meshSurvey, face) }),
  )
}

export function translateEdgeIds(
  meshSurvey: readonly EdgeSurvey[],
  brepSurvey: readonly EdgeSurvey[],
  ids: readonly string[],
): TranslatedIds {
  return translate(ids, brepSurvey, meshSurvey, 'edge', (edge) =>
    resolveEdge(brepSurvey, {
      id: edge.id,
      fingerprint: { midpoint: edge.midpoint, length: edge.length, direction: edge.direction },
    }),
  )
}

/* -------------------------------------------------------------------------- */

/**
 * An id already in the target vocabulary is left alone — that is the common case
 * when a selection was made against the backend's own report, and translating it
 * would only be a chance to get it wrong.
 */
function translate<S extends { readonly id: string }>(
  ids: readonly string[],
  brepSurvey: readonly { readonly id: string }[],
  meshSurvey: readonly S[],
  what: string,
  match: (entity: S) => ReferenceResolution,
): TranslatedIds {
  const translated: string[] = []
  const failures: string[] = []

  for (const id of ids) {
    if (brepSurvey.some((candidate) => candidate.id === id)) {
      translated.push(id)
      continue
    }

    const entity = meshSurvey.find((candidate) => candidate.id === id)
    if (!entity) {
      failures.push(`This solid has no ${what} ${id}`)
      continue
    }

    const resolution = match(entity)
    if (isResolved(resolution)) translated.push(resolution.id)
    else failures.push(resolution.reason)
  }

  return { ids: translated, failures }
}
