//! The boundary, as plain Rust.
//!
//! Every function here is what the matching `#[wasm_bindgen]` export in the
//! crate root actually does: JSON string in, JSON string out, [`KernelError`] on
//! failure. Keeping the bindings themselves to a `map_err` means this module can
//! be tested with `cargo test` rather than only in a browser.

use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};

use tectonic_kernel::io::body_from_json;
use tectonic_kernel::mesh::{self, MeshData, TessellationParams};
use tectonic_kernel::ops::{
    self, ChamferParams, ExtrudeParams, FilletParams, LoftParams, RevolveParams, ShellParams,
    SweepParams,
};
use tectonic_kernel::{Body, KernelError, KernelResult};

/// How close two vertices of an adopted mesh have to be to become one, in
/// millimetres. A triangle soup arrives with each triangle's corners duplicated;
/// without welding, no two faces would share an edge and the body could never
/// report itself solid.
const WELD_TOLERANCE: f64 = 1e-6;

pub fn extrude(params: &str) -> KernelResult<String> {
    const OPERATION: &str = "extrude";
    let params: ExtrudeParams = decode(params, OPERATION)?;
    encode_body(&ops::extrude(&params)?, OPERATION)
}

pub fn revolve(params: &str) -> KernelResult<String> {
    const OPERATION: &str = "revolve";
    let params: RevolveParams = decode(params, OPERATION)?;
    encode_body(&ops::revolve(&params)?, OPERATION)
}

pub fn sweep(params: &str) -> KernelResult<String> {
    const OPERATION: &str = "sweep";
    let params: SweepParams = decode(params, OPERATION)?;
    encode_body(&ops::sweep(&params)?, OPERATION)
}

pub fn loft(params: &str) -> KernelResult<String> {
    const OPERATION: &str = "loft";
    let params: LoftParams = decode(params, OPERATION)?;
    encode_body(&ops::loft(&params)?, OPERATION)
}

pub fn body_from_mesh(mesh: &str) -> KernelResult<String> {
    const OPERATION: &str = "bodyFromMesh";
    let mesh = decode::<MeshArrays>(mesh, OPERATION)?.into_mesh();
    if mesh.triangle_count() == 0 {
        return Err(KernelError::new(OPERATION, "the mesh has no triangles"));
    }

    let mut body = Body::empty();
    for vertex in 0..mesh.vertex_count() {
        body.add_vertex(mesh.position(vertex));
    }
    for [a, b, c] in mesh.triangles() {
        body.add_face(vec![a, b, c]);
    }
    body.weld(WELD_TOLERANCE);
    body.remove_degenerate_faces(WELD_TOLERANCE);
    body.rebuild_topology();
    encode_body(&body, OPERATION)
}

pub fn boolean_union(a: &str, b: &str) -> KernelResult<String> {
    combine("union", a, b, ops::union)
}

pub fn boolean_subtract(target: &str, tool: &str) -> KernelResult<String> {
    combine("subtract", target, tool, ops::subtract)
}

pub fn boolean_intersect(a: &str, b: &str) -> KernelResult<String> {
    combine("intersect", a, b, ops::intersect)
}

pub fn fillet(body: &str, params: &str) -> KernelResult<String> {
    const OPERATION: &str = "fillet";
    let body = decode_body(body, OPERATION)?;
    let params: FilletParams = decode(params, OPERATION)?;
    encode_body(&ops::fillet(&body, &params)?, OPERATION)
}

pub fn chamfer(body: &str, params: &str) -> KernelResult<String> {
    const OPERATION: &str = "chamfer";
    let body = decode_body(body, OPERATION)?;
    let params: ChamferParams = decode(params, OPERATION)?;
    encode_body(&ops::chamfer(&body, &params)?, OPERATION)
}

pub fn shell(body: &str, params: &str) -> KernelResult<String> {
    const OPERATION: &str = "shell";
    let body = decode_body(body, OPERATION)?;
    let params: ShellParams = decode(params, OPERATION)?;
    encode_body(&ops::shell(&body, &params)?, OPERATION)
}

pub fn triangulate(body: &str, params: Option<&str>) -> KernelResult<String> {
    const OPERATION: &str = "triangulate";
    let body = decode_body(body, OPERATION)?;
    let params = match params {
        Some(json) if !json.is_empty() => decode::<Quality>(json, OPERATION)?.into_params(),
        _ => TessellationParams::default(),
    };
    encode(
        &MeshArrays::from_mesh(&mesh::triangulate(&body, &params)?),
        OPERATION,
    )
}

pub fn simplify(mesh: &str, ratio: f64) -> KernelResult<String> {
    const OPERATION: &str = "simplify";
    let arrays: MeshArrays = decode(mesh, OPERATION)?;
    if !ratio.is_finite() || ratio <= 0.0 {
        return Err(KernelError::new(
            OPERATION,
            format!("ratio must be greater than zero, got {ratio}"),
        ));
    }
    let simplified = mesh::simplify(&arrays.into_mesh(), ratio);
    encode(&MeshArrays::from_mesh(&simplified), OPERATION)
}

pub fn mass_properties(body: &str) -> KernelResult<String> {
    const OPERATION: &str = "massProperties";
    encode(&decode_body(body, OPERATION)?.mass_properties(), OPERATION)
}

pub fn bounding_box(body: &str) -> KernelResult<String> {
    const OPERATION: &str = "boundingBox";
    encode(&decode_body(body, OPERATION)?.bounding_box(), OPERATION)
}

pub fn topology(body: &str) -> KernelResult<String> {
    const OPERATION: &str = "topology";
    encode(&decode_body(body, OPERATION)?.topology_ids(), OPERATION)
}

pub fn is_solid(body: &str) -> KernelResult<bool> {
    Ok(decode_body(body, "isSolid")?.is_solid())
}

/// Serializes an error into the JSON the host is thrown.
pub fn describe(error: &KernelError) -> String {
    serde_json::to_string(error).unwrap_or_else(|_| {
        serde_json::json!({
            "operation": error.operation.clone(),
            "message": error.message.clone(),
        })
        .to_string()
    })
}

/* -------------------------------------------------------------------------- */

/// Tessellation quality, with every field optional.
///
/// [`TessellationParams`] itself has no serde defaults — inside the kernel a
/// quality setting is always complete. A host asking for one finer control and
/// the kernel's judgement on the rest should not have to restate the other two,
/// so the gaps are filled from the kernel's own defaults here.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct Quality {
    linear_deflection: f64,
    angular_deflection: f64,
    max_edge_length: f64,
}

impl Default for Quality {
    fn default() -> Self {
        Self::from_params(TessellationParams::default())
    }
}

impl Quality {
    fn from_params(params: TessellationParams) -> Self {
        Self {
            linear_deflection: params.linear_deflection,
            angular_deflection: params.angular_deflection,
            max_edge_length: params.max_edge_length,
        }
    }

    fn into_params(self) -> TessellationParams {
        TessellationParams {
            linear_deflection: self.linear_deflection,
            angular_deflection: self.angular_deflection,
            max_edge_length: self.max_edge_length,
        }
    }
}

/// A mesh as the host holds it: three parallel arrays rather than the kernel's
/// interleaved buffer.
#[derive(Debug, Default, Serialize, Deserialize)]
struct MeshArrays {
    positions: Vec<f64>,
    normals: Vec<f64>,
    indices: Vec<u32>,
}

impl MeshArrays {
    fn from_mesh(mesh: &MeshData) -> Self {
        let (positions, normals, indices) = mesh.to_arrays();
        Self { positions, normals, indices }
    }

    fn into_mesh(self) -> MeshData {
        MeshData::from_arrays(&self.positions, &self.normals, &self.indices)
    }
}

/// Runs a boolean, which differs from its neighbours only in which kernel
/// function it reaches for.
fn combine(
    operation: &str,
    a: &str,
    b: &str,
    apply: fn(&Body, &Body) -> KernelResult<Body>,
) -> KernelResult<String> {
    let first = decode_body(a, operation)?;
    let second = decode_body(b, operation)?;
    encode_body(&apply(&first, &second)?, operation)
}

fn decode<T: DeserializeOwned>(json: &str, operation: &str) -> KernelResult<T> {
    serde_json::from_str(json)
        .map_err(|error| KernelError::new(operation, format!("bad arguments: {error}")))
}

fn decode_body(json: &str, operation: &str) -> KernelResult<Body> {
    body_from_json(json).map_err(|error| KernelError::new(operation, error.message))
}

fn encode<T: Serialize>(value: &T, operation: &str) -> KernelResult<String> {
    serde_json::to_string(value)
        .map_err(|error| KernelError::new(operation, format!("serialize: {error}")))
}

/// Bodies go out stripped of their derived structure. Edges, half-edges and
/// shells are rebuilt on the way back in, so shipping them would roughly double
/// the payload to say something the kernel already knows.
fn encode_body(body: &Body, operation: &str) -> KernelResult<String> {
    encode(
        &Body {
            id: body.id.clone(),
            vertices: body.vertices.clone(),
            faces: body.faces.clone(),
            edges: Vec::new(),
            half_edges: Vec::new(),
            shells: Vec::new(),
        },
        operation,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn square(size: f64) -> String {
        format!(
            r#"{{"points":[{{"x":0,"y":0}},{{"x":{size},"y":0}},{{"x":{size},"y":{size}}},{{"x":0,"y":{size}}}]}}"#
        )
    }

    fn box_body(size: f64, height: f64) -> String {
        extrude(&format!(
            r#"{{"profile":{},"distance":{height}}}"#,
            square(size)
        ))
        .unwrap()
    }

    fn json(text: &str) -> serde_json::Value {
        serde_json::from_str(text).unwrap()
    }

    fn volume_of(body: &str) -> f64 {
        json(&mass_properties(body).unwrap())["volume"]
            .as_f64()
            .unwrap()
    }

    #[test]
    fn extrudes_a_square_into_a_box() {
        let body = json(&box_body(10.0, 5.0));
        assert_eq!(body["faces"].as_array().unwrap().len(), 6);
        assert_eq!(body["vertices"].as_array().unwrap().len(), 8);
        // The derived structure is left for the next call to rebuild.
        assert!(body["edges"].as_array().unwrap().is_empty());
    }

    #[test]
    fn a_body_answers_every_measurement() {
        let body = box_body(10.0, 5.0);
        assert!(is_solid(&body).unwrap());
        assert!((volume_of(&body) - 500.0).abs() < 1e-9);

        let bounds = json(&bounding_box(&body).unwrap());
        assert_eq!(bounds["max"]["z"].as_f64().unwrap(), 5.0);

        let topology = json(&topology(&body).unwrap());
        assert_eq!(topology["faceIds"].as_array().unwrap().len(), 6);
        assert_eq!(topology["edgeIds"].as_array().unwrap().len(), 12);
    }

    #[test]
    fn revolving_a_square_makes_a_ring() {
        let params = format!(
            r#"{{"profile":{},"axis":{{"origin":{{"x":-5,"y":0}},"direction":{{"x":0,"y":1}}}},"angle":360}}"#,
            square(2.0)
        );
        assert!(volume_of(&revolve(&params).unwrap()) > 0.0);
    }

    #[test]
    fn sweeping_follows_the_path() {
        let params = format!(
            r#"{{"profile":{},"path":[{{"x":0,"y":0,"z":0}},{{"x":0,"y":0,"z":10}}]}}"#,
            square(2.0)
        );
        assert!((volume_of(&sweep(&params).unwrap()) - 40.0).abs() < 1e-6);
    }

    #[test]
    fn lofting_joins_two_sections() {
        let params = format!(
            r#"{{"sections":[{{"profile":{}}},{{"profile":{},"plane":{{"origin":{{"x":0,"y":0,"z":10}},"xAxis":{{"x":1,"y":0,"z":0}},"yAxis":{{"x":0,"y":1,"z":0}}}}}}]}}"#,
            square(4.0),
            square(4.0)
        );
        assert!((volume_of(&loft(&params).unwrap()) - 160.0).abs() < 1e-6);
    }

    #[test]
    fn triangulates_into_parallel_arrays() {
        let mesh: MeshArrays =
            serde_json::from_str(&triangulate(&box_body(10.0, 5.0), None).unwrap()).unwrap();
        assert_eq!(mesh.indices.len(), 36);
        assert_eq!(mesh.normals.len(), mesh.positions.len());
    }

    /// A quality given in part is topped up from the kernel's defaults, so a
    /// host can ask for one control and leave the rest to the kernel.
    #[test]
    fn tessellation_quality_is_honoured_field_by_field() {
        let body = box_body(10.0, 5.0);
        let count = |params: Option<&str>| {
            serde_json::from_str::<MeshArrays>(&triangulate(&body, params).unwrap())
                .unwrap()
                .indices
                .len()
        };

        let coarse = count(Some(""));
        assert_eq!(coarse, count(None));
        assert!(count(Some(r#"{"maxEdgeLength":1}"#)) > coarse);
    }

    #[test]
    fn a_mesh_comes_back_as_a_solid_body() {
        let mesh = triangulate(&box_body(10.0, 5.0), None).unwrap();
        let body = body_from_mesh(&mesh).unwrap();

        assert!(is_solid(&body).unwrap());
        assert!((volume_of(&body) - 500.0).abs() < 1e-6);
    }

    #[test]
    fn simplify_never_grows_a_mesh() {
        let mesh = triangulate(&box_body(10.0, 5.0), None).unwrap();
        let before: MeshArrays = serde_json::from_str(&mesh).unwrap();
        let after: MeshArrays = serde_json::from_str(&simplify(&mesh, 0.5).unwrap()).unwrap();
        assert!(after.indices.len() <= before.indices.len());
    }

    #[test]
    fn booleans_add_and_remove_material() {
        let large = box_body(10.0, 10.0);
        let small = box_body(4.0, 4.0);

        assert!(volume_of(&boolean_subtract(&large, &small).unwrap()) < 1000.0);
        assert!(volume_of(&boolean_union(&large, &small).unwrap()) >= 1000.0 - 1e-6);
        assert!(volume_of(&boolean_intersect(&large, &small).unwrap()) <= 64.0 + 1e-6);
    }

    /// The dress-up features take the ids [`topology`] reports, on a body that
    /// arrived without its derived structure — the two halves of the round trip
    /// a host makes between selecting an edge and rounding it.
    #[test]
    fn dress_up_features_take_the_ids_topology_reports() {
        let body = box_body(10.0, 10.0);
        let ids = json(&topology(&body).unwrap());
        let edge = ids["edgeIds"][0].as_str().unwrap().to_string();
        let face = ids["faceIds"][0].as_str().unwrap().to_string();

        assert!(volume_of(&fillet(&body, &format!(r#"{{"radius":1,"edgeIds":["{edge}"]}}"#)).unwrap()) < 1000.0);
        assert!(volume_of(&chamfer(&body, &format!(r#"{{"distance":1,"edgeIds":["{edge}"]}}"#)).unwrap()) < 1000.0);
        assert!(volume_of(&shell(&body, &format!(r#"{{"thickness":1,"openFaceIds":["{face}"]}}"#)).unwrap()) < 1000.0);
    }

    #[test]
    fn hollowing_without_an_open_face_still_works() {
        assert!(shell(&box_body(10.0, 10.0), r#"{"thickness":1}"#).is_ok());
    }

    /// The kernel has no corner patch, so it refuses two edges that meet rather
    /// than producing a torn blend. Asking for every edge of a box is the way a
    /// host runs into that, and the message has to say so.
    #[test]
    fn blending_edges_that_touch_is_refused_with_a_reason() {
        let body = box_body(10.0, 10.0);
        let error = fillet(&body, r#"{"radius":1}"#).unwrap_err();
        assert_eq!(error.operation, "fillet");
        assert!(error.message.contains("corner"), "{}", error.message);
    }

    #[test]
    fn malformed_arguments_name_the_operation_that_rejected_them() {
        let error = extrude("not json").unwrap_err();
        assert_eq!(error.operation, "extrude");
        assert!(error.message.starts_with("bad arguments:"));

        let error = fillet("{}", r#"{"radius":1}"#).unwrap_err();
        assert_eq!(error.operation, "fillet");
    }

    #[test]
    fn a_failed_operation_reports_the_kernels_own_reason() {
        let error = extrude(r#"{"profile":{"points":[]},"distance":5}"#).unwrap_err();
        assert_eq!(error.operation, "extrude");
        assert!(!error.message.is_empty());
    }

    #[test]
    fn an_empty_mesh_is_refused_rather_than_adopted() {
        let error = body_from_mesh(r#"{"positions":[],"normals":[],"indices":[]}"#).unwrap_err();
        assert_eq!(error.operation, "bodyFromMesh");
    }

    #[test]
    fn a_zero_ratio_is_refused() {
        let mesh = triangulate(&box_body(10.0, 5.0), None).unwrap();
        assert_eq!(simplify(&mesh, 0.0).unwrap_err().operation, "simplify");
    }

    #[test]
    fn errors_serialize_for_the_host() {
        let text = describe(&KernelError::new("extrude", "no profile"));
        let parsed = json(&text);
        assert_eq!(parsed["operation"], "extrude");
        assert_eq!(parsed["message"], "no profile");
    }
}
