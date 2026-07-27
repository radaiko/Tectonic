//! Linear algebra for the kernel — vectors, matrices, quaternions and planes.
//!
//! Everything here is pure `f64` arithmetic with no dependencies beyond serde,
//! so the same code runs under `cargo test` on the host and inside WASM.

mod mat4;
mod plane;
mod quat;
mod vec2;
mod vec3;

pub use mat4::Mat4;
pub use plane::{Plane, PlaneFrame, Side};
pub use quat::Quat;
pub use vec2::Vec2;
pub use vec3::Vec3;

/// The floor below which a length is treated as zero.
///
/// This guards divisions — normalizing, inverting, intersecting — rather than
/// deciding whether two points are the same. It sits well below [`TOLERANCE`]
/// so that a quantity large enough to be geometrically meaningful is never
/// mistaken for a degenerate one.
pub const EPSILON: f64 = 1e-12;

/// The default modelling tolerance, in millimetres.
///
/// Two points closer than this are the same point as far as the topology is
/// concerned. It is deliberately much coarser than [`EPSILON`]: coordinates
/// arrive from a constraint solver and from imported files, and both carry
/// error well above the floating-point floor.
pub const TOLERANCE: f64 = 1e-7;

/// The angular counterpart of [`TOLERANCE`], in radians — roughly a
/// thousandth of a degree. Two directions closer than this are parallel.
pub const ANGULAR_TOLERANCE: f64 = 1e-9;

pub fn degrees_to_radians(degrees: f64) -> f64 {
    degrees * core::f64::consts::PI / 180.0
}

pub fn radians_to_degrees(radians: f64) -> f64 {
    radians * 180.0 / core::f64::consts::PI
}

/// True when two numbers agree to within [`TOLERANCE`].
pub fn approx_eq(a: f64, b: f64) -> bool {
    (a - b).abs() <= TOLERANCE
}

#[cfg(test)]
mod tests {
    use super::*;
    use core::f64::consts::PI;

    #[test]
    fn tolerances_are_ordered_from_finest_to_coarsest() {
        assert!(EPSILON < TOLERANCE);
        assert!(EPSILON > 0.0);
    }

    #[test]
    fn angle_conversions_round_trip() {
        assert!((degrees_to_radians(180.0) - PI).abs() < 1e-15);
        assert!((radians_to_degrees(PI) - 180.0).abs() < 1e-13);
        for degrees in [0.0, 45.0, 90.0, -30.0, 360.0] {
            assert!((radians_to_degrees(degrees_to_radians(degrees)) - degrees).abs() < 1e-12);
        }
    }

    #[test]
    fn approx_eq_uses_the_modelling_tolerance() {
        assert!(approx_eq(1.0, 1.0 + TOLERANCE / 2.0));
        assert!(!approx_eq(1.0, 1.0 + TOLERANCE * 10.0));
    }
}
