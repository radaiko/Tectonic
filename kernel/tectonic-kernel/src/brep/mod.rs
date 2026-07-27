//! Boundary representation — the topology the kernel models with.
//!
//! A [`Body`] owns its cells in flat vectors and refers to them by index:
//! [`Vertex`], [`Edge`], [`Face`], plus the derived [`HalfEdge`] and [`Shell`]
//! structure. Indices rather than pointers keep the whole thing `Clone`, cheap
//! to serialize, and free of the reference cycles a linked topology would need.
//!
//! Geometry is faceted — every face's boundary is a loop of straight segments —
//! but each face records the [`Surface`] it was cut from, and each edge the
//! [`CurveType`] it follows. That tag is what [`crate::mesh`] refines against to
//! produce smooth output at any requested quality.

mod bbox;
mod body;
mod edge;
mod face;
mod halfedge;
mod shell;
mod surface;

pub use bbox::BoundingBox;
pub use body::{Body, MassProperties, Topology};
pub use edge::{CurveType, Edge};
pub use face::{newell_normal, Face, Loop, LoopKind};
pub use halfedge::{HalfEdge, Orientation};
pub use shell::Shell;
pub use surface::Surface;
pub use vertex::Vertex;

mod vertex;

/// Index of a vertex within its body.
pub type VertexId = usize;
/// Index of an edge within its body.
pub type EdgeId = usize;
/// Index of a face within its body.
pub type FaceId = usize;
/// Index of a half-edge within its body.
pub type HalfEdgeId = usize;
/// Index of a shell within its body.
pub type ShellId = usize;
