//! Shelling — hollowing a solid out into a wall of even thickness.

use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};

use crate::brep::{Body, Face, FaceId, Surface, Vertex, VertexId};
use crate::error::KernelResult;
use crate::math::{Plane, Vec3, EPSILON, TOLERANCE};
use crate::{bail, kernel_error};

use super::builder;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShellParams {
    /// Wall thickness, in millimetres, measured inwards from the original faces.
    pub thickness: f64,
    /// Faces to leave off, by the ids [`Body::topology_ids`] reports. The wall
    /// stops in a rim around each. Empty hollows the body without opening it,
    /// leaving a sealed void inside.
    #[serde(default)]
    pub open_face_ids: Vec<String>,
}

impl ShellParams {
    pub fn new(thickness: f64) -> Self {
        Self { thickness, open_face_ids: Vec::new() }
    }

    pub fn open_faces(mut self, ids: Vec<String>) -> Self {
        self.open_face_ids = ids;
        self
    }
}

/// Hollows a solid, leaving a wall of the given thickness.
///
/// The original faces become the outside of the wall. Each is copied inwards by
/// the thickness to make the inside, and where a face is left open the two are
/// joined by a rim so the wall's cut end is closed off.
///
/// Curved faces keep their analytic tag where the offset of that surface is
/// itself the same kind — a cylinder or a sphere of a different radius. Cones
/// and tori fall back to their facets, which stay exact; only the tag that
/// would let tessellation refine them further is lost.
pub fn shell(body: &Body, params: &ShellParams) -> KernelResult<Body> {
    const OPERATION: &str = "shell";

    if !params.thickness.is_finite() || params.thickness <= 0.0 {
        bail!(OPERATION, "thickness {} is not a positive length", params.thickness);
    }
    if body.is_empty() {
        bail!(OPERATION, "the body is empty");
    }
    if !body.is_solid() {
        bail!(OPERATION, "the body is not closed, so it has no inside to hollow out");
    }

    let open = resolve_faces(body, &params.open_face_ids, OPERATION)?;
    if open.len() >= body.faces.len() {
        bail!(OPERATION, "every face was left open, so no wall is left to build");
    }
    let kept: Vec<FaceId> = (0..body.faces.len()).filter(|id| !open.contains(id)).collect();

    // Each vertex is pushed in by the faces around it — but only the ones that
    // stay. A corner on the rim of an opening is held by its walls alone, which
    // is what leaves the rim flush with the face that was removed.
    let mut holding: HashMap<VertexId, Vec<Plane>> = HashMap::new();
    for &face in &kept {
        let plane = body.faces[face].plane(&body.vertices);
        for vertex in body.faces[face].vertex_ids() {
            holding.entry(vertex).or_default().push(plane);
        }
    }
    let inner_position: Vec<Vec3> = body
        .vertices
        .iter()
        .map(|vertex| {
            let planes = holding.get(&vertex.id).map(Vec::as_slice).unwrap_or(&[]);
            pushed_in(planes, params.thickness, vertex.position)
        })
        .collect();

    // A wall thicker than the body is thin turns its faces inside out. Catching
    // it here says so plainly, rather than returning a tangled solid.
    for &face in &kept {
        let original = &body.faces[face];
        let moved: Vec<Vec3> = original
            .outer_loop()
            .vertex_ids
            .iter()
            .map(|&id| inner_position[id])
            .collect();
        if newell(&moved).dot(original.normal) <= 0.0 {
            bail!(
                OPERATION,
                "a wall {} thick turns face {face} inside out — the body is not that thick",
                params.thickness
            );
        }
    }

    let built = assemble(body, &kept, &open, &inner_position, params.thickness);
    if !built.is_solid() {
        bail!(
            OPERATION,
            "the hollowed body did not close — the wall may have run into itself"
        );
    }
    if built.volume() <= TOLERANCE {
        bail!(OPERATION, "hollowing left nothing behind at that thickness");
    }
    Ok(built)
}

/// Builds the hollow body: the kept faces outside, their pushed-in copies
/// inside, and a rim wherever the wall was cut open.
fn assemble(
    body: &Body,
    kept: &[FaceId],
    open: &HashSet<FaceId>,
    inner_position: &[Vec3],
    thickness: f64,
) -> Body {
    let count = body.vertices.len();
    let mut vertices: Vec<Vertex> = Vec::with_capacity(count * 2);
    for vertex in &body.vertices {
        vertices.push(Vertex::new(vertices.len(), vertex.position));
    }
    for &position in inner_position {
        vertices.push(Vertex::new(vertices.len(), position));
    }
    // The outer copy of a vertex keeps its id; the inner one sits `count` along.
    let inner = |id: VertexId| id + count;

    let mut faces: Vec<Face> = Vec::new();
    for &id in kept {
        let face = &body.faces[id];
        let loops: Vec<Vec<VertexId>> =
            face.loops.iter().map(|l| l.vertex_ids.clone()).collect();

        // Outside: as it was.
        push_face(&mut faces, loops.clone(), face.normal, face.surface, &vertices);

        // Inside: the same loops on the pushed-in points, turned to face the
        // other way, since the material is now on the far side of them.
        let moved: Vec<Vec<VertexId>> = loops
            .iter()
            .map(|l| l.iter().map(|&v| inner(v)).collect())
            .collect();
        let surface = offset_surface(face, face.surface, -thickness);
        push_face(&mut faces, moved, -face.normal, surface, &vertices);
    }

    // The rim: every edge of a removed face that a kept face still holds.
    let mut walled: HashSet<(VertexId, VertexId)> = HashSet::new();
    for &id in kept {
        for (from, to) in body.faces[id].segments() {
            walled.insert(ordered(from, to));
        }
    }
    for &id in open.iter() {
        for (from, to) in body.faces[id].segments() {
            if !walled.contains(&ordered(from, to)) {
                // Both sides were opened, so there is no wall to cap here.
                continue;
            }
            // Wound the way the removed face ran, so the rim faces the way that
            // face did — out of the opening.
            let quad = vec![from, to, inner(to), inner(from)];
            let face = Face::planar(faces.len(), quad, &vertices);
            if face.normal == Vec3::ZERO {
                continue;
            }
            faces.push(face);
        }
    }

    let mut built = Body::new(vertices, faces);
    built.weld(TOLERANCE);
    built.remove_degenerate_faces(TOLERANCE);
    built.compact();
    built.heal_t_junctions(TOLERANCE);
    builder::ensure_outward(&mut built);
    built
}

/// Adds a face wound to face `outward`, tagged with `surface` where that is a
/// surface a facet can be refined against.
fn push_face(
    faces: &mut Vec<Face>,
    mut loops: Vec<Vec<VertexId>>,
    outward: Vec3,
    surface: Surface,
    vertices: &[Vertex],
) {
    if loops.is_empty() || loops[0].len() < 3 {
        return;
    }
    let outer = loops.remove(0);
    let mut face = Face::planar_with_holes(faces.len(), outer, loops, vertices);
    if face.normal == Vec3::ZERO {
        return;
    }
    if face.normal.dot(outward) < 0.0 {
        face.reverse();
    }
    if surface.is_curved() {
        builder::set_surface(&mut face, surface, vertices);
    }
    faces.push(face);
}

/// The surface a face's copy lies on once it moves `distance` along the face's
/// own outward direction — negative, for the inside of a wall. Planes are
/// rebuilt from the moved loop, so only the curved cases need answering here.
fn offset_surface(face: &Face, surface: Surface, distance: f64) -> Surface {
    // Outwards runs away from the axis on a boss and towards it in a bore, so
    // which way the radius moves follows the face, not the surface.
    let moved = |radius: f64| if face.flipped { radius - distance } else { radius + distance };
    match surface {
        Surface::Cylinder { origin, axis, radius } if moved(radius) > TOLERANCE => {
            Surface::Cylinder { origin, axis, radius: moved(radius) }
        }
        Surface::Sphere { center, radius } if moved(radius) > TOLERANCE => {
            Surface::Sphere { center, radius: moved(radius) }
        }
        // A plane is rebuilt from its own loop; the rest keep their facets only.
        _ => Surface::Nurbs,
    }
}

/// Where a vertex lands when the walls around it are pushed in by `thickness`.
///
/// Each wall gives a plane the inside of the shell has to lie on, and the corner
/// is where they meet. Three independent walls fix it exactly. Fewer do not, and
/// that is the case worth getting right: a corner on the rim of an opening is
/// held by two walls or one, and what is wanted there is the nearest point on
/// what they do fix — which is what leaves a rim flush with the face that was
/// removed.
fn pushed_in(planes: &[Plane], thickness: f64, original: Vec3) -> Vec3 {
    // An orthonormal basis for the directions the walls actually constrain.
    // Everything square to all of them is free, and stays where it was.
    let mut basis: Vec<Vec3> = Vec::new();
    for plane in planes {
        let mut direction = plane.normal;
        for held in &basis {
            direction = direction.sub(held.scale(held.dot(direction)));
        }
        if direction.length() > 1e-6 {
            basis.push(direction.normalize());
            if basis.len() == 3 {
                break;
            }
        }
    }
    if basis.is_empty() {
        return original;
    }

    // Least squares over the constrained directions only: solve for how far to
    // move from `original` along each, leaving the free directions untouched.
    let rank = basis.len();
    let mut matrix = [[0.0f64; 3]; 3];
    let mut rhs = [0.0f64; 3];
    for plane in planes {
        let target = plane.offset - thickness - plane.normal.dot(original);
        let along: Vec<f64> = basis.iter().map(|e| e.dot(plane.normal)).collect();
        for row in 0..rank {
            for col in 0..rank {
                matrix[row][col] += along[row] * along[col];
            }
            rhs[row] += along[row] * target;
        }
    }

    let Some(step) = solve(&mut matrix, &mut rhs, rank) else {
        return original;
    };
    let mut moved = original;
    for index in 0..rank {
        moved = moved.add(basis[index].scale(step[index]));
    }
    moved
}

/// Gauss-Jordan with partial pivoting on the leading `rank` rows.
fn solve(matrix: &mut [[f64; 3]; 3], rhs: &mut [f64; 3], rank: usize) -> Option<[f64; 3]> {
    for column in 0..rank {
        let mut pivot = column;
        for row in (column + 1)..rank {
            if matrix[row][column].abs() > matrix[pivot][column].abs() {
                pivot = row;
            }
        }
        if matrix[pivot][column].abs() < EPSILON {
            return None;
        }
        matrix.swap(column, pivot);
        rhs.swap(column, pivot);

        let divisor = matrix[column][column];
        for value in matrix[column].iter_mut() {
            *value /= divisor;
        }
        rhs[column] /= divisor;

        for row in 0..rank {
            if row == column {
                continue;
            }
            let factor = matrix[row][column];
            if factor == 0.0 {
                continue;
            }
            for index in 0..rank {
                matrix[row][index] -= factor * matrix[column][index];
            }
            rhs[row] -= factor * rhs[column];
        }
    }
    Some(*rhs)
}

/// The faces a selection names. Unlike edges, naming none means none.
fn resolve_faces(
    body: &Body,
    selection: &[String],
    operation: &str,
) -> KernelResult<HashSet<FaceId>> {
    let known = body.topology_ids().face_ids;
    selection
        .iter()
        .map(|id| {
            known
                .iter()
                .position(|candidate| candidate == id)
                .ok_or_else(|| kernel_error!(operation, "this body has no face {id}"))
        })
        .collect()
}

fn ordered(a: VertexId, b: VertexId) -> (VertexId, VertexId) {
    if a <= b {
        (a, b)
    } else {
        (b, a)
    }
}

/// The normal of a loop of points, by Newell's method.
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
