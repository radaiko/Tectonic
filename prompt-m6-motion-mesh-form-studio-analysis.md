=== CURRENT STATE ===
- ✅ OpenCascade WASM B-Rep kernel
- ✅ 2D Drawing workspace
- ✅ Weldments + Standard Content Library
- ✅ Feature recognition + Derived components + Design automation

=== BUILD — Motion/Animation + Mesh Editing + Form/Sculpt Modeling + Part Studios + Advanced Analysis ===

=== PART 1 — MOTION / ANIMATION ===

Create `src/motion/`:

**JointAnimation** (src/motion/JointAnimation.ts):
- Takes an assembly with mate/joint definitions
- Animates: revolute (rotation), slider (translation), cylindrical (both), planar (sliding on plane)
- Keyframes: user-defined positions at specific times
- Interpolation: linear, ease-in, ease-out, bezier
- Timeline: drag to set keyframes, play/pause/scrub
- Output: export to GIF, video, or glTF animation

**MotionStudy** (src/motion/MotionStudy.ts):
- Define: input motion (motor at joint, force, prescribed motion)
- Compute: position, velocity, acceleration of all components
- Collision detection during motion
- Visualization: motion trails, velocity arrows, acceleration vectors

**AnimationUI** (src/motion/AnimationUI.tsx):
- Timeline panel with keyframes
- Play/Pause/Stop/Reverse controls
- Speed control
- Export to video (capture frames)

=== PART 2 — MESH EDITING ===

Create `src/mesh/`:

**MeshImport** (src/mesh/MeshImport.ts):
- Import STL/OBJ mesh files
- Validate: closed manifold, non-manifold edges, zero-area faces, inverted normals
- Repair: fill holes, stitch edges, remove duplicate vertices, flip normals
- Simplify: decimate (reduce triangle count), smooth (Laplacian), remesh

**MeshToSolid** (src/mesh/MeshToSolid.ts):
- Convert mesh to B-Rep solid via OpenCascade
- Facet approximation: tessellated shape as B-Rep
- Watertight check: ensure mesh is closed before conversion
- Sharp feature preservation: detect and preserve edges

**MeshEdit** (src/mesh/MeshEdit.ts):
- Select faces/edges/vertices
- Move, rotate, scale selected
- Extrude face (push/pull)
- Bevel edge
- Bridge: connect two edge loops
- Fill hole
- Boolean: union, subtract, intersect with mesh

**MeshEditor** (src/mesh/MeshEditor.tsx):
- Dedicated mesh editing mode
- Vertex/edge/face selection
- Transformation tools
- Repair/cleanup buttons
- Convert to solid button

=== PART 3 — FORM / SCULPT MODELING ===

Create `src/form/`:

**SubdivisionSurface** (src/form/SubdivisionSurface.ts):
- Base: control cage (quad mesh)
- Subdivision: Catmull-Clark subdivision (level 0-5)
- Crease: sharp edges, partial crease
- Symmetry: mirror, radial, pattern
- Result: smooth subdivision surface → convert to B-Rep or mesh

**FormControl** (src/form/FormControl.ts):
- Create primitive cage: box, sphere, cylinder, torus, plane
- Edit cage: move vertices, split edges, extrude faces, bevel, bridge
- Subdivision preview: show smoothed result
- Crease tool: mark edges as sharp
- Insert edge loop, connect, collapse

**FormToSolid** (src/form/FormToSolid.ts):
- Convert subdivision surface to B-Rep solid
- Tessellation level control
- Watertight output

**FormEditor** (src/form/FormEditor.tsx):
- Dedicated form/sculpt mode
- Cage editing with 3D manipulation widgets
- Subdivision level slider
- Symmetry options
- Convert to solid button

=== PART 4 — PART STUDIOS ===

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

=== PART 5 — ADVANCED ANALYSIS ===

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
- Configurable: pull direction, draft angle threshold

**WallThicknessMap** (src/analysis/advanced/WallThicknessMap.ts):
- Analyze wall thickness across the entire body
- Color: red (too thin), green (nominal), blue (too thick)
- Configurable: target thickness, tolerance range
- Display: cross-section thickness lines, heat map overlay

**MinimumRadius** (src/analysis/advanced/MinimumRadius.ts):
- Find minimum radius on selected edges or entire body
- Highlight: tightest radius with marker
- Report: min, max, average radius

**AnalysisUI** (src/analysis/advanced/AnalysisUI.tsx):
- Toolbar: toggle each analysis type
- Overlay: analysis results shown on the 3D model
- Legend: color scale for heat maps
- Configurable: thresholds, directions, density

=== CROSS-CUTTING ===
- npm test passes
- TypeScript strict mode
- Form/sculpt integrates with the feature tree (FormFeature as a FeatureType)
- Part Studios are a new document mode (alongside single-part and assembly)
- Motion uses the existing mate solver for animation

=== AFTER ===
- Verify: npx tsc --noEmit
- Verify: npm test
- Commit: git add -A && git commit -m "feat: motion/animation, mesh editing, form/sculpt modeling, Part Studios, advanced analysis (curvature, zebra, draft, wall thickness)"

Do NOT ask questions. Build it.