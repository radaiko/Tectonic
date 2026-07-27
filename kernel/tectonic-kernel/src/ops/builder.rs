//! Building solids by connecting cross-sections.
//!
//! Extrude, revolve, sweep and loft all do the same thing at bottom: they place
//! a series of cross-sections in space and skin them. Only the placement
//! differs. This module owns the skinning, so the operations themselves are
//! left describing where their sections go.

use crate::brep::{Body, Face, Surface, Vertex, VertexId};
use crate::error::KernelResult;
use crate::math::{Vec3, TOLERANCE};
use crate::{bail, kernel_error};

/// One cross-section: an outer loop of points followed by any hole loops, all
/// in world space and each without a repeated closing point.
pub type Section = Vec<Vec<Vec3>>;

/// Where a side face came from, so the operation that requested the sweep can
/// tag it with the surface it knows the face lies on.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SideFace {
    /// Index of the face within the built body.
    pub face: usize,
    /// Which loop of the section — 0 is the outer boundary.
    pub loop_index: usize,
    /// Which segment of that loop.
    pub segment: usize,
    /// The section this strip starts at.
    pub section: usize,
}

/// The result of skinning a run of sections.
#[derive(Debug, Clone)]
pub struct SweptBody {
    pub body: Body,
    pub side_faces: Vec<SideFace>,
    /// The cap closing the first section, if one was built.
    pub start_cap: Option<usize>,
    /// The cap closing the last section, if one was built.
    pub end_cap: Option<usize>,
}

/// How the ends of a sweep are treated.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Ends {
    /// Flat faces close both ends, making a solid.
    Capped,
    /// No caps — the result is an open tube.
    Open,
    /// The last section joins back to the first; there are no ends to cap.
    Closed,
}

/// Skins a run of cross-sections into a body.
///
/// Every section must have the same number of loops, and matching loops must
/// have the same number of points: point *i* of a loop is joined to point *i*
/// of the next section's matching loop. Callers that start from sections of
/// different resolutions resample them first.
pub fn skin(sections: &[Section], ends: Ends, operation: &str) -> KernelResult<SweptBody> {
    if sections.len() < 2 {
        bail!(
            operation,
            "skinning needs at least two cross-sections, got {}",
            sections.len()
        );
    }
    let shape: Vec<usize> = sections[0].iter().map(|l| l.len()).collect();
    if shape.is_empty() || shape[0] < 3 {
        bail!(operation, "the first cross-section is not a closed loop");
    }
    for (index, section) in sections.iter().enumerate().skip(1) {
        let other: Vec<usize> = section.iter().map(|l| l.len()).collect();
        if other != shape {
            return Err(kernel_error!(
                operation,
                "cross-section {index} has loops {other:?}, expected {shape:?}"
            ));
        }
    }

    let mut body = Body::empty();
    // ids[section][loop][point]
    let mut ids: Vec<Vec<Vec<VertexId>>> = Vec::with_capacity(sections.len());
    for section in sections {
        let mut section_ids = Vec::with_capacity(section.len());
        for face_loop in section {
            section_ids.push(
                face_loop
                    .iter()
                    .map(|&point| body.add_vertex(point))
                    .collect(),
            );
        }
        ids.push(section_ids);
    }

    let mut side_faces = Vec::new();
    let steps = match ends {
        Ends::Closed => sections.len(),
        _ => sections.len() - 1,
    };

    for step in 0..steps {
        let next = (step + 1) % sections.len();
        for loop_index in 0..shape.len() {
            let count = shape[loop_index];
            for segment in 0..count {
                let following = (segment + 1) % count;
                let quad = [
                    ids[step][loop_index][segment],
                    ids[step][loop_index][following],
                    ids[next][loop_index][following],
                    ids[next][loop_index][segment],
                ];
                // A strip can collapse where a loft narrows to a point.
                let Some(face) = quad_face(&mut body, quad) else {
                    continue;
                };
                side_faces.push(SideFace {
                    face,
                    loop_index,
                    segment,
                    section: step,
                });
            }
        }
    }

    let (start_cap, end_cap) = match ends {
        Ends::Capped => {
            // The first section's cap faces backwards along the sweep, so its
            // loops are reversed relative to the section as given.
            let start = cap(&mut body, &ids[0], true);
            let end = cap(&mut body, &ids[sections.len() - 1], false);
            (start, end)
        }
        _ => (None, None),
    };

    body.rebuild_topology();
    Ok(SweptBody { body, side_faces, start_cap, end_cap })
}

/// Adds a quadrilateral side face, dropping corners that have collapsed onto
/// each other and skipping the face entirely if fewer than three are left.
fn quad_face(body: &mut Body, quad: [VertexId; 4]) -> Option<usize> {
    let mut corners: Vec<VertexId> = Vec::with_capacity(4);
    for &corner in &quad {
        let position = body.position(corner);
        if corners
            .last()
            .is_some_and(|&last| body.position(last).distance(position) <= TOLERANCE)
        {
            continue;
        }
        corners.push(corner);
    }
    while corners.len() > 1
        && body
            .position(corners[0])
            .distance(body.position(corners[corners.len() - 1]))
            <= TOLERANCE
    {
        corners.pop();
    }
    if corners.len() < 3 {
        return None;
    }

    let face = Face::planar(body.faces.len(), corners, &body.vertices);
    if face.normal == Vec3::ZERO {
        return None;
    }
    Some(body.push_face(face))
}

/// Closes one end of a sweep with a flat face.
fn cap(body: &mut Body, section: &[Vec<VertexId>], reversed: bool) -> Option<usize> {
    let mut outer = section.first()?.clone();
    if outer.len() < 3 {
        return None;
    }
    let mut holes: Vec<Vec<VertexId>> = section[1..].to_vec();
    if reversed {
        outer.reverse();
        for hole in &mut holes {
            hole.reverse();
        }
    }

    let face = Face::planar_with_holes(body.faces.len(), outer, holes, &body.vertices);
    if face.normal == Vec3::ZERO {
        return None;
    }
    Some(body.push_face(face))
}

/// Tags a set of side faces with an analytic surface, reorienting each face so
/// its outward direction agrees with the surface where it sits.
pub fn tag_surface(body: &mut Body, faces: &[usize], surface: Surface) {
    let vertices = body.vertices.clone();
    for &index in faces {
        let Some(face) = body.faces.get_mut(index) else {
            continue;
        };
        let middle = face.centroid(&vertices);
        let surface_normal = surface.normal_at(middle);
        face.surface = surface;
        face.flipped = surface_normal != Vec3::ZERO && surface_normal.dot(face.normal) < 0.0;
    }
}

/// Turns a body the right way out if its faces came out wound inwards.
///
/// Sweeps take their winding from the profile, so a sweep that runs against
/// the sketch plane's normal builds an inside-out solid. Rather than every
/// operation reasoning about which way its own sweep went, each one ends here
/// and the sign of the enclosed volume settles it.
pub fn ensure_outward(body: &mut Body) {
    if body.signed_volume() < 0.0 {
        body.reverse();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::math::Vec2;

    const TOL: f64 = 1e-9;

    /// A unit square at height `z`, wound counter-clockwise seen from +Z.
    fn square_at(z: f64) -> Section {
        vec![vec![
            Vec3::new(0.0, 0.0, z),
            Vec3::new(1.0, 0.0, z),
            Vec3::new(1.0, 1.0, z),
            Vec3::new(0.0, 1.0, z),
        ]]
    }

    #[test]
    fn skinning_two_squares_builds_a_closed_box() {
        let swept = skin(&[square_at(0.0), square_at(1.0)], Ends::Capped, "test").unwrap();
        assert_eq!(swept.body.faces.len(), 6);
        assert_eq!(swept.side_faces.len(), 4);
        assert!(swept.start_cap.is_some());
        assert!(swept.end_cap.is_some());
        assert!(swept.body.is_solid());
        assert!((swept.body.volume() - 1.0).abs() < TOL);
    }

    #[test]
    fn every_face_of_a_skinned_box_points_outwards() {
        let swept = skin(&[square_at(0.0), square_at(2.0)], Ends::Capped, "test").unwrap();
        let center = swept.body.bounding_box().center();
        for face in &swept.body.faces {
            let outward = face.centroid(&swept.body.vertices).sub(center);
            assert!(
                face.normal.dot(outward) > 0.0,
                "face {} points inwards",
                face.id
            );
        }
        assert!(swept.body.signed_volume() > 0.0);
    }

    #[test]
    fn an_open_sweep_has_no_caps() {
        let swept = skin(&[square_at(0.0), square_at(1.0)], Ends::Open, "test").unwrap();
        assert_eq!(swept.body.faces.len(), 4);
        assert!(swept.start_cap.is_none());
        assert!(!swept.body.is_solid());
        assert_eq!(swept.body.boundary_edges().len(), 8);
    }

    #[test]
    fn a_closed_sweep_joins_the_last_section_to_the_first() {
        // Three squares round a loop: each joins to the next, and the last back
        // to the first, giving three rings of sides and no caps.
        let sections = vec![square_at(0.0), square_at(1.0), square_at(2.0)];
        let swept = skin(&sections, Ends::Closed, "test").unwrap();
        assert_eq!(swept.side_faces.len(), 12);
        assert!(swept.start_cap.is_none());
    }

    #[test]
    fn holes_are_skinned_alongside_the_outer_loop() {
        let with_hole = |z: f64| -> Section {
            vec![
                vec![
                    Vec3::new(0.0, 0.0, z),
                    Vec3::new(4.0, 0.0, z),
                    Vec3::new(4.0, 4.0, z),
                    Vec3::new(0.0, 4.0, z),
                ],
                // Clockwise, as a hole must be.
                vec![
                    Vec3::new(1.0, 1.0, z),
                    Vec3::new(1.0, 3.0, z),
                    Vec3::new(3.0, 3.0, z),
                    Vec3::new(3.0, 1.0, z),
                ],
            ]
        };
        let swept = skin(&[with_hole(0.0), with_hole(2.0)], Ends::Capped, "test").unwrap();

        // Four outer sides, four hole sides, two caps.
        assert_eq!(swept.body.faces.len(), 10);
        assert!(swept.body.is_solid());
        // 4x4x2 minus the 2x2x2 bore.
        assert!((swept.body.volume() - (32.0 - 8.0)).abs() < TOL);
    }

    #[test]
    fn the_hole_walls_face_into_the_hole() {
        let with_hole = |z: f64| -> Section {
            vec![
                vec![
                    Vec3::new(0.0, 0.0, z),
                    Vec3::new(4.0, 0.0, z),
                    Vec3::new(4.0, 4.0, z),
                    Vec3::new(0.0, 4.0, z),
                ],
                vec![
                    Vec3::new(1.0, 1.0, z),
                    Vec3::new(1.0, 3.0, z),
                    Vec3::new(3.0, 3.0, z),
                    Vec3::new(3.0, 1.0, z),
                ],
            ]
        };
        let swept = skin(&[with_hole(0.0), with_hole(2.0)], Ends::Capped, "test").unwrap();
        let hole_center = Vec3::new(2.0, 2.0, 1.0);

        for side in swept.side_faces.iter().filter(|side| side.loop_index == 1) {
            let face = &swept.body.faces[side.face];
            let towards_axis = hole_center.sub(face.centroid(&swept.body.vertices));
            assert!(
                face.normal.dot(towards_axis) > 0.0,
                "hole wall faces away from the bore"
            );
        }
    }

    #[test]
    fn a_collapsed_strip_is_skipped_rather_than_built_degenerate() {
        // The far section is a single point: a cone, not a prism.
        let apex = vec![vec![Vec3::new(0.5, 0.5, 1.0); 4]];
        let swept = skin(&[square_at(0.0), apex], Ends::Capped, "test").unwrap();

        // Four triangular sides, one square base; the apex cap has no area.
        assert_eq!(swept.side_faces.len(), 4);
        for side in &swept.side_faces {
            assert_eq!(swept.body.faces[side.face].outer_loop().len(), 3);
        }
        // A pyramid on a unit base, one tall.
        assert!((swept.body.volume() - 1.0 / 3.0).abs() < 1e-6);
    }

    #[test]
    fn skinning_refuses_fewer_than_two_sections() {
        let error = skin(&[square_at(0.0)], Ends::Capped, "extrude").unwrap_err();
        assert_eq!(error.operation, "extrude");
        assert!(error.message.contains("at least two"));
        assert!(skin(&[], Ends::Capped, "extrude").is_err());
    }

    #[test]
    fn skinning_refuses_mismatched_sections() {
        let triangle = vec![vec![Vec3::ZERO, Vec3::X, Vec3::Y]];
        let error = skin(&[square_at(0.0), triangle], Ends::Capped, "loft").unwrap_err();
        assert!(error.message.contains("expected"));

        let extra_loop = vec![
            vec![Vec3::ZERO, Vec3::X, Vec3::Y],
            vec![Vec3::ZERO, Vec3::X, Vec3::Y],
        ];
        assert!(skin(
            &[vec![vec![Vec3::ZERO, Vec3::X, Vec3::Y]], extra_loop],
            Ends::Capped,
            "loft"
        )
        .is_err());
    }

    #[test]
    fn skinning_refuses_a_section_that_is_not_a_loop() {
        let stub = vec![vec![Vec3::ZERO, Vec3::X]];
        let error = skin(&[stub.clone(), stub], Ends::Capped, "sweep").unwrap_err();
        assert!(error.message.contains("closed loop"));
        assert!(skin(&[vec![], vec![]], Ends::Capped, "sweep").is_err());
    }

    #[test]
    fn tagging_a_surface_orients_each_face_against_it() {
        // A four-sided prism whose walls sit on a cylinder about the z axis.
        let ring = |z: f64| -> Section {
            vec![(0..4)
                .map(|index| {
                    let angle = index as f64 / 4.0 * core::f64::consts::TAU;
                    Vec3::new(2.0 * angle.cos(), 2.0 * angle.sin(), z)
                })
                .collect()]
        };
        let mut swept = skin(&[ring(0.0), ring(3.0)], Ends::Capped, "test").unwrap();
        let sides: Vec<usize> = swept.side_faces.iter().map(|side| side.face).collect();
        tag_surface(
            &mut swept.body,
            &sides,
            Surface::Cylinder { origin: Vec3::ZERO, axis: Vec3::Z, radius: 2.0 },
        );

        for &index in &sides {
            let face = &swept.body.faces[index];
            assert_eq!(face.surface.name(), "cylinder");
            // Outward-facing walls agree with the cylinder's own normal.
            assert!(!face.flipped);
            let point = face.centroid(&swept.body.vertices);
            let expected = Vec3::new(point.x, point.y, 0.0).normalize();
            assert!(face.normal_at(point).approx_eq(expected, 1e-6));
        }
        // Tagging a face that does not exist is ignored.
        tag_surface(&mut swept.body, &[999], Surface::Nurbs);
    }

    #[test]
    fn tagging_marks_an_inward_facing_wall_as_flipped() {
        let bore = |z: f64| -> Section {
            vec![
                vec![
                    Vec3::new(-5.0, -5.0, z),
                    Vec3::new(5.0, -5.0, z),
                    Vec3::new(5.0, 5.0, z),
                    Vec3::new(-5.0, 5.0, z),
                ],
                // A square bore, wound clockwise.
                (0..8)
                    .map(|index| {
                        let angle = -(index as f64) / 8.0 * core::f64::consts::TAU;
                        Vec3::new(2.0 * angle.cos(), 2.0 * angle.sin(), z)
                    })
                    .collect(),
            ]
        };
        let mut swept = skin(&[bore(0.0), bore(1.0)], Ends::Capped, "test").unwrap();
        let walls: Vec<usize> = swept
            .side_faces
            .iter()
            .filter(|side| side.loop_index == 1)
            .map(|side| side.face)
            .collect();
        tag_surface(
            &mut swept.body,
            &walls,
            Surface::Cylinder { origin: Vec3::ZERO, axis: Vec3::Z, radius: 2.0 },
        );

        for &index in &walls {
            let face = &swept.body.faces[index];
            assert!(face.flipped, "a bore wall runs against its cylinder");
            let point = face.centroid(&swept.body.vertices);
            let inward = -Vec3::new(point.x, point.y, 0.0).normalize();
            assert!(face.normal_at(point).approx_eq(inward, 1e-6));
        }
    }

    #[test]
    fn sections_of_two_dimensional_points_lift_correctly() {
        // A sanity check that the Vec2 import used by callers lines up.
        let point = Vec2::new(1.0, 2.0);
        assert_eq!(Vec3::from(point), Vec3::new(1.0, 2.0, 0.0));
    }
}
