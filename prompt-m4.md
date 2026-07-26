=== CURRENT STATE ===
- ✅ Full 2D sketch system (all entities, constraints, solver, tools, SketchEditor)
- ✅ Complete feature engine (Extrude, Revolve, Sweep, Loft, Cut, Fillet, Chamfer, Shell, Hole, Rib, Draft, Pattern, Mirror, Scale, Combine, Split, DirectEdit, FeatureTree, FeatureTreePanel, FeaturePropertiesPanel)
- ✅ Sheet metal domain (BaseFlange, EdgeFlange, MiterFlange, Hem, Jog, FlatPattern, FoldUnfold, SheetMetalEditor)
- ✅ Assembly system (AssemblyTree, Mate, MateSolver, AssemblyFeatures, AssemblyEditor)
- ✅ File I/O (.tectonic round-trip with features + sketches)
- ✅ 704+ tests passing, 90%+ coverage, TypeScript clean
- ❌ Surface modeling (M4)
- ❌ Import/export pipelines (STEP, STL, DXF, SVG, glTF, etc.)
- ❌ Multi-viewport
- ❌ View cube, visual styles
- ❌ Configurations/variants
- ❌ Touch/pen support
- ❌ Measure & analysis tools
- ❌ 3-agent code review (final step)

=== NEXT — M4: Surface Modeling + Advanced I/O ===

=== PART A — SURFACE MODELING ===

Create `src/surface/`:

**SurfaceCreation** (src/surface/SurfaceCreation.ts):
- Extrude/Revolve/Sweep/Loft — open profiles create surfaces (not solids)
- Boundary surface: create a 4-sided surface from 4 boundary curves
- Patch: fill a closed boundary of curves/edges
- Offset surface: offset an existing surface by distance
- Ruled surface: between two curves
- Extend surface: extend a surface edge by distance or to a boundary

**SurfaceEditing** (src/surface/SurfaceEditing.ts):
- Trim: trim a surface by a curve or another surface
- Untrim: restore a trimmed portion of a surface
- Extend: extend surface edges by distance
- Knit: merge multiple surfaces into a single surface
- Split: split a surface by a curve

**SurfaceToSolid** (src/surface/SurfaceToSolid.ts):
- Thicken: turn a closed surface into a solid by adding thickness
- Stitch: knit surfaces into a closed watertight solid body

**SurfaceFeature** (src/surface/SurfaceFeature.ts):
- Surface features integrate with the feature tree
- Each surface operation is a FeatureType in the tree
- Surface features can be parents of solid features (e.g., thicken)

=== PART B — IMPORT/EXPORT PIPELINES ===

Create `src/io/`:

**TectonicFormat** (already exists — enhance FileService.ts):
- Ensure full round-trip: all sketches, features, sheet metal, assemblies
- Version field for forward compatibility
- Human-readable JSON, self-contained

**STEP import** (src/io/StepImporter.ts):
- Parse STEP AP203/AP214 files (basic B-Rep import)
- Strategy: use WebAssembly-based STEP parser or basic ASCII parsing
- For now: parse header, entities, faces, return MeshData
- If full STEP parsing is too complex for StubKernel, implement a basic STP header parser and mesh importer

**STL import/export** (src/io/StlImporter.ts, src/io/StlExporter.ts):
- Read ASCII and binary STL files
- Write STL files (both formats)
- Configurable tessellation resolution

**DXF import/export** (src/io/DxfImporter.ts, src/io/DxfExporter.ts):
- Parse DXF files into sketch geometry (lines, circles, arcs)
- Export sketches to DXF
- Support R12/2000 formats

**SVG import/export** (src/io/SvgImporter.ts, src/io/SvgExporter.ts):
- Parse SVG paths into sketch geometry
- Export sketches to SVG

**OBJ export** (src/io/ObjExporter.ts):
- Export mesh data to Wavefront OBJ + MTL
- Configurable with normals, UVs

**glTF export** (src/io/GltfExporter.ts):
- Export to glTF/GLB (web-optimized 3D format)
- Include: mesh data, materials, transforms

**3MF export** (src/io/ThreeMfExporter.ts):
- Export to 3D Manufacturing Format

**PDF 2D drawing export** (src/io/PdfDrawingExporter.ts):
- Generate dimensioned orthographic 2D drawing in PDF
- Front, top, right views with dimensions
- Title block with part name, scale, date

=== CROSS-CUTTING ===
- Surface domain code is pure TypeScript (no React)
- Import/export pipelines go through the kernel (for STEP/STL) or direct (for DXF/SVG)
- npm test passes with 90%+ coverage
- TypeScript strict mode

=== DON'T ===
- Don't modify existing sketch/feature/sheetmetal/assembly code unless necessary
- Don't add a full WASM kernel (StubKernel is fine)

=== AFTER ===
- Verify: npx tsc --noEmit
- Verify: npm test -- --coverage
- Commit: git add -A && git commit -m "feat: M4 — surface modeling + import/export pipelines (STEP, STL, DXF, SVG, OBJ, glTF, 3MF, PDF)"

Do NOT ask questions. Build it.