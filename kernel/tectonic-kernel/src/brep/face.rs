//! Faces — the two-dimensional cells of the topology.

use serde::{Deserialize, Serialize};

use crate::math::{Mat4, Plane, PlaneFrame, Vec2, Vec3, EPSILON};
use crate::mesh::polygon;

use super::{FaceId, Surface, Vertex, VertexId};

/// Whether a loop bounds the face from outside or cuts a window in it.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum LoopKind {
    Outer,
    Inner,
}

/// A closed circuit of vertices bounding part of a face.
///
/// The first and last vertices are *not* repeated — the loop closes implicitly.
/// Outer loops run counter-clockwise about the face's outward normal and inner
/// loops run clockwise, which is what makes the face's signed area come out as
/// its true area with the holes already subtracted.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Loop {
    pub vertex_ids: Vec<VertexId>,
    pub kind: LoopKind,
}

impl Loop {
    pub fn outer(vertex_ids: Vec<VertexId>) -> Self {
        Self { vertex_ids, kind: LoopKind::Outer }
    }

    pub fn inner(vertex_ids: Vec<VertexId>) -> Self {
        Self { vertex_ids, kind: LoopKind::Inner }
    }

    pub fn len(&self) -> usize {
        self.vertex_ids.len()
    }

    pub fn is_empty(&self) -> bool {
        self.vertex_ids.is_empty()
    }

    /// The loop's segments, as ordered vertex pairs, closing back to the start.
    pub fn segments(&self) -> impl Iterator<Item = (VertexId, VertexId)> + '_ {
        let count = self.vertex_ids.len();
        (0..count).map(move |i| (self.vertex_ids[i], self.vertex_ids[(i + 1) % count]))
    }

    pub fn reverse(&mut self) {
        self.vertex_ids.reverse();
    }
}

/// A bounded region of a [`Surface`].
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Face {
    pub id: FaceId,
    /// The outer loop first, then any inner loops.
    pub loops: Vec<Loop>,
    pub surface: Surface,
    /// Outward unit normal, representative of the face as a whole. For a curved
    /// face this is the normal at its middle; use [`Face::normal_at`] for a
    /// particular point.
    pub normal: Vec3,
    /// True when the face's outward direction opposes its surface's own normal
    /// — a cylindrical hole bored through a solid, for instance, where the
    /// material is outside the cylinder rather than inside it.
    pub flipped: bool,
}

impl Face {
    /// A planar face, with its normal derived from the winding of its own outer
    /// loop. Building the normal from the loop rather than taking it as an
    /// argument is what keeps winding and orientation from ever disagreeing.
    pub fn planar(id: FaceId, vertex_ids: Vec<VertexId>, vertices: &[Vertex]) -> Self {
        let loops = vec![Loop::outer(vertex_ids)];
        let normal = newell_normal(&loops[0].vertex_ids, vertices);
        let origin = loops[0]
            .vertex_ids
            .first()
            .and_then(|&id| vertices.get(id))
            .map(|vertex| vertex.position)
            .unwrap_or(Vec3::ZERO);
        Self {
            id,
            loops,
            surface: Surface::plane(origin, normal),
            normal,
            flipped: false,
        }
    }

    /// A planar face with holes cut in it.
    pub fn planar_with_holes(
        id: FaceId,
        outer: Vec<VertexId>,
        holes: Vec<Vec<VertexId>>,
        vertices: &[Vertex],
    ) -> Self {
        let mut face = Self::planar(id, outer, vertices);
        for hole in holes {
            face.loops.push(Loop::inner(hole));
        }
        face.orient_loops(vertices);
        face
    }

    /// A face on a curved surface. `normal` is the face's outward direction at
    /// its middle, which also settles whether it runs with or against the
    /// surface's own normal.
    pub fn curved(
        id: FaceId,
        vertex_ids: Vec<VertexId>,
        surface: Surface,
        normal: Vec3,
        vertices: &[Vertex],
    ) -> Self {
        let normal = normal.normalize();
        let loops = vec![Loop::outer(vertex_ids)];
        let mut face = Self { id, loops, surface, normal, flipped: false };

        // Settle the flip against the surface's own normal where the face sits.
        let middle = face.centroid(vertices);
        let surface_normal = face.surface.normal_at(middle);
        face.flipped = surface_normal != Vec3::ZERO && surface_normal.dot(normal) < 0.0;
        face
    }

    pub fn outer_loop(&self) -> &Loop {
        &self.loops[0]
    }

    pub fn inner_loops(&self) -> &[Loop] {
        &self.loops[1..]
    }

    pub fn has_holes(&self) -> bool {
        self.loops.len() > 1
    }

    /// Every vertex on the face, outer loop first.
    pub fn vertex_ids(&self) -> impl Iterator<Item = VertexId> + '_ {
        self.loops.iter().flat_map(|l| l.vertex_ids.iter().copied())
    }

    /// Every boundary segment of the face, from all its loops.
    pub fn segments(&self) -> impl Iterator<Item = (VertexId, VertexId)> + '_ {
        self.loops.iter().flat_map(|l| l.segments())
    }

    /// The outward normal at a point on the face. Falls back to the face's
    /// representative normal where the surface cannot answer.
    pub fn normal_at(&self, point: Vec3) -> Vec3 {
        let surface_normal = self.surface.normal_at(point);
        if surface_normal == Vec3::ZERO {
            return self.normal;
        }
        if self.flipped {
            -surface_normal
        } else {
            surface_normal
        }
    }

    /// The plane the face lies in, for a planar face.
    pub fn plane(&self, vertices: &[Vertex]) -> Plane {
        match self.surface.as_plane() {
            Some(plane) if !self.flipped => plane,
            Some(plane) => plane.flip(),
            None => Plane::from_point_normal(self.centroid(vertices), self.normal),
        }
    }

    /// A 2D coordinate system on the face, oriented so that the outer loop runs
    /// counter-clockwise in it.
    pub fn frame(&self, vertices: &[Vertex]) -> PlaneFrame {
        PlaneFrame::from_normal(self.origin(vertices), self.normal)
    }

    fn origin(&self, vertices: &[Vertex]) -> Vec3 {
        self.loops
            .first()
            .and_then(|l| l.vertex_ids.first())
            .and_then(|&id| vertices.get(id))
            .map(|vertex| vertex.position)
            .unwrap_or(Vec3::ZERO)
    }

    pub fn positions(&self, loop_index: usize, vertices: &[Vertex]) -> Vec<Vec3> {
        self.loops
            .get(loop_index)
            .map(|l| {
                l.vertex_ids
                    .iter()
                    .filter_map(|&id| vertices.get(id).map(|vertex| vertex.position))
                    .collect()
            })
            .unwrap_or_default()
    }

    /// Surface area, with holes subtracted.
    pub fn area(&self, vertices: &[Vertex]) -> f64 {
        let frame = self.frame(vertices);
        let outer = polygon::area(&self.projected(0, &frame, vertices));
        let holes: f64 = (1..self.loops.len())
            .map(|index| polygon::area(&self.projected(index, &frame, vertices)))
            .sum();
        (outer - holes).max(0.0)
    }

    /// Area-weighted centre of the face.
    pub fn centroid(&self, vertices: &[Vertex]) -> Vec3 {
        let positions = self.positions(0, vertices);
        if positions.is_empty() {
            return Vec3::ZERO;
        }
        let plane_normal = newell_normal(&self.loops[0].vertex_ids, vertices);
        if plane_normal == Vec3::ZERO {
            // Degenerate loop: the corner average is the best available answer.
            let sum = positions.iter().fold(Vec3::ZERO, |a, &p| a.add(p));
            return sum.scale(1.0 / positions.len() as f64);
        }
        let frame = PlaneFrame::from_normal(positions[0], plane_normal);
        let flat: Vec<Vec2> = positions.iter().map(|&p| frame.to_local(p)).collect();
        frame.to_world(polygon::centroid(&flat))
    }

    /// Splits the face into triangles, given as vertex ids wound to agree with
    /// the face's outward normal.
    pub fn triangulate(&self, vertices: &[Vertex]) -> Vec<[VertexId; 3]> {
        let frame = self.frame(vertices);
        let outer = self.projected(0, &frame, vertices);
        if outer.len() < 3 {
            return Vec::new();
        }
        let holes: Vec<Vec<Vec2>> = (1..self.loops.len())
            .map(|index| self.projected(index, &frame, vertices))
            .collect();

        // Indices from the triangulator run over `outer ++ holes` in order,
        // which is exactly how the loops are laid out.
        let flat: Vec<VertexId> = self.vertex_ids().collect();
        polygon::triangulate_with_holes(&outer, &holes)
            .into_iter()
            .filter_map(|[a, b, c]| {
                Some([*flat.get(a)?, *flat.get(b)?, *flat.get(c)?])
            })
            .filter(|[a, b, c]| a != b && b != c && a != c)
            .collect()
    }

    fn projected(&self, loop_index: usize, frame: &PlaneFrame, vertices: &[Vertex]) -> Vec<Vec2> {
        self.positions(loop_index, vertices)
            .into_iter()
            .map(|position| frame.to_local(position))
            .collect()
    }

    /// True when `point` lies on the face — within `tolerance` of its surface,
    /// inside the outer loop and outside every hole.
    pub fn contains_point(&self, point: Vec3, vertices: &[Vertex], tolerance: f64) -> bool {
        if self.surface.is_planar() && self.plane(vertices).distance_to(point).abs() > tolerance {
            return false;
        }
        let frame = self.frame(vertices);
        let flat = frame.to_local(point);
        if !polygon::contains_point(&self.projected(0, &frame, vertices), flat) {
            return false;
        }
        !(1..self.loops.len())
            .any(|index| polygon::contains_point(&self.projected(index, &frame, vertices), flat))
    }

    /// Turns the face inside out: loops reverse and the normal flips.
    pub fn reverse(&mut self) {
        for face_loop in &mut self.loops {
            face_loop.reverse();
        }
        self.normal = -self.normal;
        self.flipped = !self.flipped;
    }

    /// Rewinds the loops so the outer runs counter-clockwise about the normal
    /// and the inner loops run clockwise.
    pub fn orient_loops(&mut self, vertices: &[Vertex]) {
        let normal = self.normal;
        let origin = self.origin(vertices);
        let frame = PlaneFrame::from_normal(origin, normal);
        for (index, face_loop) in self.loops.iter_mut().enumerate() {
            let flat: Vec<Vec2> = face_loop
                .vertex_ids
                .iter()
                .filter_map(|&id| vertices.get(id).map(|v| frame.to_local(v.position)))
                .collect();
            if flat.len() < 3 {
                continue;
            }
            let counter_clockwise = polygon::is_counter_clockwise(&flat);
            let wants_counter_clockwise = index == 0;
            if counter_clockwise != wants_counter_clockwise {
                face_loop.reverse();
            }
        }
    }

    /// The face after a transform. The caller is responsible for the vertex
    /// positions; this moves the surface and normal to match.
    pub fn transformed(&self, transform: &Mat4) -> Self {
        let mut moved = self.clone();
        moved.surface = self.surface.transformed(transform);
        moved.normal = transform.transform_normal(self.normal);
        if transform.flips_orientation() {
            // A mirror reverses every loop's winding, so the stored loops have
            // to be reversed too or they would disagree with the new normal.
            for face_loop in &mut moved.loops {
                face_loop.reverse();
            }
        }
        moved
    }
}

/// The normal of a (nearly) planar polygon, by Newell's method.
///
/// Newell's sum is used rather than the cross product of the first three edges
/// because it takes every vertex into account: a loop whose first corner is
/// nearly collinear — which happens constantly on tessellated arcs — would give
/// the three-point version a normal that is pure noise.
///
/// Returns [`Vec3::ZERO`] for a degenerate loop.
pub fn newell_normal(vertex_ids: &[VertexId], vertices: &[Vertex]) -> Vec3 {
    if vertex_ids.len() < 3 {
        return Vec3::ZERO;
    }
    let mut normal = Vec3::ZERO;
    for index in 0..vertex_ids.len() {
        let Some(current) = vertices.get(vertex_ids[index]) else {
            continue;
        };
        let Some(next) = vertices.get(vertex_ids[(index + 1) % vertex_ids.len()]) else {
            continue;
        };
        let (a, b) = (current.position, next.position);
        normal.x += (a.y - b.y) * (a.z + b.z);
        normal.y += (a.z - b.z) * (a.x + b.x);
        normal.z += (a.x - b.x) * (a.y + b.y);
    }
    if normal.length() < EPSILON {
        Vec3::ZERO
    } else {
        normal.normalize()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const TOL: f64 = 1e-9;

    /// A unit square in the z = 0 plane, wound counter-clockwise.
    fn square_vertices() -> Vec<Vertex> {
        vec![
            Vertex::new(0, Vec3::new(0.0, 0.0, 0.0)),
            Vertex::new(1, Vec3::new(1.0, 0.0, 0.0)),
            Vertex::new(2, Vec3::new(1.0, 1.0, 0.0)),
            Vertex::new(3, Vec3::new(0.0, 1.0, 0.0)),
        ]
    }

    #[test]
    fn a_loop_yields_its_closing_segments() {
        let face_loop = Loop::outer(vec![0, 1, 2]);
        let segments: Vec<_> = face_loop.segments().collect();
        assert_eq!(segments, vec![(0, 1), (1, 2), (2, 0)]);
        assert_eq!(face_loop.len(), 3);
        assert!(!face_loop.is_empty());
        assert!(Loop::inner(vec![]).is_empty());
        assert_eq!(Loop::inner(vec![1]).kind, LoopKind::Inner);
    }

    #[test]
    fn reversing_a_loop_reverses_its_order() {
        let mut face_loop = Loop::outer(vec![0, 1, 2, 3]);
        face_loop.reverse();
        assert_eq!(face_loop.vertex_ids, vec![3, 2, 1, 0]);
    }

    #[test]
    fn a_counter_clockwise_square_faces_up() {
        let vertices = square_vertices();
        let face = Face::planar(0, vec![0, 1, 2, 3], &vertices);
        assert!(face.normal.approx_eq(Vec3::Z, TOL));
        assert!(face.surface.is_planar());
        assert!(!face.flipped);
        assert!(!face.has_holes());
    }

    #[test]
    fn a_clockwise_square_faces_down() {
        let vertices = square_vertices();
        let face = Face::planar(0, vec![3, 2, 1, 0], &vertices);
        assert!(face.normal.approx_eq(-Vec3::Z, TOL));
    }

    #[test]
    fn newell_uses_every_vertex() {
        let vertices = square_vertices();
        assert!(newell_normal(&[0, 1, 2, 3], &vertices).approx_eq(Vec3::Z, TOL));
        // Too few points, or all coincident, is degenerate.
        assert_eq!(newell_normal(&[0, 1], &vertices), Vec3::ZERO);
        assert_eq!(newell_normal(&[0, 0, 0], &vertices), Vec3::ZERO);
        // An out-of-range id is skipped rather than panicking.
        assert!(newell_normal(&[0, 1, 2, 99], &vertices).is_finite());
    }

    #[test]
    fn newell_survives_a_nearly_collinear_first_corner() {
        // The first three points are almost in line; a three-point cross product
        // would be dominated by rounding error, Newell's sum is not.
        let vertices = vec![
            Vertex::new(0, Vec3::new(0.0, 0.0, 0.0)),
            Vertex::new(1, Vec3::new(1.0, 1e-13, 0.0)),
            Vertex::new(2, Vec3::new(2.0, 0.0, 0.0)),
            Vertex::new(3, Vec3::new(2.0, 2.0, 0.0)),
            Vertex::new(4, Vec3::new(0.0, 2.0, 0.0)),
        ];
        assert!(newell_normal(&[0, 1, 2, 3, 4], &vertices).approx_eq(Vec3::Z, 1e-9));
    }

    #[test]
    fn area_and_centroid_of_a_square() {
        let vertices = square_vertices();
        let face = Face::planar(0, vec![0, 1, 2, 3], &vertices);
        assert!((face.area(&vertices) - 1.0).abs() < TOL);
        assert!(face
            .centroid(&vertices)
            .approx_eq(Vec3::new(0.5, 0.5, 0.0), TOL));
    }

    #[test]
    fn a_hole_is_subtracted_from_the_area() {
        let mut vertices = vec![
            Vertex::new(0, Vec3::new(0.0, 0.0, 0.0)),
            Vertex::new(1, Vec3::new(4.0, 0.0, 0.0)),
            Vertex::new(2, Vec3::new(4.0, 4.0, 0.0)),
            Vertex::new(3, Vec3::new(0.0, 4.0, 0.0)),
        ];
        for (index, point) in [(1.0, 1.0), (3.0, 1.0), (3.0, 3.0), (1.0, 3.0)]
            .into_iter()
            .enumerate()
        {
            vertices.push(Vertex::new(4 + index, Vec3::new(point.0, point.1, 0.0)));
        }
        let face = Face::planar_with_holes(0, vec![0, 1, 2, 3], vec![vec![4, 5, 6, 7]], &vertices);

        assert!(face.has_holes());
        assert!((face.area(&vertices) - 12.0).abs() < TOL);
        assert_eq!(face.inner_loops().len(), 1);
        // The hole was rewound to run against the outer loop.
        assert_eq!(face.loops[1].vertex_ids, vec![7, 6, 5, 4]);
    }

    #[test]
    fn triangulating_a_square_gives_two_triangles_facing_the_right_way() {
        let vertices = square_vertices();
        let face = Face::planar(0, vec![0, 1, 2, 3], &vertices);
        let triangles = face.triangulate(&vertices);
        assert_eq!(triangles.len(), 2);

        for [a, b, c] in triangles {
            let (pa, pb, pc) = (
                vertices[a].position,
                vertices[b].position,
                vertices[c].position,
            );
            let normal = pb.sub(pa).cross(pc.sub(pa)).normalize();
            assert!(normal.approx_eq(face.normal, TOL), "triangle faces the wrong way");
        }
    }

    #[test]
    fn a_downward_face_triangulates_downward() {
        let vertices = square_vertices();
        let face = Face::planar(0, vec![3, 2, 1, 0], &vertices);
        for [a, b, c] in face.triangulate(&vertices) {
            let normal = vertices[b]
                .position
                .sub(vertices[a].position)
                .cross(vertices[c].position.sub(vertices[a].position))
                .normalize();
            assert!(normal.approx_eq(-Vec3::Z, TOL));
        }
    }

    #[test]
    fn a_degenerate_face_triangulates_to_nothing() {
        let vertices = square_vertices();
        let face = Face::planar(0, vec![0, 1], &vertices);
        assert!(face.triangulate(&vertices).is_empty());
        assert_eq!(face.area(&vertices), 0.0);
    }

    #[test]
    fn reversing_a_face_flips_its_normal_and_winding() {
        let vertices = square_vertices();
        let mut face = Face::planar(0, vec![0, 1, 2, 3], &vertices);
        let original = face.normal;
        face.reverse();
        assert!(face.normal.approx_eq(-original, TOL));
        assert_eq!(face.loops[0].vertex_ids, vec![3, 2, 1, 0]);
        assert!(face.flipped);
        // The area is unchanged; only the side it faces has moved.
        assert!((face.area(&vertices) - 1.0).abs() < TOL);
    }

    #[test]
    fn the_plane_follows_the_face_not_the_surface_when_flipped() {
        let vertices = square_vertices();
        let mut face = Face::planar(0, vec![0, 1, 2, 3], &vertices);
        assert!(face.plane(&vertices).normal.approx_eq(Vec3::Z, TOL));
        face.reverse();
        assert!(face.plane(&vertices).normal.approx_eq(-Vec3::Z, TOL));
    }

    #[test]
    fn contains_point_checks_the_plane_and_the_boundary() {
        let vertices = square_vertices();
        let face = Face::planar(0, vec![0, 1, 2, 3], &vertices);
        assert!(face.contains_point(Vec3::new(0.5, 0.5, 0.0), &vertices, TOL));
        assert!(!face.contains_point(Vec3::new(1.5, 0.5, 0.0), &vertices, TOL));
        // Off the plane, however well placed in x and y.
        assert!(!face.contains_point(Vec3::new(0.5, 0.5, 1.0), &vertices, TOL));
    }

    #[test]
    fn contains_point_excludes_holes() {
        let mut vertices = vec![
            Vertex::new(0, Vec3::new(0.0, 0.0, 0.0)),
            Vertex::new(1, Vec3::new(4.0, 0.0, 0.0)),
            Vertex::new(2, Vec3::new(4.0, 4.0, 0.0)),
            Vertex::new(3, Vec3::new(0.0, 4.0, 0.0)),
        ];
        for (index, (x, y)) in [(1.0, 1.0), (3.0, 1.0), (3.0, 3.0), (1.0, 3.0)]
            .into_iter()
            .enumerate()
        {
            vertices.push(Vertex::new(4 + index, Vec3::new(x, y, 0.0)));
        }
        let face = Face::planar_with_holes(0, vec![0, 1, 2, 3], vec![vec![4, 5, 6, 7]], &vertices);
        assert!(face.contains_point(Vec3::new(0.5, 0.5, 0.0), &vertices, TOL));
        assert!(!face.contains_point(Vec3::new(2.0, 2.0, 0.0), &vertices, TOL));
    }

    #[test]
    fn a_curved_face_reports_the_surface_normal_at_a_point() {
        // A strip of a cylinder about z, facing outwards.
        let vertices = vec![
            Vertex::new(0, Vec3::new(2.0, 0.0, 0.0)),
            Vertex::new(1, Vec3::new(0.0, 2.0, 0.0)),
            Vertex::new(2, Vec3::new(0.0, 2.0, 1.0)),
            Vertex::new(3, Vec3::new(2.0, 0.0, 1.0)),
        ];
        let surface = Surface::Cylinder { origin: Vec3::ZERO, axis: Vec3::Z, radius: 2.0 };
        let outward = Vec3::new(1.0, 1.0, 0.0).normalize();
        let face = Face::curved(0, vec![0, 1, 2, 3], surface, outward, &vertices);

        assert!(!face.flipped);
        assert!(face
            .normal_at(Vec3::new(2.0, 0.0, 0.5))
            .approx_eq(Vec3::X, TOL));
        assert!(face
            .normal_at(Vec3::new(0.0, 2.0, 0.5))
            .approx_eq(Vec3::Y, TOL));
        assert_eq!(face.surface.name(), "cylinder");
    }

    #[test]
    fn a_bore_faces_inwards_against_its_cylinder() {
        // The same strip, but the material is outside the cylinder, so the face
        // points at the axis.
        let vertices = vec![
            Vertex::new(0, Vec3::new(2.0, 0.0, 0.0)),
            Vertex::new(1, Vec3::new(0.0, 2.0, 0.0)),
            Vertex::new(2, Vec3::new(0.0, 2.0, 1.0)),
            Vertex::new(3, Vec3::new(2.0, 0.0, 1.0)),
        ];
        let surface = Surface::Cylinder { origin: Vec3::ZERO, axis: Vec3::Z, radius: 2.0 };
        let inward = -Vec3::new(1.0, 1.0, 0.0).normalize();
        let face = Face::curved(0, vec![0, 1, 2, 3], surface, inward, &vertices);

        assert!(face.flipped);
        assert!(face
            .normal_at(Vec3::new(2.0, 0.0, 0.5))
            .approx_eq(-Vec3::X, TOL));
    }

    #[test]
    fn normal_at_falls_back_where_the_surface_cannot_answer() {
        let vertices = square_vertices();
        let mut face = Face::planar(0, vec![0, 1, 2, 3], &vertices);
        face.surface = Surface::Nurbs;
        assert!(face.normal_at(Vec3::ZERO).approx_eq(Vec3::Z, TOL));
    }

    #[test]
    fn transforming_a_face_moves_its_surface_and_normal() {
        let vertices = square_vertices();
        let face = Face::planar(0, vec![0, 1, 2, 3], &vertices);
        let turned = face.transformed(&Mat4::rotation_x(core::f64::consts::FRAC_PI_2));
        assert!(turned.normal.approx_eq(-Vec3::Y, TOL));
        assert_eq!(turned.loops[0].vertex_ids, vec![0, 1, 2, 3]);
    }

    #[test]
    fn mirroring_a_face_reverses_its_loops() {
        let vertices = square_vertices();
        let face = Face::planar(0, vec![0, 1, 2, 3], &vertices);
        let mirrored = face.transformed(&Mat4::reflection(Vec3::ZERO, Vec3::X));
        assert_eq!(mirrored.loops[0].vertex_ids, vec![3, 2, 1, 0]);
    }

    #[test]
    fn segments_walk_every_loop() {
        let vertices = square_vertices();
        let face = Face::planar(0, vec![0, 1, 2, 3], &vertices);
        assert_eq!(face.segments().count(), 4);
        assert_eq!(face.vertex_ids().collect::<Vec<_>>(), vec![0, 1, 2, 3]);
        assert_eq!(face.outer_loop().len(), 4);
        assert!(face.inner_loops().is_empty());
    }

    #[test]
    fn round_trips_through_json() {
        let vertices = square_vertices();
        let face = Face::planar(7, vec![0, 1, 2, 3], &vertices);
        let json = serde_json::to_string(&face).unwrap();
        assert!(json.contains("vertexIds"));
        assert_eq!(serde_json::from_str::<Face>(&json).unwrap(), face);
    }
}
