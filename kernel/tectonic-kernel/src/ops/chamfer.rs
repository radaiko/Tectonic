//! Chamfering — cutting an edge back to a flat strip across its two faces.

use serde::{Deserialize, Serialize};

use crate::bail;
use crate::brep::{Body, Surface};
use crate::error::KernelResult;
use crate::math::EPSILON;

use super::blend::{self, BlendRun, EdgeBlend};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChamferParams {
    /// How far back the cut reaches into the first of the edge's two faces, in
    /// millimetres.
    pub distance: f64,
    /// How far it reaches into the second. Unset takes the same distance again,
    /// which is the even chamfer people mean by default.
    ///
    /// Which face is "first" is the order the body reports them in, so an uneven
    /// chamfer is worth checking against the result rather than assumed.
    #[serde(default)]
    pub second_distance: Option<f64>,
    /// Edges to cut, by the ids [`Body::topology_ids`] reports. Empty cuts every
    /// edge of the body.
    #[serde(default)]
    pub edge_ids: Vec<String>,
}

impl ChamferParams {
    pub fn new(distance: f64) -> Self {
        Self { distance, second_distance: None, edge_ids: Vec::new() }
    }

    pub fn on_edges(mut self, ids: Vec<String>) -> Self {
        self.edge_ids = ids;
        self
    }

    /// Makes the cut uneven, reaching `distance` into the second face.
    pub fn with_second_distance(mut self, distance: f64) -> Self {
        self.second_distance = Some(distance);
        self
    }

    /// The setback into each face, in the body's own face order.
    fn setbacks(&self) -> [f64; 2] {
        [self.distance, self.second_distance.unwrap_or(self.distance)]
    }
}

/// Cuts edges back to a flat strip.
///
/// Where a fillet rolls a ball along the edge and leaves the arc it sweeps, a
/// chamfer simply slices the corner off: both faces are pulled back by a set
/// distance and one flat strip is laid between where they now end.
pub fn chamfer(body: &Body, params: &ChamferParams) -> KernelResult<Body> {
    const OPERATION: &str = "chamfer";

    for distance in params.setbacks() {
        if !distance.is_finite() || distance <= 0.0 {
            bail!(OPERATION, "distance {} is not a positive length", distance);
        }
    }
    if body.is_empty() {
        bail!(OPERATION, "the body is empty");
    }

    let edges = blend::resolve_edges(body, &params.edge_ids, OPERATION)?;
    let mut blends = Vec::with_capacity(edges.len());
    for edge in edges {
        let survey = blend::survey(body, edge, OPERATION)?;
        let run = strip_run(&survey, params, OPERATION)?;
        blends.push((survey, run));
    }
    blend::build(body, &blends, OPERATION)
}

/// The strip replacing one edge, as its two ends.
fn strip_run(blend: &EdgeBlend, params: &ChamferParams, operation: &str) -> KernelResult<BlendRun> {
    let setbacks = params.setbacks();

    // Faces flat against each other leave no corner to take off.
    if (blend.dihedral / 2.0).sin().abs() < 1e-9 {
        bail!(
            operation,
            "the faces at edge {} are flat against each other, so there is no edge to chamfer",
            blend.edge
        );
    }
    blend.check_room(setbacks, operation, "the chamfer")?;

    // Both faces pull back along their own direction out of the edge.
    let step = |from: crate::math::Vec3, side: usize| {
        from.add(blend.into_face[side].scale(setbacks[side]))
    };
    let at_start = vec![step(blend.from, 0), step(blend.from, 1)];
    let at_end = vec![step(blend.to, 0), step(blend.to, 1)];

    // The strip is flat: one plane through the cut, spanned by the edge's own
    // direction and the line across between the two setbacks.
    let across = at_start[1].sub(at_start[0]);
    let normal = across.cross(blend.along);
    if normal.length() < EPSILON {
        bail!(operation, "the chamfer at edge {} collapses to a line", blend.edge);
    }
    let mut normal = normal.normalize();
    // Point it out of the material, the way the face it tags will be wound.
    let outward = if blend.convex() { -blend.bisector() } else { blend.bisector() };
    if normal.dot(outward) < 0.0 {
        normal = -normal;
    }

    let surface = Surface::plane(at_start[0], normal);
    Ok(BlendRun { at_start, at_end, surface })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::math::{Vec2, Vec3};
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
    fn cutting_one_edge_of_a_block_takes_the_corner_off_flat() {
        // A 10 x 10 x 10 block, cutting the vertical edge at x = 10, y = 10.
        let body = block(10.0, 10.0, 10.0);
        let edge = edge_between(&body, Vec3::X, Vec3::Y);
        let cut = chamfer(&body, &ChamferParams::new(2.0).on_edges(vec![edge])).unwrap();

        assert!(cut.is_solid());
        assert!(cut.is_valid());

        // The corner loses a right triangle with legs of 2, the height of the
        // block. Unlike a fillet this is exact — the strip really is flat.
        let exact = 1000.0 - (2.0 * 2.0 / 2.0) * 10.0;
        assert!((cut.volume() - exact).abs() < TOL, "{}", cut.volume());

        // The corner it replaced is gone, and both setbacks landed.
        assert!(!cut
            .vertices
            .iter()
            .any(|v| v.position.approx_eq(Vec3::new(10.0, 10.0, 0.0), TOL)));
        for corner in [Vec3::new(10.0, 8.0, 0.0), Vec3::new(8.0, 10.0, 0.0)] {
            assert!(
                cut.vertices.iter().any(|v| v.position.approx_eq(corner, TOL)),
                "{corner:?}"
            );
        }
        // One flat strip where the edge was, and nothing else added.
        assert_eq!(cut.faces.len(), 6 + 1);
    }

    #[test]
    fn the_strip_is_flat_and_faces_out() {
        let body = block(10.0, 10.0, 10.0);
        let edge = edge_between(&body, Vec3::X, Vec3::Y);
        let cut = chamfer(&body, &ChamferParams::new(3.0).on_edges(vec![edge])).unwrap();

        // The one face that is neither of the block's six axis-aligned sides.
        let strip: Vec<_> = cut
            .faces
            .iter()
            .filter(|face| face.normal.z.abs() < TOL && face.normal.x > TOL && face.normal.y > TOL)
            .collect();
        assert_eq!(strip.len(), 1);
        let strip = strip[0];

        assert_eq!(strip.surface.name(), "plane");
        // An even chamfer on a right angle bisects it, so the strip leans at 45.
        let expected = Vec3::new(1.0, 1.0, 0.0).normalize();
        assert!(strip.normal.approx_eq(expected, TOL), "{:?}", strip.normal);
        // A quad: the two setbacks at each end of the edge.
        assert_eq!(strip.outer_loop().len(), 4);
    }

    #[test]
    fn an_uneven_chamfer_cuts_further_into_one_face() {
        let body = block(10.0, 10.0, 10.0);
        let edge = edge_between(&body, Vec3::X, Vec3::Y);
        let cut = chamfer(
            &body,
            &ChamferParams::new(1.0)
                .with_second_distance(4.0)
                .on_edges(vec![edge]),
        )
        .unwrap();

        assert!(cut.is_solid());
        assert!(cut.is_valid());
        // A right triangle with legs 1 and 4, however the two are assigned.
        let exact = 1000.0 - (1.0 * 4.0 / 2.0) * 10.0;
        assert!((cut.volume() - exact).abs() < TOL, "{}", cut.volume());
        assert_eq!(cut.faces.len(), 6 + 1);
    }

    #[test]
    fn a_distance_too_large_for_the_faces_is_refused() {
        let body = block(10.0, 10.0, 10.0);
        let edge = edge_between(&body, Vec3::X, Vec3::Y);

        let error =
            chamfer(&body, &ChamferParams::new(12.0).on_edges(vec![edge.clone()])).unwrap_err();
        assert_eq!(error.operation, "chamfer");
        assert!(
            error.message.contains("cannot be blended that far back"),
            "{}",
            error.message
        );

        // Ten wide faces leave room for anything under ten.
        assert!(chamfer(&body, &ChamferParams::new(9.5).on_edges(vec![edge])).is_ok());
    }

    #[test]
    fn a_distance_that_is_not_a_length_is_refused() {
        let body = block(4.0, 4.0, 4.0);
        for distance in [0.0, -1.0, f64::NAN, f64::INFINITY] {
            let error = chamfer(&body, &ChamferParams::new(distance)).unwrap_err();
            assert!(error.message.contains("positive length"), "{distance}");
        }
        // The second distance is held to the same standard as the first.
        let error = chamfer(&body, &ChamferParams::new(1.0).with_second_distance(-2.0)).unwrap_err();
        assert!(error.message.contains("positive length"), "{}", error.message);

        assert!(chamfer(&Body::empty(), &ChamferParams::new(1.0))
            .unwrap_err()
            .message
            .contains("empty"));
    }

    #[test]
    fn cutting_two_edges_that_meet_is_refused_rather_than_left_open() {
        // Every edge of a block touches four others, so the whole-body default
        // runs straight into the corner it cannot patch.
        let body = block(10.0, 10.0, 10.0);
        let error = chamfer(&body, &ChamferParams::new(1.0)).unwrap_err();
        assert!(error.message.contains("corner patch"), "{}", error.message);
    }

    #[test]
    fn two_edges_that_do_not_touch_cut_together() {
        let body = block(10.0, 10.0, 10.0);
        let first = edge_between(&body, Vec3::X, Vec3::Y);
        let second = edge_between(&body, -Vec3::X, -Vec3::Y);
        let cut = chamfer(
            &body,
            &ChamferParams::new(2.0).on_edges(vec![first, second]),
        )
        .unwrap();

        assert!(cut.is_solid());
        assert!(cut.is_valid());
        assert_eq!(cut.faces.len(), 6 + 2);
        let exact = 1000.0 - 2.0 * (2.0 * 2.0 / 2.0) * 10.0;
        assert!((cut.volume() - exact).abs() < TOL, "{}", cut.volume());
    }

    #[test]
    fn an_unknown_edge_id_is_reported_rather_than_ignored() {
        let body = block(4.0, 4.0, 4.0);
        let error = chamfer(
            &body,
            &ChamferParams::new(1.0).on_edges(vec!["e0000000000000ff".into()]),
        )
        .unwrap_err();
        assert!(error.message.contains("no edge"), "{}", error.message);
    }

    #[test]
    fn an_edge_with_no_face_to_run_into_is_refused() {
        // Draft tapers the sides, so the corner edges lean and the flat caps
        // they end on no longer meet them squarely.
        let tapered =
            extrude(&ExtrudeParams::new(Profile::rectangle(Vec2::ZERO, 10.0, 10.0), 10.0)
                .with_draft(15.0))
            .unwrap();
        let edge = edge_between(&tapered, tapered.faces[0].normal, tapered.faces[1].normal);
        let error = chamfer(&tapered, &ChamferParams::new(0.5).on_edges(vec![edge])).unwrap_err();
        assert!(
            error.message.contains("squarely") || error.message.contains("ambiguous"),
            "{}",
            error.message
        );
    }

    #[test]
    fn params_round_trip_through_json() {
        let params = ChamferParams::new(2.5)
            .with_second_distance(1.5)
            .on_edges(vec!["e1234".into()]);
        let json = serde_json::to_string(&params).unwrap();
        assert!(json.contains("secondDistance"));
        assert!(json.contains("edgeIds"));
        assert_eq!(serde_json::from_str::<ChamferParams>(&json).unwrap(), params);

        let minimal: ChamferParams = serde_json::from_str(r#"{"distance":1.5}"#).unwrap();
        assert!(minimal.edge_ids.is_empty());
        assert_eq!(minimal.second_distance, None);
        // An unset second distance is the first one again.
        assert_eq!(minimal.setbacks(), [1.5, 1.5]);
    }
}
