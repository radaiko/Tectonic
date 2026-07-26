=== CURRENT STATE ===
- ✅ All core CAD systems: Sketch, Feature Engine, Sheet Metal, Assemblies, Surfaces
- ✅ All I/O formats: .tectonic, STEP, STL, DXF, SVG, OBJ, glTF, 3MF, PDF
- ❌ Multi-viewport (up to 4 views)
- ❌ View cube widget
- ❌ Visual styles (shaded, wireframe, shaded+edges, x-ray, hidden line)
- ❌ Configurations / variants table
- ❌ Measure & analysis tools
- ❌ Touch + pen input support
- ❌ Section views (dynamic clipping plane)
- ❌ Configurable keyboard shortcuts
- ❌ Marking menu (right-click radial)
- ❌ Performance optimization

=== BUILD M5 — UI POLISH ===

Build each missing feature. Prioritize by impact:

=== 1. MULTI-VIEWPORT ===
Update src/3d/ThreeViewport.tsx to support:
- Up to 4 viewports in configurable layouts (Single, 2H, 2V, 4-Quad)
- Each viewport independent: projection (perspective/orthographic), view direction (front/top/right/etc.), visual style
- Sync cameras across viewports (optional toggle)
- Viewport border/drag handle for resizing

=== 2. VIEW CUBE ===
Create a view cube widget (src/3d/ViewCube.tsx):
- 3D orientation cube in the corner of the viewport
- Click faces: front, back, top, bottom, left, right
- Click corners: isometric views
- Draggable rotation
- Labels on faces

=== 3. VISUAL STYLES ===
Add style toggle to the viewport:
- Shaded (default)
- Wireframe
- Shaded + Edges
- X-Ray (transparent)
- Hidden line
- Technical illustration (edge-only, blue-on-white)
- Toggle ambient occlusion (future)

=== 4. CONFIGURATIONS / VARIANTS ===
Create src/config/ConfigurationTable.ts:
- Table: rows = configurations, columns = controllable parameters
- Parameters: sketch dimensions, feature parameters, suppression state, component instances
- Named configurations with description
- Derived configurations (inherit and override)
- Switching configuration triggers full recompute
- UI: src/ui/ConfigurationPanel.tsx

=== 5. MEASURE & ANALYSIS ===
Create src/analysis/:
- MeasureDistance: between two points, edges, faces
- MeasureAngle: between two edges, faces
- MeasureLength: edge length
- MeasureArea: face area
- MeasureVolume: body volume
- MassProperties: volume, mass (with density), centroid, moments of inertia
- MinimumDistance: closest distance between two bodies
- UI: src/ui/MeasurePanel.tsx 

=== 6. SECTION VIEW ===
Add to 3D viewport:
- Dynamic clipping plane that user can position
- Half-section, quarter-section views
- Section fill color

=== 7. TOUCH + PEN SUPPORT ===
Update sketch editor and profile editor for touch:
- Pinch-to-zoom
- Drag-to-pan (single finger)
- Tap to select
- Long-press context menu
- On-screen numeric keypad for dimension entry

=== 8. KEYBOARD SHORTCUTS ===
Create src/ui/ShortcutManager.ts:
- All common actions mapped to shortcuts
- Configurable shortcut scheme
- Shortcut reference dialog (press ? to show)

=== 9. MARKING MENU ===
Create right-click radial marking menu:
- Quick access to common tools
- Context-sensitive: different options for sketch vs 3D mode

=== CROSS-CUTTING ===
- npm test passes with 90%+ coverage
- TypeScript strict mode
- No breaking changes to existing code

=== AFTER ===
- Verify: npx tsc --noEmit
- Verify: npm test
- Commit: git add -A && git commit -m "feat: M5 — multi-viewport, view cube, visual styles, configurations, measure, section view, touch, shortcuts, marking menu"

Do NOT ask questions. Build it.