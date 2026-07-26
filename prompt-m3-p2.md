=== CURRENT STATE ===
- ✅ Complete sheet metal domain (BaseFlange, EdgeFlange, MiterFlange, Hem, Jog, FlatPattern, FoldUnfold, bend geometry, parameters, operations)
- ❌ No assembly system yet
- ❌ No sheet metal editor UI
- ❌ No assembly editor UI
- ❌ No sheet metal or assembly tests
- 648 tests passing, TypeScript clean compile

=== WHAT TO BUILD — M3 Phase 2: Assemblies + Sheet Metal Editor + Assembly Editor + Tests ===

=== PART 1 — ASSEMBLY SYSTEM ===

Create `src/assembly/`:

**AssemblyTree** (src/assembly/AssemblyTree.ts):
- Hierarchical tree: assemblies contain sub-assemblies and parts (components)
- Each component is an instance with: id, name, partId (reference to a part in the document), transform (position/rotation), parentId, assemblyId
- Grounded (fixed) components: isGrounded flag
- Flexible vs rigid sub-assemblies: isFlexible flag
- toJSON() / fromJSON()
- addComponent(component, parentId), removeComponent(id), getComponent(id), getComponents()
- getPath(id): returns path from root to component
- moveComponent(id, newParentId, newTransform)

**Mate/Joint** (src/assembly/Mate.ts):
- Mate types: coincident, concentric, parallel, perpendicular, tangent, distance, angle, lock, fastened
- Joint types: revolute, slider/prismatic, cylindrical, planar, ball/spherical, screw, gear/belt, rack-and-pinion
- Each mate: id, name, type, componentId1, componentId2, entityRef1 (face/edge identifier), entityRef2, parameters (distance, angle offsets, limits), isLocked
- toJSON() / fromJSON()

**MateSolver** (src/assembly/MateSolver.ts):
- Solves the mate graph to determine component positions
- Processes mates in dependency order (grounded components first)
- Detects over-constrained components: returns list of conflicting mates
- Reports unsolved components: returns list of components with remaining DOFs
- Mate error states: solved, error, warning (over-constrained)
- Supports mate animation: interpolate from current position to solved position

**AssemblyFeatures** (src/assembly/AssemblyFeatures.ts):
- Pattern: rectangular pattern (count, spacing, direction), circular pattern (count, angle, axis)
- Mirror: mirror components about a reference plane
- Replace component: swap part reference, preserve transform, best-effort mate preservation
- Exploded view: Map<componentId, offset transform> — user-defined explode positions per component
- Interference detection: check overlapping bodies in assembly, return list of interfering component pairs
- Collision detection: during component drag, detect collisions with other components
- BOM (Bill of Materials): part name, quantity, material, mass (if defined), unique ID

=== PART 2 — SHEET METAL EDITOR UI ===

Create `src/sheetmetal/SheetMetalEditor.tsx` + `src/sheetmetal/SheetMetalEditor.css`:

- Dedicated sheet metal mode in the app
- Parameters panel: material (text input), thickness (numeric), inner radius (numeric), K-factor (numeric)
- Flange table: add/edit/delete flanges with length and angle fields
- 2D profile preview showing the sheet metal cross-section with bends
- 3D folded preview (reuses ThreeViewport)
- Flat pattern button: generates flat pattern, shows it in a 2D view
- Export flat pattern buttons: DXF, SVG
- Bend radius display: inner radius + thickness = outer radius (auto-updated)
- Touch support for tablet usage

=== PART 3 — ASSEMBLY EDITOR UI ===

Create `src/assembly/AssemblyEditor.tsx` + `src/assembly/AssemblyEditor.css`:

- Assembly tree panel (expandable tree of components)
- Right-click context menu on components: edit transform, ground/unground, delete, replace part
- Mate list panel: shows all mates, add/edit/delete
- Add mate dialog: select two components, choose mate type, set parameters
- 3D viewport shows all components with their solved positions
- BOM panel: auto-generated table
- Exploded view controls: slider for explode amount, per-component offset editor
- Section view toggle for assemblies (clip plane)
- Interference check button: highlights overlapping components in red

=== PART 4 — TESTS ===

Create tests at tests/sheetmetal/ and tests/assembly/:

**SheetMetalParameter tests** (tests/sheetmetal/SheetMetalParameters.test.ts):
- Thickness validation (must be > 0)
- Outer radius = innerRadius + thickness (auto-computed)
- Material defaults
- Serialization round-trip

**BaseFlange tests** (tests/sheetmetal/BaseFlange.test.ts):
- Creates a part from sketch profile
- Generates correct body mesh
- Serialization

**FlatPattern tests** (tests/sheetmetal/FlatPattern.test.ts):
- Computes flat pattern from folded part
- Bend lines present in output
- DXF export (mock or verify format)

**AssemblyTree tests** (tests/assembly/AssemblyTree.test.ts):
- Create assembly, add/remove components
- Move component to different parent
- Ground/unground component
- Serialization round-trip

**Mate tests** (tests/assembly/Mate.test.ts):
- Create mates of each type
- Mate solver resolves component positions
- Over-constrained detection
- Mate serialization

**AssemblyFeatures tests** (tests/assembly/AssemblyFeatures.test.ts):
- Component pattern (rectangular, circular)
- Mirror components
- Interference detection (basic)
- BOM generation

=== CROSS-CUTTING ===
- Domain code is pure TypeScript (no React in src/assembly/ or src/sheetmetal/)
- npm test passes with 90%+ coverage
- TypeScript strict mode

=== DON'T ===
- Don't add surface modeling (M4)
- Don't modify existing sketch/feature code

=== AFTER ===
- Verify: npx tsc --noEmit
- Verify: npm test -- --coverage (all passing, 90%+)
- Commit: git add -A && git commit -m "feat: M3 phase 2 — assemblies, sheet metal editor, assembly editor, tests"

Do NOT ask questions. Build it.