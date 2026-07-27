//! Extrusion — sweeping a profile along a straight line.

use serde::{Deserialize, Serialize};

use crate::bail;
use crate::brep::{Body, Surface};
use crate::error::KernelResult;
use crate::math::{degrees_to_radians, PlaneFrame, Quat, Vec3, EPSILON, TOLERANCE};

use super::builder::{self, Ends, Section};
use super::Profile;

/// How a two-sided extrusion distributes its distance about the sketch plane.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ExtrudeSide {
    /// All of the distance on the direction's side.
    #[default]
    OneSided,
    /// Half the distance either side of the plane.
    Symmetric,
    /// `distance` one way and `second_distance` the other.
    TwoSided,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtrudeParams {
    pub profile: Profile,
    pub distance: f64,
    /// Extrusion direction. Defaults to the sketch plane's normal.
    #[serde(default)]
    pub direction: Option<Vec3>,
    /// Where the profile sits in world space.
    #[serde(default)]
    pub plane: PlaneFrame,
    /// Taper along the sweep, in degrees. Positive widens the far end.
    #[serde(default)]
    pub draft_angle: f64,
    #[serde(default)]
    pub side: ExtrudeSide,
    /// The second distance, taken opposite `direction`, for a two-sided pull.
    #[serde(default)]
    pub second_distance: f64,
}

impl ExtrudeParams {
    pub fn new(profile: Profile, distance: f64) -> Self {
        Self {
            profile,
            distance,
            direction: None,
            plane: PlaneFrame::WORLD_XY,
            draft_angle: 0.0,
            side: ExtrudeSide::OneSided,
            second_distance: 0.0,
        }
    }

    pub fn on_plane(mut self, plane: PlaneFrame) -> Self {
        self.plane = plane;
        self
    }

    pub fn along(mut self, direction: Vec3) -> Self {
        self.direction = Some(direction);
        self
    }

    pub fn with_draft(mut self, degrees: f64) -> Self {
        self.draft_angle = degrees;
        self
    }

    pub fn with_side(mut self, side: ExtrudeSide) -> Self {
        self.side = side;
        self
    }

    pub fn with_second_distance(mut self, distance: f64) -> Self {
        self.second_distance = distance;
        self
    }

    /// How far the extrusion reaches either side of the sketch plane, as signed
    /// distances along the direction.
    fn span(&self) -> (f64, f64) {
        match self.side {
            ExtrudeSide::OneSided => (0.0, self.distance),
            ExtrudeSide::Symmetric => (-self.distance / 2.0, self.distance / 2.0),
            ExtrudeSide::TwoSided => (-self.second_distance, self.distance),
        }
    }
}

/// Sweeps a profile along a straight line into a solid.
pub fn extrude(params: &ExtrudeParams) -> KernelResult<Body> {
    const OPERATION: &str = "extrude";
    params.profile.validate(OPERATION)?;

    let plane = params.plane.orthonormalized();
    let direction = params
        .direction
        .map(|d| d.normalize())
        .filter(|d| *d != Vec3::ZERO)
        .unwrap_or_else(|| plane.normal());
    // An explicit direction stands in for the sketch plane's normal, so the
    // profile is carried round with it and the sweep still leaves each section
    // squarely. Without that the cross-section would shear away to nothing as
    // the direction approached the plane itself.
    let plane = aligned_to(&plane, direction);

    let (low, high) = params.span();
    let (low, high) = if low <= high { (low, high) } else { (high, low) };
    if (high - low).abs() < TOLERANCE {
        bail!(
            OPERATION,
            "distance {} is too small to sweep",
            params.distance
        );
    }

    let profile = params.profile.normalized();
    // At a quarter turn the taper runs parallel to the sweep and never meets it.
    // `tan` only reaches infinity at the exact representable quarter turn, so
    // the angle itself is what has to be checked.
    let taper = degrees_to_radians(params.draft_angle).tan();
    if !params.draft_angle.is_finite() || params.draft_angle.abs() >= 90.0 || !taper.is_finite() {
        bail!(
            OPERATION,
            "draft angle {} is a quarter turn or more",
            params.draft_angle
        );
    }

    // Only two cross-sections are needed: a linear taper between them is
    // exactly what a draft angle describes, so nothing is gained by more.
    let sections: Vec<Section> = [low, high]
        .into_iter()
        .map(|offset| {
            let scaled = if taper.abs() < EPSILON {
                profile.clone()
            } else {
                profile.offset_checked(offset * taper, OPERATION)?
            };
            Ok(lift(&scaled, &plane, direction, offset))
        })
        .collect::<KernelResult<Vec<_>>>()?;

    let mut swept = builder::skin(&sections, Ends::Capped, OPERATION)?;
    tag_analytic_surfaces(&mut swept, &profile, &plane, direction, low, taper);
    builder::ensure_outward(&mut swept.body);

    if !swept.body.is_solid() {
        bail!(OPERATION, "the swept body did not close");
    }
    Ok(swept.body)
}

/// Turns the frame so its normal points along `direction`, carrying the axes
/// with it by the shortest rotation. A frame that already faces that way comes
/// back untouched.
fn aligned_to(plane: &PlaneFrame, direction: Vec3) -> PlaneFrame {
    let turn = Quat::from_rotation_between(plane.normal(), direction);
    if turn == Quat::IDENTITY {
        return *plane;
    }
    PlaneFrame::new(
        plane.origin,
        turn.rotate(plane.x_axis),
        turn.rotate(plane.y_axis),
    )
}

/// Places a profile in world space at `offset` along the sweep.
fn lift(profile: &Profile, plane: &PlaneFrame, direction: Vec3, offset: f64) -> Section {
    let shift = direction.scale(offset);
    profile
        .loops()
        .map(|face_loop| {
            face_loop
                .iter()
                .map(|&point| plane.to_world(point).add(shift))
                .collect()
        })
        .collect()
}

/// Recovers the cylinder or cone a round profile sweeps out, so the result
/// shades and refines as the curve it is rather than as a many-sided prism.
fn tag_analytic_surfaces(
    swept: &mut builder::SweptBody,
    profile: &Profile,
    plane: &PlaneFrame,
    direction: Vec3,
    low: f64,
    taper: f64,
) {
    let Some((center, radius)) = profile.as_circle() else {
        return;
    };
    let base = plane.to_world(center).add(direction.scale(low));
    let radius_at_base = radius + low * taper;
    if radius_at_base <= TOLERANCE {
        return;
    }

    let sides: Vec<usize> = swept
        .side_faces
        .iter()
        .filter(|side| side.loop_index == 0)
        .map(|side| side.face)
        .collect();

    let surface = if taper.abs() < EPSILON {
        Surface::Cylinder {
            origin: base,
            axis: direction,
            radius: radius_at_base,
        }
    } else {
        // The taper closes the radius at a definite point; that is the apex.
        let to_apex = -radius_at_base / taper;
        Surface::Cone {
            apex: base.add(direction.scale(to_apex)),
            // The cone opens away from its apex.
            axis: if taper > 0.0 { direction } else { -direction },
            half_angle: taper.abs().atan(),
        }
    };
    builder::tag_surface(&mut swept.body, &sides, surface);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::math::Vec2;

    const TOL: f64 = 1e-9;

    fn square(size: f64) -> Profile {
        Profile::rectangle(Vec2::ZERO, size, size)
    }

    #[test]
    fn extruding_a_square_makes_a_box() {
        let body = extrude(&ExtrudeParams::new(square(10.0), 5.0)).unwrap();
        assert_eq!(body.faces.len(), 6);
        assert_eq!(body.vertices.len(), 8);
        assert_eq!(body.edges.len(), 12);
        assert!(body.is_solid());
        assert!(body.is_valid());
        assert!((body.volume() - 500.0).abs() < TOL);
        assert!((body.surface_area() - (2.0 * 100.0 + 4.0 * 50.0)).abs() < TOL);
    }

    #[test]
    fn the_extrusion_spans_the_requested_distance() {
        let body = extrude(&ExtrudeParams::new(square(2.0), 7.0)).unwrap();
        let bounds = body.bounding_box();
        assert!(bounds.min.approx_eq(Vec3::ZERO, TOL));
        assert!(bounds.max.approx_eq(Vec3::new(2.0, 2.0, 7.0), TOL));
    }

    #[test]
    fn every_face_of_an_extrusion_faces_outwards() {
        let body = extrude(&ExtrudeParams::new(square(4.0), 3.0)).unwrap();
        assert!(body.signed_volume() > 0.0);
        let center = body.bounding_box().center();
        for face in &body.faces {
            let outward = face.centroid(&body.vertices).sub(center);
            assert!(face.normal.dot(outward) > 0.0);
        }
    }

    #[test]
    fn a_clockwise_profile_still_builds_a_solid_the_right_way_out() {
        let clockwise = Profile::from_points(vec![
            Vec2::new(0.0, 0.0),
            Vec2::new(0.0, 3.0),
            Vec2::new(3.0, 3.0),
            Vec2::new(3.0, 0.0),
        ]);
        let body = extrude(&ExtrudeParams::new(clockwise, 2.0)).unwrap();
        assert!(body.is_solid());
        assert!(body.signed_volume() > 0.0);
        assert!((body.volume() - 18.0).abs() < TOL);
    }

    #[test]
    fn a_negative_distance_extrudes_the_other_way() {
        let body = extrude(&ExtrudeParams::new(square(2.0), -5.0)).unwrap();
        let bounds = body.bounding_box();
        assert!((bounds.min.z + 5.0).abs() < TOL);
        assert!(bounds.max.z.abs() < TOL);
        assert!(body.is_solid());
        assert!(body.signed_volume() > 0.0);
        assert!((body.volume() - 20.0).abs() < TOL);
    }

    #[test]
    fn a_symmetric_extrusion_straddles_the_sketch_plane() {
        let params = ExtrudeParams::new(square(2.0), 6.0).with_side(ExtrudeSide::Symmetric);
        let body = extrude(&params).unwrap();
        let bounds = body.bounding_box();
        assert!((bounds.min.z + 3.0).abs() < TOL);
        assert!((bounds.max.z - 3.0).abs() < TOL);
        assert!((body.volume() - 24.0).abs() < TOL);
    }

    #[test]
    fn a_two_sided_extrusion_uses_both_distances() {
        let params = ExtrudeParams::new(square(2.0), 4.0)
            .with_side(ExtrudeSide::TwoSided)
            .with_second_distance(1.0);
        let body = extrude(&params).unwrap();
        let bounds = body.bounding_box();
        assert!((bounds.min.z + 1.0).abs() < TOL);
        assert!((bounds.max.z - 4.0).abs() < TOL);
        assert!((body.volume() - 20.0).abs() < TOL);
    }

    #[test]
    fn extruding_along_a_given_direction_ignores_the_plane_normal() {
        let params = ExtrudeParams::new(square(2.0), 5.0).along(Vec3::X);
        let body = extrude(&params).unwrap();
        let bounds = body.bounding_box();
        assert!((bounds.max.x - 5.0).abs() < TOL);
        assert!(bounds.max.z.abs() < TOL);
        assert!(body.is_solid());
        assert!(body.signed_volume() > 0.0);
        assert!((body.volume() - 20.0).abs() < TOL);
    }

    #[test]
    fn extruding_on_a_tilted_plane_follows_that_plane() {
        let plane = PlaneFrame::from_normal(Vec3::new(0.0, 0.0, 10.0), Vec3::X);
        let body = extrude(&ExtrudeParams::new(square(2.0), 3.0).on_plane(plane)).unwrap();
        assert!(body.is_solid());
        assert!((body.volume() - 12.0).abs() < TOL);
        // The sweep ran along +X, away from the plane's origin.
        let bounds = body.bounding_box();
        assert!((bounds.max.x - 3.0).abs() < TOL);
        assert!((bounds.min.z - 10.0).abs() < TOL);
    }

    #[test]
    fn a_hole_in_the_profile_becomes_a_bore() {
        let profile = Profile::rectangle(Vec2::ZERO, 10.0, 10.0)
            .with_hole(Profile::rectangle(Vec2::splat(4.0), 2.0, 2.0).points);
        let body = extrude(&ExtrudeParams::new(profile, 5.0)).unwrap();

        // Four outer walls, four bore walls, two caps.
        assert_eq!(body.faces.len(), 10);
        assert!(body.is_solid());
        assert!((body.volume() - (500.0 - 20.0)).abs() < TOL);
    }

    #[test]
    fn a_positive_draft_widens_the_far_end() {
        let params = ExtrudeParams::new(square(10.0), 10.0).with_draft(45.0);
        let body = extrude(&params).unwrap();
        assert!(body.is_solid());

        let bounds = body.bounding_box();
        // 45 degrees over 10 mm pushes each wall out by 10 mm.
        assert!((bounds.min.x + 10.0).abs() < 1e-6);
        assert!((bounds.max.x - 20.0).abs() < 1e-6);
        // A frustum: (A1 + A2 + sqrt(A1*A2)) * h / 3.
        let expected = (100.0 + 900.0 + (100.0f64 * 900.0).sqrt()) * 10.0 / 3.0;
        assert!(
            (body.volume() - expected).abs() < expected * 1e-6,
            "{} vs {expected}",
            body.volume()
        );
    }

    #[test]
    fn a_negative_draft_narrows_the_far_end() {
        let params = ExtrudeParams::new(square(10.0), 2.0).with_draft(-20.0);
        let body = extrude(&params).unwrap();
        assert!(body.is_solid());
        let bounds = body.bounding_box();
        assert!(bounds.max.x < 10.0 + TOL);
        // Narrowing means less material than a straight pull.
        assert!(body.volume() < 200.0);
    }

    #[test]
    fn a_draft_steep_enough_to_close_the_profile_is_refused() {
        let params = ExtrudeParams::new(square(1.0), 100.0).with_draft(-80.0);
        let error = extrude(&params).unwrap_err();
        assert_eq!(error.operation, "extrude");
        assert!(error.message.contains("closes it up"));
    }

    #[test]
    fn a_draft_of_a_quarter_turn_is_refused() {
        let params = ExtrudeParams::new(square(1.0), 1.0).with_draft(90.0);
        assert!(extrude(&params).is_err());
    }

    #[test]
    fn extruding_a_circle_produces_cylindrical_walls() {
        let profile = Profile::circle(Vec2::ZERO, 5.0, 32);
        let body = extrude(&ExtrudeParams::new(profile, 10.0)).unwrap();
        assert!(body.is_solid());

        let cylindrical = body
            .faces
            .iter()
            .filter(|face| face.surface.name() == "cylinder")
            .count();
        assert_eq!(cylindrical, 32, "every wall should sit on the cylinder");

        // The walls' normals point straight out from the axis.
        for face in body.faces.iter().filter(|f| f.surface.is_curved()) {
            let point = face.centroid(&body.vertices);
            let radial = Vec3::new(point.x, point.y, 0.0).normalize();
            assert!(face.normal_at(point).approx_eq(radial, 1e-6));
        }

        let exact = core::f64::consts::PI * 25.0 * 10.0;
        assert!((body.volume() - exact).abs() < exact * 1e-2);
    }

    #[test]
    fn extruding_a_circle_with_draft_produces_a_cone() {
        let profile = Profile::circle(Vec2::ZERO, 5.0, 32);
        let params = ExtrudeParams::new(profile, 5.0).with_draft(45.0);
        let body = extrude(&params).unwrap();

        let conical: Vec<_> = body
            .faces
            .iter()
            .filter(|face| face.surface.name() == "cone")
            .collect();
        assert_eq!(conical.len(), 32);

        match conical[0].surface {
            Surface::Cone { apex, axis, half_angle } => {
                // 45 degrees from a radius of 5 puts the apex 5 below the base.
                assert!(apex.approx_eq(Vec3::new(0.0, 0.0, -5.0), 1e-6));
                assert!(axis.approx_eq(Vec3::Z, 1e-9));
                assert!((half_angle - core::f64::consts::FRAC_PI_4).abs() < 1e-9);
            }
            other => panic!("expected a cone, got {other:?}"),
        }
    }

    #[test]
    fn a_square_profile_is_not_dressed_up_as_a_cylinder() {
        let body = extrude(&ExtrudeParams::new(square(4.0), 2.0)).unwrap();
        assert!(body.faces.iter().all(|face| face.surface.is_planar()));
    }

    #[test]
    fn an_invalid_profile_is_refused() {
        let error = extrude(&ExtrudeParams::new(
            Profile::from_points(vec![Vec2::ZERO, Vec2::X]),
            5.0,
        ))
        .unwrap_err();
        assert_eq!(error.operation, "extrude");
        assert!(error.message.contains("three points"));
    }

    #[test]
    fn a_distance_of_nothing_is_refused() {
        let error = extrude(&ExtrudeParams::new(square(2.0), 0.0)).unwrap_err();
        assert!(error.message.contains("too small"));
    }

    #[test]
    fn a_zero_direction_falls_back_to_the_plane_normal() {
        let params = ExtrudeParams::new(square(2.0), 3.0).along(Vec3::ZERO);
        let body = extrude(&params).unwrap();
        assert!((body.bounding_box().max.z - 3.0).abs() < TOL);
    }

    #[test]
    fn extrude_side_defaults_to_one_sided() {
        assert_eq!(ExtrudeSide::default(), ExtrudeSide::OneSided);
        assert_eq!(ExtrudeParams::new(square(1.0), 1.0).span(), (0.0, 1.0));
    }

    #[test]
    fn params_round_trip_through_json() {
        let params = ExtrudeParams::new(square(2.0), 3.0)
            .with_draft(5.0)
            .with_side(ExtrudeSide::Symmetric);
        let json = serde_json::to_string(&params).unwrap();
        assert!(json.contains("draftAngle"));
        assert!(json.contains("symmetric"));
        assert_eq!(serde_json::from_str::<ExtrudeParams>(&json).unwrap(), params);

        // The optional fields really are optional.
        let minimal: ExtrudeParams = serde_json::from_str(
            r#"{"profile":{"points":[{"x":0,"y":0},{"x":1,"y":0},{"x":0,"y":1}]},"distance":2}"#,
        )
        .unwrap();
        assert_eq!(minimal.side, ExtrudeSide::OneSided);
        assert_eq!(minimal.plane, PlaneFrame::WORLD_XY);
        assert!(extrude(&minimal).is_ok());
    }
}
