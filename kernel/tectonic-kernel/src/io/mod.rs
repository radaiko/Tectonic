//! Serialization and mesh interchange.

mod json;

pub use json::{body_from_json, body_to_json, mesh_from_json, mesh_to_json};
