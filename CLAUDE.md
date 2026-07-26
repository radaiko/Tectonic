# Tectonic — Browser-Based Parametric CAD System

## Project Identity
- **Name:** Tectonic
- **Goal:** Browser-based 2D/3D parametric CAD with Onshape + Fusion 360 ambition
- **Scope:** CAD only — no CAM, no simulation, no generative design
- **Storage:** None. File-based I/O only. Open .tectonic file or create new. Export to save.
- **Single-user:** No accounts, no cloud, no collaboration

## Architecture
- **Runtime:** Browser (Chrome, Edge, Firefox, Safari latest 2 majors)
- **Language:** TypeScript (strict mode)
- **UI Framework:** React + TypeScript
- **2D Rendering:** Canvas 2D
- **3D Rendering:** three.js
- **B-Rep Kernel:** OpenCascade WASM (or custom WASM kernel)
- **Build:** Vite
- **Testing:** Vitest with coverage
- **Coverage target:** 90% line coverage minimum

## Module Structure
```
src/
├── app/          App shell, start screen, routing
├── ui/           React components, panels, toolbars, ribbon
├── domain/       Pure domain models (no UI dependency)
├── kernel/       WASM kernel bridge (geometry engine)
├── sketch/       2D sketch system (entities, constraints)
├── features/     Feature engine (extrude, revolve, fillet, etc.)
├── sheetmetal/   Sheet metal environment
├── assembly/     Assembly modeling with mates
├── surface/      Surface modeling
├── solver/       Constraint solver
├── io/           I/O pipelines (.tectonic, STEP, STL, DXF, etc.)
└── 3d/           3D rendering (three.js viewport)
tests/            Tests mirroring src structure
docs/             Architecture and design docs
```

## Core Design Decisions
- Domain models are renderer-agnostic — no React or three.js in domain/
- Kernel goes through a stable IKernel interface (swappable backend)
- All state is in-memory. Persistence is explicit via file save.
- Constraint solver is pure TypeScript (no WASM dependency)
- Feature tree is ordered, parametric, with dependency graph and roll bar
- Internal format (.tectonic) is self-contained JSON

## Key Commands
- `npm run dev` — Vite dev server
- `npm run build` — Production build
- `npm test` — Run Vitest
- `npm run test -- --coverage` — Coverage report
- `npx tsc --noEmit` — Type check
- `npm run lint` — ESLint

## Coding Standards
- TypeScript strict mode — no `any`, no implicit `any`
- Prefer interfaces over types for public APIs
- Barrel exports from each module (index.ts)
- Tests use describe/it pattern with expect assertions
- Naming: PascalCase for types/components, camelCase for functions/variables
- No `// eslint-disable-next-line` without justification comment

## Build Phases
1. **M0 — Scaffold + Kernel:** Vite + React + three.js scaffold, start screen (New/Open), minimal 3D viewport with test shape, .tectonic format round-trip
2. **M1 — Sketch + Constraints:** 2D sketch, full constraint solver, snap system
3. **M2 — Parametric Solids:** Feature tree, extrude/revolve/sweep/loft/fillet/chamfer/shell/hole/pattern/mirror/draft
4. **M3 — Sheet Metal + Assemblies:** Sheet metal environment, assembly mates/joints
5. **M4 — Surfaces + Advanced IO:** Surface modeling, STEP/STL/DXF import/export
6. **M5 — UI + Polish:** Multi-viewport, configurations, touch, performance