//! Tessellation — B-Rep in, triangles out.
//!
//! [`triangulate`] is the entry point: it walks a body's faces, triangulates
//! each one's loops, and refines the result against the face's analytic surface
//! until it meets the requested [`TessellationParams`]. [`simplify`] runs the
//! other way for callers that need fewer triangles than they were given.

mod data;
pub mod polygon;
mod simplify;
mod tessellate;

pub use data::{merge, MeshData, VERTEX_STRIDE};
pub use simplify::{simplify, simplify_to};
pub use tessellate::{triangulate, triangulate_face, TessellationParams};
