//! Lofting — skinning a run of profiles into a solid.

use serde::{Deserialize, Serialize};

use crate::bail;
use crate::brep::Body;
use crate::error::KernelResult;
use crate::math::{PlaneFrame, Vec2, Vec3, EPSILON, TOLERANCE};

use super::builder::{self, Ends, Section};
use super::Profile;

/// One cross-section of a loft: a closed region and the plane it is drawn on.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoftSection {
    pub profile: Profile,
    #[serde(default)]
    pub plane: PlaneFrame,
}

impl LoftSection {
    pub fn new(profile: Profile, plane: PlaneFrame) -> Self {
        Self { profile, plane }
    }

    /// A section on a plane parallel to the sketch plane, `height` above it.
    pub fn at_height(profile: Profile, height: f64) -> Self {
        Self::new(
            profile,
            PlaneFrame::new(Vec3::new(0.0, 0.0, height), Vec3::X, Vec3::Y),
        )
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoftParams {
    /// Two or more cross-sections, in the order they are skinned.
    pub sections: Vec<LoftSection>,
    /// Joins the last section back to the first, leaving no ends to cap.
    #[serde(default)]
    pub closed: bool,
}

impl LoftParams {
    pub fn new(sections: Vec<LoftSection>) -> Self {
        Self { sections, closed: false }
    }

    pub fn closed(mut self) -> Self {
        self.closed = true;
        self
    }
}

/// Skins a run of profiles into a solid.
///
/// The profiles need not agree on how many points they were drawn with: each
/// loop is resampled to the finest of the run, then turned so that its start
/// lands next to the section before it. Without that turn a square lofted to a
/// square drawn from a different corner would come out with a quarter twist in
/// it, which is the classic loft artefact.
pub fn loft(params: &LoftParams) -> KernelResult<Body> {
    const OPERATION: &str = "loft";

    let least = if params.closed { 3 } else { 2 };
    if params.sections.len() < least {
        bail!(
            OPERATION,
            "a {}loft needs at least {least} sections, got {}",
            if params.closed { "closed " } else { "" },
            params.sections.len()
        );
    }

    let mut profiles = Vec::with_capacity(params.sections.len());
    for (index, section) in params.sections.iter().enumerate() {
        section
            .profile
            .validate(OPERATION)
            .map_err(|error| crate::kernel_error!(OPERATION, "section {index}: {}", error.message))?;
        profiles.push(section.profile.normalized());
    }

    let loop_count = profiles[0].holes.len() + 1;
    for (index, profile) in profiles.iter().enumerate().skip(1) {
        if profile.holes.len() + 1 != loop_count {
            bail!(
                OPERATION,
                "section {index} has {} loops, expected {loop_count} — every section \
                 of a loft needs the same number of holes",
                profile.holes.len() + 1
            );
        }
    }

    // One resolution per loop, taken from whichever section drew it in the most
    // detail: resampling only ever adds points, so no section loses a corner it
    // was drawn with.
    let resolutions: Vec<usize> = (0..loop_count)
        .map(|index| {
            profiles
                .iter()
                .map(|profile| loop_of(profile, index).len())
                .max()
                .unwrap_or(0)
        })
        .collect();

    let mut sections: Vec<Section> = Vec::with_capacity(profiles.len());
    for (profile, placement) in profiles.iter().zip(params.sections.iter()) {
        let plane = placement.plane.orthonormalized();
        let section: Section = (0..loop_count)
            .map(|index| {
                resample(loop_of(profile, index), resolutions[index])
                    .into_iter()
                    .map(|point| plane.to_world(point))
                    .collect()
            })
            .collect();
        sections.push(section);
    }

    for index in 1..sections.len() {
        let (before, after) = sections.split_at_mut(index);
        align_to(&before[index - 1], &mut after[0]);
    }
    if params.closed {
        // The seam closes back on the first section, so it has to line up too.
        let last = sections.len() - 1;
        let (before, after) = sections.split_at_mut(last);
        align_to(&after[0], &mut before[0]);
    }

    let ends = if params.closed { Ends::Closed } else { Ends::Capped };
    let mut body = builder::skin(&sections, ends, OPERATION)?.body;
    body.weld(TOLERANCE);
    builder::ensure_outward(&mut body);

    if !body.is_solid() {
        bail!(
            OPERATION,
            "the lofted body did not close — the sections may cross or double back"
        );
    }
    Ok(body)
}

fn loop_of(profile: &Profile, index: usize) -> &[Vec2] {
    if index == 0 {
        &profile.points
    } else {
        &profile.holes[index - 1]
    }
}

/// Spaces `count` points evenly by arc length around a closed loop.
///
/// A loop that already has the wanted number of points is left exactly as drawn
/// — resampling it would slide every corner off onto the flats between them.
fn resample(points: &[Vec2], count: usize) -> Vec<Vec2> {
    if points.len() == count || points.len() < 2 || count < 3 {
        return points.to_vec();
    }

    let steps: Vec<f64> = (0..points.len())
        .map(|index| points[index].distance(points[(index + 1) % points.len()]))
        .collect();
    let total: f64 = steps.iter().sum();
    if total < EPSILON {
        return points.to_vec();
    }

    let mut resampled = Vec::with_capacity(count);
    let mut segment = 0;
    let mut walked = 0.0;
    for index in 0..count {
        let target = index as f64 / count as f64 * total;
        while segment + 1 < steps.len() && walked + steps[segment] < target {
            walked += steps[segment];
            segment += 1;
        }
        let along = if steps[segment] > EPSILON {
            ((target - walked) / steps[segment]).clamp(0.0, 1.0)
        } else {
            0.0
        };
        let start = points[segment];
        let end = points[(segment + 1) % points.len()];
        resampled.push(start.lerp(end, along));
    }
    resampled
}

/// Turns each of `section`'s loops to start where the matching loop of
/// `reference` does, so that skinning joins the points that are actually
/// nearest each other rather than the ones that happen to be listed first.
fn align_to(reference: &Section, section: &mut Section) {
    for (index, face_loop) in section.iter_mut().enumerate() {
        let Some(target) = reference.get(index) else {
            continue;
        };
        if target.len() != face_loop.len() || face_loop.len() < 2 {
            continue;
        }
        let count = face_loop.len();
        let cost = |offset: usize| -> f64 {
            (0..count)
                .map(|point| target[point].distance_squared(face_loop[(point + offset) % count]))
                .sum()
        };
        let best = (0..count)
            .min_by(|&a, &b| {
                cost(a)
                    .partial_cmp(&cost(b))
                    .unwrap_or(core::cmp::Ordering::Equal)
            })
            .unwrap_or(0);
        if best != 0 {
            face_loop.rotate_left(best);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const TOL: f64 = 1e-9;

    fn square(size: f64, height: f64) -> LoftSection {
        LoftSection::at_height(Profile::rectangle(Vec2::splat(-size / 2.0), size, size), height)
    }

    #[test]
    fn lofting_two_equal_squares_is_a_prism() {
        let params = LoftParams::new(vec![square(2.0, 0.0), square(2.0, 10.0)]);
        let body = loft(&params).unwrap();

        assert!(body.is_solid());
        assert!(body.is_valid());
        assert_eq!(body.faces.len(), 6);
        assert!((body.volume() - 40.0).abs() < TOL);
    }

    #[test]
    fn lofting_a_square_down_to_a_smaller_one_is_a_frustum() {
        let params = LoftParams::new(vec![square(4.0, 0.0), square(2.0, 6.0)]);
        let body = loft(&params).unwrap();

        assert!(body.is_solid());
        // h/3 * (A + a + sqrt(A a)) for a pyramidal frustum.
        let expected = 6.0 / 3.0 * (16.0 + 4.0 + (16.0f64 * 4.0).sqrt());
        assert!((body.volume() - expected).abs() < 1e-6, "{}", body.volume());
    }

    #[test]
    fn a_three_section_loft_passes_through_the_middle_section() {
        let params = LoftParams::new(vec![square(2.0, 0.0), square(6.0, 5.0), square(2.0, 10.0)]);
        let body = loft(&params).unwrap();

        assert!(body.is_solid());
        // Two frusta back to back, so the waist is at its widest halfway up.
        let bounds = body.bounding_box();
        assert!((bounds.max.x - 3.0).abs() < TOL);
        assert_eq!(body.faces.len(), 4 + 4 + 2);

        let one = 5.0 / 3.0 * (4.0 + 36.0 + (4.0f64 * 36.0).sqrt());
        assert!((body.volume() - 2.0 * one).abs() < 1e-6, "{}", body.volume());
    }

    #[test]
    fn sections_drawn_with_different_point_counts_are_matched_up() {
        // A square against a sixteen-sided ring: the square is resampled up to
        // sixteen points so the two can be skinned point for point.
        let ring = LoftSection::at_height(Profile::circle(Vec2::ZERO, 2.0, 16), 5.0);
        let params = LoftParams::new(vec![square(4.0, 0.0), ring]);
        let body = loft(&params).unwrap();

        assert!(body.is_solid());
        assert!(body.is_valid());
        // Sixteen strips joining the two rings, plus a cap at each end.
        assert_eq!(body.faces.len(), 18);
        assert_eq!(body.vertices.len(), 32);
    }

    #[test]
    fn a_section_turned_on_its_start_point_still_lofts_untwisted() {
        // The same square, listed from a different corner. Skinning it as given
        // would put a quarter turn in the solid; aligning first does not.
        let turned = Profile::from_points(vec![
            Vec2::new(1.0, 1.0),
            Vec2::new(-1.0, 1.0),
            Vec2::new(-1.0, -1.0),
            Vec2::new(1.0, -1.0),
        ]);
        let params = LoftParams::new(vec![
            square(2.0, 0.0),
            LoftSection::at_height(turned, 10.0),
        ]);
        let body = loft(&params).unwrap();

        assert!(body.is_solid());
        assert!((body.volume() - 40.0).abs() < TOL, "{}", body.volume());
        // Untwisted, the sides are flat, so every face is a plain quadrilateral.
        for face in &body.faces {
            assert_eq!(face.outer_loop().len(), 4);
        }
    }

    #[test]
    fn a_loft_carries_holes_through_every_section() {
        let with_hole = |size: f64, height: f64| {
            LoftSection::at_height(
                Profile::rectangle(Vec2::splat(-size / 2.0), size, size)
                    .with_hole(Profile::rectangle(Vec2::splat(-1.0), 2.0, 2.0).points),
                height,
            )
        };
        let body = loft(&LoftParams::new(vec![with_hole(6.0, 0.0), with_hole(6.0, 4.0)])).unwrap();

        assert!(body.is_solid());
        assert!((body.volume() - (36.0 - 4.0) * 4.0).abs() < 1e-9);
        assert_eq!(body.faces.len(), 10);
    }

    #[test]
    fn a_closed_loft_joins_the_last_section_back_to_the_first() {
        // A triangular ring: three stations round a circle, each carrying a
        // section that faces the way the ring is going at that point.
        let station = |degrees: f64| {
            let angle = degrees.to_radians();
            let origin = Vec3::new(10.0 * angle.cos(), 10.0 * angle.sin(), 0.0);
            // The ring travels tangentially, so the section stands across it.
            let forward = Vec3::new(-angle.sin(), angle.cos(), 0.0);
            LoftSection::new(
                Profile::circle(Vec2::ZERO, 2.0, 12),
                PlaneFrame::new(origin, Vec3::Z.cross(forward), Vec3::Z),
            )
        };
        let params = LoftParams::new(vec![station(90.0), station(210.0), station(330.0)]).closed();
        let body = loft(&params).unwrap();

        assert!(body.is_solid());
        assert!(body.is_valid());
        assert!(body.volume() > 0.0);
        // No caps: the run comes back to where it started, so all that is built
        // is three rings of strips.
        assert_eq!(body.faces.len(), 36);
    }

    #[test]
    fn a_loft_needs_more_than_one_section() {
        let error = loft(&LoftParams::new(vec![square(2.0, 0.0)])).unwrap_err();
        assert_eq!(error.operation, "loft");
        assert!(error.message.contains("at least 2"));

        let closed = LoftParams::new(vec![square(2.0, 0.0), square(2.0, 4.0)]).closed();
        assert!(loft(&closed).unwrap_err().message.contains("at least 3"));
    }

    #[test]
    fn a_loft_refuses_sections_that_disagree_about_their_holes() {
        let plain = square(6.0, 0.0);
        let holed = LoftSection::at_height(
            Profile::rectangle(Vec2::splat(-3.0), 6.0, 6.0)
                .with_hole(Profile::rectangle(Vec2::splat(-1.0), 2.0, 2.0).points),
            4.0,
        );
        let error = loft(&LoftParams::new(vec![plain, holed])).unwrap_err();
        assert!(error.message.contains("same number of holes"), "{}", error.message);
    }

    #[test]
    fn a_loft_reports_which_section_was_malformed() {
        let stub = LoftSection::at_height(Profile::from_points(vec![Vec2::ZERO, Vec2::X]), 3.0);
        let error = loft(&LoftParams::new(vec![square(2.0, 0.0), stub])).unwrap_err();
        assert!(error.message.starts_with("section 1:"), "{}", error.message);
    }

    #[test]
    fn resampling_leaves_a_loop_that_is_already_the_right_size_alone() {
        let square = vec![
            Vec2::ZERO,
            Vec2::new(1.0, 0.0),
            Vec2::new(1.0, 1.0),
            Vec2::new(0.0, 1.0),
        ];
        assert_eq!(resample(&square, 4), square);

        // Doubled up, the corners survive and a midpoint lands between each.
        let finer = resample(&square, 8);
        assert_eq!(finer.len(), 8);
        assert!(finer[0].distance(Vec2::ZERO) < TOL);
        assert!(finer[1].distance(Vec2::new(0.5, 0.0)) < TOL);
        assert!(finer[2].distance(Vec2::new(1.0, 0.0)) < TOL);

        // Degenerate input comes back untouched rather than dividing by zero.
        assert_eq!(resample(&[Vec2::ZERO, Vec2::ZERO], 6), vec![Vec2::ZERO; 2]);
        assert_eq!(resample(&square, 2), square);
    }

    #[test]
    fn params_round_trip_through_json() {
        let params = LoftParams::new(vec![square(2.0, 0.0), square(4.0, 3.0)]).closed();
        let json = serde_json::to_string(&params).unwrap();
        assert!(json.contains("closed"));
        assert_eq!(serde_json::from_str::<LoftParams>(&json).unwrap(), params);

        let minimal: LoftParams = serde_json::from_str(
            r#"{"sections":[
                {"profile":{"points":[{"x":0,"y":0},{"x":4,"y":0},{"x":0,"y":4}]}},
                {"profile":{"points":[{"x":0,"y":0},{"x":2,"y":0},{"x":0,"y":2}]},
                 "plane":{"origin":{"x":0,"y":0,"z":5},
                          "xAxis":{"x":1,"y":0,"z":0},"yAxis":{"x":0,"y":1,"z":0}}}
            ]}"#,
        )
        .unwrap();
        assert!(!minimal.closed);
        assert!(loft(&minimal).unwrap().is_solid());
    }
}
