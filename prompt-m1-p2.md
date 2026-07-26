=== CURRENT STATE ===
- ✅ 2D sketch domain model (all entity types, constraints, geometry, ids, builders, hit test, intersections, transforms, query)
- ✅ Constraint solver (geometric + dimensional constraints, constraint graph, expression parser, linalg, DOF tracking, over-constrained detection)
- ✅ Snap system (endpoints, midpoints, centers, quadrants, intersections, grid)
- ✅ Sketch renderer (Canvas 2D with grid, snap indicators, constraint icons, dimension labels)
- ✅ Drawing tools: Line, Circle, Arc, Rectangle, Slot, Polygon, Ellipse, Spline
- ❌ Remaining tools: SelectTool, TrimTool, FilletTool, ChamferTool, DimensionTool, MirrorTool, PatternTool, OffsetTool
- ❌ SketchEditor.tsx React component (integrates tools, renderer, toolbar)
- ❌ Integration with EditorView
- ❌ 2 test files failing (reference non-existent tools)
- 395 tests passing, TypeScript clean compile

=== WHAT TO BUILD — M1 Phase 2: Remaining Tools + SketchEditor ===

=== 1. Create remaining source files for tools that already have tests ===

The tests already exist at `tests/sketch/tools/SelectTool.test.ts`, `tests/sketch/tools/modifyTools.test.ts`, `tests/sketch/tools/drawingTools.test.ts`. Create the missing source files:

**SelectTool** (src/sketch/tools/SelectTool.ts):
- Click to select entity, shift+click to add/remove
- Box select (drag rectangle)
- Drag selected entities to move (respecting constraints)
- Del to delete selected entities
- Highlight selected entities

**FilletTool** (src/sketch/tools/FilletTool.ts):
- Click two lines to create fillet arc
- Radius input via keyboard or panel
- Creates arc entity + removes line corners

**ChamferTool** (src/sketch/tools/ChamferTool.ts):
- Click two lines to create chamfer
- Distance input
- Creates line chamfer between two lines

**DimensionTool** (src/sketch/tools/DimensionTool.ts):
- Click first snap point, click second snap point → dimension label
- User types numeric value → becomes driving parameter
- Uses the constraint solver's DistanceConstraint/AngleConstraint

**TrimTool** (src/sketch/tools/TrimTool.ts):
- Click entity to trim at nearest intersection
- Hold shift to extend to next intersection

**MirrorTool** (src/sketch/tools/MirrorTool.ts):
- Select entities, pick mirror line
- Mirror selected entities about the line

**PatternTool** (src/sketch/tools/PatternTool.ts):
- Select entities, choose rectangular or circular pattern
- Set parameters (count, spacing, angle)

**OffsetTool** (src/sketch/tools/OffsetTool.ts):
- Select entity, set offset distance, pick direction
- Creates offset copy of the entity

=== 2. Create SketchEditor.tsx ===

Create `src/sketch/SketchEditor.tsx` — a React component that integrates everything:

- Contains the Canvas 2D canvas element
- Manages current tool state
- Toolbar on the left side with tool icons
- Active tool highlighted
- Esc to cancel current tool
- Properties panel showing selected entity parameters
- Constraint list panel
- Status bar with: cursor position (mm), active tool name, snap status, DOF count
- Handles mouse events: pointerdown, pointermove, pointerup, wheel (zoom)
- Handles keyboard: Esc (cancel), Del (delete), Ctrl+Z (undo), Ctrl+Shift+Z (redo)
- Renders the sketch model via SketchRenderer
- Shows snap indicator when snapping active
- Inline dimension editing: click dimension label → input field appears

=== 3. Integrate with EditorView ===

Modify `src/app/EditorView.tsx`:
- Replace the simple placeholder with SketchEditor as the primary editing surface
- Keep the file info display (filename, modified status)
- Keep the save/export button
- The SketchEditor fills the main content area
- Keep the 3D viewport accessible (for later extrusion visualization)

=== 4. Wire up File I/O with Sketch ===

Since the existing FileService serializes a Document, and documents now need to contain sketch data:
- Add a `sketch` field to the Document model (SketchModel serialization)
- Update FileService to serialize/deserialize sketch data
- New document starts with a blank sketch on XY plane

=== CROSS-CUTTING ===
- All tests must pass: npm test
- TypeScript strict mode: npx tsc --noEmit
- Coverage: 90%+ line coverage
- All 2 failing test files must pass after creating missing source files
- Domain code remains renderer-agnostic

=== DON'T ===
- Don't add 3D extrusion (M2)
- Don't modify existing working tools
- Don't add auto-save

=== AFTER ===
- Verify: npx tsc --noEmit
- Verify: npm test -- --coverage (all passing, 90%+)
- Verify: npm run dev starts and shows sketch editor
- Commit: git add -A && git commit -m "feat: M1 phase 2 — SelectTool, modify tools, SketchEditor, integration"

Do NOT ask questions. Build it.