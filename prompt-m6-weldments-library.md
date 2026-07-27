=== CURRENT STATE ===
- ✅ OpenCascade WASM B-Rep kernel
- ✅ 2D Drawing workspace (building)

=== BUILD — Weldments / Structural Frames + Standard Content Library ===

=== PART 1 — WELDMENTS ===

Create `src/weldments/`:

**StructuralMember** (src/weldments/StructuralMember.ts):
- Takes: a sketch path (line/arc/polyline) + structural profile
- Profile types: standard steel shapes (I-beam, C-channel, angle, T-beam, rectangular tube, round tube, flat bar)
- Profile dimensions: width, height, thickness, flange width, etc.
- Generates: 3D solid body along the path, mitered/butt/coped joints at intersections
- Bend/trim at corners: miter joints for angled connections

**StructuralProfile** (src/weldments/StructuralProfile.ts):
- Library of standard profiles:
  - I-beam: IPE, HE-A, HE-B, HE-M (DIN/EN), W, S (AISC)
  - Channels: UPN, UPE, C (AISC)
  - Angles: L equal, L unequal
  - T-beam: T profile
  - Rectangular tube: RHS, SHS
  - Round tube: CHS, pipe (schedule based)
  - Flat bar
- Each profile: name, dimensions, cross-section geometry (polyline for extrusion)
- Ser/deser for persistence

**WeldmentAssembly** (src/weldments/WeldmentAssembly.ts):
- A structural part consists of: multiple members + end treatments
- End treatments: miter, butt, cope (notch for overlapping members), weld prep
- Gaps between members (welding gap)
- Members can be trimmed to other members (trim at intersection)

**WeldmentEditor** (src/weldments/WeldmentEditor.tsx):
- UI for creating structural members
- Select a sketch path (line, arc, chain)
- Choose profile from library (with preview)
- Set position (alignment: center, left, right, top, bottom)
- Trim/extend to adjacent members

=== PART 2 — STANDARD CONTENT LIBRARY ===

Create `src/library/`:

**StandardParts** (src/library/StandardParts.ts):
- Parametric models of common hardware:
  - Bolts: hex head, socket head cap, button head, countersunk (DIN/ISO/ANSI)
  - Nuts: hex, nylock, flange, wing
  - Washers: flat, spring, lock
  - Screws: machine, self-tapping, set
  - Bearings: ball, roller, thrust, needle
  - Pins: dowel, clevis, cotter
  - Keys: parallel, woodruff, taper
- Each part: parametric (diameter, length, thread pitch, grade)
- Generated from parameter table (no 3D mesh store)

**StructuralProfiles** (src/library/StructuralProfiles.ts):
- Steel shape tables (DIN EN 10034, AISC manual)
- Profiles indexed by name, dimensions, weight per meter
- Cross-section data for weldment generation

**LibraryBrowser** (src/library/LibraryBrowser.tsx):
- Search/filter by type, standard, size
- Preview (3D thumbnail)
- Drag & drop into assembly (or "Add to Assembly")
- Favorites / recently used

**LibraryIntegration**:
- Parts from the library insert into assemblies as components
- Parametric: changing the size updates all instances
- Configurations: each standard part is a configuration family

=== CROSS-CUTTING ===
- npm test passes
- TypeScript strict mode
- Standard parts are generated from parameters, not stored as mesh files
- Library data is embedded JSON (no external file dependencies)

=== AFTER ===
- Verify: npx tsc --noEmit
- Verify: npm test
- Commit: git add -A && git commit -m "feat: weldments/structural frames + standard content library (fasteners, hardware, profiles)"

Do NOT ask questions. Build it.