//! JSON serialization for bodies and meshes.
//!
//! This is the wire format across the WASM boundary and the geometry payload of
//! a `.tectonic` file. Every type involved derives serde, so the work here is
//! error mapping and the one invariant serde cannot express: a body read back
//! from JSON has to have its derived topology rebuilt before it can be asked
//! whether it is solid.

use crate::brep::Body;
use crate::error::{KernelError, KernelResult};
use crate::mesh::MeshData;

pub fn body_to_json(body: &Body) -> KernelResult<String> {
    serde_json::to_string(body)
        .map_err(|error| KernelError::new("serialize", format!("body: {error}")))
}

/// Reads a body back, rebuilding the edge and shell structure.
///
/// The rebuild is what makes a body read from a file answer questions the same
/// way one just modelled does. It is cheap next to parsing, and skipping it
/// would leave a body that reports itself as not solid purely because nothing
/// had derived its edges yet.
pub fn body_from_json(json: &str) -> KernelResult<Body> {
    let mut body: Body = serde_json::from_str(json)
        .map_err(|error| KernelError::new("deserialize", format!("body: {error}")))?;
    body.rebuild_topology();
    Ok(body)
}

pub fn mesh_to_json(mesh: &MeshData) -> KernelResult<String> {
    serde_json::to_string(mesh)
        .map_err(|error| KernelError::new("serialize", format!("mesh: {error}")))
}

pub fn mesh_from_json(json: &str) -> KernelResult<MeshData> {
    serde_json::from_str(json)
        .map_err(|error| KernelError::new("deserialize", format!("mesh: {error}")))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::math::Vec2;
    use crate::mesh::{triangulate, TessellationParams};
    use crate::ops::{self, ExtrudeParams};
    use crate::Profile;

    fn box_body() -> Body {
        let profile = Profile::rectangle(Vec2::ZERO, 2.0, 3.0);
        ops::extrude(&ExtrudeParams::new(profile, 4.0)).unwrap()
    }

    #[test]
    fn a_body_round_trips_and_stays_solid() {
        let body = box_body();
        let json = body_to_json(&body).unwrap();
        let restored = body_from_json(&json).unwrap();

        assert_eq!(restored.faces.len(), body.faces.len());
        assert_eq!(restored.vertices.len(), body.vertices.len());
        assert!(restored.is_solid());
        assert!((restored.volume() - 24.0).abs() < 1e-9);
        assert_eq!(restored.topology_ids(), body.topology_ids());
    }

    #[test]
    fn a_body_given_without_derived_topology_still_comes_back_solid() {
        // The minimum a caller has to supply: vertices and faces.
        let body = box_body();
        let minimal = serde_json::json!({
            "vertices": body.vertices,
            "faces": body.faces,
        })
        .to_string();

        let restored = body_from_json(&minimal).unwrap();
        assert_eq!(restored.edges.len(), 12);
        assert!(restored.is_solid());
        assert!((restored.volume() - 24.0).abs() < 1e-9);
    }

    #[test]
    fn a_mesh_round_trips() {
        let mesh = triangulate(&box_body(), &TessellationParams::default()).unwrap();
        let json = mesh_to_json(&mesh).unwrap();
        let restored = mesh_from_json(&json).unwrap();
        assert_eq!(restored, mesh);
        assert_eq!(restored.triangle_count(), 12);
    }

    #[test]
    fn malformed_json_reports_which_step_failed() {
        let error = body_from_json("not json at all").unwrap_err();
        assert_eq!(error.operation, "deserialize");
        assert!(error.message.starts_with("body:"));

        let error = mesh_from_json("{").unwrap_err();
        assert_eq!(error.operation, "deserialize");
        assert!(error.message.starts_with("mesh:"));
    }

    #[test]
    fn an_empty_body_round_trips() {
        let json = body_to_json(&Body::empty()).unwrap();
        assert!(body_from_json(&json).unwrap().is_empty());
    }
}
