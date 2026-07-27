=== CURRENT STATE ===
- ✅ All core CAD: sketch, features, sheet metal, assemblies, surfaces, drawing workspace, weldments, standard library, feature recognition, derived components, design automation, motion, mesh editing, form sculpting, Part Studios, advanced analysis
- ❌ PMI / 3D Annotations (model-based definition)
- ❌ Materials library (engineering + visual)
- ❌ Hole table in drawings
- ❌ Auto-balloon in drawings
- ❌ Image export / screenshot
- ❌ 3D PDF / HTML export
- ❌ Custom properties / metadata
- ❌ Import image as sketch background
- ❌ Visual diff / compare
- ❌ Large assembly performance
- ❌ Native CAD format import
- ❌ Appearance library
- ❌ Video export of animation
- 1,468 tests passing

=== BUILD REMAINING CAD FEATURES ===

=== PART 1 — PMI / 3D ANNOTATIONS (Model-Based Definition) ===

Create `src/pmi/`:

**PmiAnnotation** (src/pmi/PmiAnnotation.ts):
- Types: linear dimension, angular dimension, radial dimension, diametric dimension, ordinate dimension, coordinate dimension, chamfer dimension, hole callout
- Tolerance types: symmetrical, deviation, limits, fit (H7/g6 etc.), general tolerance
- Datum feature symbol, datum target
- Feature control frame (GD&T): geometric characteristic, tolerance value, datums, material condition modifiers (MMC, LMC, RFS)
- Surface finish symbol (Ra, Rz, lay direction)
- Welding symbol
- Note / text
- Leader: arrowhead type, attachment point (face/edge/vertex), leader line path, break lines
- 3D position: plane on which the annotation sits (oriented to view)
- toJSON() / fromJSON()

**PmiView** (src/pmi/PmiView.ts):
- Annotations are organized into "annotation views" (analogous to drawing views but on the 3D model)
- Each view has: a named orientation (front, top, right, isometric, or custom), associated annotations
- Users can toggle annotation view visibility

**PmiEditor** (src/pmi/PmiEditor.tsx):
- Toolbar: Dimension, GD&T, Datum, Surface Finish, Note
- Click face/edge/vertex to attach annotation
- Leader editing: drag leader points
- Annotation properties panel (edit value, tolerance, text)
- Toggle annotation view visibility
- Show/hide all annotations
- Collision detection: avoid overlapping annotations

=== PART 2 — MATERIALS LIBRARY ===

Create `src/material/`:

**PhysicalMaterial** (src/material/PhysicalMaterial.ts):
- Name, category (metal, plastic, ceramic, wood, glass, rubber, composite, fluid, other)
- Density (g/cm³), Young's modulus (GPa), Poisson's ratio, yield strength (MPa), ultimate tensile strength (MPa), thermal conductivity (W/m·K), thermal expansion coefficient (1/K), specific heat (J/kg·K)
- Color, finish (matte, gloss, satin, polished, brushed, anodized, painted)
- Subcategory: steel (carbon, stainless, tool), aluminum (6061, 7075, 2024), titanium, copper, brass, bronze, ABS, PLA, nylon, polycarbonate, acrylic, glass, wood (oak, maple, pine), rubber
- toJSON() / fromJSON()

**MaterialLibrary** (src/material/MaterialLibrary.ts):
- Built-in library: 100+ standard materials with real engineering properties
- Based on: MatWeb, ASM, CES Selector data
- Categories tree (Metal → Steel → Carbon → AISI 1018, AISI 1045, etc.)
- User-defined materials (add, edit, delete)
- Favorites
- Search by name, category, property range

**VisualAppearance** (src/material/VisualAppearance.ts):
- Base color (RGB)
- Metallic factor (0-1)
- Roughness factor (0-1)
- Opacity (0-1)
- Texture map (URL or data URL for image)
- Normal map
- Emission color + intensity
- Clearcoat / clearcoat roughness

**AppearanceLibrary** (src/material/AppearanceLibrary.ts):
- Presets: steel (brushed, polished, painted), aluminum (brushed, anodized), plastic (glossy, matte, textured), glass (clear, frosted), rubber, wood, carbon fiber
- Based on physically-based rendering (PBR) parameters

**MaterialUI** (src/material/MaterialUI.tsx):
- Material browser: search, filter by category, preview thumbnail
- Assign material to part/body/face
- Material editor: edit physical + visual properties
- Appearance picker: select from presets, custom color

**MaterialIntegration**:
- Mass properties use material density for accurate weight calculation
- Visual appearance updates the 3D viewport rendering
- BOM includes material column
- Material is serialized in .tectonic file

=== PART 3 — HOLE TABLE ===

Create `src/drawing/annotations/HoleTable.ts`:
- Detect all hole features in a part/assembly
- For each hole: position (X, Y, Z coordinates), size (diameter), depth, type (through/blind/countersink/counterbore), thread specification, angle
- Table output: rows = holes, columns = position, size, depth, type, thread
- Sort: by size, by position, by type
- Table style: configurable column widths, headers, font
- Insert into drawing workspace as a table

=== PART 4 — AUTO-BALLOON ===

Create `src/drawing/annotations/AutoBalloon.ts`:
- Detect all unique components in an assembly drawing view
- Create balloon annotations for each component
- Balloon types: circle, circle with line, hexagon, triangle, square, split circle
- Numbering: sequential, by BOM order, by component name
- Layout: automatic layout with overlap avoidance, radial, horizontal, vertical
- BOM linkage: each balloon linked to BOM item number

=== PART 5 — IMAGE EXPORT / SCREENSHOT ===

Create `src/io/ImageExporter.ts`:
- Capture current viewport as PNG or JPEG
- Configurable resolution (screen, 1x, 2x, 4x, custom)
- Transparent background option
- Anti-aliasing (MSAA samples)
- Full viewport or selection only
- Download trigger

=== PART 6 — 3D PDF / HTML EXPORT ===

Create `src/io/ThreeDPdfExporter.ts`:
- Export 3D model as interactive PDF (PRC format embedded in PDF)
- Include: mesh data, basic colors/materials, model tree
- Interactive: rotate, pan, zoom in PDF viewer (Adobe Reader)
- PRC (Product Representation Compact) format: binary encoding of B-Rep or tessellated geometry

Create `src/io/HtmlExporter.ts`:
- Export standalone HTML file with embedded 3D viewer
- Uses: three.js (embedded), OrbitControls
- Include: mesh, colors, materials, model tree (clickable)
- Single HTML file (everything embedded as data URIs)
- Works offline, no server needed

=== PART 7 — CUSTOM PROPERTIES ===

Create `src/domain/Properties.ts`:
- PropertySet: Map<string, PropertyValue> on any entity (part, assembly, feature, body)
- PropertyValue: string | number | boolean | Date | string[]
- PropertyDefinition: name, type, defaultValue, allowedValues, required
- Global property schema for the document
- Serialization in .tectonic file

**PropertiesUI** (src/ui/PropertiesPanel.tsx):
- Edit properties of selected entity
- Add/remove properties
- Property editor with type-aware inputs (text, number, checkbox, date, dropdown)
- Grid view: key-value pairs

=== PART 8 — IMPORT IMAGE ===

Create `src/io/ImageImporter.ts`:
- Import PNG, JPEG, GIF, BMP, SVG as sketch background
- Place on sketch plane: position, scale, rotation
- Lock/unlock (prevent accidental movement)
- Opacity slider (fade to trace)
- Delete
- Serialization: embed image data in .tectonic file

=== CROSS-CUTTING ===
- npm test passes
- TypeScript strict mode
- PMI is separate from 2D drawings (3D vs 2D annotations)
- Materials library is built-in JSON (no external dependencies)
- Image data is embedded in .tectonic files (base64)

=== AFTER ===
- Verify: npx tsc --noEmit
- Verify: npm test
- Commit: git add -A && git commit -m "feat: PMI/3D annotations, materials library, hole table, auto-balloon, image export, 3D PDF/HTML, custom properties, image import"

Do NOT ask questions. Build it.