Build a Rust geometric kernel for Tectonic CAD at ~/dev/private/Tectonic that replaces the OpenCascade WASM dependency. The kernel must compile to WASM via wasm-pack and implement the IKernel interface.

## Project Structure

Create `~/dev/private/Tectonic/kernel/` as a Rust workspace:

```
kernel/
├── Cargo.toml          # workspace root
├── tectonic-kernel/    # the core geometry library
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── math/       # Vector2/3, Matrix4, Quaternion
│       ├── brep/       # B-Rep topology (body, face, edge, vertex)
│       ├── ops/        # Extrude, revolve, boolean, fillet, chamfer, shell
│       ├── mesh/       # Tessellation, triangulation
│       └── io/         # Serialization, import
├── tectonic-wasm/      # wasm-bindgen bindings
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       └── types.rs    # TypeScript-compatible types
└── build.rs            # wasm-pack build script
```

## Implementation Plan

### Phase 1 — Math Types (tectonic-kernel/src/math/)

Implement in pure Rust, no external dependencies:

- **Vec2** — x, y, add, sub, scale, dot, cross, length, normalize, rotate, angle
- **Vec3** — x, y, z, add, sub, scale, dot, cross, length, normalize, lerp, distance
- **Mat4** — 4x4 matrix, identity, multiply, translate, rotate, scale, perspective, orthographic, inverse, transpose
- **Quat** — quaternion, identity, multiply, rotate, slerp, from_axis_angle, from_euler, to_matrix

### Phase 2 — B-Rep Structures (tectonic-kernel/src/brep/)

- **Vertex**: id, position (Vec3)
- **Edge**: id, vertex_ids [2], curve_type (line, arc, circle, spline), curve_params
- **Face**: id, edge_loops, surface_type (plane, cylinder, sphere, cone, torus, nurbs), surface_params, normal
- **Body**: id, faces, is_solid (closed manifold), bounding_box
- **HalfEdge**: edge_id, orientation, next, prev, face_id (for winged-edge traversal)
- **Shell**: collection of connected faces forming a closed or open surface
- **BoundingBox**: min (Vec3), max (Vec3), center, radius, contains, intersects

### Phase 3 — Operations (tectonic-kernel/src/ops/)

- **Extrude**: take a 2D profile (polyline) + direction + distance → swept body
- **Revolve**: take a 2D profile + axis + angle → revolved body
- **Sweep**: take a profile + path curve → swept body
- **Loft**: take multiple profiles → interpolated body
- **Boolean Union/Subtract/Intersect**: CSG operations on two bodies
- **Fillet**: round edges with constant or variable radius
- **Chamfer**: bevel edges with distance-distance or distance-angle
- **Shell**: hollow out a body with specified wall thickness
- **Split**: split a body by a plane

### Phase 4 — Tessellation (tectonic-kernel/src/mesh/)

- **Triangulate**: convert B-Rep faces to triangle meshes (vertices + indices + normals)
  - Configurable quality (max edge length, max angle deviation)
  - Delaunay triangulation for planar faces
  - Adaptive tessellation for curved surfaces
- **MeshData**: Vec<f32> for vertices (packed [x,y,z,nx,ny,nz,u,v]), Vec<u32> for indices
- **Simplify**: reduce triangle count while preserving shape (edge collapse / QEM)
- **Merge**: combine multiple meshes into one

### Phase 5 — WASM Bindings (tectonic-wasm/)

- Use `wasm-bindgen` for all exports
- Use `serde` + `wasm-bindgen` for JSON serialization of inputs/outputs
- Each operation takes/returns a JSON string (the .tectonic format)

```rust
#[wasm_bindgen]
pub fn extrude(profile_json: &str, distance: f64, draft_angle: f64) -> String {
    // parse profile, extrude, return mesh JSON
}
```

- Memory management: no memory leaks, all allocated memory is freed on drop
- Error handling: return Result<String, String> → JSON { error: "..." }

### Phase 6 — Integration

Update `src/kernel/` in TypeScript:

- `createKernel()` tries to load the Rust WASM kernel first
- If it fails, falls back to the TypeScript StubKernel
- The Rust kernel is loaded via `@tectonic/kernel` npm package (built from the wasm workspace)
- TypeScript types mirror the Rust types (Vec3 → {x, y, z}, etc.)

## Build Setup

The Cargo.toml for tectonic-kernel:
```toml
[package]
name = "tectonic-kernel"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

The Cargo.toml for tectonic-wasm:
```toml
[package]
name = "tectonic-wasm"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
tectonic-kernel = { path = "../tectonic-kernel" }
wasm-bindgen = "0.2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

## Tests

For the Rust kernel:
- Unit tests for all math types (Vec2, Vec3, Mat4, Quat)
- Unit tests for B-Rep structures (creation, queries, bounding box)
- Integration tests for operations (extrude a rectangle → verify face count, volume)
- Integration tests for tessellation (triangulate a box → verify 12 triangles)
- Property-based tests: extrude then boolean union → closed solid

Do NOT ask questions. Build it.