# Feature reference

Every capability area in Tectonic, with what each one covers. Scope is CAD only — no CAM,
no simulation, no generative design.

---

## Modeling

### 2D Sketching

- 14 entity types: line, circle, arc, rectangle, polygon, ellipse, spline, point,
  construction geometry, slot, text, offset curve, projected edge, image reference
- 19 geometric constraints: coincident, collinear, parallel, perpendicular, tangent,
  concentric, equal, symmetric, horizontal, vertical, midpoint, fix, and more
- Dimensional constraints with equations and global parameter references
- Snap system: grid, endpoint, midpoint, center, intersection, tangent, perpendicular
- Canvas 2D renderer, degrees-of-freedom feedback for under- and over-defined sketches

### 3D Part Modeling

- Ordered feature tree with roll bar, reorder, suppress, and a dependency graph
- Extrude, revolve, sweep, loft
- Fillet, chamfer, shell, hole, draft, rib
- Linear, circular and sketch-driven patterns; mirror
- Scale, combine (union / subtract / intersect), split
- Direct editing on faces and edges

### Surface Modeling

- Extrude, revolve, sweep and loft of open profiles
- Boundary surface, patch, offset, ruled
- Extend, trim, untrim, knit, split
- Thicken and stitch to close a shell into a solid

### Form / Sculpt Modeling

- Catmull-Clark subdivision surfaces
- Crease and symmetry
- Primitive cages as a starting point
- Convert to solid

### Mesh Editing

- Import STL and OBJ
- Validate: manifold check, orientation, self-intersection
- Repair: fill holes, stitch, remove duplicates
- Edit: extrude face, bevel, bridge, fill hole
- Simplify (decimation), convert to B-Rep solid

---

## Environments

### Sheet Metal

- Base flange, edge flange, miter flange
- Hem, jog, closed corner
- Unfold and refold
- Flat pattern with DXF export
- Bend allowance and bend deduction, K-factor, corner relief

### Assemblies

- Hierarchical assembly tree with subassemblies
- 16 mate and joint types: fixed, revolute, slider, cylindrical, planar, ball, screw,
  gear, belt, rack-and-pinion, pin-slot, parallel, tangent, concentric, distance, angle
- Mate solver with degrees-of-freedom reporting
- Bill of materials
- Exploded views
- Interference detection

### Weldments

- Structural members swept along sketch paths
- Standard profiles: I-beam, C-channel, angle, T-beam, tube, pipe, flat bar
- Miter, butt and cope joints
- End treatments and trim-to-member

### 2D Drawings

- Interactive drawing workspace
- Auto-generated orthographic views from the 3D model
- Section, detail and auxiliary views
- Dimensions and GD&T
- Title blocks, revision tables, hole tables
- Auto-balloon against the assembly BOM

### Part Studios

- Multiple parts sharing sketches in a single tab
- Per-part feature trees
- Reference visualization between parts

---

## Data and automation

### Standard Content Library

- Parametric fasteners: bolts, nuts, washers, screws, bearings, pins, keys
- Standards: DIN, ISO, ANSI
- Structural steel profiles per DIN EN and AISC

### Materials

- 100+ engineering materials
- Physical properties: density, elastic modulus, yield and tensile strength, thermal
  conductivity and expansion
- Visual appearances (PBR): base color, metallic, roughness, opacity, texture
- Appearance presets

### Configurations / Variants

- Table-driven design
- Parameter overrides per configuration
- Suppression state per configuration
- Component instance swaps
- Derived configurations

### Design Automation

- Global parameter table with expressions: `sin`, `cos`, `tan`, `sqrt`, `pow`, `abs`,
  `min`, `max`, and arithmetic over named parameters
- If-then rules engine
- JSON-based design scripts

### Derived Components

- Derived parts: a part that references another part with modifications applied
- Linked components: references to external `.tectonic` files
- Top-down design from a layout part

### Feature Recognition

- Auto-detect features from imported STEP geometry: extrude, revolve, hole, fillet,
  chamfer, pattern, mirror
- Rebuilds a parametric feature tree from dumb solids

---

## Review and analysis

### Measure & Analysis

- Distance, angle, length, area, volume
- Mass properties: mass, center of mass, moments of inertia
- Minimum distance between bodies
- Curvature combs, zebra stripes
- Draft heat map, wall thickness map, minimum radius

### PMI / 3D Annotations

- Model-based definition on the 3D model
- Dimensions, GD&T, datums, surface finish symbols, notes, leaders
- Annotation views
- Standards: ASME Y14.41, ISO 16792

### Visual Diff / Compare

- Geometry comparison between two versions
- Color-coded changes: added, removed, unchanged
- Side-by-side and overlay modes
- Change summary

### Motion / Animation

- Joint animation with keyframes and a timeline
- Motion studies with collision detection
- GIF and MP4 export

---

## Viewing and rendering

### Multi-Viewport

- Up to 4 viewports: single, 2-horizontal, 2-vertical, 4-quadrant
- Independent projection, camera and visual style per viewport
- View cube for orientation
- 6 visual styles: shaded, wireframe, shaded with edges, x-ray, hidden line, technical
  illustration

### Section Views

- Dynamic clipping plane
- Half-section and quarter-section

### Rendering

- WebGPU with automatic WebGL fallback
- On-demand render loop — frames are drawn only when something changes, so an idle
  viewport uses no GPU time
- Developer overlay (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd>): renderer backend,
  FPS, triangle count, draw calls
- FPS lock toggle (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>)

### Large Assembly Performance

- Level of detail
- Frustum and occlusion culling
- Instanced rendering for repeated components

---

## Import / Export

| Format                                          | Import                       | Export                          |
| ----------------------------------------------- | ---------------------------- | ------------------------------- |
| `.tectonic` (native JSON)                       | Full parametric history      | Full parametric history         |
| STEP (AP203 / AP214)                            | B-Rep                        | B-Rep                           |
| STL                                             | ASCII and binary             | Configurable resolution         |
| DXF                                             | R12 / 2000                   | 2D views and sketches           |
| SVG                                             | Path data                    | Sketch export                   |
| OBJ + MTL                                       | Mesh with material           | Mesh with material              |
| glTF / GLB                                      | —                            | JSON with embedded buffers      |
| 3MF                                             | —                            | ZIP + XML model                 |
| PDF (2D drawing)                                | —                            | Dimensioned orthographic        |
| PDF (3D)                                        | —                            | Interactive 3D (PRC / U3D)      |
| HTML                                            | —                            | Standalone single-file viewer   |
| PNG / JPEG                                      | —                            | Viewport screenshot             |
| GIF / MP4                                       | —                            | Motion study animation          |
| SolidWorks, CATIA, NX, Creo, Inventor, Parasolid, JT | Format detection + mesh | —                               |

Only `.tectonic` round-trips the full feature tree. Everything else is a one-way loss of
history by design.

---

## Keyboard shortcuts

The in-app reference is the source of truth — press <kbd>F1</kbd> or <kbd>?</kbd>. The
bindings live in `src/ui/shortcuts.ts`.

### General — anywhere in the application

| Keys                                             | Action                    |
| ------------------------------------------------ | ------------------------- |
| <kbd>?</kbd> / <kbd>F1</kbd>                     | Toggle help               |
| <kbd>Ctrl</kbd>+<kbd>P</kbd>                     | Command palette           |
| <kbd>Ctrl</kbd>+<kbd>N</kbd>                     | New document              |
| <kbd>Ctrl</kbd>+<kbd>O</kbd>                     | Open file                 |
| <kbd>Ctrl</kbd>+<kbd>S</kbd>                     | Save / export             |
| <kbd>Ctrl</kbd>+<kbd>Z</kbd>                     | Undo                      |
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd>    | Redo                      |
| <kbd>Esc</kbd>                                   | Cancel the current tool   |
| <kbd>Del</kbd>                                   | Delete the selection      |
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd>    | Toggle developer overlay  |
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>    | Toggle FPS lock           |

### Sketch tools — while the sketch surface is active

| Key          | Tool      |
| ------------ | --------- |
| <kbd>V</kbd> | Select    |
| <kbd>L</kbd> | Line      |
| <kbd>C</kbd> | Circle    |
| <kbd>A</kbd> | Arc       |
| <kbd>R</kbd> | Rectangle |
| <kbd>D</kbd> | Dimension |
| <kbd>T</kbd> | Trim      |
| <kbd>F</kbd> | Fillet    |
| <kbd>M</kbd> | Mirror    |
| <kbd>P</kbd> | Pattern   |

### 3D view — while the 3D surface is active

| Input       | Action        |
| ----------- | ------------- |
| Left drag   | Orbit         |
| Middle drag | Pan           |
| Scroll      | Zoom          |
| <kbd>F</kbd>| Fit to screen |

### Profile / Sheet metal — turns the active sketch into solid geometry

| Key          | Action      |
| ------------ | ----------- |
| <kbd>E</kbd> | Extrude     |
| <kbd>S</kbd> | Shell       |
| <kbd>B</kbd> | Base flange |
