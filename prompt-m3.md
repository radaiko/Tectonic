=== CURRENT STATE ===
- ✅ Full 2D sketch system (all entities, constraints, solver, tools, SketchEditor)
- ✅ Complete feature engine (all operations: Extrude, Revolve, Sweep, Loft, Cut, Fillet, Chamfer, Shell, Hole, Rib, Draft, Pattern, Mirror, Scale, Combine, Split, DirectEdit)
- ✅ FeatureTree with roll bar, reorder, suppress, dependency validation
- ✅ FeatureTreePanel UI, FeaturePropertiesPanel UI
- ✅ StubKernel supporting all feature operations
- ✅ File I/O (.tectonic round-trip with features + sketches)
- ✅ 90%+ test coverage
- 649+ tests passing
- TypeScript clean compile

=== NEXT PHASE — M3: Sheet Metal + Assemblies ===

Build the sheet metal environment and assembly modeling system. These are two large subsystems.

=== PART A — SHEET METAL ===

Create `src/sheetmetal/`:

**BaseFlange** (src/sheetmetal/BaseFlange.ts):
- Creates sheet metal part from open or closed sketch profile
- Parameters: thickness, bendRadius (default innerRadius + thickness = outerRadius), material
- K-factor / bend allowance configurable
- Generates the folded 3D sheet metal body via the kernel

**EdgeFlange** (src/sheetmetal/EdgeFlange.ts):
- Flange along an edge: length, angle, bend radius override
- Edge selection from existing sheet metal body
- Mitered corners option

**MiterFlange** (src/sheetmetal/MiterFlange.ts):
- Multiple edge flanges in one operation
- Auto-miters corner gaps

**Hem** (src/sheetmetal/Hem.ts):
- Types: open, closed, teardrop, rolled
- Length and gap parameters

**Jog** (src/sheetmetal/Jog.ts):
- Offset in the sheet with two parallel bends
- Offset distance, bend radius, angle

**SheetMetalParameters** (src/sheetmetal/SheetMetalParameters.ts):
- Material: string
- Thickness: number (mm)
- Inner radius: number (default 1mm)
- Outer radius: innerRadius + thickness (auto-computed)
- K-factor: number (default 0.33)
- Bend deduction / bend allowance
- Relief type: rectangular, tear, round, no relief

**FlatPattern** (src/sheetmetal/FlatPattern.ts):
- Compute flattened 2D outline from folded sheet metal
- Bend lines shown in the flat pattern
- Bend zone annotations
- Export to DXF/SVG

**FoldUnfold** (src/sheetmetal/FoldUnfold.ts):
- Unfold: temporarily flatten for cut operations
- Refold: restore folded state
- Cut Across Bend: cut that spans a bend line

**SheetMetalEditor** (src/sheetmetal/SheetMetalEditor.tsx):
- Dedicated UI with parameter panels
- Flange table (add/edit/delete flanges)
- Thickness, material, radii settings
- 2D profile preview + 3D folded preview
- Flat pattern preview with export buttons

=== PART B — ASSEMBLIES ===

Create `src/assembly/`:

**AssemblyTree** (src/assembly/AssemblyTree.ts):
- Hierarchical tree: assemblies contain sub-assemblies and parts
- Each component is an instance (can appear multiple times)
- Grounded (fixed in place) components
- Flexible vs rigid sub-assemblies
- toJSON/fromJSON for serialization

**Mate / Joint** (src/assembly/Mate.ts):
- Mate types: coincident, concentric, parallel, perpendicular, tangent, distance, angle, lock, fastened
- Joint types: revolute (hinge), slider (prismatic), cylindrical, planar, ball (spherical), screw, gear, belt, rack-and-pinion
- Each mate stores: type, component1, component2, entity references (faces/edges), parameters (distance, angle offsets)
- Mate solver: resolves positions from the mate constraint graph

**MateSolver** (src/assembly/MateSolver.ts):
- Solves the mate graph to determine component positions
- Detects over-constrained assemblies
- Reports unsolved (under-constrained) components
- Supports mate animation (interpolation to solved position)

**AssemblyFeatures** (src/assembly/AssemblyFeatures.ts):
- Pattern: rectangular, circular, curve-driven patterns of components
- Mirror: mirror components about a plane
- Replace component: swap one part for another (preserve mates best-effort)
- Exploded view: user-defined explode positions per component
- Interference detection: detect overlapping bodies
- Collision detection during drag
- BOM: auto-generated bill of materials

**AssemblyEditor** (src/assembly/AssemblyEditor.tsx):
- Assembly tree panel (expandable hierarchy)
- Mate list panel (add/edit/delete mates)
- 3D viewport shows assembly context
- Contextual editing: edit parts within the assembly
- Exploded view controls

=== CROSS-CUTTING ===
- All sheet metal and assembly domain code is pure TypeScript (no React)
- Sheet metal features integrate with the feature tree as FeatureTypes
- Assembly is separate from the feature engine (assemblies reference parts, not features)
- npm test passes with 90%+ coverage
- TypeScript strict mode

=== DON'T ===
- Don't add surface modeling (M4)
- Don't modify existing sketch/feature code

=== AFTER ===
- Verify: npx tsc --noEmit
- Verify: npm test -- --coverage (all passing, 90%+)
- Commit: git add -A && git commit -m "feat: M3 — sheet metal environment + assembly modeling"

Do NOT ask questions. Build it.