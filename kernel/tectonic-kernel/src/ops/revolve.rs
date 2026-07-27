//! Revolution — sweeping a profile round an axis.

use serde::{Deserialize, Serialize};

use crate::bail;
use crate::brep::{Body, Surface};
use crate::error::KernelResult;
use crate::math::{degrees_to_radians, PlaneFrame, Vec2, Vec3, TOLERANCE};

use super::builder::{self, Ends, Section};
use super::Profile;

/// How many sides a full turn is faceted into. The side faces carry the
/// cylinder or cone they came from, so the tessellator refines them back
/// towards the true surface; this only has to be fine enough that the solid's
/// own topology is right.
const SEGMENTS_PER_TURN: usize = 32;

/// The line a profile is swept about, in the sketch plane's own 2D coordinates.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RevolveAxis {
    pub origin: Vec2,
    pub direction: Vec2,
}

impl RevolveAxis {
    pub fn new(origin: Vec2, direction: Vec2) -> Self {
        Self { origin, direction }
    }

    /// The sketch's own vertical axis — the one a lathe profile is usually
    /// drawn against.
    pub const fn vertical() -> Self {
        Self { origin: Vec2::ZERO, direction: Vec2::Y }
    }
}

impl Default for RevolveAxis {
    fn default() -> Self {
        Self::vertical()
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RevolveParams {
    pub profile: Profile,
    #[serde(default)]
    pub axis: RevolveAxis,
    /// Sweep angle in degrees. A full turn closes the solid on itself.
    pub angle: f64,
    #[serde(default)]
    pub plane: PlaneFrame,
    /// Splits the sweep evenly either side of the profile.
    #[serde(default)]
    pub symmetric: bool,
}

impl RevolveParams {
    pub fn new(profile: Profile, axis: RevolveAxis, angle: f64) -> Self {
        Self {
            profile,
            axis,
            angle,
            plane: PlaneFrame::WORLD_XY,
            symmetric: false,
        }
    }

    pub fn on_plane(mut self, plane: PlaneFrame) -> Self {
        self.plane = plane;
        self
    }

    pub fn symmetric(mut self) -> Self {
        self.symmetric = true;
        self
    }

    /// True when the sweep comes all the way back round to where it started.
    pub fn is_full_turn(&self) -> bool {
        (self.angle.abs() - 360.0).abs() < 1e-9
    }
}

/// Sweeps a profile round an axis into a solid.
pub fn revolve(params: &RevolveParams) -> KernelResult<Body> {
    const OPERATION: &str = "revolve";
    params.profile.validate(OPERATION)?;

    if !params.angle.is_finite() || params.angle.abs() < TOLERANCE {
        bail!(OPERATION, "angle {} is too small to sweep", params.angle);
    }
    if params.angle.abs() > 360.0 + 1e-9 {
        bail!(
            OPERATION,
            "angle {} is more than a full turn",
            params.angle
        );
    }

    let plane = params.plane.orthonormalized();
    let along = params.axis.direction.normalize();
    if along == Vec2::ZERO {
        bail!(OPERATION, "the axis has no direction");
    }
    // The material is on the +x side of the axis once the profile is measured
    // in axis coordinates, so this is the direction radius is counted along.
    let outwards = Vec2::new(-along.y, along.x);

    let profile = params.profile.normalized();
    let lathe = to_lathe_coordinates(&profile, params.axis.origin, along, outwards, OPERATION)?;

    let sweep = degrees_to_radians(params.angle.clamp(-360.0, 360.0));
    let start = if params.symmetric { -sweep / 2.0 } else { 0.0 };
    let full_turn = params.is_full_turn();
    let steps = ((params.angle.abs() / 360.0) * SEGMENTS_PER_TURN as f64).ceil() as usize;
    let steps = steps.max(3);

    // A full turn's last ring *is* its first, so it is not built twice.
    let rings = if full_turn { steps } else { steps + 1 };
    let base = plane.to_world(params.axis.origin);
    let axis = plane.direction_to_world(along);
    let radial = plane.direction_to_world(outwards);
    let normal = plane.normal();

    let sections: Vec<Section> = (0..rings)
        .map(|ring| {
            let angle = start + sweep * (ring as f64 / steps as f64);
            let (sine, cosine) = angle.sin_cos();
            lathe
                .iter()
                .map(|face_loop| {
                    face_loop
                        .iter()
                        .map(|&point| {
                            base.add(radial.scale(point.x * cosine))
                                .add(normal.scale(point.x * sine))
                                .add(axis.scale(point.y))
                        })
                        .collect()
                })
                .collect()
        })
        .collect();

    let ends = if full_turn { Ends::Closed } else { Ends::Capped };
    let mut swept = builder::skin(&sections, ends, OPERATION)?;
    tag_surfaces_of_revolution(&mut swept, &lathe, base, axis);

    let mut body = swept.body;
    // A profile touching the axis puts every ring's point at the same place;
    // until those are fused the solid has a seam running down its spine.
    body.weld(TOLERANCE);
    builder::ensure_outward(&mut body);

    if !body.is_solid() {
        bail!(OPERATION, "the revolved body did not close");
    }
    Ok(body)
}

/// Re-expresses the profile as (radius, height) against the axis, and refuses
/// the profiles that could not sweep into a solid.
///
/// A profile with material on both sides of the axis would sweep through
/// itself, so it is rejected rather than quietly folded over. Material entirely
/// on the axis's left is mirrored to the right, which is only a choice of which
/// way the axis points and not something a caller should have to get right.
fn to_lathe_coordinates(
    profile: &Profile,
    origin: Vec2,
    along: Vec2,
    outwards: Vec2,
    operation: &str,
) -> KernelResult<Vec<Vec<Vec2>>> {
    let mut loops: Vec<Vec<Vec2>> = profile
        .loops()
        .map(|face_loop| {
            face_loop
                .iter()
                .map(|&point| {
                    let offset = point.sub(origin);
                    Vec2::new(offset.dot(outwards), offset.dot(along))
                })
                .collect()
        })
        .collect();

    let widest = loops
        .iter()
        .flatten()
        .map(|point| point.x)
        .fold(f64::NEG_INFINITY, f64::max);
    let deepest = loops
        .iter()
        .flatten()
        .map(|point| point.x)
        .fold(f64::INFINITY, f64::min);

    if widest <= TOLERANCE && deepest >= -TOLERANCE {
        bail!(operation, "the profile lies on the axis");
    }
    if widest > TOLERANCE && deepest < -TOLERANCE {
        bail!(operation, "the profile crosses the axis of revolution");
    }
    if widest <= TOLERANCE {
        // All of it is on the far side; mirror it across rather than refuse.
        for point in loops.iter_mut().flatten() {
            point.x = -point.x;
        }
        for face_loop in &mut loops {
            face_loop.reverse();
        }
    }
    Ok(loops)
}

/// Recovers the cylinder or cone each ring of side faces sweeps out.
///
/// A segment of the profile parallel to the axis sweeps a cylinder; one that
/// slants sweeps a cone. Tagging them is what lets a turned part shade as the
/// round thing it is instead of as a many-sided prism.
fn tag_surfaces_of_revolution(
    swept: &mut builder::SweptBody,
    lathe: &[Vec<Vec2>],
    base: Vec3,
    axis: Vec3,
) {
    for (loop_index, face_loop) in lathe.iter().enumerate() {
        let count = face_loop.len();
        for segment in 0..count {
            let from = face_loop[segment];
            let to = face_loop[(segment + 1) % count];
            let Some(surface) = surface_of_segment(from, to, base, axis) else {
                continue;
            };
            let faces: Vec<usize> = swept
                .side_faces
                .iter()
                .filter(|side| side.loop_index == loop_index && side.segment == segment)
                .map(|side| side.face)
                .collect();
            builder::tag_surface(&mut swept.body, &faces, surface);
        }
    }
}

/// The surface one segment of the profile sweeps out, or `None` when it sweeps
/// a flat annulus — a plane the faceting already describes exactly.
fn surface_of_segment(from: Vec2, to: Vec2, base: Vec3, axis: Vec3) -> Option<Surface> {
    let rise = to.y - from.y;
    let widening = to.x - from.x;
    if rise.abs() < TOLERANCE {
        // Perpendicular to the axis: a flat washer face.
        return None;
    }
    if widening.abs() < TOLERANCE {
        if from.x <= TOLERANCE {
            return None;
        }
        return Some(Surface::Cylinder {
            origin: base.add(axis.scale(from.y)),
            axis,
            radius: from.x,
        });
    }

    // The segment, extended, meets the axis at the cone's apex.
    let to_apex = -from.x * rise / widening;
    let half_angle = (widening / rise).abs().atan();
    Some(Surface::Cone {
        apex: base.add(axis.scale(from.y + to_apex)),
        // The cone opens away from its apex.
        axis: if widening / rise > 0.0 { axis } else { -axis },
        half_angle,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use core::f64::consts::PI;

    /// A 2x3 rectangle standing off the axis, between x = 1 and x = 3.
    fn offset_rectangle() -> Profile {
        Profile::rectangle(Vec2::new(1.0, 0.0), 2.0, 3.0)
    }

    #[test]
    fn a_full_turn_of_an_offset_rectangle_makes_a_tube() {
        let params = RevolveParams::new(offset_rectangle(), RevolveAxis::vertical(), 360.0);
        let body = revolve(&params).unwrap();
        assert!(body.is_solid());
        assert!(body.is_valid());

        // Outer barrel minus inner bore, three tall.
        let exact = PI * (9.0 - 1.0) * 3.0;
        assert!(
            (body.volume() - exact).abs() < exact * 2e-2,
            "{} vs {exact}",
            body.volume()
        );
        // The sketch's y runs up the axis, so the tube stands in world y and
        // the swept radius reaches 3 either side of it.
        let bounds = body.bounding_box();
        assert!((bounds.max.y - 3.0).abs() < 1e-9);
        assert!((bounds.max.x - 3.0).abs() < 1e-9);
        assert!((bounds.min.x + 3.0).abs() < 1e-9);
    }

    #[test]
    fn a_full_turn_has_no_caps() {
        let params = RevolveParams::new(offset_rectangle(), RevolveAxis::vertical(), 360.0);
        let body = revolve(&params).unwrap();
        // Four segments of profile, swept into SEGMENTS_PER_TURN rings each.
        assert_eq!(body.faces.len(), 4 * SEGMENTS_PER_TURN);
    }

    #[test]
    fn a_half_turn_encloses_half_as_much() {
        let full = revolve(&RevolveParams::new(
            offset_rectangle(),
            RevolveAxis::vertical(),
            360.0,
        ))
        .unwrap();
        let half = revolve(&RevolveParams::new(
            offset_rectangle(),
            RevolveAxis::vertical(),
            180.0,
        ))
        .unwrap();
        assert!(half.is_solid());
        assert!((half.volume() - full.volume() / 2.0).abs() < full.volume() * 2e-2);
        // Half a turn from the sketch plane reaches round to the far side but
        // never comes back, so it stays on one side in z.
        assert!(half.bounding_box().min.z >= -1e-9);
    }

    #[test]
    fn a_symmetric_sweep_straddles_the_profile() {
        let params = RevolveParams::new(offset_rectangle(), RevolveAxis::vertical(), 90.0).symmetric();
        let body = revolve(&params).unwrap();
        let bounds = body.bounding_box();
        // 45 degrees either side of the sketch plane, which the profile is on;
        // the sweep leaves that plane along its normal, world z.
        assert!(bounds.min.z < -1e-6);
        assert!(bounds.max.z > 1e-6);
        assert!((bounds.min.z + bounds.max.z).abs() < 1e-9);
    }

    #[test]
    fn a_profile_touching_the_axis_makes_a_solid_of_revolution() {
        // A right triangle against the axis turns into a cone.
        let profile = Profile::from_points(vec![
            Vec2::new(0.0, 0.0),
            Vec2::new(2.0, 0.0),
            Vec2::new(0.0, 6.0),
        ]);
        let body = revolve(&RevolveParams::new(profile, RevolveAxis::vertical(), 360.0)).unwrap();
        assert!(body.is_solid());
        let exact = PI * 4.0 * 6.0 / 3.0;
        assert!(
            (body.volume() - exact).abs() < exact * 3e-2,
            "{} vs {exact}",
            body.volume()
        );
    }

    #[test]
    fn a_straight_wall_is_tagged_as_a_cylinder() {
        let params = RevolveParams::new(offset_rectangle(), RevolveAxis::vertical(), 360.0);
        let body = revolve(&params).unwrap();
        let cylindrical = body
            .faces
            .iter()
            .filter(|face| face.surface.name() == "cylinder")
            .count();
        // The two vertical sides of the rectangle, one ring of faces each.
        assert_eq!(cylindrical, 2 * SEGMENTS_PER_TURN);

        // The outer wall's normals point away from the axis, which here runs
        // along world y; the bore's point back at it.
        for face in body.faces.iter().filter(|f| f.surface.is_curved()) {
            let point = face.centroid(&body.vertices);
            let radial = Vec3::new(point.x, 0.0, point.z);
            let outward = radial.length() > 2.0;
            let expected = if outward {
                radial.normalize()
            } else {
                -radial.normalize()
            };
            assert!(face.normal_at(point).approx_eq(expected, 1e-6));
        }
    }

    #[test]
    fn a_slanted_wall_is_tagged_as_a_cone() {
        let profile = Profile::from_points(vec![
            Vec2::new(1.0, 0.0),
            Vec2::new(3.0, 4.0),
            Vec2::new(1.0, 4.0),
        ]);
        let body = revolve(&RevolveParams::new(profile, RevolveAxis::vertical(), 360.0)).unwrap();
        assert!(body.faces.iter().any(|face| face.surface.name() == "cone"));
    }

    #[test]
    fn revolving_on_a_tilted_plane_turns_about_that_plane() {
        let plane = PlaneFrame::WORLD_XZ;
        let params = RevolveParams::new(offset_rectangle(), RevolveAxis::vertical(), 360.0)
            .on_plane(plane);
        let body = revolve(&params).unwrap();
        assert!(body.is_solid());
        // The sketch's own y runs along world z, so the tube stands up in z.
        let bounds = body.bounding_box();
        assert!((bounds.max.z - 3.0).abs() < 1e-9);
    }

    #[test]
    fn a_profile_crossing_the_axis_is_refused() {
        let profile = Profile::rectangle(Vec2::new(-2.0, 0.0), 4.0, 1.0);
        let error = revolve(&RevolveParams::new(
            profile,
            RevolveAxis::vertical(),
            360.0,
        ))
        .unwrap_err();
        assert_eq!(error.operation, "revolve");
        assert!(error.message.contains("crosses the axis"));
    }

    #[test]
    fn a_profile_on_the_far_side_is_mirrored_rather_than_refused() {
        let mirrored = Profile::rectangle(Vec2::new(-3.0, 0.0), 2.0, 3.0);
        let body = revolve(&RevolveParams::new(
            mirrored,
            RevolveAxis::vertical(),
            360.0,
        ))
        .unwrap();
        assert!(body.is_solid());
        let expected = revolve(&RevolveParams::new(
            offset_rectangle(),
            RevolveAxis::vertical(),
            360.0,
        ))
        .unwrap();
        assert!((body.volume() - expected.volume()).abs() < 1e-6);
    }

    #[test]
    fn an_angle_of_nothing_is_refused() {
        let error = revolve(&RevolveParams::new(
            offset_rectangle(),
            RevolveAxis::vertical(),
            0.0,
        ))
        .unwrap_err();
        assert!(error.message.contains("too small"));

        let error = revolve(&RevolveParams::new(
            offset_rectangle(),
            RevolveAxis::vertical(),
            720.0,
        ))
        .unwrap_err();
        assert!(error.message.contains("full turn"));
    }

    #[test]
    fn an_axis_with_no_direction_is_refused() {
        let params = RevolveParams::new(
            offset_rectangle(),
            RevolveAxis::new(Vec2::ZERO, Vec2::ZERO),
            360.0,
        );
        assert!(revolve(&params).unwrap_err().message.contains("direction"));
    }

    #[test]
    fn an_invalid_profile_is_refused() {
        let params = RevolveParams::new(
            Profile::from_points(vec![Vec2::ZERO, Vec2::X]),
            RevolveAxis::vertical(),
            360.0,
        );
        assert!(revolve(&params).unwrap_err().message.contains("three points"));
    }

    #[test]
    fn an_axis_the_profile_sits_on_is_refused() {
        // A profile drawn along the axis itself has no radius to sweep.
        let flat = Profile::from_points(vec![
            Vec2::new(0.0, 0.0),
            Vec2::new(0.0, 4.0),
            Vec2::new(1e-15, 2.0),
        ]);
        assert!(revolve(&RevolveParams::new(flat, RevolveAxis::vertical(), 360.0)).is_err());
    }

    #[test]
    fn params_round_trip_through_json() {
        let params = RevolveParams::new(offset_rectangle(), RevolveAxis::vertical(), 270.0)
            .symmetric();
        let json = serde_json::to_string(&params).unwrap();
        assert_eq!(serde_json::from_str::<RevolveParams>(&json).unwrap(), params);

        let minimal: RevolveParams = serde_json::from_str(
            r#"{"profile":{"points":[{"x":1,"y":0},{"x":2,"y":0},{"x":2,"y":1}]},"angle":360}"#,
        )
        .unwrap();
        assert_eq!(minimal.axis, RevolveAxis::vertical());
        assert!(!minimal.symmetric);
        assert!(revolve(&minimal).is_ok());
    }
}
