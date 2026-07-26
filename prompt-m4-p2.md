=== CURRENT STATE ===
- ✅ Surface modeling (creation, editing, surface-to-solid, feature integration)
- ❌ Import/export pipelines: STEP, STL, DXF, SVG, OBJ, glTF, 3MF, PDF
- 704 tests passing, TypeScript clean compile

=== WHAT TO BUILD — M4 Phase 2: Import/Export Pipelines ===

Build the complete I/O system in src/io/:

**STL Import/Export** (src/io/StlImporter.ts, src/io/StlExporter.ts):
- Import: read ASCII and binary STL files, parse facets (vertices, normals), return MeshData
- Export: write MeshData to ASCII and binary STL with configurable resolution
- Both formats must be correct and parseable by standard STL readers

**DXF Import/Export** (src/io/DxfImporter.ts, src/io/DxfExporter.ts):
- Import: parse DXF R12/2000 format, extract LINE, CIRCLE, ARC, POLYLINE entities → convert to sketch entities
- Export: write sketch entities (lines, circles, arcs) to DXF R12 format
- Support: layers, colors (basic), units

**SVG Import/Export** (src/io/SvgImporter.ts, src/io/SvgExporter.ts):
- Import: parse SVG path data (M, L, C, Q, A commands) → convert to sketch entities
- Export: write sketch entities to SVG path elements
- Support: viewBox, transforms (basic), stroke attributes

**OBJ Export** (src/io/ObjExporter.ts):
- Export MeshData (vertices, indices, normals, UVs) to Wavefront OBJ format
- Also write MTL material file
- Support: object groups, smooth shading, texture coordinates

**glTF Export** (src/io/GltfExporter.ts):
- Export to glTF JSON format (embedded, not GLB binary for simplicity)
- Include: meshes, accessors, buffer views, materials, node hierarchy
- Support: normals, indices

**3MF Export** (src/io/ThreeMfExporter.ts):
- Export to 3D Manufacturing Format (ZIP containing .model XML)
- Support: mesh data, materials, transforms

**STEP Import** (src/io/StepImporter.ts):
- Basic STEP AP203/AP214 header parser
- For now: parse header info, create a placeholder mesh from entity count
- Full B-Rep parsing requires OpenCascade WASM — implement what's feasible without it

**PDF 2D Drawing** (src/io/PdfDrawingExporter.ts):
- Generate simple PDF with dimensioned orthographic views
- Front, top, and right views of the model
- Dimensions on each view
- Title block with: part name, scale, date, material

**TectonicFormat updates** (src/io/FileService.ts):
- Ensure the .tectonic format can serialize/deserialize all new types
- Update version field
- Add migration path from older versions

=== CROSS-CUTTING ===
- I/O code is pure TypeScript (no React)
- Each importer/exporter is a standalone module with a clear interface
- npm test passes with 90%+ coverage
- TypeScript strict mode
- Tests for each format: import test model → verify parsed data, export test model → verify format correctness

=== DON'T ===
- Don't modify existing sketch/feature/surface/assembly code
- Don't add WASM kernel dependency (StubKernel is fine)

=== AFTER ===
- Verify: npx tsc --noEmit
- Verify: npm test -- --coverage
- Commit: git add -A && git commit -m "feat: M4 phase 2 — import/export pipelines (STL, DXF, SVG, OBJ, glTF, 3MF, PDF, STEP)"

Do NOT ask questions. Build it.