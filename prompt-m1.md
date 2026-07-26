=== CURRENT STATE ===
- ✅ Vite + React + TypeScript + three.js project scaffolded
- ✅ Start screen with New Document / Open File buttons
- ✅ 3D viewport with orbit controls and test shape
- ✅ IKernel interface + StubKernel (three.js-based temporary)
- ✅ Domain models (Document, MeshData)
- ✅ File I/O: .tectonic JSON round-trip
- ✅ 76 tests passing, 99.52% line coverage

=== NEXT PHASE — M1: 2D Sketching + Constraint Solver ===

Build the complete 2D sketch environment with a full geometric and dimensional constraint solver, snap system, and all drawing tools. The sketch system must be decoupled from the renderer (domain models are pure TypeScript, no UI dependency).

=== 1. SKETCH DOMAIN MODEL ===

Create `src/sketch/domain/SketchModel.ts` and supporting files:

Entity types (each as a class with id and serialization support):
- **PointEntity**: x, y coordinates
- **LineEntity**: startPointId, endPointId (references to PointEntity)
- **CircleEntity**: centerPointId, radius
- **ArcEntity**: centerPointId, startPointId, endPointId, radius, clockwise flag
- **RectangleEntity**: corner1, corner2, corner3, corner4 (4 PointEntity references for corners — stores as 4 points + 4 lines)
- **SlotEntity**: center1PointId, center2PointId, width (full round slot)
- **PolygonEntity**: array of pointIds, closed flag
- **EllipseEntity**: centerPointId, majorAxisPointId, minorRadius
- **SplineEntity**: array of controlPointIds, degree
- **ConstructionGeometry**: any entity with isConstruction: true flag (rendered dashed, doesn't contribute to solid)

Constraint types (each as a class with entity references):
- **CoincidentConstraint**: pointId, targetEntityId (point on curve) or two pointIds
- **HorizontalConstraint**: lineId
- **VerticalConstraint**: lineId
- **ParallelConstraint**: lineId1, lineId2
- **PerpendicularConstraint**: lineId1, lineId2
- **TangentConstraint**: entityId1, entityId2 (line-circle, circle-circle)
- **ConcentricConstraint**: circleId1, circleId2
- **CollinearConstraint**: lineId1, lineId2
- **EqualConstraint**: entityId1, entityId2 (equal length for lines, equal radius for circles)
- **MidpointConstraint**: pointId, lineId
- **SymmetricConstraint**: entityId1, entityId2, symmetryLineId
- **FixConstraint**: pointId
- **DistanceConstraint**: pointId1, pointId2, value (mm), isDriving: boolean
- **AngleConstraint**: lineId1, lineId2, value (degrees), isDriving: boolean
- **LengthConstraint**: lineId, value, isDriving: boolean
- **RadiusConstraint**: circleId (or arcId), value, isDriving: boolean
- **DiameterConstraint**: circleId, value, isDriving: boolean

Each entity and constraint must:
- Have a unique string id (UUID)
- Support toJSON() / fromJSON() for serialization
- Be stored in SketchModel (entities Map, constraints Map)

SketchModel itself:
- id, name
- entities: Map<string, SketchEntity>
- constraints: Map<string, Constraint>
- plane: plane reference (for now, just "XY" as string)
- gridSpacing: number (default 10)
- toJSON() / fromJSON()
- addEntity(), removeEntity(), addConstraint(), removeConstraint()

=== 2. CONSTRAINT SOLVER ===

Create `src/solver/ConstraintSolver.ts`:

The solver takes a SketchModel and resolves all active constraints:

- **Simultaneous solving**: When a dimension changes (e.g., user types new value), the solver re-solves all constraints to determine new positions for un-fixed entities
- **DOF tracking**: Report which entities are under-constrained (degrees of freedom > 0)
- **Over-constrained detection**: Detect when adding a new constraint would over-constrain the sketch. Return clear error message.
- **Constraint graph**: Build a dependency graph of constraints → entities to determine solve order and detect conflicts
- **Fix constraint**: Fixed entities are anchors — they don't move during solving
- **Driving vs driven dimensions**: Driving dimensions control geometry, driven dimensions are read-only references
- **Equation support**: Dimensions can reference other dimensions via simple expressions (e.g., "= d1 * 2 + 5"). Implement a basic expression parser.

Solver output:
- success: boolean
- entityPositions: Map<entityId, new position data>
- constraints: Map<constraintId, solved values>
- errors: string[] (over-constrained, conflicting, etc.)
- dof: number (degrees of freedom remaining)

Default solver behavior for conflicts: if adding a constraint creates over-constraint, reject the new constraint and return error.

=== 3. SNAP SYSTEM ===

Create `src/sketch/snapping/SnapSystem.ts`:

- Takes: current cursor position (in sketch coordinates), sketch entities, tolerance
- Returns: best snap candidate with: snapPoint, snapType, entityId, distance
- Snap types:
  - **Endpoint**: line endpoints, arc endpoints, rectangle corners
  - **Midpoint**: line midpoints, arc midpoints
  - **Center**: circle centers, arc centers
  - **Quadrant**: circle/arc quadrant points (0°, 90°, 180°, 270°)
  - **Intersection**: where two entities cross
  - **Grid**: nearest grid point
- Visual indicators: each snap type should return enough data for the UI to show a dedicated cursor icon/highlight
- Priority: Endpoint > Center > Midpoint > Quadrant > Intersection > Grid

=== 4. SKETCH RENDERER (Canvas 2D) ===

Create `src/sketch/renderer/SketchRenderer.ts`:

Canvas 2D renderer that takes a SketchModel and renders it:

Features:
- **Grid**: light gray grid lines at configured spacing
- **Entities**: draw each entity type with correct geometry
  - Lines: solid stroke
  - Circles: solid stroke outline
  - Construction: dashed stroke
  - Selected entities: highlighted (thicker stroke, blue color)
  - Pre-selection hover: subtle glow
- **Snap indicators**: when snapping active, show snap point marker + type icon
- **Constraint icons**: overlay small icons on constrained entities (e.g., H for horizontal, V for vertical, // for parallel)
- **Dimension labels**: show dimension values near the associated geometry, editable on click
- **Under-constrained entities**: show in a distinct color (e.g., orange) with DOF indicator
- **Coordinate axes**: X/Y axes with arrow tips at origin
- **Pan/zoom**: handle view transform (offset + scale)

The renderer must be a class that:
- Has a render(model: SketchModel, options: RenderOptions) method
- Options include: selectedEntityIds, hoveredEntityId, snapPoint, showGrid, showConstraints, scale, offset
- Handles DPI scaling for sharp rendering on retina displays

=== 5. SKETCH INTERACTION TOOLS ===

Create `src/sketch/tools/` with interactive tool classes following a common interface:

Each tool implements: onPointerDown, onPointerMove, onPointerUp, onKeyDown, onCancel

Tools:

**SelectTool**: Click to select, box-select, shift+click to add/remove from selection, drag to move selected entities (respecting constraints), Del to delete

**LineTool**: Click-drag to create line. Continuous mode: click-click-click creates connected lines (chain). Right-click or Esc to end chain. Snap to endpoints.

**CircleTool**: Click for center, drag to radius. Release to create. Snap to center.

**ArcTool**: 3-point mode: click for start, click for end, drag for radius. Or center-point-arc mode: click center, click start, click end angle.

**RectangleTool**: Click-drag corner-to-corner. Or center-rectangle mode (Alt+drag from center outward).

**SlotTool**: Click-drag for center-to-center distance, release then move mouse for width.

**PolygonTool**: Click to place vertices, double-click or right-click to close. N-sided mode: input N, click center, radius.

**EllipseTool**: Click center, drag for major axis, release, move for minor radius.

**SplineTool**: Click to place control points, double-click to finish.

**TrimTool**: Click on entity to trim at nearest intersection. Hold shift to extend.

**FilletTool**: Click two lines to create fillet arc. Radius input.

**ChamferTool**: Click two lines to create chamfer. Distance input.

**DimensionTool**: Click first snap point, click second snap point → dimension label appears. User types value. Dimension becomes driving parameter.

**MirrorTool**: Select entities, pick mirror line, mirror selected.

**PatternTool**: Select entities, choose rectangular or circular pattern, set parameters.

**OffsetTool**: Select entity, set offset distance, direction.

=== 6. TOOLBAR & UI INTEGRATION ===

Create `src/sketch/SketchEditor.tsx` — a React component that integrates everything:

- Left toolbar with tool icons (select, line, circle, arc, rect, slot, polygon, ellipse, spline, trim, fillet, chamfer, dimension, mirror, pattern)
- Active tool highlighted
- Esc to cancel tool
- Properties panel showing selected entity parameters (editable)
- Constraint list panel showing all constraints on selected entities
- Dimension editing: click dimension label → inline input appears
- Status bar showing: cursor position, active tool, snap status, DOF count

=== 7. INTEGRATE WITH APP ===

Modify EditorView.tsx to:
- When user creates a new document or opens one, show sketch mode as the initial editing experience
- Replace the simple "test shape" 3D view with the sketch editor as the primary editing surface (keep 3D view accessible for later extrusion visualization)
- Toolbar at top, sketch canvas as main area, properties panel on right

=== CROSS-CUTTING ===
- All domain/solver code in src/sketch/ or src/solver/ — NO React imports in those files
- SketchRender takes CanvasRenderingContext2D, not React elements
- Tools are pure logic: they receive pointer events and return actions to apply to the model
- Test the constraint solver thoroughly: at least tests for each constraint type
- Test serialization of sketch models
- TypeScript strict mode everywhere
- npm test must pass at 90%+ coverage

=== DON'T ===
- Don't add 3D extrusion yet (that's M2)
- Don't add sheet metal (M3)
- Don't add assemblies (M3)
- Don't add surface modeling (M4)
- Don't modify IKernel or StubKernel
- Don't add auto-save or localStorage

=== AFTER ===
- Verify: npx tsc --noEmit passes
- Verify: npm test passes with 90%+ coverage
- Verify: npm run dev starts and shows sketch editor with grid
- Commit: git add -A && git commit -m "feat: M1 — 2D sketch system with constraint solver, snap system, drawing tools"

Do NOT ask questions. Build it.