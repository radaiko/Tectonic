Complete the Rust geometric kernel for Tectonic CAD at ~/dev/private/Tectonic/kernel/. Current state: 30+ source files, 10,112 lines, 364/368 tests passing. Fix the remaining issues, add missing operations, complete WASM bindings, and integrate with TypeScript.

=== STEP 1 — FIX 4 FAILING TESTS ===

Run `cargo test` in kernel/tectonic-kernel/ to see the 4 failures. Fix them:

1. `mesh::polygon::tests::two_holes_are_both_eliminated` — assertion logic issue
2. `mesh::simplify::tests::simplifying_preserves_the_overall_shape` — tolerance or assertion
3. `ops::extrude::tests::a_draft_of_a_quarter_turn_is_refused` — angle check logic
4. `ops::extrude::tests::extruding_along_a_given_direction_ignores_the_plane_normal` — direction handling

Read each test and the source it tests. Fix the source code if the test is correct, or fix the test assertion if the behavior is correct. After fixing, run `cargo test` and confirm all 368 pass.

=== STEP 2 — ADD MISSING OPERATIONS ===

Add to `kernel/tectonic-kernel/src/ops/`:

**Revolve** (revolve.rs):
- Take a 2D profile + axis line + angle → revolved body
- Support: full revolve (360°), partial angle, symmetric angle
- Profile is a closed polyline, axis is a (point, direction) pair
- Split the profile into segments along the axis side, generate radial quads
- Each quad becomes two triangles in the mesh

**Sweep** (sweep.rs):
- Take a 2D profile + a 3D path (polyline of points) → swept body
- Support: perpendicular orientation (profile stays perpendicular to path), parallel orientation
- At each path vertex, compute the Frenet frame (tangent, normal, binormal)
- Transform the profile into each frame and skin between adjacent frames
- Skin: connect corresponding vertices between adjacent profiles
- Cap the start and end

**Loft** (loft.rs):
- Take multiple 2D profiles (at different positions along Z) → lofted body
- Support: center-line guide (optional third profile as a guide curve)
- Match vertex count between profiles (interpolate if needed)
- Skin between adjacent profiles
- Cap the start and end

**Boolean** (boolean.rs):
- Union, Subtract, Intersect between two bodies
- Use the BSP tree approach: partition both bodies, classify faces, merge
- return: Body (the resulting solid)

**Fillet** (fillet.rs):
- Round edges with a given radius
- For each edge: create a cylindrical surface segment that blends the two adjacent faces
- Replace the edge with the fillet surface
- Constant radius support

**Chamfer** (chamfer.rs):
- Bevel edges with distance-distance or distance-angle
- For each edge: create a planar face that connects the two faces at the specified distances
- Replace the edge with the chamfer face

**Shell** (shell.rs):
- Hollow out a body with specified wall thickness
- Remove specified faces, offset remaining faces inward by thickness
- Connect the offset faces with side faces

=== STEP 3 — COMPLETE WASM BINDINGS ===

Update `kernel/tectonic-wasm/src/lib.rs`:

- Use wasm-bindgen to export all kernel operations
- Each operation takes/returns a JSON string (the .tectonic format for mesh data)
- Export: extrude, revolve, sweep, loft, booleanUnion, booleanSubtract, booleanIntersect, fillet, chamfer, shell, triangulate, simplify, massProperties, boundingBox

```rust
#[wasm_bindgen]
pub fn extrude(profile_json: &str, distance: f64, draft_angle: f64) -> String {
    let profile: Vec<Vec2> = serde_json::from_str(profile_json).unwrap_or_default();
    let body = ops::extrude(&profile, distance, draft_angle);
    serde_json::to_string(&body).unwrap_or_default()
}
```

- Error handling: return Result<String, String> → JSON { error: "..." }
- Memory: no leaks, all allocations are freed on drop
- Build: run `wasm-pack build --target web` in the tectonic-wasm directory

=== STEP 4 — TYPE SCRIPT INTEGRATION ===

Update `src/kernel/createKernel.ts`:

- Try to load `@tectonic/kernel` (the wasm-pack output)
- If loaded, create a RustKernel that implements IKernel by calling the WASM functions
- If not loaded, fall back to StubKernel

```typescript
async function createKernel(): Promise<IKernel> {
  try {
    const wasm = await import('@tectonic/kernel')
    await wasm.default() // init the WASM module
    return new RustKernel(wasm)
  } catch {
    console.warn('Rust WASM kernel not available, using StubKernel')
    return new StubKernel()
  }
}
```

The RustKernel class wraps each WASM function, parsing JSON inputs/outputs.

=== STEP 5 — TESTS AND VALIDATION ===

After all steps:
1. Run `cargo test` in tectonic-kernel — all 368+ tests must pass
2. Run `wasm-pack build --target web` in tectonic-wasm — must compile
3. Run `npx tsc --noEmit` in the project root — must pass
4. Run `npm test` in the project root — all 1,818 tests must pass

Do NOT ask questions. Build it.