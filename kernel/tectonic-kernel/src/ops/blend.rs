//! Shared machinery for the operations that replace an edge with a new face.
//!
//! Fillet and chamfer differ only in what they put where the edge used to be —
//! an arc of a cylinder for one, a single flat strip for the other. Everything
//! else is the same work: measuring how the two faces meet, checking there is
//! room to cut that far back, pulling both faces off the edge and threading the
//! new points into the face that closes the end.

use std::collections::HashMap;

use crate::brep::{Body, EdgeId, Face, FaceId, Surface, Vertex, VertexId};
use crate::error::KernelResult;
use crate::math::{Plane, Vec3, EPSILON, TOLERANCE};
use crate::{bail, kernel_error};

use super::builder;

/// How an edge sits between the two faces that meet along it.
#[derive(Debug, Clone)]
pub(super) struct EdgeBlend {
    pub edge: EdgeId,
    pub start: VertexId,
    pub end: VertexId,
    pub from: Vec3,
    pub to: Vec3,
    /// Unit direction from `from` to `to`.
    pub along: Vec3,
    pub faces: [FaceId; 2],
    pub planes: [Plane; 2],
    /// Unit direction leaving the edge into each face, square to `along`.
    pub into_face: [Vec3; 2],
    /// How far each face reaches from the edge in that direction.
    pub room: [f64; 2],
    /// The angle between the faces measured through the material. Greater than
    /// a half turn means the edge is concave.
    pub dihedral: f64,
}

impl EdgeBlend {
    pub fn convex(&self) -> bool {
        self.dihedral < core::f64::consts::PI
    }

    pub fn midpoint(&self) -> Vec3 {
        self.from.lerp(self.to, 0.5)
    }

    /// The unit direction bisecting the two faces, square to the edge. On a
    /// convex edge it leaves the edge into the material; on a concave one it
    /// leaves into the void. Zero when the faces double back on each other.
    pub fn bisector(&self) -> Vec3 {
        let sum = self.into_face[0].add(self.into_face[1]);
        if sum.length() < EPSILON {
            Vec3::ZERO
        } else {
            sum.normalize()
        }
    }

    /// Refuses a cut that would run off the end of either face.
    pub fn check_room(&self, reach: [f64; 2], operation: &str, what: &str) -> KernelResult<()> {
        for side in 0..2 {
            if reach[side] >= self.room[side] - TOLERANCE {
                bail!(
                    operation,
                    "{what} reaches {:.6} into a face only {:.6} wide — the edge cannot be \
                     blended that far back",
                    reach[side],
                    self.room[side]
                );
            }
        }
        Ok(())
    }
}

/// What stands in for one blended edge: the run of points replacing each of its
/// two ends, listed from the first face's side to the second's.
#[derive(Debug, Clone)]
pub(super) struct BlendRun {
    pub at_start: Vec<Vec3>,
    pub at_end: Vec<Vec3>,
    /// The surface the new faces lie on.
    pub surface: Surface,
}

/// Measures how an edge meets its faces.
pub(super) fn survey(body: &Body, edge: EdgeId, operation: &str) -> KernelResult<EdgeBlend> {
    let Some(stored) = body.edges.get(edge) else {
        bail!(operation, "there is no edge {edge} on this body");
    };
    let faces = body.faces_of_edge(edge);
    if faces.len() != 2 {
        bail!(
            operation,
            "edge {edge} has {} faces on it, and only an edge between two can be blended",
            faces.len()
        );
    }
    let faces = [faces[0], faces[1]];
    for face in faces {
        if !body.faces[face].surface.is_planar() {
            bail!(
                operation,
                "face {face} at edge {edge} is a {} — only planar faces can be blended",
                body.faces[face].surface.name()
            );
        }
    }

    let (start, end) = (stored.start(), stored.end());
    let (from, to) = (body.position(start), body.position(end));
    let along = to.sub(from);
    if along.length() <= TOLERANCE {
        bail!(operation, "edge {edge} is too short to blend");
    }
    let along = along.normalize();
    let middle = from.lerp(to, 0.5);

    let mut planes = [Plane::new(Vec3::Z, 0.0); 2];
    let mut into_face = [Vec3::ZERO; 2];
    let mut room = [0.0f64; 2];
    for side in 0..2 {
        let face = &body.faces[faces[side]];
        let plane = face.plane(&body.vertices);
        // Square to both the edge and the face's normal, so it lies in the face
        // and leaves the edge at a right angle.
        let mut direction = plane.normal.cross(along);
        if direction.length() < EPSILON {
            bail!(operation, "face {} lies along edge {edge}", faces[side]);
        }
        direction = direction.normalize();
        if direction.dot(face.centroid(&body.vertices).sub(middle)) < 0.0 {
            direction = -direction;
        }
        planes[side] = plane;
        into_face[side] = direction;
        room[side] = face
            .vertex_ids()
            .map(|id| body.position(id).sub(middle).dot(direction))
            .fold(0.0f64, f64::max);
    }

    let dihedral = body
        .dihedral_angle(edge)
        .ok_or_else(|| kernel_error!(operation, "edge {edge} has no measurable angle"))?;

    Ok(EdgeBlend {
        edge,
        start,
        end,
        from,
        to,
        along,
        faces,
        planes,
        into_face,
        room,
        dihedral,
    })
}

/// The edges a selection names, or every edge of the body when it names none.
pub(super) fn resolve_edges(
    body: &Body,
    selection: &[String],
    operation: &str,
) -> KernelResult<Vec<EdgeId>> {
    if selection.is_empty() {
        return Ok((0..body.edges.len()).collect());
    }
    let known = body.topology_ids().edge_ids;
    selection
        .iter()
        .map(|id| {
            known
                .iter()
                .position(|candidate| candidate == id)
                .ok_or_else(|| kernel_error!(operation, "this body has no edge {id}"))
        })
        .collect()
}

/// Rebuilds the body with each blended edge replaced by the faces its run
/// describes.
///
/// Two blends that meet at a vertex would have to be joined by a corner patch
/// there — a piece of a sphere, for a fillet — and that is not built here, so
/// the case is refused rather than left with a hole in it.
pub(super) fn build(
    body: &Body,
    blends: &[(EdgeBlend, BlendRun)],
    operation: &str,
) -> KernelResult<Body> {
    if blends.is_empty() {
        bail!(operation, "no edges were selected");
    }

    let mut claimed: HashMap<VertexId, EdgeId> = HashMap::new();
    for (blend, _) in blends {
        for corner in [blend.start, blend.end] {
            if let Some(other) = claimed.insert(corner, blend.edge) {
                bail!(
                    operation,
                    "edges {other} and {} meet at a corner, and blending both would need a \
                     corner patch between them — blend edges that do not touch",
                    blend.edge
                );
            }
        }
    }

    // (face, vertex) -> the run of points standing in for that corner.
    let mut corners: HashMap<(FaceId, VertexId), Vec<Vec3>> = HashMap::new();
    let mut extra: Vec<(Vec<Vec3>, Surface)> = Vec::new();

    for (blend, run) in blends {
        if run.at_start.len() != run.at_end.len() || run.at_start.len() < 2 {
            bail!(operation, "the blend for edge {} is malformed", blend.edge);
        }
        let last = run.at_start.len() - 1;

        // The two faces the edge separates each pull back to their own tangent.
        corners.insert((blend.faces[0], blend.start), vec![run.at_start[0]]);
        corners.insert((blend.faces[0], blend.end), vec![run.at_end[0]]);
        corners.insert((blend.faces[1], blend.start), vec![run.at_start[last]]);
        corners.insert((blend.faces[1], blend.end), vec![run.at_end[last]]);

        // The face closing each end takes the whole run in place of its corner.
        for (corner, points) in [(blend.start, &run.at_start), (blend.end, &run.at_end)] {
            let closing = closing_face(body, blend, corner, operation)?;
            let forward = runs_from_first_face(body, blend, closing, corner);
            let mut spliced = points.clone();
            if !forward {
                spliced.reverse();
            }
            corners.insert((closing, corner), spliced);
        }

        // And the blend itself: one strip per step of the run.
        for step in 0..last {
            let quad = vec![
                run.at_start[step],
                run.at_start[step + 1],
                run.at_end[step + 1],
                run.at_end[step],
            ];
            extra.push((oriented_outwards(quad, blend, run.surface), run.surface));
        }
    }

    let rebuilt = rebuild(body, &corners, extra);
    if !rebuilt.is_solid() {
        bail!(
            operation,
            "the blended body did not close — the blends may have run into each other"
        );
    }
    Ok(rebuilt)
}

/// The face that closes one end of a blended edge: the one meeting the corner
/// square to the edge, so that the new run lies in its plane.
fn closing_face(
    body: &Body,
    blend: &EdgeBlend,
    corner: VertexId,
    operation: &str,
) -> KernelResult<FaceId> {
    let candidates: Vec<FaceId> = body
        .faces
        .iter()
        .filter(|face| face.id != blend.faces[0] && face.id != blend.faces[1])
        .filter(|face| face.vertex_ids().any(|id| id == corner))
        // Square to the edge, which is what puts the whole run in its plane.
        .filter(|face| face.normal.cross(blend.along).length() < 1e-6)
        .map(|face| face.id)
        .collect();

    match candidates.len() {
        1 => Ok(candidates[0]),
        0 => Err(kernel_error!(
            operation,
            "nothing closes edge {} squarely at one end, so there is no face for the \
             blend to run into",
            blend.edge
        )),
        count => Err(kernel_error!(
            operation,
            "{count} faces close edge {} at one end; blending there is ambiguous",
            blend.edge
        )),
    }
}

/// Whether the closing face walks its corner from the first blended face
/// towards the second, which is the order its run has to be spliced in.
fn runs_from_first_face(
    body: &Body,
    blend: &EdgeBlend,
    closing: FaceId,
    corner: VertexId,
) -> bool {
    let face = &body.faces[closing];
    for face_loop in &face.loops {
        let Some(at) = face_loop.vertex_ids.iter().position(|&id| id == corner) else {
            continue;
        };
        let count = face_loop.vertex_ids.len();
        let before = face_loop.vertex_ids[(at + count - 1) % count];
        // The run enters from whichever blended face already shares the edge the
        // loop arrived on.
        if shares_segment(body, blend.faces[0], before, corner) {
            return true;
        }
        if shares_segment(body, blend.faces[1], before, corner) {
            return false;
        }
    }
    true
}

fn shares_segment(body: &Body, face: FaceId, a: VertexId, b: VertexId) -> bool {
    body.faces[face]
        .segments()
        .any(|(from, to)| (from, to) == (a, b) || (from, to) == (b, a))
}

/// Winds a new blend face so that it faces out of the material.
///
/// The reference has to be the blend's own surface, not the edge it replaces: a
/// convex blend cuts the edge away, so its face lies *inside* the old edge and
/// measuring outwards from there gets the sign backwards every time.
fn oriented_outwards(points: Vec<Vec3>, blend: &EdgeBlend, surface: Surface) -> Vec<Vec3> {
    let middle = points
        .iter()
        .fold(Vec3::ZERO, |sum, &point| sum.add(point))
        .scale(1.0 / points.len() as f64);

    // A convex blend faces away from the material; a concave one is scooped, so
    // it looks back towards it.
    let sign = if blend.convex() { 1.0 } else { -1.0 };
    let outwards = if surface.is_curved() {
        // For a fillet this is the radial from the ball's centre line, which is
        // the true outward normal whatever the arc turns through.
        surface.normal_at(middle).scale(sign)
    } else {
        // A flat strip has no such centre, so bisect the two faces instead. On a
        // convex edge the bisector runs into the material and the strip faces
        // the other way; on a concave one it runs into the void, which is the
        // way the strip already faces. Negating with `sign` covers both.
        blend.bisector().scale(-sign)
    };

    let mut points = points;
    if newell(&points).dot(outwards) < 0.0 {
        points.reverse();
    }
    points
}

/// Builds the new body: every face as before but with the replaced corners
/// spliced in, plus the blend faces.
fn rebuild(
    body: &Body,
    corners: &HashMap<(FaceId, VertexId), Vec<Vec3>>,
    extra: Vec<(Vec<Vec3>, Surface)>,
) -> Body {
    let mut vertices: Vec<Vertex> = Vec::new();
    let mut faces: Vec<Face> = Vec::new();

    let mut add = |vertices: &mut Vec<Vertex>, points: &[Vec3]| -> Vec<VertexId> {
        points
            .iter()
            .map(|&position| {
                let id = vertices.len();
                vertices.push(Vertex::new(id, position));
                id
            })
            .collect()
    };

    for face in &body.faces {
        let loops: Vec<Vec<Vec3>> = face
            .loops
            .iter()
            .map(|face_loop| {
                face_loop
                    .vertex_ids
                    .iter()
                    .flat_map(|&id| match corners.get(&(face.id, id)) {
                        Some(run) => run.clone(),
                        None => vec![body.position(id)],
                    })
                    .collect()
            })
            .collect();
        if loops.is_empty() || loops[0].len() < 3 {
            continue;
        }

        let outer = add(&mut vertices, &loops[0]);
        let holes: Vec<Vec<VertexId>> = loops[1..]
            .iter()
            .map(|hole| add(&mut vertices, hole))
            .collect();
        let mut rebuilt = Face::planar_with_holes(faces.len(), outer, holes, &vertices);
        // planar_with_holes rewinds the holes against its own normal; the face
        // already knew which way it faced, so keep that.
        if rebuilt.normal.dot(face.normal) < 0.0 {
            rebuilt.reverse();
        }
        if face.surface.is_curved() {
            builder::set_surface(&mut rebuilt, face.surface, &vertices);
        }
        faces.push(rebuilt);
    }

    for (points, surface) in extra {
        if points.len() < 3 {
            continue;
        }
        let ids = add(&mut vertices, &points);
        let mut face = Face::planar(faces.len(), ids, &vertices);
        if surface.is_curved() {
            builder::set_surface(&mut face, surface, &vertices);
        }
        faces.push(face);
    }

    let mut rebuilt = Body::new(vertices, faces);
    rebuilt.weld(TOLERANCE);
    rebuilt.remove_degenerate_faces(TOLERANCE);
    rebuilt.compact();
    rebuilt.heal_t_junctions(TOLERANCE);
    builder::ensure_outward(&mut rebuilt);
    rebuilt
}

/// The normal of a loop of points, by Newell's method — the positional twin of
/// [`crate::brep::newell_normal`], for loops that have no vertices behind them
/// yet.
fn newell(points: &[Vec3]) -> Vec3 {
    let mut normal = Vec3::ZERO;
    for index in 0..points.len() {
        let a = points[index];
        let b = points[(index + 1) % points.len()];
        normal.x += (a.y - b.y) * (a.z + b.z);
        normal.y += (a.z - b.z) * (a.x + b.x);
        normal.z += (a.x - b.x) * (a.y + b.y);
    }
    normal
}
