//! Filleting — rounding an edge into an arc that blends its two faces.

use serde::{Deserialize, Serialize};

use crate::bail;
use crate::brep::{Body, Surface};
use crate::error::KernelResult;
use crate::math::{Quat, Vec3, EPSILON};

use super::blend::{self, BlendRun, EdgeBlend};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilletParams {
    /// Radius of the rolling ball, in millimetres.
    pub radius: f64,
    /// Edges to round, by the ids [`Body::topology_ids`] reports. Empty rounds
    /// every edge of the body.
    #[serde(default)]
    pub edge_ids: Vec<String>,
    /// Facets across the arc. Zero picks a count from the angle turned.
    #[serde(default)]
    pub segments: usize,
}

impl FilletParams {
    pub fn new(radius: f64) -> Self {
        Self { radius, edge_ids: Vec::new(), segments: 0 }
    }

    pub fn on_edges(mut self, ids: Vec<String>) -> Self {
        self.edge_ids = ids;
        self
    }

    pub fn with_segments(mut self, segments: usize) -> Self {
        self.segments = segments;
        self
    }
}

/// The finest arc a fillet is faceted to without being asked: an eighth of a
/// turn per facet, so a right-angled edge comes back as four.
const RADIANS_PER_SEGMENT: f64 = core::f64::consts::FRAC_PI_4 / 2.0;

/// Rounds edges with a constant radius.
///
/// The blend is the surface a ball of that radius sweeps out as it rolls along
/// the inside of the edge touching both faces. Its centre runs parallel to the
/// edge, so the blend is a piece of a cylinder, and where it touches each face
/// is where that face is cut back to.
pub fn fillet(body: &Body, params: &FilletParams) -> KernelResult<Body> {
    const OPERATION: &str = "fillet";

    if !params.radius.is_finite() || params.radius <= 0.0 {
        bail!(OPERATION, "radius {} is not a positive length", params.radius);
    }
    if body.is_empty() {
        bail!(OPERATION, "the body is empty");
    }

    let edges = blend::resolve_edges(body, &params.edge_ids, OPERATION)?;
    let mut blends = Vec::with_capacity(edges.len());
    for edge in edges {
        let survey = blend::survey(body, edge, OPERATION)?;
        let run = arc_run(&survey, params, OPERATION)?;
        blends.push((survey, run));
    }
    blend::build(body, &blends, OPERATION)
}

/// The arc replacing one edge, as the points at each of its two ends.
fn arc_run(blend: &EdgeBlend, params: &FilletParams, operation: &str) -> KernelResult<BlendRun> {
    let radius = params.radius;
    let half = blend.dihedral / 2.0;
    let (sine, cosine) = half.sin_cos();
    if sine.abs() < 1e-9 {
        bail!(
            operation,
            "the faces at edge {} are flat against each other, so there is no edge to round",
            blend.edge
        );
    }

    // Where the rolling ball touches each face, measured from the edge.
    let reach = radius * (cosine / sine).abs();
    blend.check_room([reach, reach], operation, "the fillet")?;

    // The ball's centre: the one point that is `radius` from both faces.
    let bisector = blend.into_face[0].add(blend.into_face[1]);
    if bisector.length() < EPSILON {
        bail!(operation, "the faces at edge {} double back on each other", blend.edge);
    }
    let bisector = bisector.normalize();
    let lift = radius / sine.abs();

    let centre_at_start = blend.from.add(bisector.scale(lift));
    let centre_at_end = blend.to.add(bisector.scale(lift));

    // The arc runs from where the ball touches the first face to where it
    // touches the second, always the short way round.
    let first = blend.planes[0].project(centre_at_start).sub(centre_at_start);
    let second = blend.planes[1].project(centre_at_start).sub(centre_at_start);
    let turn = signed_angle(first, second, blend.along);

    let segments = if params.segments > 0 {
        params.segments
    } else {
        (turn.abs() / RADIANS_PER_SEGMENT).ceil().max(1.0) as usize
    };

    let mut at_start = Vec::with_capacity(segments + 1);
    let mut at_end = Vec::with_capacity(segments + 1);
    for step in 0..=segments {
        let spin = Quat::from_axis_angle(blend.along, turn * step as f64 / segments as f64);
        let spoke = spin.rotate(first);
        at_start.push(centre_at_start.add(spoke));
        at_end.push(centre_at_end.add(spoke));
    }

    Ok(BlendRun {
        at_start,
        at_end,
        surface: Surface::Cylinder {
            origin: centre_at_start,
            axis: blend.along,
            radius,
        },
    })
}

/// The angle from `from` to `to` about `axis`, signed by which way it turns.
fn signed_angle(from: Vec3, to: Vec3, axis: Vec3) -> f64 {
    let across = from.cross(to).dot(axis);
    let along = from.dot(to);
    across.atan2(along)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::math::Vec2;
    use crate::ops::{extrude, ExtrudeParams};
    use crate::Profile;

    const TOL: f64 = 1e-6;

    fn block(width: f64, depth: f64, height: f64) -> Body {
        extrude(&ExtrudeParams::new(
            Profile::rectangle(Vec2::ZERO, width, depth),
            height,
        ))
        .unwrap()
    }

    /// The id of the one edge running between the two faces with these normals.
    fn edge_between(body: &Body, first: Vec3, second: Vec3) -> String {
        let ids = body.topology_ids().edge_ids;
        for edge in 0..body.edges.len() {
            let faces = body.faces_of_edge(edge);
            if faces.len() != 2 {
                continue;
            }
            let normals = [body.faces[faces[0]].normal, body.faces[faces[1]].normal];
            let matches = |wanted: Vec3| normals.iter().any(|n| n.approx_eq(wanted, 1e-9));
            if matches(first) && matches(second) {
                return ids[edge].clone();
            }
        }
        panic!("no edge between those faces");
    }

    #[test]
    fn rounding_one_edge_of_a_block_takes_off_the_corner() {
        // A 10 x 10 x 10 block, rounding the vertical edge at x = 10, y = 10.
        let body = block(10.0, 10.0, 10.0);
        let edge = edge_between(&body, Vec3::X, Vec3::Y);
        let rounded = fillet(&body, &FilletParams::new(2.0).on_edges(vec![edge])).unwrap();

        assert!(rounded.is_solid());
        assert!(rounded.is_valid());

        // The corner loses a square of side r and gains a quarter disc. Faceted,
        // the quarter disc is a fan of four triangles rather than a true arc, so
        // the volume comes up a little short of the exact answer.
        let square = 2.0 * 2.0;
        let quarter = core::f64::consts::PI * 4.0 / 4.0;
        let exact = 1000.0 - (square - quarter) * 10.0;
        assert!(rounded.volume() < 1000.0);
        assert!((rounded.volume() - exact).abs() < 3.0, "{}", rounded.volume());

        // The rounded corner no longer reaches the original one.
        assert!(!rounded
            .vertices
            .iter()
            .any(|v| v.position.approx_eq(Vec3::new(10.0, 10.0, 0.0), TOL)));
        // Four facets across a quarter turn, plus the two flats it blends.
        assert_eq!(rounded.faces.len(), 6 + 4);
    }

    #[test]
    fn the_blend_sits_on_a_cylinder_of_the_right_radius() {
        let body = block(10.0, 10.0, 10.0);
        let edge = edge_between(&body, Vec3::X, Vec3::Y);
        let rounded = fillet(&body, &FilletParams::new(3.0).on_edges(vec![edge])).unwrap();

        let axis = Vec3::new(7.0, 7.0, 0.0);
        let blend: Vec<_> = rounded
            .faces
            .iter()
            .filter(|face| face.surface.name() == "cylinder")
            .collect();
        assert_eq!(blend.len(), 4);

        for face in blend {
            for id in face.vertex_ids() {
                let point = rounded.position(id);
                let radial = Vec3::new(point.x - axis.x, point.y - axis.y, 0.0);
                assert!((radial.length() - 3.0).abs() < TOL, "{}", radial.length());
            }
            // And it faces out of the block, not into it.
            let middle = face.centroid(&rounded.vertices);
            let outward = Vec3::new(middle.x - axis.x, middle.y - axis.y, 0.0).normalize();
            assert!(face.normal.dot(outward) > 0.9);
        }
    }

    #[test]
    fn asking_for_more_facets_gives_a_smoother_arc() {
        let body = block(10.0, 10.0, 10.0);
        let edge = edge_between(&body, Vec3::X, Vec3::Y);
        let coarse = fillet(
            &body,
            &FilletParams::new(2.0).on_edges(vec![edge.clone()]).with_segments(2),
        )
        .unwrap();
        let fine = fillet(
            &body,
            &FilletParams::new(2.0).on_edges(vec![edge]).with_segments(16),
        )
        .unwrap();

        assert_eq!(coarse.faces.len(), 6 + 2);
        assert_eq!(fine.faces.len(), 6 + 16);
        // A finer arc cuts less off, converging on the true quarter disc.
        assert!(fine.volume() > coarse.volume());
        let exact = 1000.0 - (4.0 - core::f64::consts::PI) * 10.0;
        assert!((fine.volume() - exact).abs() < 0.1, "{}", fine.volume());
    }

    #[test]
    fn an_edge_that_is_not_a_right_angle_rounds_too() {
        // A triangular prism: the edge at the apex closes to 60 degrees, so the
        // fillet has to cut further back into each face than its radius.
        let triangle = Profile::from_points(vec![
            Vec2::new(0.0, 0.0),
            Vec2::new(10.0, 0.0),
            Vec2::new(5.0, 10.0 * (3.0f64).sqrt() / 2.0),
        ]);
        let body = extrude(&ExtrudeParams::new(triangle, 4.0)).unwrap();
        let apex = Vec3::new(5.0, 10.0 * (3.0f64).sqrt() / 2.0, 0.0);

        let edge = body
            .topology_ids()
            .edge_ids
            .into_iter()
            .zip(0..body.edges.len())
            .find(|(_, edge)| {
                let stored = &body.edges[*edge];
                body.position(stored.start()).sub(apex).xy().length() < 1e-9
                    && body.position(stored.end()).sub(apex).xy().length() < 1e-9
            })
            .map(|(id, _)| id)
            .expect("the apex edge");

        let rounded = fillet(&body, &FilletParams::new(1.0).on_edges(vec![edge])).unwrap();
        assert!(rounded.is_solid());
        assert!(rounded.is_valid());
        assert!(rounded.volume() < body.volume());

        // A 60 degree corner: the ball's centre sits 1/sin(30) = 2 back from the
        // apex along the bisector, which here points straight down in y.
        let centre = Vec3::new(apex.x, apex.y - 2.0, 0.0);
        for face in rounded.faces.iter().filter(|f| f.surface.name() == "cylinder") {
            for id in face.vertex_ids() {
                let point = rounded.position(id);
                let radial = Vec3::new(point.x - centre.x, point.y - centre.y, 0.0);
                assert!((radial.length() - 1.0).abs() < TOL, "{}", radial.length());
            }
        }
    }

    #[test]
    fn a_radius_too_large_for_the_faces_is_refused() {
        let body = block(10.0, 10.0, 10.0);
        let edge = edge_between(&body, Vec3::X, Vec3::Y);

        // Ten wide faces leave room for a radius under ten, and no more.
        let error = fillet(&body, &FilletParams::new(12.0).on_edges(vec![edge.clone()])).unwrap_err();
        assert_eq!(error.operation, "fillet");
        assert!(error.message.contains("cannot be blended that far back"), "{}", error.message);

        assert!(fillet(&body, &FilletParams::new(9.5).on_edges(vec![edge])).is_ok());
    }

    #[test]
    fn a_radius_that_is_not_a_length_is_refused() {
        let body = block(4.0, 4.0, 4.0);
        for radius in [0.0, -1.0, f64::NAN, f64::INFINITY] {
            let error = fillet(&body, &FilletParams::new(radius)).unwrap_err();
            assert!(error.message.contains("positive length"), "{radius}");
        }
        assert!(fillet(&Body::empty(), &FilletParams::new(1.0))
            .unwrap_err()
            .message
            .contains("empty"));
    }

    #[test]
    fn rounding_two_edges_that_meet_is_refused_rather_than_left_open() {
        // Every edge of a block touches four others, so the whole-body default
        // runs straight into the corner it cannot patch.
        let body = block(10.0, 10.0, 10.0);
        let error = fillet(&body, &FilletParams::new(1.0)).unwrap_err();
        assert!(error.message.contains("corner patch"), "{}", error.message);
    }

    #[test]
    fn two_edges_that_do_not_touch_round_together() {
        // The two vertical edges at opposite corners of the block.
        let body = block(10.0, 10.0, 10.0);
        let first = edge_between(&body, Vec3::X, Vec3::Y);
        let second = edge_between(&body, -Vec3::X, -Vec3::Y);
        let rounded = fillet(
            &body,
            &FilletParams::new(2.0).on_edges(vec![first, second]).with_segments(4),
        )
        .unwrap();

        assert!(rounded.is_solid());
        assert_eq!(rounded.faces.len(), 6 + 8);
        let exact = 1000.0 - 2.0 * (4.0 - core::f64::consts::PI) * 10.0;
        assert!((rounded.volume() - exact).abs() < 3.0, "{}", rounded.volume());
    }

    #[test]
    fn an_unknown_edge_id_is_reported_rather_than_ignored() {
        let body = block(4.0, 4.0, 4.0);
        let error = fillet(
            &body,
            &FilletParams::new(1.0).on_edges(vec!["e0000000000000ff".into()]),
        )
        .unwrap_err();
        assert!(error.message.contains("no edge"), "{}", error.message);
    }

    #[test]
    fn an_edge_with_no_face_to_run_into_is_refused() {
        // Draft tapers the sides, so the corner edges lean and the flat caps they
        // end on no longer meet them squarely — there is nothing for the blend to
        // run into. (A plain rotation would not do: it turns the whole block, so
        // every face still meets its edges exactly as before.)
        let tapered =
            extrude(&ExtrudeParams::new(Profile::rectangle(Vec2::ZERO, 10.0, 10.0), 10.0)
                .with_draft(15.0))
            .unwrap();
        // Two adjacent tapered sides, so the edge between them is a leaning one.
        let edge = edge_between(&tapered, tapered.faces[0].normal, tapered.faces[1].normal);
        let error = fillet(&tapered, &FilletParams::new(0.5).on_edges(vec![edge])).unwrap_err();
        assert!(
            error.message.contains("squarely") || error.message.contains("ambiguous"),
            "{}",
            error.message
        );
    }

    #[test]
    fn params_round_trip_through_json() {
        let params = FilletParams::new(2.5)
            .on_edges(vec!["e1234".into()])
            .with_segments(6);
        let json = serde_json::to_string(&params).unwrap();
        assert!(json.contains("edgeIds"));
        assert_eq!(serde_json::from_str::<FilletParams>(&json).unwrap(), params);

        let minimal: FilletParams = serde_json::from_str(r#"{"radius":1.5}"#).unwrap();
        assert!(minimal.edge_ids.is_empty());
        assert_eq!(minimal.segments, 0);
    }
}
