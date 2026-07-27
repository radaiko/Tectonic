//! Closed planar regions — the input every sweeping operation starts from.

use serde::{Deserialize, Serialize};

use crate::error::KernelResult;
use crate::math::{Vec2, EPSILON, TOLERANCE};
use crate::mesh::polygon;
use crate::{bail, kernel_error};

/// A closed region in a sketch plane's 2D coordinates: one outer boundary with
/// any number of holes removed from it.
///
/// Loops are given without a repeated closing point. [`Profile::normalized`]
/// puts them into the winding the rest of the kernel assumes — outer
/// counter-clockwise, holes clockwise — so callers can pass whatever the sketch
/// happened to produce.
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub points: Vec<Vec2>,
    #[serde(default)]
    pub holes: Vec<Vec<Vec2>>,
}

impl Profile {
    pub fn from_points(points: Vec<Vec2>) -> Self {
        Self { points, holes: Vec::new() }
    }

    pub fn with_hole(mut self, hole: Vec<Vec2>) -> Self {
        self.holes.push(hole);
        self
    }

    /// A rectangle with its lower-left corner at `origin`.
    pub fn rectangle(origin: Vec2, width: f64, height: f64) -> Self {
        Self::from_points(vec![
            origin,
            Vec2::new(origin.x + width, origin.y),
            Vec2::new(origin.x + width, origin.y + height),
            Vec2::new(origin.x, origin.y + height),
        ])
    }

    /// A circle approximated by `segments` straight sides.
    pub fn circle(center: Vec2, radius: f64, segments: usize) -> Self {
        let segments = segments.max(3);
        Self::from_points(
            (0..segments)
                .map(|index| {
                    let angle = index as f64 / segments as f64 * core::f64::consts::TAU;
                    Vec2::new(
                        center.x + radius * angle.cos(),
                        center.y + radius * angle.sin(),
                    )
                })
                .collect(),
        )
    }

    /// Every loop, outer first.
    pub fn loops(&self) -> impl Iterator<Item = &Vec<Vec2>> {
        core::iter::once(&self.points).chain(self.holes.iter())
    }

    pub fn is_empty(&self) -> bool {
        self.points.len() < 3
    }

    /// Enclosed area, with holes subtracted.
    pub fn area(&self) -> f64 {
        let outer = polygon::area(&self.points);
        let holes: f64 = self.holes.iter().map(|hole| polygon::area(hole)).sum();
        (outer - holes).max(0.0)
    }

    pub fn centroid(&self) -> Vec2 {
        polygon::centroid(&self.points)
    }

    pub fn bounds(&self) -> (Vec2, Vec2) {
        let mut min = Vec2::splat(f64::INFINITY);
        let mut max = Vec2::splat(f64::NEG_INFINITY);
        for point in &self.points {
            min = min.min(*point);
            max = max.max(*point);
        }
        if self.points.is_empty() {
            (Vec2::ZERO, Vec2::ZERO)
        } else {
            (min, max)
        }
    }

    /// Rejects profiles no operation could build a solid from.
    pub fn validate(&self, operation: &str) -> KernelResult<()> {
        if self.points.len() < 3 {
            bail!(
                operation,
                "profile needs at least three points, got {}",
                self.points.len()
            );
        }
        if !self.points.iter().all(|point| point.is_finite()) {
            bail!(operation, "profile contains a non-finite point");
        }
        if self.area() <= TOLERANCE * TOLERANCE {
            bail!(operation, "profile encloses no area");
        }
        Ok(())
    }

    /// Drops repeated points and puts every loop into the kernel's winding:
    /// the outer loop counter-clockwise, holes clockwise.
    ///
    /// Sweeping relies on this. The quad strips that form a swept body take
    /// their outward direction from the loop's winding, so a profile drawn
    /// clockwise would build a solid that is inside out.
    pub fn normalized(&self) -> Self {
        let mut outer = dedupe(&self.points);
        if !polygon::is_counter_clockwise(&outer) {
            outer.reverse();
        }
        let holes = self
            .holes
            .iter()
            .map(|hole| {
                let mut cleaned = dedupe(hole);
                if polygon::is_counter_clockwise(&cleaned) {
                    cleaned.reverse();
                }
                cleaned
            })
            .filter(|hole| hole.len() >= 3)
            .collect();
        Self { points: outer, holes }
    }

    /// The circle this profile approximates, if it does.
    ///
    /// Extruding a circle should produce a cylinder, not a prism with a great
    /// many sides. Recovering the circle here is what lets the extrusion tag its
    /// side faces as cylindrical, so they shade smoothly and can be refined
    /// towards the true radius at any quality.
    pub fn as_circle(&self) -> Option<(Vec2, f64)> {
        // A pentagon is the fewest sides worth calling a circle; below that,
        // the user drew a polygon and means it.
        if self.points.len() < 5 || !self.holes.is_empty() {
            return None;
        }
        let center = self.centroid();
        let radii: Vec<f64> = self
            .points
            .iter()
            .map(|point| point.distance(center))
            .collect();
        let mean = radii.iter().sum::<f64>() / radii.len() as f64;
        if mean < EPSILON {
            return None;
        }
        let uniform = radii
            .iter()
            .all(|radius| (radius - mean).abs() < mean * 1e-6);
        if !uniform {
            return None;
        }

        // Evenly spaced too, or it is a star rather than a circle.
        let mut angles: Vec<f64> = self
            .points
            .iter()
            .map(|point| point.sub(center).angle())
            .collect();
        angles.sort_by(|a, b| a.partial_cmp(b).unwrap_or(core::cmp::Ordering::Equal));
        let expected = core::f64::consts::TAU / angles.len() as f64;
        for window in angles.windows(2) {
            if (window[1] - window[0] - expected).abs() > expected * 1e-3 {
                return None;
            }
        }
        Some((center, mean))
    }

    /// Moves every loop outwards by `distance`, growing the region. A negative
    /// distance shrinks it.
    ///
    /// This is how draft is applied: the far end of a tapered extrusion is this
    /// profile offset by `depth * tan(angle)`. Corners are mitred, with a limit
    /// so that a sharp corner offset a long way produces a blunt end rather
    /// than a spike shooting off to infinity.
    pub fn offset(&self, distance: f64) -> Self {
        if distance.abs() < EPSILON {
            return self.clone();
        }
        let normalized = self.normalized();
        Self {
            points: offset_loop(&normalized.points, distance),
            holes: normalized
                .holes
                .iter()
                .map(|hole| offset_loop(hole, distance))
                .collect(),
        }
    }

    /// Fails when an offset would consume the region entirely — a shrink deeper
    /// than the profile is wide, or a draft angle steep enough to close it.
    ///
    /// Area alone does not catch this. Offset a square inwards by more than
    /// half its width and it passes straight through itself and comes out the
    /// other side, larger than it started and still wound the same way. What
    /// gives it away is that every edge has reversed direction, so that is what
    /// is checked.
    pub fn offset_checked(&self, distance: f64, operation: &str) -> KernelResult<Self> {
        let source = self.normalized();
        let offset = self.offset(distance);
        let closed_up = offset.points.len() < 3
            || offset.area() <= TOLERANCE * TOLERANCE
            || !keeps_direction(&source.points, &offset.points)
            || source
                .holes
                .iter()
                .zip(offset.holes.iter())
                .any(|(before, after)| !keeps_direction(before, after));

        if closed_up {
            return Err(kernel_error!(
                operation,
                "offsetting the profile by {distance} closes it up"
            ));
        }
        Ok(offset)
    }

    /// Reverses every loop's winding.
    pub fn reversed(&self) -> Self {
        let mut flipped = self.clone();
        flipped.points.reverse();
        for hole in &mut flipped.holes {
            hole.reverse();
        }
        flipped
    }
}

/// Removes consecutive duplicates, including across the closing seam.
fn dedupe(points: &[Vec2]) -> Vec<Vec2> {
    let mut cleaned: Vec<Vec2> = Vec::with_capacity(points.len());
    for &point in points {
        if cleaned
            .last()
            .is_none_or(|last| last.distance(point) > TOLERANCE)
        {
            cleaned.push(point);
        }
    }
    while cleaned.len() > 1 {
        let first = cleaned[0];
        let last = cleaned[cleaned.len() - 1];
        if first.distance(last) <= TOLERANCE {
            cleaned.pop();
        } else {
            break;
        }
    }
    cleaned
}

/// Whether an offset loop still runs the way the loop it came from did.
///
/// Each edge is compared with the edge it was offset from: pointing the same
/// way is a positive dot product. A loop that has passed through itself has
/// every edge turned around, so one surviving edge is enough to say the loop
/// held its direction.
fn keeps_direction(before: &[Vec2], after: &[Vec2]) -> bool {
    let count = before.len();
    if count < 2 || after.len() != count {
        return false;
    }
    (0..count).any(|index| {
        let source = before[(index + 1) % count].sub(before[index]);
        let offset = after[(index + 1) % count].sub(after[index]);
        source.dot(offset) > 0.0
    })
}

/// Offsets one loop along its outward normals, mitring the corners.
fn offset_loop(points: &[Vec2], distance: f64) -> Vec<Vec2> {
    // Past this, a mitre is cut off square. Four times the offset corresponds
    // to a corner of about 29 degrees.
    const MITRE_LIMIT: f64 = 4.0;

    let count = points.len();
    if count < 3 {
        return points.to_vec();
    }

    // Outward normal of the segment leaving each point. For a counter-clockwise
    // loop the material is on the left, so the outward side is to the right.
    let normals: Vec<Vec2> = (0..count)
        .map(|index| {
            let direction = points[(index + 1) % count].sub(points[index]);
            Vec2::new(direction.y, -direction.x).normalize()
        })
        .collect();

    (0..count)
        .map(|index| {
            let incoming = normals[(index + count - 1) % count];
            let outgoing = normals[index];
            let bisector = incoming.add(outgoing);
            if bisector.length() < EPSILON {
                // The loop doubles back on itself; there is no mitre to take.
                return points[index].add(outgoing.scale(distance));
            }
            let bisector = bisector.normalize();
            let projection = bisector.dot(outgoing);
            if projection.abs() < 1.0 / MITRE_LIMIT {
                points[index].add(bisector.scale(distance * MITRE_LIMIT))
            } else {
                points[index].add(bisector.scale(distance / projection))
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    const TOL: f64 = 1e-9;

    fn square() -> Profile {
        Profile::rectangle(Vec2::ZERO, 2.0, 2.0)
    }

    #[test]
    fn a_rectangle_has_four_corners_and_the_right_area() {
        let profile = Profile::rectangle(Vec2::new(1.0, 1.0), 3.0, 2.0);
        assert_eq!(profile.points.len(), 4);
        assert!((profile.area() - 6.0).abs() < TOL);
        let (min, max) = profile.bounds();
        assert!(min.approx_eq(Vec2::new(1.0, 1.0), TOL));
        assert!(max.approx_eq(Vec2::new(4.0, 3.0), TOL));
        assert!(!profile.is_empty());
    }

    #[test]
    fn a_circle_approximates_its_area() {
        let profile = Profile::circle(Vec2::ZERO, 5.0, 128);
        let exact = core::f64::consts::PI * 25.0;
        assert!((profile.area() - exact).abs() < exact * 1e-3);
        assert!(profile.centroid().approx_eq(Vec2::ZERO, 1e-9));
        // Fewer than three sides is not a loop; the constructor raises it.
        assert_eq!(Profile::circle(Vec2::ZERO, 1.0, 1).points.len(), 3);
    }

    #[test]
    fn holes_are_subtracted_from_the_area() {
        let profile = Profile::rectangle(Vec2::ZERO, 4.0, 4.0)
            .with_hole(Profile::rectangle(Vec2::ONE, 2.0, 2.0).points);
        assert!((profile.area() - 12.0).abs() < TOL);
        assert_eq!(profile.loops().count(), 2);
    }

    #[test]
    fn validation_rejects_what_cannot_be_swept() {
        assert!(square().validate("extrude").is_ok());

        let too_few = Profile::from_points(vec![Vec2::ZERO, Vec2::X]);
        assert!(too_few.validate("extrude").is_err());
        assert!(too_few.is_empty());

        let collinear = Profile::from_points(vec![
            Vec2::ZERO,
            Vec2::new(1.0, 0.0),
            Vec2::new(2.0, 0.0),
        ]);
        let error = collinear.validate("extrude").unwrap_err();
        assert_eq!(error.operation, "extrude");
        assert!(error.message.contains("no area"));

        let broken = Profile::from_points(vec![
            Vec2::new(f64::NAN, 0.0),
            Vec2::new(1.0, 0.0),
            Vec2::new(0.0, 1.0),
        ]);
        assert!(broken.validate("extrude").is_err());
    }

    #[test]
    fn normalizing_makes_the_outer_loop_counter_clockwise() {
        let clockwise = Profile::from_points(vec![
            Vec2::ZERO,
            Vec2::new(0.0, 1.0),
            Vec2::new(1.0, 1.0),
            Vec2::new(1.0, 0.0),
        ]);
        assert!(!polygon::is_counter_clockwise(&clockwise.points));
        assert!(polygon::is_counter_clockwise(&clockwise.normalized().points));
    }

    #[test]
    fn normalizing_makes_holes_run_the_other_way() {
        let profile = Profile::rectangle(Vec2::ZERO, 4.0, 4.0)
            .with_hole(Profile::rectangle(Vec2::ONE, 2.0, 2.0).points);
        let normalized = profile.normalized();
        assert!(polygon::is_counter_clockwise(&normalized.points));
        assert!(!polygon::is_counter_clockwise(&normalized.holes[0]));
    }

    #[test]
    fn normalizing_drops_repeated_points() {
        let sloppy = Profile::from_points(vec![
            Vec2::ZERO,
            Vec2::ZERO,
            Vec2::new(1.0, 0.0),
            Vec2::new(1.0, 1.0),
            // A repeated closing point, as a sketch exporter might emit.
            Vec2::ZERO,
        ]);
        let normalized = sloppy.normalized();
        assert_eq!(normalized.points.len(), 3);
        assert!((normalized.area() - 0.5).abs() < TOL);
    }

    #[test]
    fn normalizing_drops_holes_that_collapse() {
        let profile = square().with_hole(vec![Vec2::ZERO, Vec2::ZERO, Vec2::ZERO]);
        assert!(profile.normalized().holes.is_empty());
    }

    #[test]
    fn reversing_flips_every_loop() {
        let profile = Profile::rectangle(Vec2::ZERO, 4.0, 4.0)
            .with_hole(Profile::rectangle(Vec2::ONE, 2.0, 2.0).points)
            .normalized();
        let reversed = profile.reversed();
        assert!(!polygon::is_counter_clockwise(&reversed.points));
        assert!(polygon::is_counter_clockwise(&reversed.holes[0]));
    }

    #[test]
    fn a_many_sided_regular_polygon_is_recognised_as_a_circle() {
        let (center, radius) = Profile::circle(Vec2::new(2.0, 3.0), 5.0, 32)
            .as_circle()
            .expect("should read as a circle");
        assert!(center.approx_eq(Vec2::new(2.0, 3.0), 1e-6));
        assert!((radius - 5.0).abs() < 1e-6);
    }

    #[test]
    fn a_square_is_not_a_circle() {
        assert!(square().as_circle().is_none());
        // Nor is a star: the radii alternate.
        let star: Vec<Vec2> = (0..10)
            .map(|index| {
                let angle = index as f64 / 10.0 * core::f64::consts::TAU;
                let radius = if index % 2 == 0 { 5.0 } else { 2.0 };
                Vec2::new(radius * angle.cos(), radius * angle.sin())
            })
            .collect();
        assert!(Profile::from_points(star).as_circle().is_none());
    }

    #[test]
    fn an_ellipse_is_not_a_circle() {
        let ellipse: Vec<Vec2> = (0..32)
            .map(|index| {
                let angle = index as f64 / 32.0 * core::f64::consts::TAU;
                Vec2::new(5.0 * angle.cos(), 3.0 * angle.sin())
            })
            .collect();
        assert!(Profile::from_points(ellipse).as_circle().is_none());
    }

    #[test]
    fn a_circle_with_a_hole_is_not_reported_as_a_plain_circle() {
        let annulus = Profile::circle(Vec2::ZERO, 5.0, 32)
            .with_hole(Profile::circle(Vec2::ZERO, 2.0, 32).points);
        assert!(annulus.as_circle().is_none());
    }

    #[test]
    fn offsetting_a_square_outwards_grows_it_evenly() {
        let grown = square().offset(1.0);
        let (min, max) = grown.bounds();
        assert!(min.approx_eq(Vec2::splat(-1.0), 1e-9));
        assert!(max.approx_eq(Vec2::splat(3.0), 1e-9));
        assert!((grown.area() - 16.0).abs() < 1e-9);
    }

    #[test]
    fn offsetting_inwards_shrinks_it() {
        let shrunk = square().offset(-0.5);
        assert!((shrunk.area() - 1.0).abs() < 1e-9);
        let (min, max) = shrunk.bounds();
        assert!(min.approx_eq(Vec2::splat(0.5), 1e-9));
        assert!(max.approx_eq(Vec2::splat(1.5), 1e-9));
    }

    #[test]
    fn offsetting_by_nothing_changes_nothing() {
        let profile = square();
        assert_eq!(profile.offset(0.0), profile);
    }

    #[test]
    fn offsetting_grows_the_solid_by_shrinking_its_holes() {
        let profile = Profile::rectangle(Vec2::ZERO, 10.0, 10.0)
            .with_hole(Profile::rectangle(Vec2::splat(4.0), 2.0, 2.0).points);
        let grown = profile.offset(0.5);
        // The outer boundary moved out and the hole closed in, so the material
        // gained on both counts.
        assert!(grown.area() > profile.area());
        let hole_area = polygon::area(&grown.holes[0]);
        assert!(hole_area < 4.0, "hole should shrink, got {hole_area}");
    }

    #[test]
    fn a_sharp_corner_is_mitred_rather_than_spiked() {
        // A 10-degree wedge: an unlimited mitre would throw the tip a long way
        // out, so the limit has to cap it.
        let spike = Profile::from_points(vec![
            Vec2::new(0.0, 0.0),
            Vec2::new(20.0, 1.0),
            Vec2::new(20.0, -1.0),
        ]);
        let grown = spike.offset(1.0);
        let tip = grown
            .points
            .iter()
            .map(|point| point.length())
            .fold(0.0f64, f64::max);
        assert!(tip < 40.0, "mitre ran away to {tip}");
        assert!(grown.area() > spike.area());
    }

    #[test]
    fn offset_checked_refuses_to_close_the_profile() {
        let profile = square();
        assert!(profile.offset_checked(-0.5, "shell").is_ok());
        let error = profile.offset_checked(-5.0, "shell").unwrap_err();
        assert_eq!(error.operation, "shell");
        assert!(error.message.contains("closes it up"));
    }

    #[test]
    fn a_degenerate_loop_survives_offsetting_untouched() {
        assert_eq!(offset_loop(&[Vec2::ZERO, Vec2::X], 1.0).len(), 2);
    }

    #[test]
    fn an_empty_profile_reports_empty_bounds() {
        let empty = Profile::default();
        assert!(empty.is_empty());
        assert_eq!(empty.bounds(), (Vec2::ZERO, Vec2::ZERO));
        assert_eq!(empty.area(), 0.0);
    }

    #[test]
    fn round_trips_through_json() {
        let profile = square().with_hole(Profile::rectangle(Vec2::splat(0.5), 1.0, 1.0).points);
        let json = serde_json::to_string(&profile).unwrap();
        assert_eq!(serde_json::from_str::<Profile>(&json).unwrap(), profile);
        // Holes are optional in the wire format.
        let bare: Profile = serde_json::from_str(r#"{"points":[]}"#).unwrap();
        assert!(bare.holes.is_empty());
    }
}
