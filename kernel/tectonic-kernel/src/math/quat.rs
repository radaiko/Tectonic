//! Unit quaternions — the kernel's rotation representation.
//!
//! Rotations are stored as quaternions rather than matrices because sweeps and
//! lofts interpolate between orientations, and interpolating matrices does not
//! produce a rotation.

use core::ops::Mul;
use serde::{Deserialize, Serialize};

use super::{Mat4, Vec3, EPSILON};

/// A rotation, as a quaternion `w + xi + yj + zk`.
///
/// Every constructor here returns a unit quaternion; [`Quat::normalize`] exists
/// for the drift that accumulates when many rotations are composed.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Quat {
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub w: f64,
}

impl Quat {
    pub const IDENTITY: Self = Self { x: 0.0, y: 0.0, z: 0.0, w: 1.0 };

    pub const fn new(x: f64, y: f64, z: f64, w: f64) -> Self {
        Self { x, y, z, w }
    }

    pub const fn identity() -> Self {
        Self::IDENTITY
    }

    /// Rotation of `radians` about `axis`, right-handed.
    pub fn from_axis_angle(axis: Vec3, radians: f64) -> Self {
        let axis = axis.normalize();
        if axis == Vec3::ZERO {
            return Self::IDENTITY;
        }
        let half = radians / 2.0;
        let (sin, cos) = half.sin_cos();
        Self::new(axis.x * sin, axis.y * sin, axis.z * sin, cos)
    }

    /// Intrinsic XYZ Euler angles, in radians — the order the UI presents them
    /// in, and the order three.js defaults to.
    pub fn from_euler(x: f64, y: f64, z: f64) -> Self {
        let (sx, cx) = (x / 2.0).sin_cos();
        let (sy, cy) = (y / 2.0).sin_cos();
        let (sz, cz) = (z / 2.0).sin_cos();
        Self::new(
            sx * cy * cz + cx * sy * sz,
            cx * sy * cz - sx * cy * sz,
            cx * cy * sz + sx * sy * cz,
            cx * cy * cz - sx * sy * sz,
        )
    }

    /// The shortest rotation carrying `from` onto `to`.
    ///
    /// Antiparallel inputs have no shortest rotation — every half-turn about an
    /// axis perpendicular to them works — so one such axis is picked. This is
    /// the case sweeps hit when a path doubles back on itself.
    pub fn from_rotation_between(from: Vec3, to: Vec3) -> Self {
        let from = from.normalize();
        let to = to.normalize();
        if from == Vec3::ZERO || to == Vec3::ZERO {
            return Self::IDENTITY;
        }
        let dot = from.dot(to).clamp(-1.0, 1.0);
        if dot > 1.0 - EPSILON {
            return Self::IDENTITY;
        }
        if dot < -1.0 + EPSILON {
            return Self::from_axis_angle(from.any_perpendicular(), core::f64::consts::PI);
        }
        let axis = from.cross(to);
        Self::new(axis.x, axis.y, axis.z, 1.0 + dot).normalize()
    }

    /// Hamilton product — the rotation that applies `other` first, then `self`.
    pub fn multiply(self, other: Self) -> Self {
        Self::new(
            self.w * other.x + self.x * other.w + self.y * other.z - self.z * other.y,
            self.w * other.y - self.x * other.z + self.y * other.w + self.z * other.x,
            self.w * other.z + self.x * other.y - self.y * other.x + self.z * other.w,
            self.w * other.w - self.x * other.x - self.y * other.y - self.z * other.z,
        )
    }

    pub fn length_squared(self) -> f64 {
        self.x * self.x + self.y * self.y + self.z * self.z + self.w * self.w
    }

    pub fn length(self) -> f64 {
        self.length_squared().sqrt()
    }

    pub fn normalize(self) -> Self {
        let length = self.length();
        if length < EPSILON {
            Self::IDENTITY
        } else {
            let scale = 1.0 / length;
            Self::new(self.x * scale, self.y * scale, self.z * scale, self.w * scale)
        }
    }

    pub fn conjugate(self) -> Self {
        Self::new(-self.x, -self.y, -self.z, self.w)
    }

    /// The opposite rotation. Equal to the conjugate for unit quaternions.
    pub fn inverse(self) -> Self {
        let length_squared = self.length_squared();
        if length_squared < EPSILON {
            return Self::IDENTITY;
        }
        let scale = 1.0 / length_squared;
        Self::new(
            -self.x * scale,
            -self.y * scale,
            -self.z * scale,
            self.w * scale,
        )
    }

    pub fn dot(self, other: Self) -> f64 {
        self.x * other.x + self.y * other.y + self.z * other.z + self.w * other.w
    }

    /// Applies the rotation to a vector.
    pub fn rotate(self, vector: Vec3) -> Vec3 {
        // v + 2 * (q_xyz x ((q_xyz x v) + w * v)) — the standard expansion,
        // cheaper and steadier than building a matrix for a single vector.
        let axis = Vec3::new(self.x, self.y, self.z);
        let t = axis.cross(vector).scale(2.0);
        vector.add(t.scale(self.w)).add(axis.cross(t))
    }

    /// The rotation angle in `[0, pi]`.
    pub fn angle(self) -> f64 {
        let q = self.normalize();
        2.0 * q.w.abs().clamp(0.0, 1.0).acos()
    }

    /// The rotation axis, or +X for a rotation of zero.
    pub fn axis(self) -> Vec3 {
        let axis = Vec3::new(self.x, self.y, self.z);
        if axis.length() < EPSILON {
            Vec3::X
        } else {
            axis.normalize()
        }
    }

    /// Spherical linear interpolation, taking the short way round.
    ///
    /// `q` and `-q` are the same rotation, so the sign is flipped when the
    /// inputs point away from each other — otherwise a loft between two nearly
    /// equal orientations could take the 350-degree path.
    pub fn slerp(self, other: Self, t: f64) -> Self {
        let a = self.normalize();
        let mut b = other.normalize();
        let mut dot = a.dot(b);

        if dot < 0.0 {
            b = Self::new(-b.x, -b.y, -b.z, -b.w);
            dot = -dot;
        }

        // Nearly coincident: slerp's denominator vanishes, so fall back to a
        // straight lerp, which agrees to within rounding error at this angle.
        if dot > 1.0 - 1e-9 {
            return Self::new(
                a.x + (b.x - a.x) * t,
                a.y + (b.y - a.y) * t,
                a.z + (b.z - a.z) * t,
                a.w + (b.w - a.w) * t,
            )
            .normalize();
        }

        let theta = dot.clamp(-1.0, 1.0).acos();
        let sin_theta = theta.sin();
        let scale_a = ((1.0 - t) * theta).sin() / sin_theta;
        let scale_b = (t * theta).sin() / sin_theta;
        Self::new(
            a.x * scale_a + b.x * scale_b,
            a.y * scale_a + b.y * scale_b,
            a.z * scale_a + b.z * scale_b,
            a.w * scale_a + b.w * scale_b,
        )
    }

    /// The equivalent rotation matrix.
    pub fn to_matrix(self) -> Mat4 {
        let q = self.normalize();
        let (x, y, z, w) = (q.x, q.y, q.z, q.w);
        let (x2, y2, z2) = (x + x, y + y, z + z);
        let (xx, xy, xz) = (x * x2, x * y2, x * z2);
        let (yy, yz, zz) = (y * y2, y * z2, z * z2);
        let (wx, wy, wz) = (w * x2, w * y2, w * z2);

        Mat4::from_rows([
            1.0 - (yy + zz),
            xy - wz,
            xz + wy,
            0.0,
            xy + wz,
            1.0 - (xx + zz),
            yz - wx,
            0.0,
            xz - wy,
            yz + wx,
            1.0 - (xx + yy),
            0.0,
            0.0,
            0.0,
            0.0,
            1.0,
        ])
    }

    /// Reads the rotation out of a matrix. Any scale in the matrix is ignored;
    /// the shear a non-uniform scale introduces is not representable and is
    /// dropped along with it.
    pub fn from_matrix(matrix: &Mat4) -> Self {
        let m = |row: usize, col: usize| matrix.get(row, col);
        let trace = m(0, 0) + m(1, 1) + m(2, 2);

        if trace > 0.0 {
            let s = 0.5 / (trace + 1.0).sqrt();
            Self::new(
                (m(2, 1) - m(1, 2)) * s,
                (m(0, 2) - m(2, 0)) * s,
                (m(1, 0) - m(0, 1)) * s,
                0.25 / s,
            )
            .normalize()
        } else if m(0, 0) > m(1, 1) && m(0, 0) > m(2, 2) {
            let s = 2.0 * (1.0 + m(0, 0) - m(1, 1) - m(2, 2)).sqrt();
            Self::new(
                0.25 * s,
                (m(0, 1) + m(1, 0)) / s,
                (m(0, 2) + m(2, 0)) / s,
                (m(2, 1) - m(1, 2)) / s,
            )
            .normalize()
        } else if m(1, 1) > m(2, 2) {
            let s = 2.0 * (1.0 + m(1, 1) - m(0, 0) - m(2, 2)).sqrt();
            Self::new(
                (m(0, 1) + m(1, 0)) / s,
                0.25 * s,
                (m(1, 2) + m(2, 1)) / s,
                (m(0, 2) - m(2, 0)) / s,
            )
            .normalize()
        } else {
            let s = 2.0 * (1.0 + m(2, 2) - m(0, 0) - m(1, 1)).sqrt();
            Self::new(
                (m(0, 2) + m(2, 0)) / s,
                (m(1, 2) + m(2, 1)) / s,
                0.25 * s,
                (m(1, 0) - m(0, 1)) / s,
            )
            .normalize()
        }
    }

    pub fn approx_eq(self, other: Self, tolerance: f64) -> bool {
        (self.x - other.x).abs() <= tolerance
            && (self.y - other.y).abs() <= tolerance
            && (self.z - other.z).abs() <= tolerance
            && (self.w - other.w).abs() <= tolerance
    }

    /// True when both describe the same rotation, allowing for the `q` / `-q`
    /// double cover.
    pub fn same_rotation(self, other: Self, tolerance: f64) -> bool {
        let negated = Self::new(-other.x, -other.y, -other.z, -other.w);
        self.approx_eq(other, tolerance) || self.approx_eq(negated, tolerance)
    }
}

impl Default for Quat {
    fn default() -> Self {
        Self::IDENTITY
    }
}

impl Mul for Quat {
    type Output = Self;
    fn mul(self, other: Self) -> Self {
        self.multiply(other)
    }
}

impl Mul<Vec3> for Quat {
    type Output = Vec3;
    fn mul(self, vector: Vec3) -> Vec3 {
        self.rotate(vector)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use core::f64::consts::{FRAC_PI_2, PI};

    #[test]
    fn identity_rotates_nothing() {
        let v = Vec3::new(1.0, 2.0, 3.0);
        assert_eq!(Quat::identity().rotate(v), v);
        assert_eq!(Quat::default(), Quat::IDENTITY);
        assert!((Quat::IDENTITY.length() - 1.0).abs() < 1e-12);
    }

    #[test]
    fn from_axis_angle_turns_the_right_way() {
        let q = Quat::from_axis_angle(Vec3::Z, FRAC_PI_2);
        assert!(q.rotate(Vec3::X).approx_eq(Vec3::Y, 1e-12));
        assert!(Quat::from_axis_angle(Vec3::X, FRAC_PI_2)
            .rotate(Vec3::Y)
            .approx_eq(Vec3::Z, 1e-12));
    }

    #[test]
    fn from_axis_angle_of_a_degenerate_axis_is_the_identity() {
        assert_eq!(Quat::from_axis_angle(Vec3::ZERO, 1.0), Quat::IDENTITY);
    }

    #[test]
    fn constructors_produce_unit_quaternions() {
        for q in [
            Quat::from_axis_angle(Vec3::new(1.0, 2.0, 3.0), 0.9),
            Quat::from_euler(0.3, -0.4, 1.2),
            Quat::from_rotation_between(Vec3::X, Vec3::new(1.0, 1.0, 1.0)),
        ] {
            assert!((q.length() - 1.0).abs() < 1e-12, "not unit: {q:?}");
        }
    }

    #[test]
    fn rotation_preserves_length() {
        let q = Quat::from_axis_angle(Vec3::new(1.0, 1.0, 0.0), 0.8);
        let v = Vec3::new(3.0, -2.0, 5.0);
        assert!((q.rotate(v).length() - v.length()).abs() < 1e-12);
    }

    #[test]
    fn rotating_about_an_axis_leaves_that_axis_fixed() {
        let axis = Vec3::new(1.0, 2.0, 3.0).normalize();
        let q = Quat::from_axis_angle(axis, 1.1);
        assert!(q.rotate(axis).approx_eq(axis, 1e-12));
    }

    #[test]
    fn multiply_applies_the_right_operand_first() {
        let z90 = Quat::from_axis_angle(Vec3::Z, FRAC_PI_2);
        let x90 = Quat::from_axis_angle(Vec3::X, FRAC_PI_2);
        let combined = x90.multiply(z90);
        // X --z90--> Y --x90--> Z
        assert!(combined.rotate(Vec3::X).approx_eq(Vec3::Z, 1e-12));
        assert!((x90 * z90).same_rotation(combined, 1e-12));
    }

    #[test]
    fn multiplication_matches_composing_the_matrices() {
        let a = Quat::from_axis_angle(Vec3::new(0.0, 1.0, 1.0), 0.6);
        let b = Quat::from_euler(0.2, 0.5, -0.3);
        let from_quat = a.multiply(b).to_matrix();
        let from_matrix = a.to_matrix().multiply(&b.to_matrix());
        assert!(from_quat.approx_eq(&from_matrix, 1e-12));
    }

    #[test]
    fn inverse_and_conjugate_undo_the_rotation() {
        let q = Quat::from_axis_angle(Vec3::new(1.0, -2.0, 0.5), 1.3);
        let v = Vec3::new(2.0, 0.0, -1.0);
        assert!(q.inverse().rotate(q.rotate(v)).approx_eq(v, 1e-12));
        assert!(q.conjugate().approx_eq(q.inverse(), 1e-12));
        assert!(q.multiply(q.inverse()).same_rotation(Quat::IDENTITY, 1e-12));
    }

    #[test]
    fn inverse_of_a_degenerate_quaternion_is_the_identity() {
        assert_eq!(Quat::new(0.0, 0.0, 0.0, 0.0).inverse(), Quat::IDENTITY);
        assert_eq!(Quat::new(0.0, 0.0, 0.0, 0.0).normalize(), Quat::IDENTITY);
    }

    #[test]
    fn from_euler_composes_intrinsic_xyz() {
        let q = Quat::from_euler(0.3, 0.7, -0.2);
        let expected = Quat::from_axis_angle(Vec3::X, 0.3)
            .multiply(Quat::from_axis_angle(Vec3::Y, 0.7))
            .multiply(Quat::from_axis_angle(Vec3::Z, -0.2));
        assert!(q.same_rotation(expected, 1e-12));
    }

    #[test]
    fn from_rotation_between_carries_one_direction_onto_the_other() {
        let from = Vec3::new(1.0, 2.0, 3.0);
        let to = Vec3::new(-2.0, 0.5, 1.0);
        let q = Quat::from_rotation_between(from, to);
        assert!(q.rotate(from.normalize()).approx_eq(to.normalize(), 1e-12));
    }

    #[test]
    fn from_rotation_between_handles_parallel_and_antiparallel_inputs() {
        assert!(Quat::from_rotation_between(Vec3::X, Vec3::X).same_rotation(Quat::IDENTITY, 1e-12));

        // Antiparallel: any perpendicular axis is a valid answer, so check the
        // result rather than the axis it chose.
        let flip = Quat::from_rotation_between(Vec3::X, -Vec3::X);
        assert!(flip.rotate(Vec3::X).approx_eq(-Vec3::X, 1e-12));

        assert_eq!(
            Quat::from_rotation_between(Vec3::ZERO, Vec3::X),
            Quat::IDENTITY
        );
    }

    #[test]
    fn slerp_hits_its_endpoints() {
        let a = Quat::from_axis_angle(Vec3::Z, 0.0);
        let b = Quat::from_axis_angle(Vec3::Z, 1.2);
        assert!(a.slerp(b, 0.0).same_rotation(a, 1e-12));
        assert!(a.slerp(b, 1.0).same_rotation(b, 1e-12));
    }

    #[test]
    fn slerp_moves_at_a_constant_angular_rate() {
        let a = Quat::IDENTITY;
        let b = Quat::from_axis_angle(Vec3::Z, PI * 0.8);
        let half = a.slerp(b, 0.5);
        assert!(half.same_rotation(Quat::from_axis_angle(Vec3::Z, PI * 0.4), 1e-12));
        let quarter = a.slerp(b, 0.25);
        assert!(quarter.same_rotation(Quat::from_axis_angle(Vec3::Z, PI * 0.2), 1e-12));
    }

    #[test]
    fn slerp_takes_the_short_way_round() {
        let a = Quat::from_axis_angle(Vec3::Z, 0.1);
        // The same rotation written with the opposite sign — the long way is a
        // near-full turn, the short way is almost nothing.
        let b = Quat::from_axis_angle(Vec3::Z, 0.2);
        let negated = Quat::new(-b.x, -b.y, -b.z, -b.w);
        let short = a.slerp(negated, 0.5);
        assert!(short.same_rotation(Quat::from_axis_angle(Vec3::Z, 0.15), 1e-9));
    }

    #[test]
    fn slerp_between_nearly_equal_rotations_stays_finite() {
        let a = Quat::from_axis_angle(Vec3::Z, 0.5);
        let b = Quat::from_axis_angle(Vec3::Z, 0.5 + 1e-12);
        let mid = a.slerp(b, 0.5);
        assert!((mid.length() - 1.0).abs() < 1e-9);
        assert!(mid.same_rotation(a, 1e-9));
    }

    #[test]
    fn to_matrix_agrees_with_direct_rotation() {
        let q = Quat::from_euler(0.4, -0.9, 1.1);
        let m = q.to_matrix();
        for v in [Vec3::X, Vec3::Y, Vec3::Z, Vec3::new(1.0, -2.0, 3.0)] {
            assert!(m.transform_vector(v).approx_eq(q.rotate(v), 1e-12));
        }
    }

    #[test]
    fn to_matrix_agrees_with_the_matrix_axis_rotation() {
        let axis = Vec3::new(1.0, 2.0, -1.0);
        let angle = 0.85;
        assert!(Quat::from_axis_angle(axis, angle)
            .to_matrix()
            .approx_eq(&Mat4::rotation(axis, angle), 1e-12));
    }

    #[test]
    fn from_matrix_round_trips_through_to_matrix() {
        // Each branch of the trace test needs exercising: a small rotation hits
        // the trace > 0 path, half-turns about each axis hit the other three.
        for q in [
            Quat::from_euler(0.3, 0.2, 0.1),
            Quat::from_axis_angle(Vec3::X, PI),
            Quat::from_axis_angle(Vec3::Y, PI),
            Quat::from_axis_angle(Vec3::Z, PI),
            Quat::from_axis_angle(Vec3::new(1.0, 1.0, 1.0), 2.0),
        ] {
            let round_tripped = Quat::from_matrix(&q.to_matrix());
            assert!(
                round_tripped.same_rotation(q, 1e-9),
                "{q:?} became {round_tripped:?}"
            );
        }
    }

    #[test]
    fn angle_and_axis_read_back_what_went_in() {
        let axis = Vec3::new(0.0, 1.0, 1.0).normalize();
        let q = Quat::from_axis_angle(axis, 1.0);
        assert!((q.angle() - 1.0).abs() < 1e-12);
        assert!(q.axis().approx_eq(axis, 1e-12));
        assert_eq!(Quat::IDENTITY.axis(), Vec3::X);
        assert!(Quat::IDENTITY.angle() < 1e-12);
    }

    #[test]
    fn same_rotation_sees_through_the_double_cover() {
        let q = Quat::from_axis_angle(Vec3::Y, 0.7);
        let negated = Quat::new(-q.x, -q.y, -q.z, -q.w);
        assert!(q.same_rotation(negated, 1e-12));
        assert!(!q.approx_eq(negated, 1e-12));
        assert!(negated.rotate(Vec3::X).approx_eq(q.rotate(Vec3::X), 1e-12));
    }

    #[test]
    fn operators_match_the_methods() {
        let a = Quat::from_axis_angle(Vec3::Z, 0.4);
        let b = Quat::from_axis_angle(Vec3::X, 0.6);
        assert_eq!(a * b, a.multiply(b));
        assert_eq!(a * Vec3::X, a.rotate(Vec3::X));
        assert!((a.dot(a) - 1.0).abs() < 1e-12);
    }

    #[test]
    fn round_trips_through_json() {
        let q = Quat::from_axis_angle(Vec3::Z, 0.5);
        let json = serde_json::to_string(&q).unwrap();
        assert!(serde_json::from_str::<Quat>(&json).unwrap().approx_eq(q, 1e-15));
    }
}
