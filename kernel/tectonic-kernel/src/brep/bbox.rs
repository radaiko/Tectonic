//! Axis-aligned bounding boxes.

use serde::{Deserialize, Serialize};

use crate::math::Vec3;

/// An axis-aligned box in world space.
///
/// An empty box is represented by an inverted extent (`min` above `max`), which
/// is what [`BoundingBox::empty`] returns. That makes [`BoundingBox::expand`]
/// fold correctly from nothing without a special first-point case.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct BoundingBox {
    pub min: Vec3,
    pub max: Vec3,
}

impl BoundingBox {
    /// A box containing nothing. Expanding it by a point yields that point.
    pub fn empty() -> Self {
        Self {
            min: Vec3::splat(f64::INFINITY),
            max: Vec3::splat(f64::NEG_INFINITY),
        }
    }

    pub fn new(min: Vec3, max: Vec3) -> Self {
        Self { min: min.min(max), max: min.max(max) }
    }

    pub fn from_points(points: impl IntoIterator<Item = Vec3>) -> Self {
        let mut bounds = Self::empty();
        for point in points {
            bounds.expand(point);
        }
        bounds
    }

    /// A box of `size` centred on `center`.
    pub fn from_center_size(center: Vec3, size: Vec3) -> Self {
        let half = size.abs().scale(0.5);
        Self { min: center.sub(half), max: center.add(half) }
    }

    pub fn is_empty(&self) -> bool {
        self.min.x > self.max.x || self.min.y > self.max.y || self.min.z > self.max.z
    }

    pub fn expand(&mut self, point: Vec3) {
        self.min = self.min.min(point);
        self.max = self.max.max(point);
    }

    /// Grows the box by `amount` in every direction. A negative amount shrinks
    /// it, possibly to nothing.
    pub fn inflate(&self, amount: f64) -> Self {
        if self.is_empty() {
            return *self;
        }
        Self {
            min: self.min.sub(Vec3::splat(amount)),
            max: self.max.add(Vec3::splat(amount)),
        }
    }

    /// The smallest box containing both.
    pub fn union(&self, other: &Self) -> Self {
        if self.is_empty() {
            return *other;
        }
        if other.is_empty() {
            return *self;
        }
        Self {
            min: self.min.min(other.min),
            max: self.max.max(other.max),
        }
    }

    /// The overlap of two boxes, or `None` when they do not meet.
    pub fn intersection(&self, other: &Self) -> Option<Self> {
        let min = self.min.max(other.min);
        let max = self.max.min(other.max);
        let candidate = Self { min, max };
        if candidate.is_empty() {
            None
        } else {
            Some(candidate)
        }
    }

    pub fn center(&self) -> Vec3 {
        if self.is_empty() {
            Vec3::ZERO
        } else {
            self.min.add(self.max).scale(0.5)
        }
    }

    pub fn size(&self) -> Vec3 {
        if self.is_empty() {
            Vec3::ZERO
        } else {
            self.max.sub(self.min)
        }
    }

    /// The radius of the smallest sphere about [`BoundingBox::center`] that
    /// contains the box — half the diagonal.
    pub fn radius(&self) -> f64 {
        self.size().length() * 0.5
    }

    pub fn diagonal(&self) -> f64 {
        self.size().length()
    }

    pub fn volume(&self) -> f64 {
        let size = self.size();
        size.x * size.y * size.z
    }

    /// The longest side. Used to scale tolerances to the size of a model.
    pub fn largest_extent(&self) -> f64 {
        self.size().max_component()
    }

    pub fn contains(&self, point: Vec3) -> bool {
        !self.is_empty()
            && point.x >= self.min.x
            && point.x <= self.max.x
            && point.y >= self.min.y
            && point.y <= self.max.y
            && point.z >= self.min.z
            && point.z <= self.max.z
    }

    /// True when `point` is inside, allowing `tolerance` of slack on each side.
    pub fn contains_within(&self, point: Vec3, tolerance: f64) -> bool {
        self.inflate(tolerance).contains(point)
    }

    pub fn contains_box(&self, other: &Self) -> bool {
        if other.is_empty() {
            return true;
        }
        self.contains(other.min) && self.contains(other.max)
    }

    /// True when the boxes overlap or touch.
    pub fn intersects(&self, other: &Self) -> bool {
        !self.is_empty()
            && !other.is_empty()
            && self.min.x <= other.max.x
            && self.max.x >= other.min.x
            && self.min.y <= other.max.y
            && self.max.y >= other.min.y
            && self.min.z <= other.max.z
            && self.max.z >= other.min.z
    }

    /// The eight corners, or an empty list for an empty box.
    pub fn corners(&self) -> Vec<Vec3> {
        if self.is_empty() {
            return Vec::new();
        }
        let mut corners = Vec::with_capacity(8);
        for &x in &[self.min.x, self.max.x] {
            for &y in &[self.min.y, self.max.y] {
                for &z in &[self.min.z, self.max.z] {
                    corners.push(Vec3::new(x, y, z));
                }
            }
        }
        corners
    }

    /// The point inside the box closest to `point`.
    pub fn closest_point(&self, point: Vec3) -> Vec3 {
        point.max(self.min).min(self.max)
    }

    /// The box containing this one after `transform` is applied. Transforming
    /// the eight corners rather than just `min` and `max` keeps the result
    /// correct under rotation.
    pub fn transformed(&self, transform: &crate::math::Mat4) -> Self {
        Self::from_points(
            self.corners()
                .into_iter()
                .map(|corner| transform.transform_point(corner)),
        )
    }
}

impl Default for BoundingBox {
    fn default() -> Self {
        Self::empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::math::Mat4;

    const TOL: f64 = 1e-12;

    fn unit_box() -> BoundingBox {
        BoundingBox::new(Vec3::ZERO, Vec3::ONE)
    }

    #[test]
    fn an_empty_box_contains_nothing() {
        let empty = BoundingBox::empty();
        assert!(empty.is_empty());
        assert!(!empty.contains(Vec3::ZERO));
        assert_eq!(empty.center(), Vec3::ZERO);
        assert_eq!(empty.size(), Vec3::ZERO);
        assert_eq!(empty.volume(), 0.0);
        assert!(empty.corners().is_empty());
        assert_eq!(BoundingBox::default(), BoundingBox::empty());
    }

    #[test]
    fn new_sorts_its_corners() {
        let box_ = BoundingBox::new(Vec3::ONE, Vec3::ZERO);
        assert_eq!(box_.min, Vec3::ZERO);
        assert_eq!(box_.max, Vec3::ONE);
        assert!(!box_.is_empty());
    }

    #[test]
    fn expanding_an_empty_box_gives_a_degenerate_box_at_that_point() {
        let mut bounds = BoundingBox::empty();
        bounds.expand(Vec3::new(1.0, 2.0, 3.0));
        assert!(!bounds.is_empty());
        assert_eq!(bounds.min, Vec3::new(1.0, 2.0, 3.0));
        assert_eq!(bounds.max, Vec3::new(1.0, 2.0, 3.0));
        assert_eq!(bounds.volume(), 0.0);
        assert!(bounds.contains(Vec3::new(1.0, 2.0, 3.0)));
    }

    #[test]
    fn from_points_bounds_them_all() {
        let bounds = BoundingBox::from_points([
            Vec3::new(-1.0, 0.0, 2.0),
            Vec3::new(3.0, -4.0, 0.0),
            Vec3::new(0.0, 1.0, 5.0),
        ]);
        assert_eq!(bounds.min, Vec3::new(-1.0, -4.0, 0.0));
        assert_eq!(bounds.max, Vec3::new(3.0, 1.0, 5.0));
        assert!(BoundingBox::from_points([]).is_empty());
    }

    #[test]
    fn from_center_size_centres_the_box() {
        let bounds = BoundingBox::from_center_size(Vec3::new(1.0, 1.0, 1.0), Vec3::splat(2.0));
        assert_eq!(bounds.min, Vec3::ZERO);
        assert_eq!(bounds.max, Vec3::splat(2.0));
        assert!(bounds.center().approx_eq(Vec3::ONE, TOL));
    }

    #[test]
    fn measures_report_the_extent() {
        let bounds = BoundingBox::new(Vec3::ZERO, Vec3::new(1.0, 2.0, 2.0));
        assert_eq!(bounds.size(), Vec3::new(1.0, 2.0, 2.0));
        assert_eq!(bounds.volume(), 4.0);
        assert_eq!(bounds.largest_extent(), 2.0);
        assert!((bounds.diagonal() - 3.0).abs() < TOL);
        assert!((bounds.radius() - 1.5).abs() < TOL);
        assert!(bounds.center().approx_eq(Vec3::new(0.5, 1.0, 1.0), TOL));
    }

    #[test]
    fn contains_includes_the_boundary() {
        let unit = unit_box();
        assert!(unit.contains(Vec3::new(0.5, 0.5, 0.5)));
        assert!(unit.contains(Vec3::ZERO));
        assert!(unit.contains(Vec3::ONE));
        assert!(!unit.contains(Vec3::new(1.5, 0.5, 0.5)));
        assert!(!unit.contains(Vec3::new(-0.001, 0.5, 0.5)));
    }

    #[test]
    fn contains_within_allows_slack() {
        let unit = unit_box();
        assert!(!unit.contains(Vec3::new(1.0001, 0.5, 0.5)));
        assert!(unit.contains_within(Vec3::new(1.0001, 0.5, 0.5), 0.001));
    }

    #[test]
    fn contains_box_is_true_for_a_nested_box() {
        let unit = unit_box();
        assert!(unit.contains_box(&BoundingBox::new(
            Vec3::splat(0.25),
            Vec3::splat(0.75)
        )));
        assert!(!unit.contains_box(&BoundingBox::new(Vec3::ZERO, Vec3::splat(2.0))));
        // Nothing is inside everything.
        assert!(unit.contains_box(&BoundingBox::empty()));
    }

    #[test]
    fn intersects_detects_overlap_and_touching() {
        let unit = unit_box();
        assert!(unit.intersects(&BoundingBox::new(Vec3::splat(0.5), Vec3::splat(2.0))));
        // Face-to-face contact counts as intersecting.
        assert!(unit.intersects(&BoundingBox::new(Vec3::new(1.0, 0.0, 0.0), Vec3::splat(2.0))));
        assert!(!unit.intersects(&BoundingBox::new(Vec3::splat(1.1), Vec3::splat(2.0))));
        assert!(!unit.intersects(&BoundingBox::empty()));
        assert!(!BoundingBox::empty().intersects(&unit));
    }

    #[test]
    fn union_covers_both_and_ignores_empties() {
        let a = BoundingBox::new(Vec3::ZERO, Vec3::ONE);
        let b = BoundingBox::new(Vec3::splat(2.0), Vec3::splat(3.0));
        let union = a.union(&b);
        assert_eq!(union.min, Vec3::ZERO);
        assert_eq!(union.max, Vec3::splat(3.0));
        assert_eq!(a.union(&BoundingBox::empty()), a);
        assert_eq!(BoundingBox::empty().union(&a), a);
    }

    #[test]
    fn intersection_returns_the_overlap_or_nothing() {
        let a = BoundingBox::new(Vec3::ZERO, Vec3::ONE);
        let b = BoundingBox::new(Vec3::splat(0.5), Vec3::splat(2.0));
        let overlap = a.intersection(&b).expect("boxes overlap");
        assert_eq!(overlap.min, Vec3::splat(0.5));
        assert_eq!(overlap.max, Vec3::ONE);
        assert!(a
            .intersection(&BoundingBox::new(Vec3::splat(5.0), Vec3::splat(6.0)))
            .is_none());
    }

    #[test]
    fn inflate_grows_and_shrinks() {
        let unit = unit_box();
        let grown = unit.inflate(1.0);
        assert_eq!(grown.min, Vec3::splat(-1.0));
        assert_eq!(grown.max, Vec3::splat(2.0));
        assert!(unit.inflate(-1.0).is_empty());
        assert!(BoundingBox::empty().inflate(1.0).is_empty());
    }

    #[test]
    fn corners_lists_all_eight() {
        let corners = unit_box().corners();
        assert_eq!(corners.len(), 8);
        assert!(corners.contains(&Vec3::ZERO));
        assert!(corners.contains(&Vec3::ONE));
        assert!(corners.contains(&Vec3::new(1.0, 0.0, 1.0)));
    }

    #[test]
    fn closest_point_clamps_into_the_box() {
        let unit = unit_box();
        assert_eq!(unit.closest_point(Vec3::splat(5.0)), Vec3::ONE);
        assert_eq!(unit.closest_point(Vec3::splat(-5.0)), Vec3::ZERO);
        let inside = Vec3::splat(0.5);
        assert_eq!(unit.closest_point(inside), inside);
    }

    #[test]
    fn transformed_bounds_the_rotated_box() {
        let unit = BoundingBox::new(Vec3::splat(-1.0), Vec3::splat(1.0));
        let rotated = unit.transformed(&Mat4::rotation_z(core::f64::consts::FRAC_PI_4));
        // A cube spun 45 degrees about z needs a wider box in x and y.
        assert!(rotated.max.x > 1.4 && rotated.max.x < 1.5);
        assert!((rotated.max.z - 1.0).abs() < TOL);
        assert!(rotated.contains_box(&BoundingBox::new(
            Vec3::splat(-0.9),
            Vec3::splat(0.9)
        )));
    }

    #[test]
    fn translation_moves_the_box_without_growing_it() {
        let moved = unit_box().transformed(&Mat4::translation(Vec3::new(10.0, 0.0, 0.0)));
        assert!(moved.min.approx_eq(Vec3::new(10.0, 0.0, 0.0), TOL));
        assert!((moved.volume() - 1.0).abs() < TOL);
    }

    #[test]
    fn round_trips_through_json() {
        let bounds = unit_box();
        let json = serde_json::to_string(&bounds).unwrap();
        assert_eq!(serde_json::from_str::<BoundingBox>(&json).unwrap(), bounds);
    }
}
