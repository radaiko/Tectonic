=== CURRENT STATE ===
- ✅ Feature domain model (Feature types, parameters, schema, factory)
- ✅ FeatureTree (ordered list, roll bar, reorder, suppress, dependency validation)
- ✅ ExtrudeOperation, RevolveOperation, SweepOperation, LoftOperation
- ✅ CSG kernel (basic boolean operations via three.js)
- ✅ StubKernel updated with extrude/revolve/sweep/loft support
- ✅ Plane/profile geometry helpers
- ❌ Missing modify operations: Cut, Fillet, Chamfer, Shell, Hole, Draft, Rib
- ❌ Missing pattern operations: Pattern, Mirror, Scale
- ❌ Missing combine operations: Combine (union/subtract/intersect), Split, ReplaceFace, MoveFace, DeleteFace
- ❌ FeatureEngine.ts (orchestrator that evaluates all features)
- ❌ Feature tree panel UI (FeatureTreePanel.tsx)
- ❌ EditorView integration (sketch → feature → 3D view pipeline)
- ❌ Direct editing (move face, offset face, delete face)
- 599 tests passing, TypeScript clean compile

=== WHAT TO BUILD — M2 Phase 2: Remaining Operations + Feature Engine + UI ===

=== 1. REMAINING OPERATIONS ===

Create `src/features/operations/`:

**CutOperation.ts**:
- Takes: source feature (extrude/revolve/sweep/loft) + target body
- Calls kernel: booleanSubtract(targetBody, toolBody)
- Parameters: sourceFeatureId, operationType (cut, cutThin)

**FilletOperation.ts**:
- Takes: edge selections (by face/edge references), radius, variable radius (optional)
- Parameters: edgeReferences, radius, variableRadii (optional)
- Calls kernel: fillet(body, edges, radius)

**ChamferOperation.ts**:
- Takes: edge selections, distance1, distance2 (or distance + angle)
- Parameters: edgeReferences, distance1, distance2, angle (optional)
- Calls kernel: chamfer(body, edges, distance1, distance2)

**ShellOperation.ts**:
- Takes: face selections (to remove), thickness, alternate thickness (optional)
- Parameters: openFaceReferences, thickness, alternateThickness (optional)
- Calls kernel: shell(body, openFaces, thickness)

**HoleOperation.ts**:
- Takes: hole center point (from sketch), diameter, depth, hole type, thread spec
- Parameters: sketchId, centerPoint, diameter, depth, holeType, threadSpec
- Calls kernel: hole(body, center, diameter, depth, holeType)

**RibOperation.ts**:
- Takes: sketch profile, thickness, direction, extrude to adjacent faces
- Parameters: sketchId, thickness, direction, bothSides
- Calls kernel: rib(body, profile, thickness, direction)

**DraftOperation.ts**:
- Takes: face selections, pull direction, draft angle, neutral plane
- Parameters: faceReferences, pullDirection, draftAngle, neutralPlaneId
- Calls kernel: draft(body, faces, direction, angle, neutralPlane)

**PatternOperation.ts**:
- Takes: source feature ID(s), pattern type (rectangular/circular/curve), count, spacing, angle
- Parameters: sourceFeatureIds, patternType, count, spacing, direction, angle
- Calls kernel: pattern(body, features, type, params)

**MirrorOperation.ts**:
- Takes: source feature ID(s) or body, mirror plane
- Parameters: sourceFeatureIds, mirrorPlaneId
- Calls kernel: mirror(body, plane)

**ScaleOperation.ts**:
- Takes: body, scale factor (uniform or non-uniform), origin point
- Parameters: bodyId, uniformScale, scaleX, scaleY, scaleZ, originPoint
- Calls kernel: scale(body, factor, origin)

**CombineOperation.ts**:
- Takes: target body, tool body, operation type (union/subtract/intersect)
- Parameters: targetBodyId, toolBodyId, operationType
- Calls kernel: booleanUnion/Subtract/Intersect(target, tool)

**SplitOperation.ts**:
- Takes: body, splitting plane/surface
- Parameters: bodyId, splitPlaneId
- Calls kernel: split(body, plane)

**DirectEditOperation.ts**:
- Move face: select face, move direction, distance
- Offset face: select face, offset distance
- Delete face: select face, heal opening
- Parameters: faceReferences, operationType, distance, direction

=== 2. FEATURE ENGINE ===

Create `src/features/FeatureEngine.ts`:

The orchestrator that evaluates the feature tree:

- evaluate(featureTree, sketches, kernel): evaluates all active features in order
- Returns: Map<featureId, Body> — each feature's resulting body/mesh
- On error: marks feature as status='error' with errorMessage
- Processing order: features sorted by index, then by dependency graph
- Each feature takes its sketch input + previous feature's output body → produces new body
- Extrude/Cut/Revolve/etc. create/modify bodies
- Pattern/Mirror create multiple copies
- Combine merges bodies

=== 3. UPDATE STUBKERNEL ===

Enhance `src/kernel/StubKernel.ts` to support all operations:

- fillet(body, edges, radius): round selected edges (approximate with rounded geometry)
- chamfer(body, edges, distance1, distance2): bevel edges
- shell(body, openFaces, thickness): hollow out body
- hole(body, center, diameter, depth, holeType): create hole
- draft(body, faces, direction, angle): apply draft angle
- pattern(body, features, type, params): pattern instances
- mirror(body, plane): mirror geometry
- scale(body, factor, origin): scale geometry
- booleanUnion/Subtract/Intersect(target, tool): CSG operations
- split(body, plane): split body
- moveFace(body, face, direction, distance): direct edit
- offsetFace(body, face, distance): offset face
- deleteFace(body, face): delete and heal

Each returns: { vertices, indices, normals, faceIds, edgeIds, vertexIds }

=== 4. FEATURE TREE UI ===

Create `src/ui/FeatureTreePanel.tsx`:

- Tree/list of all features in the current document
- Each row: icon (based on FeatureType), name, status indicator (active/suppressed/error)
- Drag to reorder (with dependency validation — red indicator for invalid drops)
- Right-click context menu: Edit Parameters, Suppress/Unsuppress, Delete, Rename
- Roll bar: horizontal line or draggable indicator showing current position in history
- Click on a feature → selects it, shows parameters in properties panel
- Double-click on a sketch-based feature → opens that sketch for editing

=== 5. SKETCH → FEATURE PIPELINE ===

Modify `src/app/EditorView.tsx`:

- Toggle between Sketch mode and 3D modeling mode
- From sketch mode: "Extrude" button in toolbar creates an ExtrudeFeature from the current sketch
- Feature tree panel on the left side
- 3D viewport on the right (shows the built body)
- When a feature is selected in the tree, its parameters show in the properties panel
- Parametric updates: changing a sketch dimension or feature parameter triggers re-evaluation

=== 6. UPDATE FILE I/O ===

Update `src/io/FileService.ts` and `src/domain/Document.ts`:
- Document now contains: featureTree, sketches, bodies (computed, not serialized)
- Serialization: feature tree + sketch data
- Deserialization: reconstruct features, re-evaluate engine

=== 7. REFERENCE GEOMETRY ===

Create `src/features/geometry/ReferenceGeometry.ts`:
- Plane: offset, angle, midpoint, tangent, through-line, through-three-points, at-angle-to-face, mid-plane
- Axis: through edge, through two points, through cylindrical face, intersection of two planes
- Point: at vertex, midpoint, center of circle/arc, intersection, on surface
- Coordinate System: origin + X, Y, Z axes

=== CROSS-CUTTING ===
- All feature code goes through IKernel (never call three.js directly)
- Domain models are serializable (toJSON/fromJSON)
- npm test passes with 90%+ coverage
- TypeScript strict mode

=== DON'T ===
- Don't add sheet metal (M3)
- Don't add assemblies (M3)
- Don't add surfaces (M4)

=== AFTER ===
- Verify: npx tsc --noEmit
- Verify: npm test -- --coverage (all passing, 90%+)
- Verify: npm run dev starts
- Commit: git add -A && git commit -m "feat: M2 phase 2 — complete feature engine, feature tree UI, sketch→feature pipeline, all operations"

Do NOT ask questions. Build it.