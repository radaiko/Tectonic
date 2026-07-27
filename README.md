# Tectonic

**Browser-based parametric 2D/3D CAD system** with Onshape and Fusion 360 ambition.

CAD only — no CAM, no simulation, no generative design. File-based, no cloud, no accounts, no collaboration.

---

## Features

| Area | Capabilities |
|---|---|
| **2D Sketching** | Full sketch environment with 14 entity types, 19 geometric constraints, dimensional constraints with equations, snap system, Canvas 2D renderer |
| **3D Part Modeling** | Parametric feature tree with roll bar, reorder, suppress. Extrude, revolve, sweep, loft, fillet, chamfer, shell, hole, draft, rib, pattern, mirror, scale, combine, split, direct editing |
| **Sheet Metal** | Base flange, edge flange, miter flange, hem, jog, unfold/refold, flat pattern with DXF export, bend allowance, K-factor, corner relief |
| **Assemblies** | Hierarchical assembly tree, 16 mate/joint types (revolute, slider, cylindrical, planar, ball, screw, gear, belt, rack-and-pinion), mate solver, BOM, exploded views, interference detection |
| **Surface Modeling** | Extrude/revolve/sweep/loft open profiles, boundary surface, patch, offset, ruled, extend, trim, untrim, knit, split, thicken, stitch |
| **2D Drawings** | Interactive technical drawing workspace with auto-generated orthographic views, section views, detail views, auxiliary views, dimensions, GD&T, title blocks, revision tables, hole tables, auto-balloon |
| **Weldments** | Structural members from sketch paths and standard profiles (I-beam, C-channel, angle, T-beam, tube, pipe, flat bar), miter/butt/cope joints, end treatments |
| **Standard Content Library** | Parametric fasteners (bolts, nuts, washers, screws, bearings, pins, keys) per DIN/ISO/ANSI, structural steel profiles per DIN EN/AISC |
| **Feature Recognition** | Auto-detect extrude, revolve, hole, fillet, chamfer, pattern, mirror, shell from imported STEP geometry |
| **Derived Components** | Derived parts (part referencing another with modifications), linked components (external .tectonic file references), top-down design |
| **Design Automation** | Global parameter table with expressions (sin, cos, sqrt, pow, etc.), if-then rules engine, JSON-based design scripts |
| **Motion / Animation** | Joint animation with keyframes and timeline, motion studies with collision detection, GIF and MP4 export |
| **Mesh Editing** | Import STL/OBJ, validate, repair (fill holes, stitch, remove duplicates), edit (extrude face, bevel, bridge, fill hole), simplify, convert to B-Rep solid |
| **Form / Sculpt Modeling** | Catmull-Clark subdivision surfaces, crease, symmetry, primitive cages, convert to solid |
| **Part Studios** | Multiple parts sharing sketches in one tab, per-part feature trees, reference visualization |
| **PMI / 3D Annotations** | Model-based definition with dimensions, GD&T, datums, surface finish, notes, leaders, annotation views per ASME Y14.41 / ISO 16792 |
| **Materials Library** | 100+ engineering materials with physical properties (density, modulus, strength, thermal), visual appearances (PBR: color, metallic, roughness, opacity, texture), appearance presets |
| **Configurations / Variants** | Table-driven design with parameter overrides, suppression state, component instances, derived configurations |
| **Multi-Viewport** | Up to 4 viewports (single, 2H, 2V, 4-quad), independent projection/view/style per viewport, view cube, 6 visual styles (shaded, wireframe, shaded+edges, x-ray, hidden line, technical illustration) |
| **Section Views** | Dynamic clipping plane, half-section, quarter-section views |
| **Measure & Analysis** | Distance, angle, length, area, volume, mass properties, minimum distance, curvature combs, zebra stripes, draft heat map, wall thickness map, minimum radius |
| **Visual Diff / Compare** | Geometry comparison with color-coded changes (green=added, red=removed, transparent=unchanged), side-by-side overlay, change summary |

## Import / Export

| Format | Import | Export |
|---|---|---|
| `.tectonic` (native JSON) | ✅ Full parametric | ✅ Full parametric |
| STEP (AP203/AP214) | ✅ B-Rep | ✅ B-Rep |
| STL | ✅ ASCII + Binary | ✅ Configurable resolution |
| DXF | ✅ R12/2000 | ✅ 2D views / sketches |
| SVG | ✅ Path data | ✅ Sketch export |
| OBJ + MTL | ✅ | ✅ Mesh + material |
| glTF / GLB | — | ✅ JSON embedded |
| 3MF | — | ✅ ZIP + XML model |
| PDF (2D drawing) | — | ✅ Dimensioned orthographic |
| PDF (3D) | — | ✅ Interactive 3D (PRC/U3D) |
| HTML | — | ✅ Standalone 3D viewer |
| PNG / JPEG | — | ✅ Screenshot |
| GIF / MP4 | — | ✅ Animation |
| SolidWorks, CATIA, NX, Creo, Inventor, Parasolid, JT | ✅ Format detection + mesh | — |

## Rendering

- **WebGPU** with automatic **WebGL** fallback
- On-demand render loop (zero GPU usage when idle)
- Developer overlay: Ctrl+Shift+D shows renderer, FPS, triangles, draw calls
- Ctrl+Shift+F toggles 60 FPS lock

## Geometric Kernel

The geometric kernel is written in **Rust** and compiled to **WASM** via wasm-pack, replacing OpenCascade WASM.

- **14,000+ lines of Rust** across 30+ modules
- **447 unit tests**, all passing
- Math: Vec2, Vec3, Mat4, Quat, Plane
- B-Rep: Vertex, Edge, Face, Body, HalfEdge, Shell, Surface, BoundingBox
- Operations: Extrude, Revolve, Sweep, Loft, Boolean, Fillet, Chamfer, Shell
- Mesh: Polygon triangulation (ear-clipping, Delaunay), Tessellation, Simplify
- All 14 operations exported via wasm-bindgen with JSON I/O
- Graceful fallback to TypeScript StubKernel if WASM fails to load

## Architecture

```
src/
├── app/          App shell, start screen, routing
├── ui/           React components, panels, toolbars, ribbon
├── domain/       Pure domain models (no UI dependency)
├── kernel/       WASM kernel bridge (Rust WASM + StubKernel fallback)
├── sketch/       2D sketch system (entities, constraints, solver)
├── features/     Feature engine (extrude, revolve, fillet, etc.)
├── sheetmetal/   Sheet metal environment
├── assembly/     Assembly modeling with mates
├── drawing/      2D drawing workspace
├── surface/      Surface modeling
├── weldments/    Structural frames
├── library/      Standard content library
├── recognition/  Feature recognition
├── automation/   Design automation
├── motion/       Motion/animation
├── mesh/         Mesh editing
├── form/         Sculpt/subdivision modeling
├── studio/       Part Studios
├── pmi/          3D annotations
├── material/     Materials library
├── config/       Configurations/variants
├── analysis/     Measure & analysis tools
├── diff/         Visual diff/compare
├── performance/  Large assembly performance
├── io/           I/O pipelines (all formats)
├── 3d/           3D rendering (three.js WebGPU/WebGL)
├── view/         Multi-viewport, view cube, visual styles
└── solver/       Constraint solver
```

## Tech Stack

- **Language:** TypeScript (strict mode) + Rust (WASM kernel)
- **UI:** React
- **3D Rendering:** three.js (WebGPU + WebGL fallback)
- **2D Rendering:** Canvas 2D
- **Build:** Vite
- **Testing:** Vitest (TypeScript), cargo test (Rust)
- **WASM:** wasm-pack (Rust → WASM)

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Type check
npx tsc --noEmit

# Build for production
npm run build
```

## Project Structure

```
~/dev/private/Tectonic/
├── src/              # TypeScript source
├── tests/            # TypeScript tests (1,822+)
├── kernel/           # Rust geometric kernel
│   ├── tectonic-kernel/  # Core Rust library (447 tests)
│   └── tectonic-wasm/    # WASM bindings
├── CLAUDE.md         # Claude Code project context
└── package.json
```

## License

Source-available. See [LICENSE](LICENSE) for details. Third-party dependencies are governed by their respective licenses (MIT, Apache 2.0).