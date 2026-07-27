//! Turning B-Rep faces into triangles.

use serde::{Deserialize, Serialize};

use crate::brep::{Body, Face, Surface, Vertex};
use crate::error::KernelResult;
use crate::math::{PlaneFrame, Vec2, Vec3, EPSILON};

use super::MeshData;

/// How finely a body should be triangulated.
///
/// The two deflections are the same controls a B-Rep kernel exposes: how far a
/// facet may stray from the true surface, and how far its normal may. Both are
/// applied, and the finer one wins — a large gentle curve is limited by the
/// linear tolerance, a small tight one by the angular.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TessellationParams {
    /// Greatest allowed distance between a facet and the surface it stands in
    /// for, in millimetres.
    pub linear_deflection: f64,
    /// Greatest allowed angle between the normals at a facet's corners, in
    /// radians.
    pub angular_deflection: f64,
    /// Upper bound on any triangle edge. Zero leaves it unbounded — this is for
    /// callers that need evenly-sized triangles regardless of curvature.
    pub max_edge_length: f64,
}

impl Default for TessellationParams {
    fn default() -> Self {
        Self {
            linear_deflection: 0.1,
            angular_deflection: 0.5,
            max_edge_length: 0.0,
        }
    }
}

impl TessellationParams {
    /// Quality suitable for a quick preview.
    pub fn coarse() -> Self {
        Self {
            linear_deflection: 0.5,
            angular_deflection: 0.8,
            max_edge_length: 0.0,
        }
    }

    /// Quality suitable for export or close inspection.
    pub fn fine() -> Self {
        Self {
            linear_deflection: 0.01,
            angular_deflection: 0.15,
            max_edge_length: 0.0,
        }
    }

    pub fn with_linear_deflection(mut self, deflection: f64) -> Self {
        self.linear_deflection = deflection;
        self
    }

    pub fn with_max_edge_length(mut self, length: f64) -> Self {
        self.max_edge_length = length;
        self
    }
}

/// How many times a face's triangles may be split in four. Four levels turn one
/// triangle into 256, which is far past the point where the source facets, not
/// the refinement, are the limit on quality.
const MAX_REFINEMENT: u32 = 4;

/// Triangulates a whole body.
///
/// Vertices are emitted per face rather than shared between faces. Two faces
/// meeting at an edge need different normals there — that is what makes the
/// edge look like an edge — so sharing the vertex would round every corner of
/// the model off.
pub fn triangulate(body: &Body, params: &TessellationParams) -> KernelResult<MeshData> {
    let mut mesh = MeshData::new();
    for face in &body.faces {
        append_face(&mut mesh, face, &body.vertices, params);
    }
    Ok(mesh)
}

/// Triangulates a single face, for callers that tessellate a selection.
pub fn triangulate_face(
    face: &Face,
    vertices: &[Vertex],
    params: &TessellationParams,
) -> MeshData {
    let mut mesh = MeshData::new();
    append_face(&mut mesh, face, vertices, params);
    mesh
}

fn append_face(mesh: &mut MeshData, face: &Face, vertices: &[Vertex], params: &TessellationParams) {
    let triangles = face.triangulate(vertices);
    if triangles.is_empty() {
        return;
    }

    let frame = face.frame(vertices);
    let level = refinement_level(face, vertices, &triangles, params);

    for [a, b, c] in triangles {
        let corners = [
            vertices[a].position,
            vertices[b].position,
            vertices[c].position,
        ];
        if level == 0 {
            emit(mesh, face, &frame, corners);
        } else {
            subdivide(mesh, face, &frame, corners, level);
        }
    }
}

/// Works out how many times this face's facets need splitting to meet the
/// requested tolerances.
fn refinement_level(
    face: &Face,
    vertices: &[Vertex],
    triangles: &[[usize; 3]],
    params: &TessellationParams,
) -> u32 {
    let longest = triangles
        .iter()
        .flat_map(|&[a, b, c]| {
            let (pa, pb, pc) = (
                vertices[a].position,
                vertices[b].position,
                vertices[c].position,
            );
            [pa.distance(pb), pb.distance(pc), pc.distance(pa)]
        })
        .fold(0.0f64, f64::max);

    if longest < EPSILON {
        return 0;
    }

    let radius = curvature_radius(&face.surface, face.centroid(vertices));
    let mut level = 0;
    let mut chord = longest;

    while level < MAX_REFINEMENT {
        let too_long = params.max_edge_length > 0.0 && chord > params.max_edge_length;
        // Sagitta of a chord on a circle of this radius: how far the flat facet
        // sits from the surface it stands in for.
        let sagitta = radius.map(|r| chord * chord / (8.0 * r)).unwrap_or(0.0);
        let subtended = radius.map(|r| chord / r).unwrap_or(0.0);
        let too_coarse = sagitta > params.linear_deflection.max(EPSILON)
            || subtended > params.angular_deflection.max(EPSILON);

        if !too_long && !too_coarse {
            break;
        }
        level += 1;
        chord *= 0.5;
    }

    level
}

/// The radius of the surface's curvature near `point`, or `None` when it is
/// flat and no amount of subdivision would bring a facet closer to it.
fn curvature_radius(surface: &Surface, point: Vec3) -> Option<f64> {
    let radius = match *surface {
        Surface::Plane { .. } | Surface::Nurbs => return None,
        Surface::Cylinder { radius, .. } | Surface::Sphere { radius, .. } => radius,
        Surface::Cone { apex, axis, half_angle } => {
            // A cone's cross-section widens along the axis; the tightest
            // curvature near this face is what matters.
            let radial = point.sub(apex).reject_from(axis.normalize()).length();
            (radial * half_angle.cos()).max(EPSILON)
        }
        // The inside of the tube curves more tightly than the outside.
        Surface::Torus { minor_radius, .. } => minor_radius,
    };
    if radius <= EPSILON {
        None
    } else {
        Some(radius)
    }
}

/// Splits a triangle into four and recurses, pulling every new corner onto the
/// true surface as it goes. Uniform depth across the face keeps the split
/// points on shared edges agreeing, so no cracks open up between facets.
fn subdivide(
    mesh: &mut MeshData,
    face: &Face,
    frame: &PlaneFrame,
    corners: [Vec3; 3],
    level: u32,
) {
    if level == 0 {
        emit(mesh, face, frame, corners);
        return;
    }
    let [a, b, c] = corners;
    let ab = project(face, a.lerp(b, 0.5));
    let bc = project(face, b.lerp(c, 0.5));
    let ca = project(face, c.lerp(a, 0.5));

    subdivide(mesh, face, frame, [a, ab, ca], level - 1);
    subdivide(mesh, face, frame, [ab, b, bc], level - 1);
    subdivide(mesh, face, frame, [ca, bc, c], level - 1);
    subdivide(mesh, face, frame, [ab, bc, ca], level - 1);
}

fn project(face: &Face, point: Vec3) -> Vec3 {
    if face.surface.is_curved() {
        face.surface.project(point)
    } else {
        point
    }
}

fn emit(mesh: &mut MeshData, face: &Face, frame: &PlaneFrame, corners: [Vec3; 3]) {
    let base = mesh.vertex_count() as u32;
    for corner in corners {
        let normal = smooth_normal(face, corner);
        mesh.push_vertex(corner, normal, texture_coordinate(face, frame, corner));
    }
    mesh.push_triangle(base, base + 1, base + 2);
}

/// The normal to shade with: the true surface normal where there is one, so a
/// faceted cylinder renders as a smooth cylinder.
fn smooth_normal(face: &Face, point: Vec3) -> Vec3 {
    let normal = face.normal_at(point);
    if normal == Vec3::ZERO {
        face.normal
    } else {
        normal
    }
}

/// Texture coordinates from the surface's natural parameters, so a material
/// wraps a cylinder the way it should rather than following an arbitrary
/// planar projection.
fn texture_coordinate(face: &Face, frame: &PlaneFrame, point: Vec3) -> Vec2 {
    use core::f64::consts::{PI, TAU};

    match face.surface {
        Surface::Cylinder { origin, axis, .. } => {
            let axis = axis.normalize();
            let reference = axis.any_perpendicular();
            let bitangent = axis.cross(reference);
            let relative = point.sub(origin);
            let radial = relative.reject_from(axis);
            let angle = radial.dot(bitangent).atan2(radial.dot(reference));
            Vec2::new(wrap(angle / TAU), relative.dot(axis))
        }
        Surface::Cone { apex, axis, .. } => {
            let axis = axis.normalize();
            let reference = axis.any_perpendicular();
            let bitangent = axis.cross(reference);
            let relative = point.sub(apex);
            let radial = relative.reject_from(axis);
            let angle = radial.dot(bitangent).atan2(radial.dot(reference));
            Vec2::new(wrap(angle / TAU), relative.dot(axis))
        }
        Surface::Sphere { center, radius } => {
            let relative = point.sub(center);
            let angle = relative.y.atan2(relative.x);
            let polar = if radius > EPSILON {
                (relative.z / radius).clamp(-1.0, 1.0).acos()
            } else {
                0.0
            };
            Vec2::new(wrap(angle / TAU), polar / PI)
        }
        Surface::Torus { center, axis, major_radius, .. } => {
            let axis = axis.normalize();
            let reference = axis.any_perpendicular();
            let bitangent = axis.cross(reference);
            let relative = point.sub(center);
            let radial = relative.reject_from(axis);
            let major = radial.dot(bitangent).atan2(radial.dot(reference));
            let tube_center = center.add(radial.normalize().scale(major_radius));
            let outward = point.sub(tube_center);
            let minor = outward.dot(axis).atan2(outward.dot(radial.normalize()));
            Vec2::new(wrap(major / TAU), wrap(minor / TAU))
        }
        // Planar and freeform faces get the face's own 2D frame, which is the
        // parameterization the sketch was drawn in.
        _ => frame.to_local(point),
    }
}

/// Maps a signed turn fraction onto `[0, 1)`.
fn wrap(value: f64) -> f64 {
    let wrapped = value % 1.0;
    if wrapped < 0.0 {
        wrapped + 1.0
    } else {
        wrapped
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::brep::Face;
    use crate::math::Mat4;
    use crate::ops::{self, ExtrudeParams};
    use crate::Profile;

    const TOL: f64 = 1e-6;

    fn square_profile(size: f64) -> Profile {
        Profile::from_points(vec![
            Vec2::new(0.0, 0.0),
            Vec2::new(size, 0.0),
            Vec2::new(size, size),
            Vec2::new(0.0, size),
        ])
    }

    fn box_body(size: f64) -> Body {
        ops::extrude(&ExtrudeParams::new(square_profile(size), size)).unwrap()
    }

    #[test]
    fn default_quality_is_between_coarse_and_fine() {
        let default = TessellationParams::default();
        assert!(TessellationParams::coarse().linear_deflection > default.linear_deflection);
        assert!(TessellationParams::fine().linear_deflection < default.linear_deflection);
        assert_eq!(default.max_edge_length, 0.0);
        assert_eq!(
            TessellationParams::default()
                .with_linear_deflection(0.25)
                .linear_deflection,
            0.25
        );
        assert_eq!(
            TessellationParams::default().with_max_edge_length(2.0).max_edge_length,
            2.0
        );
    }

    #[test]
    fn a_box_tessellates_to_twelve_triangles() {
        let mesh = triangulate(&box_body(10.0), &TessellationParams::default()).unwrap();
        assert_eq!(mesh.triangle_count(), 12);
        // Six faces, four corners each, none shared between faces.
        assert_eq!(mesh.vertex_count(), 36);
    }

    #[test]
    fn a_tessellated_box_has_the_right_volume_and_area() {
        let mesh = triangulate(&box_body(2.0), &TessellationParams::default()).unwrap();
        assert!((mesh.volume() - 8.0).abs() < TOL);
        assert!((mesh.surface_area() - 24.0).abs() < TOL);
    }

    #[test]
    fn box_normals_are_axis_aligned_and_outward() {
        let body = box_body(2.0);
        let mesh = triangulate(&body, &TessellationParams::default()).unwrap();
        let center = body.bounding_box().center();
        for index in 0..mesh.vertex_count() {
            let normal = mesh.normal(index);
            assert!((normal.length() - 1.0).abs() < TOL);
            // Exactly one component is non-zero on a box.
            let non_zero = normal
                .to_array()
                .iter()
                .filter(|value| value.abs() > 0.5)
                .count();
            assert_eq!(non_zero, 1);
            assert!(mesh.position(index).sub(center).dot(normal) > 0.0);
        }
    }

    #[test]
    fn triangles_are_wound_to_agree_with_their_normals() {
        let mesh = triangulate(&box_body(3.0), &TessellationParams::default()).unwrap();
        for [a, b, c] in mesh.triangles() {
            let (pa, pb, pc) = (mesh.position(a), mesh.position(b), mesh.position(c));
            let facet = pb.sub(pa).cross(pc.sub(pa)).normalize();
            assert!(facet.dot(mesh.normal(a)) > 0.9);
        }
    }

    #[test]
    fn a_planar_face_is_not_refined_however_fine_the_tolerance() {
        // A plane is already exact; subdividing it would add triangles for
        // nothing.
        let mesh = triangulate(&box_body(100.0), &TessellationParams::fine()).unwrap();
        assert_eq!(mesh.triangle_count(), 12);
    }

    #[test]
    fn max_edge_length_subdivides_even_a_flat_face() {
        let body = box_body(8.0);
        let params = TessellationParams::default().with_max_edge_length(3.0);
        let mesh = triangulate(&body, &params).unwrap();
        assert!(mesh.triangle_count() > 12);
        // The surface is unchanged by subdivision.
        assert!((mesh.surface_area() - 6.0 * 64.0).abs() < 1e-6);
        assert!((mesh.volume() - 512.0).abs() < 1e-6);
    }

    #[test]
    fn a_curved_face_is_refined_and_bulges_towards_its_surface() {
        // One flat strip standing in for a quarter of a cylinder. Refining it
        // should push the new points out onto the true radius.
        let vertices = vec![
            Vertex::new(0, Vec3::new(10.0, 0.0, 0.0)),
            Vertex::new(1, Vec3::new(0.0, 10.0, 0.0)),
            Vertex::new(2, Vec3::new(0.0, 10.0, 5.0)),
            Vertex::new(3, Vec3::new(10.0, 0.0, 5.0)),
        ];
        let surface = Surface::Cylinder { origin: Vec3::ZERO, axis: Vec3::Z, radius: 10.0 };
        let face = Face::curved(
            0,
            vec![0, 1, 2, 3],
            surface,
            Vec3::new(1.0, 1.0, 0.0).normalize(),
            &vertices,
        );

        let coarse = triangulate_face(&face, &vertices, &TessellationParams::coarse());
        let fine = triangulate_face(&face, &vertices, &TessellationParams::fine());
        assert!(fine.triangle_count() > coarse.triangle_count());

        // Every vertex of the refined mesh sits on the cylinder.
        for index in 0..fine.vertex_count() {
            let point = fine.position(index);
            let radius = Vec3::new(point.x, point.y, 0.0).length();
            assert!((radius - 10.0).abs() < 1e-4, "radius {radius}");
        }
    }

    #[test]
    fn a_curved_face_gets_smooth_normals_from_its_surface() {
        let vertices = vec![
            Vertex::new(0, Vec3::new(10.0, 0.0, 0.0)),
            Vertex::new(1, Vec3::new(0.0, 10.0, 0.0)),
            Vertex::new(2, Vec3::new(0.0, 10.0, 5.0)),
            Vertex::new(3, Vec3::new(10.0, 0.0, 5.0)),
        ];
        let surface = Surface::Cylinder { origin: Vec3::ZERO, axis: Vec3::Z, radius: 10.0 };
        let face = Face::curved(
            0,
            vec![0, 1, 2, 3],
            surface,
            Vec3::new(1.0, 1.0, 0.0).normalize(),
            &vertices,
        );
        let mesh = triangulate_face(&face, &vertices, &TessellationParams::default());

        for index in 0..mesh.vertex_count() {
            let point = mesh.position(index);
            let expected = Vec3::new(point.x, point.y, 0.0).normalize();
            assert!(mesh.normal(index).approx_eq(expected, 1e-5));
        }
    }

    #[test]
    fn finer_tolerances_produce_more_triangles_up_to_the_cap() {
        let vertices = vec![
            Vertex::new(0, Vec3::new(50.0, 0.0, 0.0)),
            Vertex::new(1, Vec3::new(0.0, 50.0, 0.0)),
            Vertex::new(2, Vec3::new(0.0, 50.0, 5.0)),
            Vertex::new(3, Vec3::new(50.0, 0.0, 5.0)),
        ];
        let surface = Surface::Cylinder { origin: Vec3::ZERO, axis: Vec3::Z, radius: 50.0 };
        let face = Face::curved(
            0,
            vec![0, 1, 2, 3],
            surface,
            Vec3::new(1.0, 1.0, 0.0).normalize(),
            &vertices,
        );
        let counts: Vec<usize> = [1.0, 0.1, 0.001]
            .into_iter()
            .map(|deflection| {
                triangulate_face(
                    &face,
                    &vertices,
                    &TessellationParams::default().with_linear_deflection(deflection),
                )
                .triangle_count()
            })
            .collect();
        assert!(counts[0] <= counts[1] && counts[1] <= counts[2]);
        // The cap holds: two source triangles, four levels of four-way splits.
        assert!(counts[2] <= 2 * 4usize.pow(MAX_REFINEMENT));
    }

    #[test]
    fn a_sphere_face_refines_onto_its_shell() {
        let radius = 20.0;
        let vertices = vec![
            Vertex::new(0, Vec3::new(radius, 0.0, 0.0)),
            Vertex::new(1, Vec3::new(0.0, radius, 0.0)),
            Vertex::new(2, Vec3::new(0.0, 0.0, radius)),
        ];
        let surface = Surface::Sphere { center: Vec3::ZERO, radius };
        let face = Face::curved(
            0,
            vec![0, 1, 2],
            surface,
            Vec3::ONE.normalize(),
            &vertices,
        );
        let mesh = triangulate_face(&face, &vertices, &TessellationParams::fine());
        assert!(mesh.triangle_count() > 1);
        for index in 0..mesh.vertex_count() {
            assert!((mesh.position(index).length() - radius).abs() < 1e-6);
        }
    }

    #[test]
    fn planar_texture_coordinates_follow_the_face_frame() {
        let body = box_body(4.0);
        let mesh = triangulate(&body, &TessellationParams::default()).unwrap();
        // A 4 mm square face spans 4 units of its own parameter space.
        let mut span = 0.0f64;
        for index in 0..mesh.vertex_count() {
            span = span.max(mesh.uv(index).x.abs()).max(mesh.uv(index).y.abs());
        }
        assert!((span - 4.0).abs() < TOL);
    }

    #[test]
    fn cylindrical_texture_coordinates_wrap_around_the_axis() {
        let vertices = vec![
            Vertex::new(0, Vec3::new(10.0, 0.0, 0.0)),
            Vertex::new(1, Vec3::new(-10.0, 0.0, 0.0)),
            Vertex::new(2, Vec3::new(-10.0, 0.0, 5.0)),
            Vertex::new(3, Vec3::new(10.0, 0.0, 5.0)),
        ];
        let surface = Surface::Cylinder { origin: Vec3::ZERO, axis: Vec3::Z, radius: 10.0 };
        let face = Face::curved(0, vec![0, 1, 2, 3], surface, Vec3::Y, &vertices);
        let mesh = triangulate_face(&face, &vertices, &TessellationParams::coarse());

        for index in 0..mesh.vertex_count() {
            let uv = mesh.uv(index);
            assert!((0.0..1.0).contains(&uv.x), "u out of range: {}", uv.x);
            // v is the height up the axis.
            assert!((0.0..=5.0).contains(&uv.y));
        }
    }

    #[test]
    fn sphere_and_torus_coordinates_stay_in_range() {
        let sphere_vertices = vec![
            Vertex::new(0, Vec3::new(5.0, 0.0, 0.0)),
            Vertex::new(1, Vec3::new(0.0, 5.0, 0.0)),
            Vertex::new(2, Vec3::new(0.0, 0.0, 5.0)),
        ];
        let sphere = Face::curved(
            0,
            vec![0, 1, 2],
            Surface::Sphere { center: Vec3::ZERO, radius: 5.0 },
            Vec3::ONE.normalize(),
            &sphere_vertices,
        );
        let mesh = triangulate_face(&sphere, &sphere_vertices, &TessellationParams::default());
        for index in 0..mesh.vertex_count() {
            let uv = mesh.uv(index);
            assert!((0.0..1.0).contains(&uv.x));
            assert!((0.0..=1.0).contains(&uv.y));
        }

        let torus_vertices = vec![
            Vertex::new(0, Vec3::new(6.0, 0.0, 0.0)),
            Vertex::new(1, Vec3::new(0.0, 6.0, 0.0)),
            Vertex::new(2, Vec3::new(0.0, 5.0, 1.0)),
            Vertex::new(3, Vec3::new(5.0, 0.0, 1.0)),
        ];
        let torus = Face::curved(
            0,
            vec![0, 1, 2, 3],
            Surface::Torus {
                center: Vec3::ZERO,
                axis: Vec3::Z,
                major_radius: 5.0,
                minor_radius: 1.0,
            },
            Vec3::new(1.0, 1.0, 0.0).normalize(),
            &torus_vertices,
        );
        let torus_mesh = triangulate_face(&torus, &torus_vertices, &TessellationParams::default());
        for index in 0..torus_mesh.vertex_count() {
            let uv = torus_mesh.uv(index);
            assert!((0.0..1.0).contains(&uv.x));
            assert!((0.0..1.0).contains(&uv.y));
        }
    }

    #[test]
    fn wrap_maps_negative_turns_into_range() {
        assert!((wrap(-0.25) - 0.75).abs() < 1e-12);
        assert!((wrap(0.25) - 0.25).abs() < 1e-12);
        assert!(wrap(0.0).abs() < 1e-12);
        assert!((wrap(1.5) - 0.5).abs() < 1e-12);
    }

    #[test]
    fn curvature_radius_is_none_for_flat_surfaces() {
        assert_eq!(
            curvature_radius(&Surface::plane(Vec3::ZERO, Vec3::Z), Vec3::ZERO),
            None
        );
        assert_eq!(curvature_radius(&Surface::Nurbs, Vec3::ZERO), None);
        assert_eq!(
            curvature_radius(
                &Surface::Cylinder { origin: Vec3::ZERO, axis: Vec3::Z, radius: 0.0 },
                Vec3::ZERO
            ),
            None
        );
        assert_eq!(
            curvature_radius(
                &Surface::Sphere { center: Vec3::ZERO, radius: 4.0 },
                Vec3::ZERO
            ),
            Some(4.0)
        );
    }

    #[test]
    fn an_empty_body_tessellates_to_an_empty_mesh() {
        let mesh = triangulate(&Body::empty(), &TessellationParams::default()).unwrap();
        assert!(mesh.is_empty());
    }

    #[test]
    fn a_degenerate_face_contributes_nothing() {
        let vertices = vec![
            Vertex::new(0, Vec3::ZERO),
            Vertex::new(1, Vec3::X),
            Vertex::new(2, Vec3::X.scale(2.0)),
        ];
        let face = Face::planar(0, vec![0, 1, 2], &vertices);
        assert!(triangulate_face(&face, &vertices, &TessellationParams::default()).is_empty());
    }

    #[test]
    fn tessellation_follows_a_transformed_body() {
        let body = box_body(2.0).transformed(&Mat4::translation(Vec3::new(10.0, 0.0, 0.0)));
        let mesh = triangulate(&body, &TessellationParams::default()).unwrap();
        assert!((mesh.bounding_box().min.x - 10.0).abs() < TOL);
        assert!((mesh.volume() - 8.0).abs() < TOL);
    }
}
