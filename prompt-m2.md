=== CURRENT STATE ===
- ✅ Full 2D sketch system (domain, constraints, solver, snap system, renderer, all drawing tools, SketchEditor)
- ✅ File I/O (.tectonic round-trip)
- ✅ IKernel interface + StubKernel (three.js-based)
- ✅ 3D viewport with orbit controls
- 518+ tests passing (fixing 2 test assertion issues)

=== NEXT PHASE — M2: Parametric Feature-Based 3D Modeling ===

The feature engine is the heart of Tectonic. Build the feature architecture so sketch profiles can be extruded/revolved/etc. into 3D solids, visualized in the 3D viewport, and the feature tree drives all geometry.

=== 1. FEATURE DOMAIN MODEL ===

Create `src/features/domain/Feature.ts` and supporting files:

Feature base class/interface with:
- id: string (UUID)
- name: string
- featureType: FeatureType enum
- sketchId: string | null (reference to the sketch this feature uses)
- parameters: Record<string, any> (type-specific params)
- status: 'active' | 'suppressed' | 'error'
- errorMessage: string | null (when status is 'error')
- parentFeatureIds: string[] (dependencies — features this depends on)
- childFeatureIds: string[] (features that depend on this)
- toJSON() / fromJSON()

Feature types (FeatureType enum):
- ExtrudeFeature
- RevolveFeature
- SweepFeature
- LoftFeature
- CutExtrudeFeature
- CutRevolveFeature
- CutSweepFeature
- CutLoftFeature
- FilletFeature
- ChamferFeature
- ShellFeature
- HoleFeature
- RibFeature
- DraftFeature
- PatternFeature
- MirrorFeature
- ScaleFeature
- CombineFeature

=== 2. FEATURE TREE ===

Create `src/features/FeatureTree.ts`:

- Ordered list of features (the modeling history)
- Roll bar: index indicating current position in history (features after the bar are "rolled back" and not evaluated)
- addFeature(feature, index?: number): adds at end or at specified index
- removeFeature(id): removes feature and all dependents
- reorderFeature(id, newIndex): reorder (validate dependencies)
- suppressFeature(id) / unsuppressFeature(id)
- moveRollBar(newIndex): move roll bar position
- getActiveFeatures(): features before the roll bar that are not suppressed and not errored
- getDependents(id): all features that depend on the given feature
- validateDependencies(id, newIndex): returns true if moving/reordering is valid
- toJSON() / fromJSON()

Dependency rules:
- A feature cannot be moved before its sketch
- A feature cannot be moved before features it depends on
- Children of a feature are moved with it
- Cutting/combining features must be after the body they operate on

=== 3. FEATURE ENGINE ===

Create `src/features/FeatureEngine.ts`:

The engine takes active features + sketches and produces 3D geometry via the kernel:

- engine.evaluate(featureTree, sketches, kernel): evaluates all active features in order, builds the 3D body
- Returns: Body (mesh data) or error
- On error: marks the feature as status='error' with errorMessage, continues evaluating remaining features

Feature implementations (each takes sketch geometry + parameters → calls IKernel methods):

**Extrude** (src/features/operations/ExtrudeOperation.ts):
- Takes: sketch profile (2D polyline), direction (one-sided/symmetric/asymmetric), distance(s), draft angle, boolean operation (new body/join/cut)
- Calls kernel: extrude(profile, distance, draftAngle) or extrudeCut(profile, distance, draftAngle, targetBody)
- Start condition: blind (default), through-all, up-to-face, up-to-surface, up-to-body, offset from face

**Revolve** (src/features/operations/RevolveOperation.ts):
- Takes: sketch profile, axis (sketch line or reference axis), angle (full or partial), boolean operation
- Calls kernel: revolve(profile, axis, angle)

**Sweep** (src/features/operations/SweepOperation.ts):
- Takes: sketch profile, path (sketch curve), orientation (follow path / perpendicular), twist angle
- Calls kernel: sweep(profile, path, orientation, twist)

**Loft** (src/features/operations/LoftOperation.ts):
- Takes: multiple sketch profiles, optional center-line guide, rails, start/end constraints (tangent, curvature)
- Calls kernel: loft(profiles, guides)

**Cut** (src/features/operations/CutOperation.ts):
- Wraps Extrude/Revolve/Sweep/Loft but with subtractive boolean
- Calls kernel: booleanSubtract(targetBody, toolBody)

**Fillet** (src/features/operations/FilletOperation.ts):
- Takes: edge selections (face references or edge ids), radius, variable radius support
- Calls kernel: fillet(body, edges, radius)

**Chamfer** (src/features/operations/ChamferOperation.ts):
- Takes: edge selections, distance-distance or distance-angle
- Calls kernel: chamfer(body, edges, distances, angle)

**Shell** (src/features/operations/ShellOperation.ts):
- Takes: faces to remove, thickness (uniform or variable)
- Calls kernel: shell(body, openFaces, thickness)

**Hole** (src/features/operations/HoleOperation.ts):
- Takes: hole center point (from sketch), diameter, depth, hole type (simple/countersink/counterbore), thread spec
- Calls kernel: hole(body, center, diameter, depth, type)

**Draft** (src/features/operations/DraftOperation.ts):
- Takes: faces, pull direction, draft angle, neutral plane
- Calls kernel: draft(body, faces, direction, angle, neutralPlane)

**Pattern** (src/features/operations/PatternOperation.ts):
- Takes: source feature(s), pattern type (rectangular/circular), parameters (count, spacing, angle)
- Calls kernel: pattern(body/features, type, params)

**Mirror** (src/features/operations/MirrorOperation.ts):
- Takes: source feature(s) or body, mirror plane
- Calls kernel: mirror(body, plane)

**Boolean Combine** (src/features/operations/CombineOperation.ts):
- Takes: target body, tool body, operation type (union/subtract/intersect)
- Calls kernel: booleanUnion / booleanSubtract / booleanIntersect

=== 4. UPDATE STUBKERNEL ===

`src/kernel/StubKernel.ts` — update the stub to support feature operations:

Since we don't have a real WASM kernel yet, implement basic versions using three.js BufferGeometry operations:

- extrude(profile, distance): Create a box-like shape from sketch profile extruded along Z
- revolve(profile, axis, angle): Create a revolved shape using lathe geometry
- sweep(profile, path): Create swept shape (approximate)
- fillet(edgeSet, radius): Approximate with rounded cylinder at edge (or fall back to no-op)
- booleanSubtract/Union: Use CSG-like approach or fall back (for now, just return the tool body)
- chamfer, shell: Approximate or fall back

Each operation returns: { vertices, indices, normals } for the 3D viewport to display.

Also store a reference to the original feature in the body metadata so the 3D viewport can highlight/reference it.

=== 5. UPLOAD SKETCH → FEATURE PIPELINE ===

Create `src/app/useEditorState.ts` or extend EditorView:

- Toggle between Sketch mode and 3D modeling mode
- From sketch mode: "Extrude" button takes the current sketch, creates an ExtrudeFeature with it
- Feature tree panel on the left showing all features
- Click a feature to select it, show its parameters in the properties panel
- Parametric updates: changing a sketch dimension or feature parameter triggers re-evaluation

=== 6. FEATURE TREE UI ===

Create `src/ui/FeatureTreePanel.tsx`:

- Tree/list showing all features in the current document
- Each row: icon (based on feature type), name, status indicator (active/suppressed/error)
- Drag to reorder (with dependency validation showing a red indicator for invalid drops)
- Right-click context menu: Edit Parameters, Suppress/Unsuppress, Delete, Rename
- Roll bar indicator: a horizontal line showing current position in history
- Click on a feature to select it (shows parameters in properties panel)

=== 7. 3D VIEWPORT INTEGRATION ===

Update `src/3d/ThreeViewport.tsx`:

- Accept a Body (mesh data) or array of bodies as a prop
- Render each body in the scene with distinct color
- When a feature is selected, highlight its corresponding body/face
- Multiple bodies in the scene for multi-body parts
- Section view toggle (dynamic clipping plane)
- Visual style toggle (shaded, wireframe, shaded+edges)

=== 8. UPDATE FILE I/O ===

Update `src/io/FileService.ts` and `src/domain/Document.ts`:

- Document now contains: featureTree, bodies (computed, not serialized), sketches
- Serialization: feature tree, sketch data, document metadata
- Deserialization: reconstruct features, then re-evaluate all features to rebuild bodies

=== 9. TESTS ===

Create tests for all feature operations at `src/features/FeatureEngine.test.ts` and `tests/features/`:

- Feature tree tests (add, remove, reorder, suppress, roll bar)
- Extrude feature tests (basic extrude, cut, through-all, draft angle, up-to-face)
- Revolve feature tests
- Feature round-trip serialization tests
- Feature engine evaluation tests (with StubKernel)

=== CROSS-CUTTING ===
- All source code in src/features/, src/ui/ (no React in features/)
- All features go through IKernel interface (never call three.js directly from feature code)
- npm test must pass with 90%+ coverage
- TypeScript strict mode throughout
- Feature parameters are plain objects (serializable)

=== DON'T ===
- Don't add sheet metal (M3)
- Don't add assemblies (M3)
- Don't add surfaces (M4)
- Don't modify the sketch system (already complete)
- Don't add a real WASM kernel (StubKernel is fine for now)

=== AFTER ===
- Verify: npx tsc --noEmit
- Verify: npm test -- --coverage (all passing, 90%+)
- Verify: npm run dev starts and shows sketch → extrude → 3D view workflow
- Commit: git add -A && git commit -m "feat: M2 — parametric feature engine, feature tree, 3D operations, Extrude/Revolve/Sweep/Loft/Fillet/Chamfer/Shell/Hole/Draft/Pattern/Mirror"

Do NOT ask questions. Build it.