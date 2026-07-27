//! Sweeping — dragging a profile along a path.

use serde::{Deserialize, Serialize};

use crate::bail;
use crate::brep::Body;
use crate::error::KernelResult;
use crate::math::{degrees_to_radians, PlaneFrame, Quat, Vec3, TOLERANCE};

use super::builder::{self, Ends, Section};
use super::Profile;

/// How the profile is carried along the path.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SweepOrientation {
    /// The section turns with the path, staying square to it the whole way.
    #[default]
    FollowPath,
    /// The section keeps the sketch plane's own orientation and is only
    /// translated, so a path that curves produces a sheared sweep.
    Perpendicular,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SweepParams {
    pub profile: Profile,
    /// The spine, in world space. Needs at least two distinct points.
    pub path: Vec<Vec3>,
    /// The frame the profile's 2D coordinates are read in.
    #[serde(default)]
    pub plane: PlaneFrame,
    #[serde(default)]
    pub orientation: SweepOrientation,
    /// Total twist about the path from start to end, in degrees.
    #[serde(default)]
    pub twist_angle: f64,
}

impl SweepParams {
    pub fn new(profile: Profile, path: Vec<Vec3>) -> Self {
        Self {
            profile,
            path,
            plane: PlaneFrame::WORLD_XY,
            orientation: SweepOrientation::default(),
            twist_angle: 0.0,
        }
    }

    pub fn on_plane(mut self, plane: PlaneFrame) -> Self {
        self.plane = plane;
        self
    }

    pub fn with_orientation(mut self, orientation: SweepOrientation) -> Self {
        self.orientation = orientation;
        self
    }

    pub fn with_twist(mut self, degrees: f64) -> Self {
        self.twist_angle = degrees;
        self
    }
}

/// Drags a profile along a path into a solid.
pub fn sweep(params: &SweepParams) -> KernelResult<Body> {
    const OPERATION: &str = "sweep";
    params.profile.validate(OPERATION)?;

    // Checked before deduplication: a non-finite point is never within
    // tolerance of anything, so it would otherwise be dropped as a repeat and
    // reported as a path that was too short.
    if !params.path.iter().all(|point| point.is_finite()) {
        bail!(OPERATION, "the path contains a non-finite point");
    }
    let spine = dedupe_path(&params.path);
    if spine.len() < 2 {
        bail!(
            OPERATION,
            "the path needs at least two distinct points, got {}",
            spine.len()
        );
    }
    if !params.twist_angle.is_finite() {
        bail!(OPERATION, "the twist angle is not a number");
    }

    let plane = params.plane.orthonormalized();
    let tangents = tangents_along(&spine);
    let profile = params.profile.normalized();

    let mut frames = Vec::with_capacity(spine.len());
    let (mut u, mut v) = match params.orientation {
        SweepOrientation::Perpendicular => (plane.x_axis, plane.y_axis),
        SweepOrientation::FollowPath => square_to(tangents[0], plane),
    };
    for (index, &tangent) in tangents.iter().enumerate() {
        if params.orientation == SweepOrientation::FollowPath && index > 0 {
            // Rotation-minimizing frames: carry the last section round by
            // exactly the turn the path took, and no more. Rebuilding the frame
            // from scratch at each station would let it spin about the path.
            let turn = Quat::from_rotation_between(tangents[index - 1], tangent);
            u = turn.rotate(u).normalize();
            v = turn.rotate(v).normalize();
        }
        let twist = degrees_to_radians(params.twist_angle) * index as f64
            / (spine.len() - 1).max(1) as f64;
        let spun = Quat::from_axis_angle(tangent, twist);
        frames.push((spun.rotate(u), spun.rotate(v)));
    }

    let sections: Vec<Section> = spine
        .iter()
        .zip(frames.iter())
        .map(|(&station, &(u, v))| {
            profile
                .loops()
                .map(|face_loop| {
                    face_loop
                        .iter()
                        .map(|&point| station.add(u.scale(point.x)).add(v.scale(point.y)))
                        .collect()
                })
                .collect()
        })
        .collect();

    let swept = builder::skin(&sections, Ends::Capped, OPERATION)?;
    let mut body = swept.body;
    body.weld(TOLERANCE);
    builder::ensure_outward(&mut body);

    if !body.is_solid() {
        bail!(
            OPERATION,
            "the swept body did not close — the path may double back through the section"
        );
    }
    Ok(body)
}

/// Drops points that repeat the one before them, which would otherwise leave a
/// station with no direction to face.
fn dedupe_path(path: &[Vec3]) -> Vec<Vec3> {
    let mut cleaned: Vec<Vec3> = Vec::with_capacity(path.len());
    for &point in path {
        if cleaned
            .last()
            .is_none_or(|last| last.distance(point) > TOLERANCE)
        {
            cleaned.push(point);
        }
    }
    cleaned
}

/// The direction the sweep faces at each station.
///
/// Interior stations average the segments either side, so the section splits
/// the corner rather than sitting square to one leg and slicing into the other.
fn tangents_along(spine: &[Vec3]) -> Vec<Vec3> {
    let count = spine.len();
    (0..count)
        .map(|index| {
            let incoming = if index > 0 {
                spine[index].sub(spine[index - 1]).normalize()
            } else {
                Vec3::ZERO
            };
            let outgoing = if index + 1 < count {
                spine[index + 1].sub(spine[index]).normalize()
            } else {
                Vec3::ZERO
            };
            let averaged = incoming.add(outgoing);
            if averaged.length() > TOLERANCE {
                averaged.normalize()
            } else {
                // A hairpin: the two legs cancel. Face along the incoming leg
                // rather than returning nothing to orient against.
                incoming.add(outgoing.scale(-1.0)).normalize()
            }
        })
        .collect()
}

/// A pair of axes square to `tangent`, taking their roll from the sketch plane
/// so the section starts out oriented the way it was drawn.
fn square_to(tangent: Vec3, plane: PlaneFrame) -> (Vec3, Vec3) {
    let mut u = plane.x_axis.reject_from(tangent);
    if u.length() < TOLERANCE {
        u = plane.y_axis.reject_from(tangent);
    }
    if u.length() < TOLERANCE {
        u = tangent.any_perpendicular();
    }
    let u = u.normalize();
    (u, tangent.cross(u).normalize())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::math::Vec2;

    const TOL: f64 = 1e-9;

    fn square(size: f64) -> Profile {
        Profile::rectangle(Vec2::splat(-size / 2.0), size, size)
    }

    #[test]
    fn sweeping_along_a_straight_path_is_a_prism() {
        let path = vec![Vec3::ZERO, Vec3::new(0.0, 0.0, 10.0)];
        let body = sweep(&SweepParams::new(square(2.0), path)).unwrap();
        assert!(body.is_solid());
        assert!(body.is_valid());
        assert!((body.volume() - 40.0).abs() < TOL);
        assert_eq!(body.faces.len(), 6);
    }

    #[test]
    fn the_section_stays_square_to_a_path_that_turns() {
        // An L: up the z axis, then off along x.
        let path = vec![
            Vec3::ZERO,
            Vec3::new(0.0, 0.0, 10.0),
            Vec3::new(10.0, 0.0, 10.0),
        ];
        let body = sweep(&SweepParams::new(square(2.0), path)).unwrap();
        assert!(body.is_solid());
        // Two legs of ten at four square each, mitred at the corner: the mitre
        // takes as much off the inside as it adds outside.
        assert!((body.volume() - 80.0).abs() < 1e-6, "{}", body.volume());
        // Each end section is centred on its path point, so the sweep stops
        // there; only the leg it turns away from reaches past the corner.
        let bounds = body.bounding_box();
        assert!((bounds.max.x - 10.0).abs() < TOL);
        assert!((bounds.max.z - 11.0).abs() < TOL);
    }

    #[test]
    fn a_perpendicular_sweep_keeps_the_sketch_orientation() {
        // A path that steps sideways as it rises. Following it would turn the
        // section into the bend; leaving it parallel shears the solid instead.
        let path = vec![
            Vec3::ZERO,
            Vec3::new(0.0, 0.0, 10.0),
            Vec3::new(10.0, 0.0, 20.0),
        ];
        let params = SweepParams::new(square(2.0), path.clone())
            .with_orientation(SweepOrientation::Perpendicular);
        let body = sweep(&params).unwrap();
        assert!(body.is_solid());

        // Every section is still the sketch's own square, so the sweep is two
        // units wide in y from end to end and shearing leaves the volume alone.
        for vertex in &body.vertices {
            assert!((vertex.position.y.abs() - 1.0).abs() < TOL);
        }
        assert!((body.volume() - 4.0 * 20.0).abs() < 1e-6, "{}", body.volume());

        // Following the path instead tips the sections and changes the shape.
        let followed = sweep(&SweepParams::new(square(2.0), path)).unwrap();
        assert!(followed.volume() > body.volume());
    }

    #[test]
    fn sweeping_a_closed_square_path_returns_to_where_it_started() {
        let path = vec![
            Vec3::ZERO,
            Vec3::new(0.0, 0.0, 20.0),
            Vec3::new(20.0, 0.0, 20.0),
            Vec3::new(20.0, 0.0, 0.0),
        ];
        let body = sweep(&SweepParams::new(square(2.0), path)).unwrap();
        assert!(body.is_solid());
        assert!(body.signed_volume() > 0.0);
    }

    #[test]
    fn a_twisted_sweep_turns_the_section_as_it_goes() {
        let path = vec![Vec3::ZERO, Vec3::new(0.0, 0.0, 10.0)];
        let straight = sweep(&SweepParams::new(square(2.0), path.clone())).unwrap();
        let twisted = sweep(&SweepParams::new(square(2.0), path).with_twist(45.0)).unwrap();
        assert!(twisted.is_solid());

        // An eighth of a turn stands the far section on its corner, so the
        // footprint grows from the square's half-width to its half-diagonal.
        let straight_reach = straight.bounding_box().max.x;
        let twisted_reach = twisted.bounding_box().max.x;
        assert!((straight_reach - 1.0).abs() < TOL);
        assert!((twisted_reach - core::f64::consts::SQRT_2).abs() < 1e-6);
    }

    #[test]
    fn a_sweep_on_a_tilted_plane_reads_the_profile_in_that_plane() {
        // The profile is drawn on the yz plane and swept along x.
        let params = SweepParams::new(square(2.0), vec![Vec3::ZERO, Vec3::new(6.0, 0.0, 0.0)])
            .on_plane(PlaneFrame::WORLD_YZ)
            .with_orientation(SweepOrientation::Perpendicular);
        let body = sweep(&params).unwrap();
        assert!(body.is_solid());
        assert!((body.volume() - 24.0).abs() < TOL);
    }

    #[test]
    fn a_profile_with_a_hole_sweeps_into_a_tube() {
        let profile = Profile::rectangle(Vec2::splat(-3.0), 6.0, 6.0)
            .with_hole(Profile::rectangle(Vec2::splat(-1.0), 2.0, 2.0).points);
        let body = sweep(&SweepParams::new(
            profile,
            vec![Vec3::ZERO, Vec3::new(0.0, 0.0, 5.0)],
        ))
        .unwrap();
        assert!(body.is_solid());
        assert!((body.volume() - (36.0 - 4.0) * 5.0).abs() < TOL);
        // Four outer walls, four bore walls, two caps.
        assert_eq!(body.faces.len(), 10);
    }

    #[test]
    fn repeated_path_points_are_dropped_rather_than_stalling_the_sweep() {
        let path = vec![
            Vec3::ZERO,
            Vec3::ZERO,
            Vec3::new(0.0, 0.0, 4.0),
            Vec3::new(0.0, 0.0, 4.0),
        ];
        let body = sweep(&SweepParams::new(square(2.0), path)).unwrap();
        assert!((body.volume() - 16.0).abs() < TOL);
    }

    #[test]
    fn a_path_that_goes_nowhere_is_refused() {
        let error = sweep(&SweepParams::new(square(2.0), vec![Vec3::ZERO])).unwrap_err();
        assert_eq!(error.operation, "sweep");
        assert!(error.message.contains("at least two"));

        assert!(sweep(&SweepParams::new(square(2.0), vec![Vec3::ZERO; 4])).is_err());
    }

    #[test]
    fn a_non_finite_path_is_refused() {
        let path = vec![Vec3::ZERO, Vec3::new(f64::NAN, 0.0, 1.0)];
        let error = sweep(&SweepParams::new(square(2.0), path)).unwrap_err();
        assert!(error.message.contains("non-finite"));

        let path = vec![Vec3::ZERO, Vec3::new(0.0, 0.0, 1.0)];
        let params = SweepParams::new(square(2.0), path).with_twist(f64::INFINITY);
        assert!(sweep(&params).unwrap_err().message.contains("twist"));
    }

    #[test]
    fn an_invalid_profile_is_refused() {
        let params = SweepParams::new(
            Profile::from_points(vec![Vec2::ZERO, Vec2::X]),
            vec![Vec3::ZERO, Vec3::Z],
        );
        assert!(sweep(&params).unwrap_err().message.contains("three points"));
    }

    #[test]
    fn a_section_sheared_flat_by_its_path_is_refused() {
        // Sweeping along the sketch plane itself, without turning the section
        // to follow, leaves nothing with any thickness.
        let params = SweepParams::new(square(2.0), vec![Vec3::ZERO, Vec3::new(5.0, 0.0, 0.0)])
            .with_orientation(SweepOrientation::Perpendicular);
        assert!(sweep(&params).is_err());
    }

    #[test]
    fn tangents_bisect_a_corner() {
        let spine = vec![Vec3::ZERO, Vec3::Z, Vec3::new(1.0, 0.0, 1.0)];
        let tangents = tangents_along(&spine);
        assert!(tangents[0].approx_eq(Vec3::Z, TOL));
        assert!(tangents[2].approx_eq(Vec3::X, TOL));
        // The middle one splits the right angle between them.
        let bisector = Vec3::new(1.0, 0.0, 1.0).normalize();
        assert!(tangents[1].approx_eq(bisector, TOL));
    }

    #[test]
    fn a_hairpin_still_yields_a_direction() {
        let spine = vec![Vec3::ZERO, Vec3::Z, Vec3::ZERO];
        for tangent in tangents_along(&spine) {
            assert!((tangent.length() - 1.0).abs() < TOL);
        }
    }

    #[test]
    fn the_starting_frame_falls_back_when_the_plane_lines_up_with_the_path() {
        // The sketch x axis is the path direction, so it cannot be the section's.
        let (u, v) = square_to(Vec3::X, PlaneFrame::WORLD_XY);
        assert!(u.dot(Vec3::X).abs() < TOL);
        assert!(v.dot(Vec3::X).abs() < TOL);
        assert!(u.dot(v).abs() < TOL);

        // And when both plane axes do.
        let degenerate = PlaneFrame::new(Vec3::ZERO, Vec3::X, Vec3::X);
        let (u, _) = square_to(Vec3::X, degenerate);
        assert!(u.dot(Vec3::X).abs() < TOL);
    }

    #[test]
    fn params_round_trip_through_json() {
        let params = SweepParams::new(square(2.0), vec![Vec3::ZERO, Vec3::Z])
            .with_orientation(SweepOrientation::Perpendicular)
            .with_twist(30.0);
        let json = serde_json::to_string(&params).unwrap();
        assert!(json.contains("twistAngle"));
        assert!(json.contains("perpendicular"));
        assert_eq!(serde_json::from_str::<SweepParams>(&json).unwrap(), params);

        let minimal: SweepParams = serde_json::from_str(
            r#"{"profile":{"points":[{"x":0,"y":0},{"x":1,"y":0},{"x":0,"y":1}]},
                "path":[{"x":0,"y":0,"z":0},{"x":0,"y":0,"z":3}]}"#,
        )
        .unwrap();
        assert_eq!(minimal.orientation, SweepOrientation::FollowPath);
        assert!(sweep(&minimal).is_ok());
    }
}
