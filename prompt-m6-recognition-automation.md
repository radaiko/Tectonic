=== CURRENT STATE ===
- ✅ OpenCascade WASM B-Rep kernel
- ✅ 2D Drawing workspace
- ✅ Weldments + Standard Content Library

=== BUILD — Feature Recognition + Derived/Linked Components + Design Automation ===

=== PART 1 — FEATURE RECOGNITION ===

Create `src/recognition/`:

**FeatureRecognizer** (src/recognition/FeatureRecognizer.ts):
- Takes: imported B-Rep body (from STEP/IGES import)
- Analyzes the body topology to identify parametric features
- Output: a reconstruction of the feature tree (as close as possible to the original)

Recognition algorithms:
- **Extrude recognition**: find planar faces with parallel opposite faces → identify extrude direction, depth, profile
- **Revolve recognition**: find cylindrical/conical faces sharing an axis → identify revolve axis, angle, profile
- **Hole recognition**: find cylindrical faces → identify hole diameter, depth, type (through/blind), thread
- **Fillet recognition**: find constant-radius concave edges → identify fillet radius, edge chain
- **Chamfer recognition**: find beveled edges → identify chamfer distances
- **Pattern recognition**: find repeated features → identify pattern type, count, spacing
- **Mirror recognition**: find symmetric features → identify mirror plane
- **Shell recognition**: find constant-thickness hollow body → identify shell thickness, open faces

**FeatureReconstructor** (src/recognition/FeatureReconstructor.ts):
- Takes recognized features + creates a feature tree in the Tectonic document
- Generates sketch geometry for each recognized feature
- Produces a fully parametric, editable model

**RecognitionUI** (src/recognition/RecognitionUI.tsx):
- Progress indicator during recognition
- Shows recognized features for user confirmation
- Manual override: user can correct misrecognized features
- Import → Recognize → Edit workflow

=== PART 2 — DERIVED / LINKED COMPONENTS ===

Create `src/assembly/DerivedComponent.ts`:

**DerivedPart** (src/assembly/DerivedPart.ts):
- A part that references another part (the "source") as its base
- Changes: modifies the source (adds/removes features, changes dimensions)
- On source update: re-evaluate derived part with changes applied
- Chain: derived part can be the source for another derived part

**LinkedComponent** (src/assembly/LinkedComponent.ts):
- Assembly component that references an external .tectonic file
- On file change: re-load and update the component
- Path: relative path to the external file
- Auto-update: prompt user when external file changes, or auto-update

**TopDownDesign** (src/assembly/TopDownDesign.ts):
- Create a new part "in context" of an assembly
- Reference other components' geometry (edges, faces, vertices)
- "Make independent" to break the link
- "Update all" to propagate changes

**DerivedUI** (src/assembly/DerivedUI.tsx):
- Visual indicator for derived/linked components in the assembly tree
- "Update" button for linked components
- "Make Independent" context menu option
- "Create Derived Part" menu option

=== PART 3 — DESIGN AUTOMATION ===

Create `src/automation/`:

**ParameterTable** (src/automation/ParameterTable.ts):
- Global named parameters accessible from any feature/any sketch
- Expressions: `length = width * 2 + 5`, `angle = atan(height / width)`
- Functions: sin, cos, tan, asin, acos, atan, sqrt, abs, floor, ceil, round, min, max, pow, log
- Units: mm, cm, m, inch, deg, rad
- References: `d1 = Sketch1.line1.length`, `volume = Part1.Body1.volume`

**RulesEngine** (src/automation/RulesEngine.ts):
- If-then rules: `if (length > 100) then suppress(Feature3)`
- Event triggers: on parameter change, on feature creation, on import
- Actions: set parameter, suppress feature, unsuppress feature, add feature, remove feature, change material

**DesignScript** (src/automation/DesignScript.ts):
- Simple scripting language for design automation
- For now: a JSON-based sequence of operations
- Future: JavaScript/TypeScript-based scripting
- Example: `{ "type": "setParameter", "name": "length", "value": 200 }`

**AutomationUI** (src/automation/AutomationUI.tsx):
- Parameter table editor (add/edit/delete parameters, expressions)
- Rule editor (if-then with visual builder)
- Script runner (execute scripts, show progress, undo)
- Parameter browser (search, filter, reference)

=== CROSS-CUTTING ===
- npm test passes
- TypeScript strict mode
- Expression parser supports basic math functions + unit conversion
- Rules are evaluated in order (no circular dependency)

=== AFTER ===
- Verify: npx tsc --noEmit
- Verify: npm test
- Commit: git add -A && git commit -m "feat: feature recognition, derived/linked components, design automation (parameters, rules, scripting)"

Do NOT ask questions. Build it.