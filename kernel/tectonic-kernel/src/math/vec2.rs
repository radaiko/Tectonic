//! Two-dimensional vectors — the coordinate space sketches and profiles live in.

use core::ops::{Add, AddAssign, Div, Mul, Neg, Sub, SubAssign};
use serde::{Deserialize, Serialize};

use super::EPSILON;

/// A point or direction in the plane.
///
/// Profiles reach the kernel in a sketch plane's local 2D coordinates; the
/// modelling operations lift them into world space themselves, so everything
/// upstream of `ops/` can stay two-dimensional.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Vec2 {
    pub x: f64,
    pub y: f64,
}

impl Vec2 {
    pub const ZERO: Self = Self { x: 0.0, y: 0.0 };
    pub const ONE: Self = Self { x: 1.0, y: 1.0 };
    pub const X: Self = Self { x: 1.0, y: 0.0 };
    pub const Y: Self = Self { x: 0.0, y: 1.0 };

    pub const fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }

    pub const fn splat(value: f64) -> Self {
        Self { x: value, y: value }
    }

    pub fn add(self, other: Self) -> Self {
        Self::new(self.x + other.x, self.y + other.y)
    }

    pub fn sub(self, other: Self) -> Self {
        Self::new(self.x - other.x, self.y - other.y)
    }

    pub fn scale(self, factor: f64) -> Self {
        Self::new(self.x * factor, self.y * factor)
    }

    pub fn dot(self, other: Self) -> f64 {
        self.x * other.x + self.y * other.y
    }

    /// The z component of the 3D cross product — signed area of the
    /// parallelogram, and the sign test every winding check here is built on.
    pub fn cross(self, other: Self) -> f64 {
        self.x * other.y - self.y * other.x
    }

    pub fn length_squared(self) -> f64 {
        self.dot(self)
    }

    pub fn length(self) -> f64 {
        self.length_squared().sqrt()
    }

    /// Unit vector in the same direction, or [`Vec2::ZERO`] for a zero vector.
    ///
    /// Returning zero rather than NaN keeps a degenerate segment from poisoning
    /// a whole profile: the caller sees a length-zero direction and can skip it.
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
        )
    }

    /// Counter-clockwise rotation about the origin, in radians.
    pub fn rotate(self, radians: f64) -> Self {
        let (sin, cos) = radians.sin_cos();
        Self::new(self.x * cos - self.y * sin, self.x * sin + self.y * cos)
    }

    /// Rotation counter-clockwise by a quarter turn. Exact, unlike `rotate`.
    pub fn perpendicular(self) -> Self {
        Self::new(-self.y, self.x)
    }

    /// Direction as an angle in `(-pi, pi]`, measured from +X.
    pub fn angle(self) -> f64 {
        self.y.atan2(self.x)
    }

    /// Signed angle from `self` to `other`, in `(-pi, pi]`.
    pub fn angle_to(self, other: Self) -> f64 {
        self.cross(other).atan2(self.dot(other))
    }

    pub fn min(self, other: Self) -> Self {
        Self::new(self.x.min(other.x), self.y.min(other.y))
    }

    pub fn max(self, other: Self) -> Self {
        Self::new(self.x.max(other.x), self.y.max(other.y))
    }

    pub fn abs(self) -> Self {
        Self::new(self.x.abs(), self.y.abs())
    }

    pub fn is_finite(self) -> bool {
        self.x.is_finite() && self.y.is_finite()
    }

    pub fn approx_eq(self, other: Self, tolerance: f64) -> bool {
        (self.x - other.x).abs() <= tolerance && (self.y - other.y).abs() <= tolerance
    }
}

impl Default for Vec2 {
    fn default() -> Self {
        Self::ZERO
    }
}

impl Add for Vec2 {
    type Output = Self;
    fn add(self, other: Self) -> Self {
        Vec2::add(self, other)
    }
}

impl AddAssign for Vec2 {
    fn add_assign(&mut self, other: Self) {
        *self = Vec2::add(*self, other);
    }
}

impl Sub for Vec2 {
    type Output = Self;
    fn sub(self, other: Self) -> Self {
        Vec2::sub(self, other)
    }
}

impl SubAssign for Vec2 {
    fn sub_assign(&mut self, other: Self) {
        *self = Vec2::sub(*self, other);
    }
}

impl Mul<f64> for Vec2 {
    type Output = Self;
    fn mul(self, factor: f64) -> Self {
        self.scale(factor)
    }
}

impl Div<f64> for Vec2 {
    type Output = Self;
    fn div(self, divisor: f64) -> Self {
        self.scale(1.0 / divisor)
    }
}

impl Neg for Vec2 {
    type Output = Self;
    fn neg(self) -> Self {
        Self::new(-self.x, -self.y)
    }
}

impl From<(f64, f64)> for Vec2 {
    fn from((x, y): (f64, f64)) -> Self {
        Self::new(x, y)
    }
}

impl From<[f64; 2]> for Vec2 {
    fn from([x, y]: [f64; 2]) -> Self {
        Self::new(x, y)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use core::f64::consts::{FRAC_PI_2, PI};

    #[test]
    fn adds_and_subtracts_componentwise() {
        let a = Vec2::new(1.0, 2.0);
        let b = Vec2::new(4.0, 8.0);
        assert_eq!(a.add(b), Vec2::new(5.0, 10.0));
        assert_eq!(b.sub(a), Vec2::new(3.0, 6.0));
        assert_eq!(a + b, Vec2::new(5.0, 10.0));
        assert_eq!(b - a, Vec2::new(3.0, 6.0));
    }

    #[test]
    fn scales_and_negates() {
        let a = Vec2::new(1.5, -2.0);
        assert_eq!(a.scale(2.0), Vec2::new(3.0, -4.0));
        assert_eq!(a * 2.0, Vec2::new(3.0, -4.0));
        assert_eq!(a / 0.5, Vec2::new(3.0, -4.0));
        assert_eq!(-a, Vec2::new(-1.5, 2.0));
    }

    #[test]
    fn dot_is_zero_for_perpendicular_vectors() {
        assert_eq!(Vec2::X.dot(Vec2::Y), 0.0);
        assert_eq!(Vec2::X.dot(Vec2::X), 1.0);
        assert_eq!(Vec2::new(3.0, 4.0).dot(Vec2::new(2.0, 1.0)), 10.0);
    }

    #[test]
    fn cross_gives_signed_parallelogram_area() {
        assert_eq!(Vec2::X.cross(Vec2::Y), 1.0);
        assert_eq!(Vec2::Y.cross(Vec2::X), -1.0);
        assert_eq!(Vec2::new(2.0, 0.0).cross(Vec2::new(0.0, 3.0)), 6.0);
    }

    #[test]
    fn length_uses_pythagoras() {
        assert_eq!(Vec2::new(3.0, 4.0).length(), 5.0);
        assert_eq!(Vec2::new(3.0, 4.0).length_squared(), 25.0);
        assert_eq!(Vec2::ZERO.length(), 0.0);
    }

    #[test]
    fn normalize_yields_unit_length() {
        let unit = Vec2::new(3.0, 4.0).normalize();
        assert!((unit.length() - 1.0).abs() < 1e-12);
        assert!(unit.approx_eq(Vec2::new(0.6, 0.8), 1e-12));
    }

    #[test]
    fn normalize_of_zero_stays_zero_rather_than_nan() {
        let unit = Vec2::ZERO.normalize();
        assert_eq!(unit, Vec2::ZERO);
        assert!(unit.is_finite());
    }

    #[test]
    fn rotate_turns_counter_clockwise() {
        let rotated = Vec2::X.rotate(FRAC_PI_2);
        assert!(rotated.approx_eq(Vec2::Y, 1e-12));
        let half = Vec2::X.rotate(PI);
        assert!(half.approx_eq(Vec2::new(-1.0, 0.0), 1e-12));
    }

    #[test]
    fn rotate_preserves_length() {
        let a = Vec2::new(3.0, 4.0);
        assert!((a.rotate(0.7).length() - 5.0).abs() < 1e-12);
    }

    #[test]
    fn perpendicular_is_an_exact_quarter_turn() {
        assert_eq!(Vec2::X.perpendicular(), Vec2::Y);
        assert_eq!(Vec2::Y.perpendicular(), Vec2::new(-1.0, 0.0));
        assert_eq!(Vec2::new(2.0, 3.0).perpendicular().dot(Vec2::new(2.0, 3.0)), 0.0);
    }

    #[test]
    fn angle_measures_from_positive_x() {
        assert_eq!(Vec2::X.angle(), 0.0);
        assert!((Vec2::Y.angle() - FRAC_PI_2).abs() < 1e-12);
        assert!((Vec2::new(-1.0, 0.0).angle() - PI).abs() < 1e-12);
    }

    #[test]
    fn angle_to_is_signed() {
        assert!((Vec2::X.angle_to(Vec2::Y) - FRAC_PI_2).abs() < 1e-12);
        assert!((Vec2::Y.angle_to(Vec2::X) + FRAC_PI_2).abs() < 1e-12);
    }

    #[test]
    fn distance_and_lerp() {
        let a = Vec2::new(0.0, 0.0);
        let b = Vec2::new(3.0, 4.0);
        assert_eq!(a.distance(b), 5.0);
        assert_eq!(a.distance_squared(b), 25.0);
        assert_eq!(a.lerp(b, 0.5), Vec2::new(1.5, 2.0));
        assert_eq!(a.lerp(b, 0.0), a);
        assert_eq!(a.lerp(b, 1.0), b);
    }

    #[test]
    fn min_max_and_abs_work_componentwise() {
        let a = Vec2::new(-1.0, 5.0);
        let b = Vec2::new(2.0, 3.0);
        assert_eq!(a.min(b), Vec2::new(-1.0, 3.0));
        assert_eq!(a.max(b), Vec2::new(2.0, 5.0));
        assert_eq!(a.abs(), Vec2::new(1.0, 5.0));
    }

    #[test]
    fn converts_from_tuples_and_arrays() {
        assert_eq!(Vec2::from((1.0, 2.0)), Vec2::new(1.0, 2.0));
        assert_eq!(Vec2::from([1.0, 2.0]), Vec2::new(1.0, 2.0));
        assert_eq!(Vec2::default(), Vec2::ZERO);
        assert_eq!(Vec2::splat(3.0), Vec2::new(3.0, 3.0));
    }

    #[test]
    fn assign_operators_mutate_in_place() {
        let mut a = Vec2::new(1.0, 1.0);
        a += Vec2::new(2.0, 3.0);
        assert_eq!(a, Vec2::new(3.0, 4.0));
        a -= Vec2::new(1.0, 1.0);
        assert_eq!(a, Vec2::new(2.0, 3.0));
    }

    #[test]
    fn round_trips_through_json() {
        let a = Vec2::new(1.25, -3.5);
        let json = serde_json::to_string(&a).unwrap();
        assert_eq!(json, r#"{"x":1.25,"y":-3.5}"#);
        assert_eq!(serde_json::from_str::<Vec2>(&json).unwrap(), a);
    }
}
