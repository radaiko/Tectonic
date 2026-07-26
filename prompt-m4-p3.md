=== CURRENT STATE ===
- ✅ STL, DXF, SVG import/export pipelines
- ❌ Missing: OBJ, glTF, 3MF, PDF drawing, STEP import
- 821 tests passing, TypeScript clean compile

=== BUILD REMAINING I/O FORMATS ===

Create these in src/io/:

**ObjExporter** (src/io/ObjExporter.ts):
- Export MeshData (vertices, indices, normals) to Wavefront OBJ format
- Write companion MTL material file
- Support: object groups (g), smooth shading (s), vertex normals, texture coordinates
- Test: export a known mesh, verify format correctness

**GltfExporter** (src/io/GltfExporter.ts):
- Export to glTF JSON (not GLB binary)
- Structure: scene → nodes → meshes → accessors → bufferViews → buffer (base64-embedded)
- Include: POSITION accessor, NORMAL accessor, INDEX accessor
- Material support (PBR metallic-roughness, basic)
- No external .bin file — embed everything in the JSON as data URIs
- Test: export a simple mesh, verify structure with glTF schema

**ThreeMfExporter** (src/io/ThreeMfExporter.ts):
- Export to 3D Manufacturing Format (.3mf)
- Content-types: [Content_Types].xml, 3D/3dmodel.model
- Mesh resources with vertices and triangles
- Basic material/color support
- Package as ZIP archive
- Test: export a simple mesh, verify ZIP structure

**PdfDrawingExporter** (src/io/PdfDrawingExporter.ts):
- Generate PDF 2D drawing of the part (no external PDF library — use simple PDF syntax)
- Three orthographic views: front, top, right (side-by-side on A4 landscape)
- Each view shows: silhouette edges with dimensions
- Title block with: part name, scale, date, material
- Basic PDF content stream (pages, annotations, simple graphics)
- No external dependencies — write raw PDF

**StepImporter** (src/io/StepImporter.ts):
- Parse STEP AP203/AP214 file headers (ISO-10303-21)
- Extract: file description, name, timestamp, author
- Parse basic entities: CARTESIAN_POINT, DIRECTION, VECTOR, LINE, CIRCLE
- For now: import 2D sketches (edges, arcs) as sketch entities
- Full B-Rep import requires OpenCascade WASM — implement what's feasible

**Update FileService** (src/io/FileService.ts):
- Add export method for each new format
- Import method auto-detects format from file extension

=== CROSS-CUTTING ===
- npm test passes
- TypeScript strict mode
- Each exporter is a standalone module

=== AFTER ===
- Verify: npx tsc --noEmit
- Verify: npm test
- Commit: git add -A && git commit -m "feat: M4 phase 3 — OBJ, glTF, 3MF, PDF, STEP I/O pipelines"

Do NOT ask questions. Build it.