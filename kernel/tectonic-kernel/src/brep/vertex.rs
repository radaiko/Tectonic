//! Vertices — the zero-dimensional cells of the topology.

use serde::{Deserialize, Serialize};

use crate::math::Vec3;

use super::VertexId;

/// A point in space, referenced by index from the loops that pass through it.
///
/// Positions are stored once per body and shared by every face that meets
/// there, so moving a vertex moves every face at once and the topology cannot
/// come apart at a seam.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Vertex {
    pub id: VertexId,
    pub position: Vec3,
}

impl Vertex {
    pub fn new(id: VertexId, position: Vec3) -> Self {
        Self { id, position }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn carries_an_id_and_a_position() {
        let vertex = Vertex::new(3, Vec3::new(1.0, 2.0, 3.0));
        assert_eq!(vertex.id, 3);
        assert_eq!(vertex.position, Vec3::new(1.0, 2.0, 3.0));
    }

    #[test]
    fn round_trips_through_json() {
        let vertex = Vertex::new(1, Vec3::X);
        let json = serde_json::to_string(&vertex).unwrap();
        assert_eq!(serde_json::from_str::<Vertex>(&json).unwrap(), vertex);
    }
}
