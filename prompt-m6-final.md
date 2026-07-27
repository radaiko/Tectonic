=== CURRENT STATE ===
- ✅ OpenCascade WASM kernel
- ✅ 2D Drawing workspace
- ✅ Weldments + Standard Library
- ✅ Feature recognition + Derived components + Design automation
- ✅ Motion/Animation + Mesh editing + Form sculpting
- ❌ Part Studios (multiple parts sharing sketches)
- ❌ Advanced analysis (curvature combs, zebra stripes, draft heat map, wall thickness map)
- ❌ Tests for new modules (motion, mesh, form, recognition, automation, derived, drawing)
- 1,409 tests passing

=== BUILD REMAINING — Part Studios + Advanced Analysis + Tests ===

=== PART 1 — PART STUDIOS ===

Create `src/studio/`:

**PartStudio** (src/studio/PartStudio.ts):
- A single tab/workspace with multiple parts sharing sketches
- Sketches at the studio level (not per-part)
- Features reference studio-level sketches
- Each part in the studio has its own feature tree
- Parts can reference other parts' geometry (shared edges, faces)
- toJSON() / fromJSON()

**PartStudioEditor** (src/studio/PartStudioEditor.tsx):
- Part list with visibility toggles
- Shared sketch browser
- Feature tree per part
- Reference visualization: highlight which part uses which sketch

=== PART 2 — ADVANCED ANALYSIS ===

Create `src/analysis/advanced/`:

**CurvatureComb** (src/analysis/advanced/CurvatureComb.ts):
- Display curvature combs on selected edges
- Show: curvature magnitude, direction, inflection points
- Color: green (smooth), red (tight), blue (flat)

**ZebraStripes** (src/analysis/advanced/ZebraStripes.ts):
- Reflective stripe analysis on surfaces
- Detect: surface discontinuities, tangent discontinuities, curvature discontinuities
- Configurable: stripe density, angle, movement (animated)

**DraftHeatMap** (src/analysis/advanced/DraftHeatMap.ts):
- Color-coded analysis of face angles relative to pull direction
- Red: < 0° (undercut), yellow: 0-1° (risky), green: 1-3° (draft), blue: > 3° (safe)

**WallThicknessMap** (src/analysis/advanced/WallThicknessMap.ts):
- Analyze wall thickness across the entire body
- Color: red (too thin), green (nominal), blue (too thick)
- Configurable: target thickness, tolerance range

**MinimumRadius** (src/analysis/advanced/MinimumRadius.ts):
- Find minimum radius on selected edges or entire body
- Report: min, max, average radius

**AnalysisUI** (src/analysis/advanced/AnalysisUI.tsx):
- Toggle each analysis type
- Results overlay on 3D model
- Color scale legend

=== PART 3 — TESTS ===

Create tests for all new modules:

**tests/motion/**:
- JointAnimation.test.ts: keyframe creation, interpolation, timeline
- MotionStudy.test.ts: input motion, collision detection
- AnimationUI.test.ts: play/pause controls

**tests/mesh/**:
- MeshImport.test.ts: STL import, validation, repair
- MeshEdit.test.ts: face selection, move, extrude
- MeshToSolid.test.ts: conversion to B-Rep

**tests/form/**:
- SubdivisionSurface.test.ts: Catmull-Clark subdivision, crease, symmetry

**tests/recognition/**:
- FeatureRecognizer.test.ts: extrude/hole/fillet recognition

**tests/automation/**:
- ParameterTable.test.ts: expressions, unit conversion
- RulesEngine.test.ts: if-then rules, event triggers
- DesignScript.test.ts: script execution

**tests/assembly/**:
- DerivedPart.test.ts: derived part creation, source update propagation
- LinkedComponent.test.ts: external file reference
- TopDownDesign.test.ts: in-context part creation

**tests/drawing/**:
- DrawingDocument.test.ts: serialization round-trip
- ViewGenerator.test.ts: orthographic projection
- AutoDimension.test.ts: dimension placement

=== CROSS-CUTTING ===
- npm test passes with 90%+ coverage
- TypeScript strict mode
- Part Studios integrate with the feature tree

=== AFTER ===
- Verify: npx tsc --noEmit
- Verify: npm test -- --coverage
- Commit: git add -A && git commit -m "feat: Part Studios + advanced analysis + tests for all new modules"

Do NOT ask questions. Build it.