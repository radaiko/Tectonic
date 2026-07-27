=== CURRENT STATE ===
- ✅ PMI/3D annotations, materials library, hole table, auto-balloon, custom properties
- ❌ Image export / screenshot
- ❌ 3D PDF / HTML export
- ❌ Import image as sketch background
- ❌ Visual diff / compare
- ❌ Native CAD format import (SolidWorks, CATIA, NX, Creo, Inventor, Parasolid)
- ❌ Appearance library polish
- ❌ Video export of animation (MP4)
- ❌ Large assembly performance
- 1,468 tests passing

=== BUILD REMAINING FEATURES ===

=== PART 1 — IMAGE EXPORT ===

Create `src/io/ImageExporter.ts`:
- Capture current three.js viewport as PNG or JPEG
- Configurable resolution: screen, 2x, 4x, custom
- Configurable background: current, white, transparent
- Anti-aliasing via renderer settings
- Download trigger (or return Blob)
- Uses: renderer.domElement.toDataURL() or renderer.domElement.toBlob()

=== PART 2 — 3D PDF EXPORT ===

Create `src/io/ThreeDPdfExporter.ts`:
- Create a PDF with embedded 3D content (PRC or U3D format)
- PRC format: Product Representation Compact, binary encoding
- Include: tessellated mesh data, basic colors/materials, model tree
- PDF structure: catalog, page, 3D annotation, 3D stream
- Interactive: rotate, pan, zoom in Adobe Reader
- Fallback: if PRC is too complex, create a simple PDF with embedded U3D

=== PART 3 — HTML EXPORT ===

Create `src/io/HtmlExporter.ts`:
- Export standalone HTML file with embedded 3D viewer
- Include: three.js (bundled), OrbitControls, mesh data, materials, model tree
- Everything in a single HTML file (base64 data URIs)
- Works offline, no server needed
- Model tree: clickable part list on the side
- Basic controls: orbit, pan, zoom, reset view, toggle wireframe

=== PART 4 — IMPORT IMAGE ===

Create `src/io/ImageImporter.ts`:
- Import PNG, JPEG, GIF, BMP as sketch background
- On import: place on sketch plane, auto-scale to fit
- Properties: position (x, y), scale, rotation, opacity (0-1), lock/unlock
- Image data stored in .tectonic file as base64 data URL
- Render: draw image on the sketch canvas behind sketch geometry
- Controls: drag to move, corner handles to scale, opacity slider

=== PART 5 — VISUAL DIFF / COMPARE ===

Create `src/diff/VisualDiff.ts`:
- Compare two B-Rep bodies (or two versions of the same document)
- Compute: faces that changed, faces that are new, faces that were removed
- Color coding: green = added, red = removed, transparent = unchanged
- Face comparison: compare face normals, area, position to detect changes
- Mesh comparison: compare vertex positions within tolerance
- UI: toggle between versions, side-by-side, overlay, difference highlight
- Report: summary of changes (N faces added, M faces removed, K faces changed)

=== PART 6 — NATIVE CAD FORMAT IMPORT ===

Create `src/io/CadImportService.ts`:
- Import pipeline for proprietary CAD formats
- For each format: detect format from file header/binary signature
- Strategy: use CAD Exchanger SDK (WASM) if available, or implement basic mesh extraction
- For now: implement format detection and header parsing, create placeholder mesh
- Formats: SolidWorks (.sldprt/.sldasm), CATIA V5 (.CATPart/.CATProduct), NX (.prt), Creo (.prt/.asm), Inventor (.ipt/.iam), Parasolid (X_T/X_B), JT (.jt)
- Each returns: MeshData with metadata (original format, application, timestamp)

=== PART 7 — VIDEO EXPORT ===

Update `src/motion/capture.ts`:
- Add MP4 export using MediaRecorder API (browser-native)
- Capture canvas frames at configurable FPS (24, 30, 60)
- Duration: based on animation timeline
- Resolution: viewport or custom
- Codec: H.264 (via MediaRecorder)
- Progress callback during recording

=== PART 8 — LARGE ASSEMBLY PERFORMANCE ===

Create `src/performance/`:
- LevelOfDetail: automatic simplification of distant components (reduce triangle count)
- SelectiveLoading: only load visible/active components, lazy-load others
- BoundingBox proxy: show bounding box for distant components instead of full mesh
- Frustum culling: skip rendering components outside the view frustum
- Instance merging: merge identical meshes (same geometry, different position)
- Progressive loading: show simplified version first, refine over time

=== CROSS-CUTTING ===
- npm test passes
- TypeScript strict mode
- Image data embedded in .tectonic files (base64)
- HTML export is a single self-contained file
- Large assembly features are opt-in (user can toggle)

=== AFTER ===
- Verify: npx tsc --noEmit
- Verify: npm test
- Commit: git add -A && git commit -m "feat: image export, 3D PDF/HTML, import image, visual diff, native CAD import, video export, large assembly performance"

Do NOT ask questions. Build it.