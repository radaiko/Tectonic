//! Half-edges — the directed traversal structure over the topology.

use serde::{Deserialize, Serialize};

use super::{EdgeId, FaceId, HalfEdgeId, VertexId};

/// Which way a half-edge runs along its edge.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Orientation {
    /// From the edge's first vertex to its second.
    Forward,
    Reversed,
}

impl Orientation {
    pub fn opposite(self) -> Self {
        match self {
            Self::Forward => Self::Reversed,
            Self::Reversed => Self::Forward,
        }
    }
}

/// One face's use of one edge.
///
/// Each edge of a closed solid is used twice — once by each of the two faces
/// meeting there — and the two uses run in opposite directions. That is the
/// whole manifold condition, and it is what [`super::Body::is_solid`] checks.
/// The `next`/`prev` links walk a face's boundary; `twin` steps across an edge
/// to the neighbouring face.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HalfEdge {
    pub id: HalfEdgeId,
    pub edge_id: EdgeId,
    pub face_id: FaceId,
    pub orientation: Orientation,
    /// The vertex this half-edge leaves from.
    pub origin: VertexId,
    /// Next half-edge round the same loop.
    pub next: HalfEdgeId,
    /// Previous half-edge round the same loop.
    pub prev: HalfEdgeId,
    /// The opposing use of the same edge, when the topology has one.
    pub twin: Option<HalfEdgeId>,
}

impl HalfEdge {
    /// True when no face lies on the other side — a boundary of an open shell.
    pub fn is_boundary(&self) -> bool {
        self.twin.is_none()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn half_edge() -> HalfEdge {
        HalfEdge {
            id: 0,
            edge_id: 4,
            face_id: 2,
            orientation: Orientation::Forward,
            origin: 7,
            next: 1,
            prev: 3,
            twin: None,
        }
    }

    #[test]
    fn orientation_has_two_opposing_directions() {
        assert_eq!(Orientation::Forward.opposite(), Orientation::Reversed);
        assert_eq!(Orientation::Reversed.opposite(), Orientation::Forward);
        assert_eq!(Orientation::Forward.opposite().opposite(), Orientation::Forward);
    }

    #[test]
    fn a_half_edge_without_a_twin_is_on_the_boundary() {
        let mut edge = half_edge();
        assert!(edge.is_boundary());
        edge.twin = Some(9);
        assert!(!edge.is_boundary());
    }

    #[test]
    fn round_trips_through_json() {
        let edge = half_edge();
        let json = serde_json::to_string(&edge).unwrap();
        assert!(json.contains("edgeId"));
        assert_eq!(serde_json::from_str::<HalfEdge>(&json).unwrap(), edge);
    }
}
