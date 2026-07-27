//! Three-dimensional vectors — the kernel's world-space coordinate type.

use core::ops::{Add, AddAssign, Div, Mul, Neg, Sub, SubAssign};
use serde::{Deserialize, Serialize};

use super::{Vec2, EPSILON};

/// A point or direction in world space.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Vec3 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Vec3 {
    pub const ZERO: Self = Self { x: 0.0, y: 0.0, z: 0.0 };
    pub const ONE: Self = Self { x: 1.0, y: 1.0, z: 1.0 };
    pub const X: Self = Self { x: 1.0, y: 0.0, z: 0.0 };
    pub const Y: Self = Self { x: 0.0, y: 1.0, z: 0.0 };
    pub const Z: Self = Self { x: 0.0, y: 0.0, z: 1.0 };

    pub const fn new(x: f64, y: f64, z: f64) -> Self {
        Self { x, y, z }
    }

    pub const fn splat(value: f64) -> Self {
        Self { x: value, y: value, z: value }
    }

    pub fn add(self, other: Self) -> Self {
        Self::new(self.x + other.x, self.y + other.y, self.z + other.z)
    }

    pub fn sub(self, other: Self) -> Self {
        Self::new(self.x - other.x, self.y - other.y, self.z - other.z)
    }

    pub fn scale(self, factor: f64) -> Self {
        Self::new(self.x * factor, self.y * factor, self.z * factor)
    }

    /// Componentwise product. Used for non-uniform scaling.
    pub fn mul_componentwise(self, other: Self) -> Self {
        Self::new(self.x * other.x, self.y * other.y, self.z * other.z)
    }

    pub fn dot(self, other: Self) -> f64 {
        self.x * other.x + self.y * other.y + self.z * other.z
    }

    pub fn cross(self, other: Self) -> Self {
        Self::new(
            self.y * other.z - self.z * other.y,
            self.z * other.x - self.x * other.z,
            self.x * other.y - self.y * other.x,
        )
    }

    pub fn length_squared(self) -> f64 {
        self.dot(self)
    }

    pub fn length(self) -> f64 {
        self.length_squared().sqrt()
    }

    /// Unit vector in the same direction, or [`Vec3::ZERO`] for a zero vector.
    pub fn normalize(self) -> Self {
        let length = self.length();
        if length < EPSILON {
            Self::ZERO
        } else {
            self.scale(1.0 / length)
        }
    }

    pub fn distance(self, other: Self) -> f64 {
        self.sub(other).length()
    }

    pub fn distance_squared(self, other: Self) -> f64 {
        self.sub(other).length_squared()
    }

    pub fn lerp(self, other: Self, t: f64) -> Self {
        Self::new(
            self.x + (other.x - self.x) * t,
            self.y + (other.y - self.y) * t,
            self.z + (other.z - self.z) * t,
        )
    }

    /// Component of `self` lying along `axis`, which need not be normalized.
    pub fn project_onto(self, axis: Self) -> Self {
        let length_squared = axis.length_squared();
        if length_squared < EPSILON * EPSILON {
            Self::ZERO
        } else {
            axis.scale(self.dot(axis) / length_squared)
        }
    }

    /// Component of `self` at right angles to `axis`.
    pub fn reject_from(self, axis: Self) -> Self {
        self.sub(self.project_onto(axis))
    }

    /// Mirror of `self` in the plane through the origin with unit `normal`.
    pub fn reflect(self, normal: Self) -> Self {
        self.sub(normal.scale(2.0 * self.dot(normal)))
    }

    /// Unsigned angle between two directions, in `[0, pi]`.
    ///
    /// Uses `atan2` of the cross and dot products rather than `acos` of the
    /// normalized dot: near 0 and pi the latter loses most of its precision,
    /// which is exactly where coplanarity and reversal tests are decided.
    pub fn angle_to(self, other: Self) -> f64 {
        let cross = self.cross(other).length();
        let dot = self.dot(other);
        cross.atan2(dot)
    }

    /// Some unit vector at right angles to `self`.
    ///
    /// Picks the smallest component to cross against so the result stays well
    /// conditioned whatever direction `self` points in.
    pub fn any_perpendicular(self) -> Self {
        let axis = if self.x.abs() <= self.y.abs() && self.x.abs() <= self.z.abs() {
            Self::X
        } else if self.y.abs() <= self.z.abs() {
            Self::Y
        } else {
            Self::Z
        };
        let perpendicular = self.cross(axis);
        if perpendicular.length() < EPSILON {
            // `self` is degenerate; any direction will do.
            Self::X
        } else {
            perpendicular.normalize()
        }
    }

    pub fn min(self, other: Self) -> Self {
        Self::new(
            self.x.min(other.x),
            self.y.min(other.y),
            self.z.min(other.z),
        )
    }

    pub fn max(self, other: Self) -> Self {
        Self::new(
            self.x.max(other.x),
            self.y.max(other.y),
            self.z.max(other.z),
        )
    }

    pub fn abs(self) -> Self {
        Self::new(self.x.abs(), self.y.abs(), self.z.abs())
    }

    /// Largest component. Used for tolerance scaling against a shape's size.
    pub fn max_component(self) -> f64 {
        self.x.max(self.y).max(self.z)
    }

    pub fn min_component(self) -> f64 {
        self.x.min(self.y).min(self.z)
    }

    pub fn is_finite(self) -> bool {
        self.x.is_finite() && self.y.is_finite() && self.z.is_finite()
    }

    pub fn is_zero(self, tolerance: f64) -> bool {
        self.length_squared() <= tolerance * tolerance
    }

    pub fn approx_eq(self, other: Self, tolerance: f64) -> bool {
        (self.x - other.x).abs() <= tolerance
            && (self.y - other.y).abs() <= tolerance
            && (self.z - other.z).abs() <= tolerance
    }

    /// Drops the z component. Only meaningful for points already in a plane.
    pub fn xy(self) -> Vec2 {
        Vec2::new(self.x, self.y)
    }

    pub fn to_array(self) -> [f64; 3] {
        [self.x, self.y, self.z]
    }
}

impl Default for Vec3 {
    fn default() -> Self {
        Self::ZERO
    }
}

impl Add for Vec3 {
    type Output = Self;
    fn add(self, other: Self) -> Self {
        Vec3::add(self, other)
    }
}

impl AddAssign for Vec3 {
    fn add_assign(&mut self, other: Self) {
        *self = Vec3::add(*self, other);
    }
}

impl Sub for Vec3 {
    type Output = Self;
    fn sub(self, other: Self) -> Self {
        Vec3::sub(self, other)
    }
}

impl SubAssign for Vec3 {
    fn sub_assign(&mut self, other: Self) {
        *self = Vec3::sub(*self, other);
    }
}

impl Mul<f64> for Vec3 {
    type Output = Self;
    fn mul(self, factor: f64) -> Self {
        self.scale(factor)
    }
}

impl Div<f64> for Vec3 {
    type Output = Self;
    fn div(self, divisor: f64) -> Self {
        self.scale(1.0 / divisor)
    }
}

impl Neg for Vec3 {
    type Output = Self;
    fn neg(self) -> Self {
        Self::new(-self.x, -self.y, -self.z)
    }
}

impl From<(f64, f64, f64)> for Vec3 {
    fn from((x, y, z): (f64, f64, f64)) -> Self {
        Self::new(x, y, z)
    }
}

impl From<[f64; 3]> for Vec3 {
    fn from([x, y, z]: [f64; 3]) -> Self {
        Self::new(x, y, z)
    }
}

impl From<Vec2> for Vec3 {
    fn from(v: Vec2) -> Self {
        Self::new(v.x, v.y, 0.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use core::f64::consts::{FRAC_PI_2, PI};

    #[test]
    fn adds_and_subtracts_componentwise() {
        let a = Vec3::new(1.0, 2.0, 3.0);
        let b = Vec3::new(4.0, 8.0, 16.0);
        assert_eq!(a.add(b), Vec3::new(5.0, 10.0, 19.0));
        assert_eq!(b.sub(a), Vec3::new(3.0, 6.0, 13.0));
        assert_eq!(a + b, Vec3::new(5.0, 10.0, 19.0));
        assert_eq!(b - a, Vec3::new(3.0, 6.0, 13.0));
    }

    #[test]
    fn scales_and_negates() {
        let a = Vec3::new(1.0, -2.0, 3.0);
        assert_eq!(a.scale(2.0), Vec3::new(2.0, -4.0, 6.0));
        assert_eq!(a * 2.0, Vec3::new(2.0, -4.0, 6.0));
        assert_eq!(a / 0.5, Vec3::new(2.0, -4.0, 6.0));
        assert_eq!(-a, Vec3::new(-1.0, 2.0, -3.0));
        assert_eq!(
            a.mul_componentwise(Vec3::new(2.0, 3.0, 4.0)),
            Vec3::new(2.0, -6.0, 12.0)
        );
    }

    #[test]
    fn dot_is_zero_for_perpendicular_vectors() {
        assert_eq!(Vec3::X.dot(Vec3::Y), 0.0);
        assert_eq!(Vec3::X.dot(Vec3::X), 1.0);
        assert_eq!(Vec3::new(1.0, 2.0, 3.0).dot(Vec3::new(4.0, 5.0, 6.0)), 32.0);
    }

    #[test]
    fn cross_follows_the_right_hand_rule() {
        assert_eq!(Vec3::X.cross(Vec3::Y), Vec3::Z);
        assert_eq!(Vec3::Y.cross(Vec3::Z), Vec3::X);
        assert_eq!(Vec3::Z.cross(Vec3::X), Vec3::Y);
        assert_eq!(Vec3::Y.cross(Vec3::X), -Vec3::Z);
    }

    #[test]
    fn cross_of_parallel_vectors_is_zero() {
        assert_eq!(Vec3::X.cross(Vec3::X.scale(3.0)), Vec3::ZERO);
    }

    #[test]
    fn cross_is_perpendicular_to_both_inputs() {
        let a = Vec3::new(1.0, 2.0, 3.0);
        let b = Vec3::new(-4.0, 5.0, 6.0);
        let n = a.cross(b);
        assert!(n.dot(a).abs() < 1e-12);
        assert!(n.dot(b).abs() < 1e-12);
    }

    #[test]
    fn length_uses_pythagoras() {
        assert_eq!(Vec3::new(2.0, 3.0, 6.0).length(), 7.0);
        assert_eq!(Vec3::new(2.0, 3.0, 6.0).length_squared(), 49.0);
    }

    #[test]
    fn normalize_yields_unit_length() {
        let unit = Vec3::new(0.0, 3.0, 4.0).normalize();
        assert!((unit.length() - 1.0).abs() < 1e-12);
        assert!(unit.approx_eq(Vec3::new(0.0, 0.6, 0.8), 1e-12));
    }

    #[test]
    fn normalize_of_zero_stays_zero_rather_than_nan() {
        assert_eq!(Vec3::ZERO.normalize(), Vec3::ZERO);
        assert!(Vec3::ZERO.normalize().is_finite());
    }

    #[test]
    fn lerp_interpolates_between_endpoints() {
        let a = Vec3::ZERO;
        let b = Vec3::new(2.0, 4.0, 6.0);
        assert_eq!(a.lerp(b, 0.0), a);
        assert_eq!(a.lerp(b, 1.0), b);
        assert_eq!(a.lerp(b, 0.5), Vec3::new(1.0, 2.0, 3.0));
    }

    #[test]
    fn distance_measures_the_gap() {
        let a = Vec3::new(1.0, 1.0, 1.0);
        let b = Vec3::new(1.0, 4.0, 5.0);
        assert_eq!(a.distance(b), 5.0);
        assert_eq!(a.distance_squared(b), 25.0);
    }

    #[test]
    fn project_and_reject_split_a_vector() {
        let v = Vec3::new(2.0, 3.0, 0.0);
        let along = v.project_onto(Vec3::X);
        let across = v.reject_from(Vec3::X);
        assert!(along.approx_eq(Vec3::new(2.0, 0.0, 0.0), 1e-12));
        assert!(across.approx_eq(Vec3::new(0.0, 3.0, 0.0), 1e-12));
        assert!(along.add(across).approx_eq(v, 1e-12));
    }

    #[test]
    fn project_onto_a_degenerate_axis_is_zero() {
        assert_eq!(Vec3::ONE.project_onto(Vec3::ZERO), Vec3::ZERO);
    }

    #[test]
    fn reflect_flips_the_normal_component() {
        let bounced = Vec3::new(1.0, -1.0, 0.0).reflect(Vec3::Y);
        assert!(bounced.approx_eq(Vec3::new(1.0, 1.0, 0.0), 1e-12));
    }

    #[test]
    fn angle_to_is_unsigned_and_stable_at_the_extremes() {
        assert!((Vec3::X.angle_to(Vec3::Y) - FRAC_PI_2).abs() < 1e-12);
        assert!(Vec3::X.angle_to(Vec3::X) < 1e-12);
        assert!((Vec3::X.angle_to(-Vec3::X) - PI).abs() < 1e-12);
        // Nearly parallel: acos-based formulas lose precision here, atan2 does not.
        let nearly = Vec3::new(1.0, 1e-8, 0.0).normalize();
        assert!((Vec3::X.angle_to(nearly) - 1e-8).abs() < 1e-14);
    }

    #[test]
    fn any_perpendicular_is_unit_and_orthogonal() {
        for direction in [
            Vec3::X,
            Vec3::Y,
            Vec3::Z,
            Vec3::new(1.0, 2.0, 3.0).normalize(),
            Vec3::new(-5.0, 0.0, 0.1).normalize(),
        ] {
            let perpendicular = direction.any_perpendicular();
            assert!((perpendicular.length() - 1.0).abs() < 1e-12);
            assert!(perpendicular.dot(direction).abs() < 1e-12);
        }
    }

    #[test]
    fn any_perpendicular_of_zero_is_still_a_unit_vector() {
        assert_eq!(Vec3::ZERO.any_perpendicular(), Vec3::X);
    }

    #[test]
    fn min_max_abs_and_components() {
        let a = Vec3::new(-1.0, 5.0, 2.0);
        let b = Vec3::new(2.0, 3.0, 9.0);
        assert_eq!(a.min(b), Vec3::new(-1.0, 3.0, 2.0));
        assert_eq!(a.max(b), Vec3::new(2.0, 5.0, 9.0));
        assert_eq!(a.abs(), Vec3::new(1.0, 5.0, 2.0));
        assert_eq!(a.max_component(), 5.0);
        assert_eq!(a.min_component(), -1.0);
    }

    #[test]
    fn is_zero_respects_tolerance() {
        assert!(Vec3::new(1e-12, 0.0, 0.0).is_zero(1e-9));
        assert!(!Vec3::new(1e-3, 0.0, 0.0).is_zero(1e-9));
    }

    #[test]
    fn converts_from_tuples_arrays_and_vec2() {
        assert_eq!(Vec3::from((1.0, 2.0, 3.0)), Vec3::new(1.0, 2.0, 3.0));
        assert_eq!(Vec3::from([1.0, 2.0, 3.0]), Vec3::new(1.0, 2.0, 3.0));
        assert_eq!(Vec3::from(Vec2::new(1.0, 2.0)), Vec3::new(1.0, 2.0, 0.0));
        assert_eq!(Vec3::new(1.0, 2.0, 3.0).xy(), Vec2::new(1.0, 2.0));
        assert_eq!(Vec3::new(1.0, 2.0, 3.0).to_array(), [1.0, 2.0, 3.0]);
        assert_eq!(Vec3::default(), Vec3::ZERO);
        assert_eq!(Vec3::splat(2.0), Vec3::new(2.0, 2.0, 2.0));
    }

    #[test]
    fn assign_operators_mutate_in_place() {
        let mut a = Vec3::ZERO;
        a += Vec3::ONE;
        assert_eq!(a, Vec3::ONE);
        a -= Vec3::new(0.0, 1.0, 0.0);
        assert_eq!(a, Vec3::new(1.0, 0.0, 1.0));
    }

    #[test]
    fn round_trips_through_json() {
        let a = Vec3::new(1.5, -2.0, 0.25);
        let json = serde_json::to_string(&a).unwrap();
        assert_eq!(json, r#"{"x":1.5,"y":-2.0,"z":0.25}"#);
        assert_eq!(serde_json::from_str::<Vec3>(&json).unwrap(), a);
    }
}
