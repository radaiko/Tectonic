=== CURRENT STATE ===
- ✅ OpenCascade WASM B-Rep kernel (real NURBS geometry)
- ✅ All core CAD: sketch, features, sheet metal, assemblies, surfaces, I/O
- ❌ 2D Drawing workspace — missing full interactive technical drawings

=== BUILD — 2D Drawing Workspace ===

Onshape and Fusion 360 have dedicated drawing workspaces where engineers create dimensioned technical drawings from 3D models. Build this for Tectonic.

=== 1. DRAWING DOMAIN MODEL ===

Create `src/drawing/domain/`:

**DrawingDocument** (src/drawing/domain/DrawingDocument.ts):
- id, name, sheet size (A0-A4, Letter, custom width/height), orientation (portrait/landscape)
- scale: number (e.g., 1:1, 1:2, 2:1)
- views: DrawingView[]
- annotations: Annotation[]
- titleBlock: TitleBlock
- revisionTable: RevisionTable
- toJSON() / fromJSON()

**DrawingView** (src/drawing/domain/DrawingView.ts):
- Types: orthographic (front/top/right/left/bottom/back), section, detail, auxiliary, isometric
- position: { x, y } on the sheet
- scale: number (per-view scale override)
- sourcePartId: string (which part/assembly this view shows)
- parentViewId: string | null (for projected views, section views)
- sectionLine: { start, end, reference } | null (for section views)
- detailCircle: { center, radius } | null (for detail views)
- displayOptions: { visibleEdges, hiddenEdges, tangentEdges, shading }

**Annotation** (src/drawing/domain/Annotation.ts):
- Types: linear dimension, aligned dimension, angular dimension, radial dimension, diametric dimension, ordinate dimension, note/text, datum feature, datum target, feature control frame, surface finish, weld symbol, center mark, center line, hole callout, balloon, leader
- Each annotation: id, type, position, referenceViewId, referenced geometry (edges/vertices), value, tolerance, precision

**TitleBlock** (src/drawing/domain/TitleBlock.ts):
- Fields: company name, part name, part number, material, finish, scale, date, drawn by, checked by, approved by, revision
- Each field: label, value, position, font size
- Customizable: user can add/remove fields

**RevisionTable** (src/drawing/domain/RevisionTable.ts):
- Rows: revision letter, description, date, approved by
- Auto-increment revision on save

=== 2. VIEW GENERATION ===

Create `src/drawing/views/ViewGenerator.ts`:

Generate 2D orthographic views from 3D geometry:

- Project 3D geometry onto 2D planes (front, top, right, etc.)
- Compute visible edges (silhouette), hidden edges (dashed), tangent edges
- Hidden line removal: determine which edges are occluded
- Projection types: first-angle (ISO) and third-angle (ANSI)
- Scale: fit view to available space on sheet
- Automatic layout: arrange views on sheet with proper alignment

**SectionViewGenerator** (src/drawing/views/SectionViewGenerator.ts):
- Take a cut plane through the 3D model
- Generate cross-section view with section hatching
- Support: full section, half section, offset section, broken-out section, rotated section

**DetailViewGenerator** (src/drawing/views/DetailViewGenerator.ts):
- Take a circular region from a parent view
- Generate enlarged detail view with detail circle indicator

**AuxiliaryViewGenerator** (src/drawing/views/AuxiliaryViewGenerator.ts):
- Project view perpendicular to a selected edge or face

=== 3. DIMENSIONING ===

Create `src/drawing/dimensions/`:

**AutoDimension** (src/drawing/dimensions/AutoDimension.ts):
- Automatically place dimensions on views: horizontal, vertical, radial, angular
- Avoid overlaps: smart dimension placement
- Baseline and chain dimensioning styles

**DimensionStyles** (src/drawing/dimensions/DimensionStyles.ts):
- Arrowheads: filled, open, dot, slash, arch
- Text: font, size, position (above line, aligned, ISO)
- Tolerance: none, symmetrical, deviation, limits, fit

=== 4. DRAWING EDITOR UI ===

Create `src/drawing/DrawingEditor.tsx` + `src/drawing/DrawingEditor.css`:

The interactive drawing workspace:

- **Sheet view**: rendered SVG/Canvas sheet with all views
- **View manipulation**: drag to reposition views, scale, delete
- **View creation toolbar**: New View, Projected View, Section View, Detail View, Auxiliary View
- **Annotation toolbar**: Dimension, Note, Balloon, Center Mark, GD&T, Surface Finish
- **Properties panel**: select a view/annotation → edit its properties
- **Title block editor**: click fields to edit values
- **Revision table**: auto-managed
- **Sheet setup**: paper size, orientation, scale

=== 5. AUTOMATIC VIEW LAYOUT ===

Create `src/drawing/views/AutoLayout.ts`:
- Given a 3D model and sheet size, compute optimal view positions
- Standard 3-view layout: front, top, right (aligned)
- Add isometric view in corner
- Scale each view to fit available space

=== 6. INTEGRATION ===

Add to the app:
- Drawing mode/tab in the main editor
- "Create Drawing" button in the 3D view toolbar
- Drawing file type (.tectonic drawing) or embedded in the .tectonic document
- Export drawing to PDF, DXF, SVG

=== 7. TESTS ===

Create tests at tests/drawing/:
- DrawingDocument serialization round-trip
- View generation (orthographic projection of a simple box)
- Hidden line removal correctness
- Dimension placement (no overlap)
- Title block field editing
- Section view generation
- Auto-layout for standard sheet sizes

=== CROSS-CUTTING ===
- TypeScript strict mode
- Domain code is pure TypeScript (no React in src/drawing/domain/)
- npm test passes with 90%+ coverage
- Drawing files are standalone (.tectonic drawing) or embedded in the main .tectonic file

=== AFTER ===
- Verify: npx tsc --noEmit
- Verify: npm test
- Commit: git add -A && git commit -m "feat: 2D drawing workspace — interactive technical drawings, auto view generation, dimensioning, GD&T, title blocks"

Do NOT ask questions. Build it.