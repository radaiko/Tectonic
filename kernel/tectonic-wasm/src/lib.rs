//! WebAssembly bindings for the Tectonic kernel.
//!
//! The boundary is JSON in, JSON out. Every entry point parses its arguments,
//! calls into `tectonic-kernel`, and serializes the result; nothing here holds
//! state, so a host can call these in any order without a session to manage.
//!
//! Two shapes cross the boundary repeatedly:
//!
//! * A **body** — the kernel's own [`Body`] serialization. The host treats it as
//!   opaque and hands it straight back to the next operation. Only `vertices`
//!   and `faces` are required on the way in: the edge and shell structure is
//!   derived on arrival, so a body may travel stripped of it.
//! * A **mesh** — `{ positions, normals, indices }`, the flat arrays a renderer
//!   uploads. This is deliberately *not* the kernel's interleaved `MeshData`:
//!   the host's mesh type is three parallel arrays, and converting here saves
//!   the JavaScript side a de-interleaving pass over every vertex.
//!
//! Failures are thrown as a JSON string `{"operation": …, "message": …}` rather
//! than a bare message, so the host can report which feature failed and not just
//! that something did.
//!
//! Each `#[wasm_bindgen]` export is a two-line shell over a function in [`api`].
//! That split is what lets the whole boundary be tested with `cargo test` on the
//! host: `JsValue` only exists inside WebAssembly, so anything that touched it
//! directly could only be exercised in a browser.

use wasm_bindgen::prelude::*;

use tectonic_kernel::KernelError;

pub mod api;

/// The kernel's version, for the host to show and to check a cached module
/// against.
#[wasm_bindgen]
pub fn version() -> String {
    tectonic_kernel::VERSION.to_string()
}

/// The backend name the host shows in its UI and logs.
#[wasm_bindgen]
pub fn name() -> String {
    tectonic_kernel::NAME.to_string()
}

/* ----------------------------- construction ------------------------------ */

/// Sweeps a profile along a straight line into a solid.
#[wasm_bindgen]
pub fn extrude(params: &str) -> Result<String, JsValue> {
    api::extrude(params).map_err(throw)
}

/// Sweeps a profile about an axis lying in its own plane.
#[wasm_bindgen]
pub fn revolve(params: &str) -> Result<String, JsValue> {
    api::revolve(params).map_err(throw)
}

/// Sweeps a profile along a polyline spine.
#[wasm_bindgen]
pub fn sweep(params: &str) -> Result<String, JsValue> {
    api::sweep(params).map_err(throw)
}

/// Skins a run of cross-sections into a solid.
#[wasm_bindgen]
pub fn loft(params: &str) -> Result<String, JsValue> {
    api::loft(params).map_err(throw)
}

/// Adopts a triangle mesh as a body, welding its corners back together.
///
/// This is how geometry the kernel did not model — an imported file, or a result
/// that came back from the host's own fallback path — re-enters as something the
/// modelling operations will accept.
#[wasm_bindgen(js_name = bodyFromMesh)]
pub fn body_from_mesh(mesh: &str) -> Result<String, JsValue> {
    api::body_from_mesh(mesh).map_err(throw)
}

/* -------------------------------- booleans ------------------------------- */

/// Everything in either body.
#[wasm_bindgen(js_name = booleanUnion)]
pub fn boolean_union(a: &str, b: &str) -> Result<String, JsValue> {
    api::boolean_union(a, b).map_err(throw)
}

/// `target` with `tool` cut away from it.
#[wasm_bindgen(js_name = booleanSubtract)]
pub fn boolean_subtract(target: &str, tool: &str) -> Result<String, JsValue> {
    api::boolean_subtract(target, tool).map_err(throw)
}

/// Only the material the two bodies share.
#[wasm_bindgen(js_name = booleanIntersect)]
pub fn boolean_intersect(a: &str, b: &str) -> Result<String, JsValue> {
    api::boolean_intersect(a, b).map_err(throw)
}

/* ---------------------------- dress-up features --------------------------- */

/// Rounds the named edges, or every edge when none are named.
#[wasm_bindgen]
pub fn fillet(body: &str, params: &str) -> Result<String, JsValue> {
    api::fillet(body, params).map_err(throw)
}

/// Cuts the named edges back flat, or every edge when none are named.
#[wasm_bindgen]
pub fn chamfer(body: &str, params: &str) -> Result<String, JsValue> {
    api::chamfer(body, params).map_err(throw)
}

/// Hollows a solid, leaving the named faces open.
#[wasm_bindgen]
pub fn shell(body: &str, params: &str) -> Result<String, JsValue> {
    api::shell(body, params).map_err(throw)
}

/* -------------------------------- output --------------------------------- */

/// Turns a body into renderable triangles. Omitting `params` takes the kernel's
/// default quality.
#[wasm_bindgen]
pub fn triangulate(body: &str, params: Option<String>) -> Result<String, JsValue> {
    api::triangulate(body, params.as_deref()).map_err(throw)
}

/// Reduces a mesh to `ratio` of its triangles, between 0 and 1.
#[wasm_bindgen]
pub fn simplify(mesh: &str, ratio: f64) -> Result<String, JsValue> {
    api::simplify(mesh, ratio).map_err(throw)
}

/* ------------------------------ measurement ------------------------------ */

/// Volume, surface area, centre of mass and inertia, at unit density.
#[wasm_bindgen(js_name = massProperties)]
pub fn mass_properties(body: &str) -> Result<String, JsValue> {
    api::mass_properties(body).map_err(throw)
}

/// The body's axis-aligned extent in world space.
#[wasm_bindgen(js_name = boundingBox)]
pub fn bounding_box(body: &str) -> Result<String, JsValue> {
    api::bounding_box(body).map_err(throw)
}

/// The face, edge and vertex identifiers a host-side selection can name — the
/// ids [`fillet`], [`chamfer`] and [`shell`] take.
#[wasm_bindgen]
pub fn topology(body: &str) -> Result<String, JsValue> {
    api::topology(body).map_err(throw)
}

/// Whether the body bounds a volume rather than being a loose shell.
#[wasm_bindgen(js_name = isSolid)]
pub fn is_solid(body: &str) -> Result<bool, JsValue> {
    api::is_solid(body).map_err(throw)
}

/// Serializes an error into the string the host receives, falling back to a
/// hand-built object if even that fails — the host has to be handed something it
/// can parse, whatever went wrong.
fn throw(error: KernelError) -> JsValue {
    JsValue::from_str(&api::describe(&error))
}
