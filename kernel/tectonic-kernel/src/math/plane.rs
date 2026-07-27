//! Planes and plane frames.

use serde::{Deserialize, Serialize};

use super::{Mat4, Vec2, Vec3, EPSILON};

/// Which side of a plane a point falls on.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Side {
    /// In front — the side the normal points towards.
    Front,
    Back,
    /// Within tolerance of the plane itself.
    On,
}

/// An oriented plane, as the set of points where `normal · p = offset`.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Plane {
    /// Unit normal. "Front" is the side it points towards.
    pub normal: Vec3,
    /// Signed distance from the origin along `normal`.
    pub offset: f64,
}

impl Plane {
    pub fn new(normal: Vec3, offset: f64) -> Self {
        Self { normal: normal.normalize(), offset }
    }

    pub fn from_point_normal(point: Vec3, normal: Vec3) -> Self {
        let normal = normal.normalize();
        Self { normal, offset: normal.dot(point) }
    }

    /// The plane through three points, wound counter-clockwise as seen from the
    /// front. Returns `None` when the points are collinear.
    pub fn from_points(a: Vec3, b: Vec3, c: Vec3) -> Option<Self> {
        let normal = b.sub(a).cross(c.sub(a));
        if normal.length() < EPSILON {
            None
        } else {
            Some(Self::from_point_normal(a, normal))
        }
    }

    /// Signed distance from the plane — positive in front, negative behind.
    pub fn distance_to(&self, point: Vec3) -> f64 {
        self.normal.dot(point) - self.offset
    }

    pub fn classify(&self, point: Vec3, tolerance: f64) -> Side {
        let distance = self.distance_to(point);
        if distance > tolerance {
            Side::Front
        } else if distance < -tolerance {
            Side::Back
        } else {
            Side::On
        }
    }

    pub fn project(&self, point: Vec3) -> Vec3 {
        point.sub(self.normal.scale(self.distance_to(point)))
    }

    /// Some point on the plane — the one closest to the origin.
    pub fn origin(&self) -> Vec3 {
        self.normal.scale(self.offset)
    }

    pub fn flip(&self) -> Self {
        Self { normal: -self.normal, offset: -self.offset }
    }

    /// Where the segment `a`→`b` crosses the plane, as a parameter in `[0, 1]`.
    /// `None` when the segment runs parallel to the plane.
    pub fn intersect_segment_parameter(&self, a: Vec3, b: Vec3) -> Option<f64> {
        let da = self.distance_to(a);
        let db = self.distance_to(b);
        let denominator = da - db;
        if denominator.abs() < EPSILON {
            None
        } else {
            Some(da / denominator)
        }
    }

    /// The point where the segment `a`→`b` crosses the plane.
    pub fn intersect_segment(&self, a: Vec3, b: Vec3) -> Option<Vec3> {
        self.intersect_segment_parameter(a, b)
            .map(|t| a.lerp(b, t))
    }

    pub fn approx_eq(&self, other: &Self, tolerance: f64) -> bool {
        self.normal.approx_eq(other.normal, tolerance)
            && (self.offset - other.offset).abs() <= tolerance
    }

    /// True when both planes describe the same surface, whichever way each one
    /// happens to face.
    pub fn is_coplanar(&self, other: &Self, tolerance: f64) -> bool {
        self.approx_eq(other, tolerance) || self.approx_eq(&other.flip(), tolerance)
    }
}

/// A placed 2D coordinate system in 3D — how a sketch plane is expressed.
///
/// `x_axis` and `y_axis` are unit and perpendicular; their cross product is the
/// normal, which is also the direction an extrusion takes by default.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct PlaneFrame {
    pub origin: Vec3,
    pub x_axis: Vec3,
    pub y_axis: Vec3,
}

impl PlaneFrame {
    /// The world XY plane — the frame every operation falls back to.
    pub const WORLD_XY: Self = Self {
        origin: Vec3::ZERO,
        x_axis: Vec3::X,
        y_axis: Vec3::Y,
    };

    pub const WORLD_XZ: Self = Self {
        origin: Vec3::ZERO,
        x_axis: Vec3::X,
        y_axis: Vec3::Z,
    };

    pub const WORLD_YZ: Self = Self {
        origin: Vec3::ZERO,
        x_axis: Vec3::Y,
        y_axis: Vec3::Z,
    };

    pub fn new(origin: Vec3, x_axis: Vec3, y_axis: Vec3) -> Self {
        Self { origin, x_axis, y_axis }
    }

    /// A frame on the plane through `origin` with the given normal, with axes
    /// picked arbitrarily but consistently.
    pub fn from_normal(origin: Vec3, normal: Vec3) -> Self {
        let normal = normal.normalize();
        let x_axis = normal.any_perpendicular();
        let y_axis = normal.cross(x_axis).normalize();
        Self { origin, x_axis, y_axis }
    }

    pub fn normal(&self) -> Vec3 {
        self.x_axis.cross(self.y_axis).normalize()
    }

    /// Re-derives perpendicular unit axes, in case the caller supplied axes
    /// that had drifted out of true.
    pub fn orthonormalized(&self) -> Self {
        let x_axis = self.x_axis.normalize();
        let normal = x_axis.cross(self.y_axis).normalize();
        if normal == Vec3::ZERO {
            return Self::from_normal(self.origin, Vec3::Z);
        }
        Self {
            origin: self.origin,
            x_axis,
            y_axis: normal.cross(x_axis).normalize(),
        }
    }

    /// Lifts a point from the frame's 2D coordinates into world space.
    pub fn to_world(&self, point: Vec2) -> Vec3 {
        self.origin
            .add(self.x_axis.scale(point.x))
            .add(self.y_axis.scale(point.y))
    }

    /// Projects a world point into the frame's 2D coordinates. Any component
    /// along the normal is dropped.
    pub fn to_local(&self, point: Vec3) -> Vec2 {
        let relative = point.sub(self.origin);
        Vec2::new(relative.dot(self.x_axis), relative.dot(self.y_axis))
    }

    /// Lifts a 2D direction into world space.
    pub fn direction_to_world(&self, direction: Vec2) -> Vec3 {
        self.x_axis
            .scale(direction.x)
            .add(self.y_axis.scale(direction.y))
    }

    pub fn plane(&self) -> Plane {
        Plane::from_point_normal(self.origin, self.normal())
    }

    /// The local-to-world transform, with the normal as its third column.
    pub fn to_matrix(&self) -> Mat4 {
        Mat4::from_frame(self.origin, self.x_axis, self.y_axis, self.normal())
    }
}

impl Default for PlaneFrame {
    fn default() -> Self {
        Self::WORLD_XY
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const TOL: f64 = 1e-9;

    #[test]
    fn from_point_normal_normalizes_the_normal() {
        let plane = Plane::from_point_normal(Vec3::new(0.0, 0.0, 5.0), Vec3::new(0.0, 0.0, 3.0));
        assert!(plane.normal.approx_eq(Vec3::Z, TOL));
        assert!((plane.offset - 5.0).abs() < TOL);
    }

    #[test]
    fn new_normalizes_too() {
        let plane = Plane::new(Vec3::new(0.0, 0.0, 4.0), 2.0);
        assert!(plane.normal.approx_eq(Vec3::Z, TOL));
    }

    #[test]
    fn from_points_winds_counter_clockwise() {
        let plane = Plane::from_points(Vec3::ZERO, Vec3::X, Vec3::Y).unwrap();
        assert!(plane.normal.approx_eq(Vec3::Z, TOL));
        assert!(plane.offset.abs() < TOL);
    }

    #[test]
    fn from_collinear_points_is_none() {
        assert!(Plane::from_points(Vec3::ZERO, Vec3::X, Vec3::X.scale(2.0)).is_none());
        assert!(Plane::from_points(Vec3::ZERO, Vec3::ZERO, Vec3::ZERO).is_none());
    }

    #[test]
    fn distance_is_signed() {
        let plane = Plane::from_point_normal(Vec3::ZERO, Vec3::Z);
        assert!((plane.distance_to(Vec3::new(0.0, 0.0, 2.0)) - 2.0).abs() < TOL);
        assert!((plane.distance_to(Vec3::new(0.0, 0.0, -2.0)) + 2.0).abs() < TOL);
        assert!(plane.distance_to(Vec3::new(5.0, 5.0, 0.0)).abs() < TOL);
    }

    #[test]
    fn classify_sorts_points_by_side() {
        let plane = Plane::from_point_normal(Vec3::ZERO, Vec3::Z);
        assert_eq!(plane.classify(Vec3::new(0.0, 0.0, 1.0), TOL), Side::Front);
        assert_eq!(plane.classify(Vec3::new(0.0, 0.0, -1.0), TOL), Side::Back);
        assert_eq!(plane.classify(Vec3::new(1.0, 1.0, 0.0), TOL), Side::On);
        // Within tolerance still counts as on the plane.
        assert_eq!(plane.classify(Vec3::new(0.0, 0.0, 1e-12), TOL), Side::On);
    }

    #[test]
    fn project_drops_the_normal_component() {
        let plane = Plane::from_point_normal(Vec3::new(0.0, 0.0, 1.0), Vec3::Z);
        let projected = plane.project(Vec3::new(2.0, 3.0, 7.0));
        assert!(projected.approx_eq(Vec3::new(2.0, 3.0, 1.0), TOL));
        assert!(plane.distance_to(projected).abs() < TOL);
    }

    #[test]
    fn origin_is_the_closest_point_to_the_world_origin() {
        let plane = Plane::from_point_normal(Vec3::new(4.0, 0.0, 0.0), Vec3::X);
        assert!(plane.origin().approx_eq(Vec3::new(4.0, 0.0, 0.0), TOL));
    }

    #[test]
    fn flip_swaps_the_sides() {
        let plane = Plane::from_point_normal(Vec3::new(0.0, 0.0, 3.0), Vec3::Z);
        let flipped = plane.flip();
        let point = Vec3::new(0.0, 0.0, 5.0);
        assert!((plane.distance_to(point) + flipped.distance_to(point)).abs() < TOL);
        assert!(plane.is_coplanar(&flipped, TOL));
        assert!(!plane.approx_eq(&flipped, TOL));
    }

    #[test]
    fn segment_intersection_lands_on_the_plane() {
        let plane = Plane::from_point_normal(Vec3::ZERO, Vec3::Z);
        let hit = plane
            .intersect_segment(Vec3::new(0.0, 0.0, -1.0), Vec3::new(2.0, 0.0, 1.0))
            .unwrap();
        assert!(hit.approx_eq(Vec3::new(1.0, 0.0, 0.0), TOL));
        assert!(plane.distance_to(hit).abs() < TOL);
    }

    #[test]
    fn a_segment_parallel_to_the_plane_does_not_intersect() {
        let plane = Plane::from_point_normal(Vec3::ZERO, Vec3::Z);
        assert!(plane
            .intersect_segment(Vec3::new(0.0, 0.0, 1.0), Vec3::new(1.0, 1.0, 1.0))
            .is_none());
    }

    #[test]
    fn world_xy_frame_round_trips_points() {
        let frame = PlaneFrame::WORLD_XY;
        assert!(frame.normal().approx_eq(Vec3::Z, TOL));
        let point = Vec2::new(3.0, -2.0);
        assert!(frame.to_world(point).approx_eq(Vec3::new(3.0, -2.0, 0.0), TOL));
        assert!(frame.to_local(frame.to_world(point)).approx_eq(point, TOL));
    }

    #[test]
    fn a_tilted_frame_round_trips_points() {
        let frame = PlaneFrame::from_normal(Vec3::new(1.0, 2.0, 3.0), Vec3::new(1.0, 1.0, 1.0));
        for point in [Vec2::ZERO, Vec2::new(1.0, 0.0), Vec2::new(-4.0, 2.5)] {
            assert!(frame.to_local(frame.to_world(point)).approx_eq(point, TOL));
        }
        // Axes are unit and perpendicular, and the normal is what was asked for.
        assert!((frame.x_axis.length() - 1.0).abs() < TOL);
        assert!((frame.y_axis.length() - 1.0).abs() < TOL);
        assert!(frame.x_axis.dot(frame.y_axis).abs() < TOL);
        assert!(frame
            .normal()
            .approx_eq(Vec3::new(1.0, 1.0, 1.0).normalize(), TOL));
    }

    #[test]
    fn to_local_drops_the_normal_component() {
        let frame = PlaneFrame::WORLD_XY;
        assert!(frame
            .to_local(Vec3::new(1.0, 2.0, 99.0))
            .approx_eq(Vec2::new(1.0, 2.0), TOL));
    }

    #[test]
    fn direction_to_world_ignores_the_origin() {
        let frame = PlaneFrame::new(Vec3::new(10.0, 10.0, 10.0), Vec3::X, Vec3::Y);
        assert!(frame
            .direction_to_world(Vec2::new(1.0, 0.0))
            .approx_eq(Vec3::X, TOL));
    }

    #[test]
    fn orthonormalized_repairs_skewed_axes() {
        let skewed = PlaneFrame::new(
            Vec3::ZERO,
            Vec3::new(2.0, 0.0, 0.0),
            Vec3::new(1.0, 3.0, 0.0),
        );
        let fixed = skewed.orthonormalized();
        assert!((fixed.x_axis.length() - 1.0).abs() < TOL);
        assert!((fixed.y_axis.length() - 1.0).abs() < TOL);
        assert!(fixed.x_axis.dot(fixed.y_axis).abs() < TOL);
        assert!(fixed.normal().approx_eq(Vec3::Z, TOL));
    }

    #[test]
    fn orthonormalizing_parallel_axes_falls_back_to_a_usable_frame() {
        let degenerate = PlaneFrame::new(Vec3::ZERO, Vec3::X, Vec3::X);
        let fixed = degenerate.orthonormalized();
        assert!((fixed.normal().length() - 1.0).abs() < TOL);
        assert!(fixed.x_axis.dot(fixed.y_axis).abs() < TOL);
    }

    #[test]
    fn frame_plane_and_matrix_agree() {
        let frame = PlaneFrame::from_normal(Vec3::new(0.0, 0.0, 4.0), Vec3::Z);
        let plane = frame.plane();
        assert!(plane.normal.approx_eq(Vec3::Z, TOL));
        assert!((plane.offset - 4.0).abs() < TOL);

        let matrix = frame.to_matrix();
        let point = Vec2::new(2.0, -1.0);
        assert!(matrix
            .transform_point(Vec3::new(point.x, point.y, 0.0))
            .approx_eq(frame.to_world(point), TOL));
    }

    #[test]
    fn the_standard_frames_face_the_expected_way() {
        assert!(PlaneFrame::WORLD_XY.normal().approx_eq(Vec3::Z, TOL));
        assert!(PlaneFrame::WORLD_XZ.normal().approx_eq(-Vec3::Y, TOL));
        assert!(PlaneFrame::WORLD_YZ.normal().approx_eq(Vec3::X, TOL));
        assert_eq!(PlaneFrame::default(), PlaneFrame::WORLD_XY);
    }
}
