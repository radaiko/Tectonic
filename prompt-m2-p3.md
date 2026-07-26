=== CURRENT STATE ===
- ✅ Complete feature engine (all operations implemented in FeatureEngine + FeatureTree)
- ✅ All operations: Extrude, Revolve, Sweep, Loft, Cut, Fillet, Chamfer, Shell, Hole, Rib, Draft, Pattern, Mirror, Scale, Combine, Split, DirectEdit
- ✅ StubKernel supports all operations
- ✅ Reference geometry module
- ❌ No tests for features (coverage dropped to 70%)
- ❌ FeatureTreePanel.tsx UI component missing
- ❌ EditorView not integrated with feature tree
- 599 tests passing, TypeScript clean compile

=== WHAT TO BUILD — M2 Phase 3: Tests + FeatureTreePanel UI ===

=== 1. WRITE TESTS FOR FEATURE SYSTEM ===

Create tests at tests/features/:

**FeatureTree.test.ts** (at least 15 tests):
- Creating FeatureTree with empty list
- Add features in order
- Remove feature and its dependents
- Reorder feature (valid and invalid — should reject invalid reorder)
- Suppress and unsuppress features
- Move roll bar forward and backward
- Get active features (after roll bar, suppressed, errored)
- Dependency graph construction
- Serialize and deserialize feature tree
- Validate dependencies (circular dependency rejection)

**FeatureEngine.test.ts** (at least 10 tests):
- Evaluate empty feature tree
- Evaluate single extrude feature
- Evaluate multiple features in order
- Feature with error status — other features continue
- Re-evaluation after parameter change
- Feature dependency chain
- Pattern/Mirror evaluation

**Operations tests** (at tests/features/operations/):
- ExtrudeOperation.test.ts: basic extrude, with draft, two-sided, cut
- FilletOperation.test.ts: basic fillet, variable radius
- ChamferOperation.test.ts: distance-distance, distance-angle
- ShellOperation.test.ts: uniform thickness
- PatternOperation.test.ts: rectangular pattern, circular pattern
- CombineOperation.test.ts: union, subtract, intersect
- Each test: create operation, verify parameters, verify serialization

Test approach: use the StubKernel for all tests (not a real WASM kernel). Test that operations produce expected mesh properties (vertex count, approximate shape).

=== 2. FEATURE TREE UI ===

Create `src/ui/FeatureTreePanel.tsx` + `src/ui/FeatureTreePanel.css`:

React component showing the feature tree:
- List/accordion of all features in order
- Each row: icon (based on FeatureType), feature name, status indicator (green=active, yellow=suppressed, red=error)
- Drag and drop reordering (with dependency check)
- Right-click context menu with options: Edit Parameters, Suppress/Unsuppress, Delete, Rename
- Roll bar indicator: a horizontal line or slider showing current position in history
- When a feature is selected (clicked), highlight it and show its parameters in the properties panel
- Expand/collapse for features with children
- Highlight dependent features when hovering over a feature

=== 3. INTEGRATE WITH EDITORVIEW ===

Modify `src/app/EditorView.tsx`:
- Add FeatureTreePanel on the left side
- Add a tab/toggle between sketch and 3D mode
- In sketch mode: show sketch editor + properties
- In 3D mode: show 3D viewport + feature tree + properties
- "Extrude" button in sketch mode toolbar: creates ExtrudeFeature and switches to 3D mode
- Properties panel shows feature parameters when a feature is selected
- Changing a feature parameter triggers re-evaluation

=== 4. CREATE FEATURE PROPERTIES UI ===

Create `src/ui/FeaturePropertiesPanel.tsx`:
- Shows all parameters of the currently selected feature
- Inline editing with numeric inputs for distances, angles
- Dropdowns for operation types (blind/through-all, one-sided/symmetric)
- Apply button or live preview on change
- Read-only display of computed values (resulting body size, etc.)

=== CROSS-CUTTING ===
- npm test must pass with 90%+ coverage (currently 70%, need 90%)
- TypeScript strict mode
- React components in src/ui/, no React in src/features/
- FeatureTree and FeatureEngine tests must be thorough

=== DON'T ===
- Don't change feature operations (they work)
- Don't add sheet metal, assemblies, surfaces

=== AFTER ===
- Verify: npx tsc --noEmit
- Verify: npm test -- --coverage (all passing, 90%+)
- Commit: git add -A && git commit -m "feat: M2 phase 3 — feature tests, FeatureTreePanel, EditorView integration, FeaturePropertiesPanel"

Do NOT ask questions. Build it.