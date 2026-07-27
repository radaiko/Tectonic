//! Triangle mesh storage.

use serde::{Deserialize, Serialize};

use crate::brep::BoundingBox;
use crate::math::{Mat4, Vec2, Vec3};

/// Floats per vertex: position, normal, texture coordinate.
pub const VERTEX_STRIDE: usize = 8;

/// A renderable triangle mesh.
///
/// Vertices are interleaved as `[x, y, z, nx, ny, nz, u, v]` in one `f32`
/// buffer. Interleaving matters at this boundary: the buffer is copied straight
/// out of WASM memory into a GPU vertex buffer, and a single copy of one array
/// beats three copies of three.
///
/// `f32` rather than `f64` for the same reason — the renderer wants 32-bit
/// floats, and converting 300k vertices on the JavaScript side would cost more
/// than the precision is worth for something about to be rasterized.
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MeshData {
    pub vertices: Vec<f32>,
    pub indices: Vec<u32>,
}

impl MeshData {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_capacity(vertices: usize, triangles: usize) -> Self {
        Self {
            vertices: Vec::with_capacity(vertices * VERTEX_STRIDE),
            indices: Vec::with_capacity(triangles * 3),
        }
    }

    pub fn vertex_count(&self) -> usize {
        self.vertices.len() / VERTEX_STRIDE
    }

    pub fn triangle_count(&self) -> usize {
        self.indices.len() / 3
    }

    pub fn is_empty(&self) -> bool {
        self.indices.is_empty()
    }

    /// Appends a vertex and returns its index.
    pub fn push_vertex(&mut self, position: Vec3, normal: Vec3, uv: Vec2) -> u32 {
        let index = self.vertex_count() as u32;
        self.vertices.extend_from_slice(&[
            position.x as f32,
            position.y as f32,
            position.z as f32,
            normal.x as f32,
            normal.y as f32,
            normal.z as f32,
            uv.x as f32,
            uv.y as f32,
        ]);
        index
    }

    pub fn push_triangle(&mut self, a: u32, b: u32, c: u32) {
        self.indices.extend_from_slice(&[a, b, c]);
    }

    pub fn position(&self, vertex: usize) -> Vec3 {
        let base = vertex * VERTEX_STRIDE;
        Vec3::new(
            self.vertices.get(base).copied().unwrap_or(0.0) as f64,
            self.vertices.get(base + 1).copied().unwrap_or(0.0) as f64,
            self.vertices.get(base + 2).copied().unwrap_or(0.0) as f64,
        )
    }

    pub fn normal(&self, vertex: usize) -> Vec3 {
        let base = vertex * VERTEX_STRIDE + 3;
        Vec3::new(
            self.vertices.get(base).copied().unwrap_or(0.0) as f64,
            self.vertices.get(base + 1).copied().unwrap_or(0.0) as f64,
            self.vertices.get(base + 2).copied().unwrap_or(0.0) as f64,
        )
    }

    pub fn uv(&self, vertex: usize) -> Vec2 {
        let base = vertex * VERTEX_STRIDE + 6;
        Vec2::new(
            self.vertices.get(base).copied().unwrap_or(0.0) as f64,
            self.vertices.get(base + 1).copied().unwrap_or(0.0) as f64,
        )
    }

    pub fn set_normal(&mut self, vertex: usize, normal: Vec3) {
        let base = vertex * VERTEX_STRIDE + 3;
        if base + 2 < self.vertices.len() {
            self.vertices[base] = normal.x as f32;
            self.vertices[base + 1] = normal.y as f32;
            self.vertices[base + 2] = normal.z as f32;
        }
    }

    /// The three corner indices of a triangle.
    pub fn triangle(&self, triangle: usize) -> Option<[usize; 3]> {
        let base = triangle * 3;
        Some([
            *self.indices.get(base)? as usize,
            *self.indices.get(base + 1)? as usize,
            *self.indices.get(base + 2)? as usize,
        ])
    }

    pub fn triangles(&self) -> impl Iterator<Item = [usize; 3]> + '_ {
        (0..self.triangle_count()).filter_map(|index| self.triangle(index))
    }

    pub fn bounding_box(&self) -> BoundingBox {
        BoundingBox::from_points((0..self.vertex_count()).map(|index| self.position(index)))
    }

    /// Total area of the triangles.
    pub fn surface_area(&self) -> f64 {
        self.triangles()
            .map(|[a, b, c]| {
                let (pa, pb, pc) = (self.position(a), self.position(b), self.position(c));
                pb.sub(pa).cross(pc.sub(pa)).length() * 0.5
            })
            .sum::<f64>()
    }

    /// Enclosed volume, by the divergence theorem. Only meaningful for a mesh
    /// that is watertight and wound outwards.
    pub fn volume(&self) -> f64 {
        let total: f64 = self
            .triangles()
            .map(|[a, b, c]| {
                self.position(a)
                    .dot(self.position(b).cross(self.position(c)))
            })
            .sum();
        (total / 6.0).abs()
    }

    /// Moves the mesh, taking the normals with it.
    pub fn transform(&mut self, transform: &Mat4) {
        let flips = transform.flips_orientation();
        for index in 0..self.vertex_count() {
            let position = transform.transform_point(self.position(index));
            let normal = transform.transform_normal(self.normal(index));
            let base = index * VERTEX_STRIDE;
            self.vertices[base] = position.x as f32;
            self.vertices[base + 1] = position.y as f32;
            self.vertices[base + 2] = position.z as f32;
            self.vertices[base + 3] = normal.x as f32;
            self.vertices[base + 4] = normal.y as f32;
            self.vertices[base + 5] = normal.z as f32;
        }
        if flips {
            // A mirror reverses every triangle's winding; swapping two corners
            // back keeps the front face facing front.
            for triangle in self.indices.chunks_exact_mut(3) {
                triangle.swap(1, 2);
            }
        }
    }

    /// Recomputes vertex normals from the triangles, area-weighted.
    ///
    /// Used for geometry that arrived position-first — an imported mesh, or the
    /// output of a boolean — so the normals agree with the winding rather than
    /// with whatever the source claimed.
    pub fn recompute_normals(&mut self) {
        let mut accumulated = vec![Vec3::ZERO; self.vertex_count()];
        for [a, b, c] in self.triangles().collect::<Vec<_>>() {
            let (pa, pb, pc) = (self.position(a), self.position(b), self.position(c));
            // Not normalized: the cross product's length is twice the triangle's
            // area, which is exactly the weight a large facet should carry.
            let weighted = pb.sub(pa).cross(pc.sub(pa));
            for corner in [a, b, c] {
                if let Some(slot) = accumulated.get_mut(corner) {
                    *slot += weighted;
                }
            }
        }
        for (index, normal) in accumulated.into_iter().enumerate() {
            self.set_normal(index, normal.normalize());
        }
    }

    /// Fuses vertices that share a position, normal and texture coordinate.
    pub fn deduplicate(&mut self, tolerance: f64) {
        if self.vertices.is_empty() {
            return;
        }
        let quantum = tolerance.max(1e-9);
        let mut lookup: std::collections::HashMap<[i64; 8], u32> = std::collections::HashMap::new();
        let mut remap = vec![0u32; self.vertex_count()];
        let mut vertices: Vec<f32> = Vec::with_capacity(self.vertices.len());

        for index in 0..self.vertex_count() {
            let base = index * VERTEX_STRIDE;
            let slice = &self.vertices[base..base + VERTEX_STRIDE];
            let mut key = [0i64; VERTEX_STRIDE];
            for (slot, &value) in key.iter_mut().zip(slice.iter()) {
                *slot = (value as f64 / quantum).round() as i64;
            }
            match lookup.get(&key) {
                Some(&existing) => remap[index] = existing,
                None => {
                    let new_index = (vertices.len() / VERTEX_STRIDE) as u32;
                    vertices.extend_from_slice(slice);
                    lookup.insert(key, new_index);
                    remap[index] = new_index;
                }
            }
        }

        self.vertices = vertices;
        for index in &mut self.indices {
            *index = remap[*index as usize];
        }
        // A collapse can leave a triangle with two corners at the same vertex.
        self.remove_degenerate_triangles();
    }

    /// Drops triangles with a repeated corner or no area.
    pub fn remove_degenerate_triangles(&mut self) {
        let kept: Vec<u32> = self
            .triangles()
            .filter(|&[a, b, c]| {
                if a == b || b == c || a == c {
                    return false;
                }
                let (pa, pb, pc) = (self.position(a), self.position(b), self.position(c));
                pb.sub(pa).cross(pc.sub(pa)).length() > 1e-18
            })
            .flat_map(|[a, b, c]| [a as u32, b as u32, c as u32])
            .collect();
        self.indices = kept;
    }

    /// Turns every triangle inside out.
    pub fn flip_winding(&mut self) {
        for triangle in self.indices.chunks_exact_mut(3) {
            triangle.swap(1, 2);
        }
        for index in 0..self.vertex_count() {
            self.set_normal(index, -self.normal(index));
        }
    }

    /// Appends another mesh, shifting its indices into place.
    pub fn append(&mut self, other: &Self) {
        let offset = self.vertex_count() as u32;
        self.vertices.extend_from_slice(&other.vertices);
        self.indices
            .extend(other.indices.iter().map(|index| index + offset));
    }

    /// The three separate arrays the TypeScript `MeshData` uses.
    pub fn to_arrays(&self) -> (Vec<f64>, Vec<f64>, Vec<u32>) {
        let count = self.vertex_count();
        let mut positions = Vec::with_capacity(count * 3);
        let mut normals = Vec::with_capacity(count * 3);
        for index in 0..count {
            let position = self.position(index);
            let normal = self.normal(index);
            positions.extend_from_slice(&[position.x, position.y, position.z]);
            normals.extend_from_slice(&[normal.x, normal.y, normal.z]);
        }
        (positions, normals, self.indices.clone())
    }

    /// Builds a mesh from separate position, normal and index arrays. Missing
    /// normals are derived from the winding.
    pub fn from_arrays(positions: &[f64], normals: &[f64], indices: &[u32]) -> Self {
        let count = positions.len() / 3;
        let mut mesh = Self::with_capacity(count, indices.len() / 3);
        for index in 0..count {
            let position = Vec3::new(
                positions[index * 3],
                positions[index * 3 + 1],
                positions[index * 3 + 2],
            );
            let normal = if normals.len() >= (index + 1) * 3 {
                Vec3::new(
                    normals[index * 3],
                    normals[index * 3 + 1],
                    normals[index * 3 + 2],
                )
            } else {
                Vec3::ZERO
            };
            mesh.push_vertex(position, normal, Vec2::ZERO);
        }
        mesh.indices = indices.to_vec();
        if normals.len() < positions.len() {
            mesh.recompute_normals();
        }
        mesh
    }
}

/// Concatenates meshes into one.
pub fn merge(meshes: &[MeshData]) -> MeshData {
    let vertices: usize = meshes.iter().map(|mesh| mesh.vertex_count()).sum();
    let triangles: usize = meshes.iter().map(|mesh| mesh.triangle_count()).sum();
    let mut merged = MeshData::with_capacity(vertices, triangles);
    for mesh in meshes {
        merged.append(mesh);
    }
    merged
}

#[cfg(test)]
mod tests {
    use super::*;

    const TOL: f64 = 1e-6;

    /// A single triangle in the z = 0 plane, facing +Z.
    fn triangle() -> MeshData {
        let mut mesh = MeshData::new();
        mesh.push_vertex(Vec3::ZERO, Vec3::Z, Vec2::ZERO);
        mesh.push_vertex(Vec3::new(2.0, 0.0, 0.0), Vec3::Z, Vec2::new(1.0, 0.0));
        mesh.push_vertex(Vec3::new(0.0, 2.0, 0.0), Vec3::Z, Vec2::new(0.0, 1.0));
        mesh.push_triangle(0, 1, 2);
        mesh
    }

    /// A closed unit cube, six quads split into twelve triangles.
    fn cube() -> MeshData {
        let corners = [
            Vec3::new(0.0, 0.0, 0.0),
            Vec3::new(1.0, 0.0, 0.0),
            Vec3::new(1.0, 1.0, 0.0),
            Vec3::new(0.0, 1.0, 0.0),
            Vec3::new(0.0, 0.0, 1.0),
            Vec3::new(1.0, 0.0, 1.0),
            Vec3::new(1.0, 1.0, 1.0),
            Vec3::new(0.0, 1.0, 1.0),
        ];
        let quads = [
            ([0, 3, 2, 1], Vec3::new(0.0, 0.0, -1.0)),
            ([4, 5, 6, 7], Vec3::Z),
            ([0, 1, 5, 4], Vec3::new(0.0, -1.0, 0.0)),
            ([1, 2, 6, 5], Vec3::X),
            ([2, 3, 7, 6], Vec3::Y),
            ([3, 0, 4, 7], Vec3::new(-1.0, 0.0, 0.0)),
        ];
        let mut mesh = MeshData::new();
        for (quad, normal) in quads {
            let base = mesh.vertex_count() as u32;
            for &corner in &quad {
                mesh.push_vertex(corners[corner], normal, Vec2::ZERO);
            }
            mesh.push_triangle(base, base + 1, base + 2);
            mesh.push_triangle(base, base + 2, base + 3);
        }
        mesh
    }

    #[test]
    fn an_empty_mesh_has_nothing_in_it() {
        let mesh = MeshData::new();
        assert!(mesh.is_empty());
        assert_eq!(mesh.vertex_count(), 0);
        assert_eq!(mesh.triangle_count(), 0);
        assert!(mesh.bounding_box().is_empty());
        assert_eq!(mesh.volume(), 0.0);
        assert_eq!(mesh.surface_area(), 0.0);
        assert_eq!(MeshData::default(), mesh);
    }

    #[test]
    fn vertices_are_stored_interleaved() {
        let mesh = triangle();
        assert_eq!(mesh.vertices.len(), 3 * VERTEX_STRIDE);
        assert_eq!(mesh.vertex_count(), 3);
        assert_eq!(mesh.triangle_count(), 1);
        assert!(mesh.position(1).approx_eq(Vec3::new(2.0, 0.0, 0.0), TOL));
        assert!(mesh.normal(1).approx_eq(Vec3::Z, TOL));
        assert!(mesh.uv(1).approx_eq(Vec2::new(1.0, 0.0), TOL));
    }

    #[test]
    fn reading_past_the_end_gives_zeroes_rather_than_panicking() {
        let mesh = triangle();
        assert_eq!(mesh.position(99), Vec3::ZERO);
        assert_eq!(mesh.normal(99), Vec3::ZERO);
        assert_eq!(mesh.uv(99), Vec2::ZERO);
        assert_eq!(mesh.triangle(99), None);
    }

    #[test]
    fn setting_a_normal_out_of_range_is_ignored() {
        let mut mesh = triangle();
        mesh.set_normal(99, Vec3::X);
        assert_eq!(mesh.vertex_count(), 3);
    }

    #[test]
    fn area_and_bounds_of_a_triangle() {
        let mesh = triangle();
        assert!((mesh.surface_area() - 2.0).abs() < TOL);
        let bounds = mesh.bounding_box();
        assert!(bounds.min.approx_eq(Vec3::ZERO, TOL));
        assert!(bounds.max.approx_eq(Vec3::new(2.0, 2.0, 0.0), TOL));
    }

    #[test]
    fn a_closed_cube_reports_its_volume_and_area() {
        let mesh = cube();
        assert_eq!(mesh.triangle_count(), 12);
        assert!((mesh.volume() - 1.0).abs() < TOL);
        assert!((mesh.surface_area() - 6.0).abs() < TOL);
    }

    #[test]
    fn recomputing_normals_follows_the_winding() {
        let mut mesh = triangle();
        mesh.set_normal(0, Vec3::ZERO);
        mesh.set_normal(1, Vec3::X);
        mesh.set_normal(2, -Vec3::Z);
        mesh.recompute_normals();
        for index in 0..3 {
            assert!(mesh.normal(index).approx_eq(Vec3::Z, TOL));
        }
    }

    #[test]
    fn recomputed_normals_are_area_weighted() {
        // Two triangles sharing a vertex, one much larger than the other. The
        // shared normal should lean towards the larger one's plane.
        let mut mesh = MeshData::new();
        mesh.push_vertex(Vec3::ZERO, Vec3::ZERO, Vec2::ZERO);
        mesh.push_vertex(Vec3::new(10.0, 0.0, 0.0), Vec3::ZERO, Vec2::ZERO);
        mesh.push_vertex(Vec3::new(0.0, 10.0, 0.0), Vec3::ZERO, Vec2::ZERO);
        mesh.push_vertex(Vec3::new(0.0, 0.0, 0.1), Vec3::ZERO, Vec2::ZERO);
        mesh.push_triangle(0, 1, 2);
        mesh.push_triangle(0, 2, 3);
        mesh.recompute_normals();
        // The big +Z-facing triangle dominates the shared corner.
        assert!(mesh.normal(0).z > 0.9);
        assert!((mesh.normal(0).length() - 1.0).abs() < TOL);
    }

    #[test]
    fn transforming_moves_positions_and_normals() {
        let mut mesh = triangle();
        mesh.transform(&Mat4::rotation_x(core::f64::consts::FRAC_PI_2));
        // A quarter turn about x carries +Y onto +Z and +Z onto -Y.
        assert!(mesh.normal(0).approx_eq(-Vec3::Y, TOL));
        assert!(mesh.position(2).approx_eq(Vec3::new(0.0, 0.0, 2.0), TOL));
    }

    #[test]
    fn mirroring_keeps_the_front_face_forward() {
        let mut mesh = cube();
        let before = mesh.volume();
        mesh.transform(&Mat4::reflection(Vec3::ZERO, Vec3::X));
        assert!((mesh.volume() - before).abs() < TOL);
        // Winding was corrected, so the outward normals still agree with it.
        for [a, b, c] in mesh.triangles() {
            let (pa, pb, pc) = (mesh.position(a), mesh.position(b), mesh.position(c));
            let facet = pb.sub(pa).cross(pc.sub(pa)).normalize();
            assert!(facet.dot(mesh.normal(a)) > 0.5);
        }
    }

    #[test]
    fn flipping_the_winding_flips_the_normals_too() {
        let mut mesh = triangle();
        mesh.flip_winding();
        assert_eq!(mesh.indices, vec![0, 2, 1]);
        assert!(mesh.normal(0).approx_eq(-Vec3::Z, TOL));
    }

    #[test]
    fn deduplicate_fuses_identical_vertices() {
        let mut mesh = MeshData::new();
        for _ in 0..2 {
            let base = mesh.vertex_count() as u32;
            mesh.push_vertex(Vec3::ZERO, Vec3::Z, Vec2::ZERO);
            mesh.push_vertex(Vec3::X, Vec3::Z, Vec2::ZERO);
            mesh.push_vertex(Vec3::Y, Vec3::Z, Vec2::ZERO);
            mesh.push_triangle(base, base + 1, base + 2);
        }
        assert_eq!(mesh.vertex_count(), 6);
        mesh.deduplicate(1e-6);
        assert_eq!(mesh.vertex_count(), 3);
        assert_eq!(mesh.triangle_count(), 2);
    }

    #[test]
    fn deduplicate_keeps_vertices_that_differ_only_in_normal() {
        // A cube's corner belongs to three faces with three different normals;
        // fusing them would round off every edge in the render.
        let mut mesh = MeshData::new();
        mesh.push_vertex(Vec3::ZERO, Vec3::Z, Vec2::ZERO);
        mesh.push_vertex(Vec3::ZERO, Vec3::X, Vec2::ZERO);
        mesh.push_vertex(Vec3::ZERO, Vec3::Y, Vec2::ZERO);
        mesh.deduplicate(1e-6);
        assert_eq!(mesh.vertex_count(), 3);
    }

    #[test]
    fn deduplicate_on_an_empty_mesh_is_a_no_op() {
        let mut mesh = MeshData::new();
        mesh.deduplicate(1e-6);
        assert!(mesh.is_empty());
    }

    #[test]
    fn degenerate_triangles_are_removed() {
        let mut mesh = triangle();
        mesh.push_triangle(0, 0, 1);
        let flat = mesh.push_vertex(Vec3::new(1.0, 0.0, 0.0), Vec3::Z, Vec2::ZERO);
        mesh.push_triangle(0, 1, flat);
        assert_eq!(mesh.triangle_count(), 3);
        mesh.remove_degenerate_triangles();
        assert_eq!(mesh.triangle_count(), 1);
    }

    #[test]
    fn append_shifts_the_second_mesh_into_place() {
        let mut mesh = triangle();
        mesh.append(&triangle());
        assert_eq!(mesh.vertex_count(), 6);
        assert_eq!(mesh.triangle_count(), 2);
        assert_eq!(mesh.triangle(1), Some([3, 4, 5]));
    }

    #[test]
    fn merge_concatenates_a_list() {
        let merged = merge(&[triangle(), triangle(), MeshData::new()]);
        assert_eq!(merged.vertex_count(), 6);
        assert_eq!(merged.triangle_count(), 2);
        assert!(merge(&[]).is_empty());
    }

    #[test]
    fn arrays_round_trip() {
        let mesh = cube();
        let (positions, normals, indices) = mesh.to_arrays();
        assert_eq!(positions.len(), mesh.vertex_count() * 3);
        assert_eq!(normals.len(), mesh.vertex_count() * 3);

        let rebuilt = MeshData::from_arrays(&positions, &normals, &indices);
        assert_eq!(rebuilt.vertex_count(), mesh.vertex_count());
        assert!((rebuilt.volume() - 1.0).abs() < TOL);
        for index in 0..mesh.vertex_count() {
            assert!(rebuilt.position(index).approx_eq(mesh.position(index), TOL));
            assert!(rebuilt.normal(index).approx_eq(mesh.normal(index), TOL));
        }
    }

    #[test]
    fn from_arrays_derives_missing_normals() {
        let positions = vec![0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0];
        let mesh = MeshData::from_arrays(&positions, &[], &[0, 1, 2]);
        assert_eq!(mesh.vertex_count(), 3);
        for index in 0..3 {
            assert!(mesh.normal(index).approx_eq(Vec3::Z, TOL));
        }
    }

    #[test]
    fn with_capacity_reserves_without_filling() {
        let mesh = MeshData::with_capacity(10, 4);
        assert_eq!(mesh.vertex_count(), 0);
        assert!(mesh.vertices.capacity() >= 10 * VERTEX_STRIDE);
    }

    #[test]
    fn round_trips_through_json() {
        let mesh = triangle();
        let json = serde_json::to_string(&mesh).unwrap();
        assert_eq!(serde_json::from_str::<MeshData>(&json).unwrap(), mesh);
    }
}
