//! # tectonic-kernel
//!
//! The geometric modelling kernel behind Tectonic: B-Rep topology, the
//! modelling operations that build it, and the tessellation that turns it into
//! triangles a renderer can draw.
//!
//! The crate is deliberately free of platform dependencies — no threads, no
//! filesystem, no clock — so the same build runs under `cargo test` on the host
//! and inside WebAssembly. The WASM boundary lives in the sibling
//! `tectonic-wasm` crate; nothing here knows it exists.
//!
//! ## The model
//!
//! Geometry is a *faceted B-Rep*. A [`Body`] owns vertices, edges and faces;
//! each [`Face`] carries edge loops in the plane of a tagged [`Surface`]. Curved
//! surfaces are faceted when they are built and keep their analytic tag, so
//! [`mesh`] can refine them back towards the true surface at whatever quality a
//! given view asks for, and [`Face::normal_at`] can answer with the exact
//! normal rather than a facet's.
//!
//! ```
//! use tectonic_kernel::{ops, math::Vec2, mesh::TessellationParams, Profile};
//!
//! let square = Profile::from_points(vec![
//!     Vec2::new(0.0, 0.0),
//!     Vec2::new(10.0, 0.0),
//!     Vec2::new(10.0, 10.0),
//!     Vec2::new(0.0, 10.0),
//! ]);
//! let params = ops::ExtrudeParams::new(square, 5.0);
//! let body = ops::extrude(&params).unwrap();
//!
//! assert_eq!(body.faces.len(), 6);
//! assert!((body.volume() - 500.0).abs() < 1e-9);
//!
//! let mesh = tectonic_kernel::mesh::triangulate(&body, &TessellationParams::default()).unwrap();
//! assert_eq!(mesh.triangle_count(), 12);
//! ```

pub mod brep;
pub mod error;
pub mod io;
pub mod math;
pub mod mesh;
pub mod ops;

pub use brep::{
    Body, BoundingBox, CurveType, Edge, Face, HalfEdge, Loop, Orientation, Shell, Surface, Vertex,
};
pub use error::{KernelError, KernelResult};
pub use math::{Mat4, Plane, PlaneFrame, Quat, Vec2, Vec3};
pub use mesh::{MeshData, TessellationParams};
pub use ops::Profile;

/// The kernel's version, as reported to the host across the WASM boundary.
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// The backend name the host shows in its UI and logs.
pub const NAME: &str = "tectonic-rust";

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reports_its_identity() {
        assert_eq!(NAME, "tectonic-rust");
        assert!(!VERSION.is_empty());
    }
}
