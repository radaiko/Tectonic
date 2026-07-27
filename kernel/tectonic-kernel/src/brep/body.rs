//! Bodies — a complete B-Rep solid or shell.

use std::cmp::Ordering;
use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::math::{Mat4, Plane, Vec3};

use super::{
    BoundingBox, CurveType, Edge, EdgeId, Face, FaceId, HalfEdge, Orientation, Shell, Vertex,
    VertexId,
};

/// Mass and inertia of a solid, at unit density.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MassProperties {
    pub volume: f64,
    pub surface_area: f64,
    pub center_of_mass: Vec3,
    /// Inertia about the centre of mass, row-major 3x3. Symmetric.
    pub inertia: [f64; 9],
}

/// The face, edge and vertex identifiers a host-side selection can name.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Topology {
    pub face_ids: Vec<String>,
    pub edge_ids: Vec<String>,
    pub vertex_ids: Vec<String>,
}

/// A solid or shell: vertices, the faces built on them, and the edge and
/// half-edge structure derived from those faces.
///
/// `edges`, `half_edges` and `shells` are derived, never authored. Every
/// constructor and mutator here ends by calling [`Body::rebuild_topology`], so
/// they always agree with `faces`; a body assembled by hand from JSON should
/// call it once before asking about solidity.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Body {
    /// Host-assigned handle. Empty until the caller names it.
    #[serde(default)]
    pub id: String,
    pub vertices: Vec<Vertex>,
    pub faces: Vec<Face>,
    #[serde(default)]
    pub edges: Vec<Edge>,
    #[serde(default)]
    pub half_edges: Vec<HalfEdge>,
    #[serde(default)]
    pub shells: Vec<Shell>,
}

impl Body {
    pub fn empty() -> Self {
        Self {
            id: String::new(),
            vertices: Vec::new(),
            faces: Vec::new(),
            edges: Vec::new(),
            half_edges: Vec::new(),
            shells: Vec::new(),
        }
    }

    /// Assembles a body from vertices and faces, deriving the rest.
    pub fn new(vertices: Vec<Vertex>, faces: Vec<Face>) -> Self {
        let mut body = Self { vertices, faces, ..Self::empty() };
        body.rebuild_topology();
        body
    }

    pub fn with_id(mut self, id: impl Into<String>) -> Self {
        self.id = id.into();
        self
    }

    pub fn is_empty(&self) -> bool {
        self.faces.is_empty()
    }

    /// Adds a vertex and returns its id.
    pub fn add_vertex(&mut self, position: Vec3) -> VertexId {
        let id = self.vertices.len();
        self.vertices.push(Vertex::new(id, position));
        id
    }

    /// Adds a planar face from a loop of existing vertices, returning its id.
    pub fn add_face(&mut self, vertex_ids: Vec<VertexId>) -> FaceId {
        let id = self.faces.len();
        let face = Face::planar(id, vertex_ids, &self.vertices);
        self.faces.push(face);
        id
    }

    /// Adds an already-built face, renumbering it into this body.
    pub fn push_face(&mut self, mut face: Face) -> FaceId {
        let id = self.faces.len();
        face.id = id;
        self.faces.push(face);
        id
    }

    pub fn position(&self, vertex: VertexId) -> Vec3 {
        self.vertices
            .get(vertex)
            .map(|v| v.position)
            .unwrap_or(Vec3::ZERO)
    }

    /// Rebuilds edges, half-edges and shells from the faces.
    ///
    /// Two faces meeting along a segment produce one edge with two opposing
    /// half-edges. Everything the topology can answer — solidity, neighbours,
    /// which faces form one lump — falls out of that pairing.
    pub fn rebuild_topology(&mut self) {
        for (index, face) in self.faces.iter_mut().enumerate() {
            face.id = index;
        }
        for (index, vertex) in self.vertices.iter_mut().enumerate() {
            vertex.id = index;
        }

        self.edges.clear();
        self.half_edges.clear();

        let mut edge_lookup: HashMap<(VertexId, VertexId), EdgeId> = HashMap::new();
        // Collected per loop so `next`/`prev` can be wired once the loop's
        // half-edges all have ids.
        let mut loop_runs: Vec<Vec<usize>> = Vec::new();

        for face in &self.faces {
            for face_loop in &face.loops {
                if face_loop.len() < 2 {
                    continue;
                }
                let mut run = Vec::with_capacity(face_loop.len());
                for (from, to) in face_loop.segments() {
                    let key = if from <= to { (from, to) } else { (to, from) };
                    let edge_id = *edge_lookup.entry(key).or_insert_with(|| {
                        let id = self.edges.len();
                        self.edges.push(Edge::line(id, from, to));
                        id
                    });
                    let orientation = if self.edges[edge_id].vertex_ids == [from, to] {
                        Orientation::Forward
                    } else {
                        Orientation::Reversed
                    };
                    let id = self.half_edges.len();
                    run.push(id);
                    self.half_edges.push(HalfEdge {
                        id,
                        edge_id,
                        face_id: face.id,
                        orientation,
                        origin: from,
                        next: id,
                        prev: id,
                        twin: None,
                    });
                }
                loop_runs.push(run);
            }
        }

        for run in &loop_runs {
            let count = run.len();
            for (position, &id) in run.iter().enumerate() {
                self.half_edges[id].next = run[(position + 1) % count];
                self.half_edges[id].prev = run[(position + count - 1) % count];
            }
        }

        self.pair_twins();
        self.rebuild_shells();
    }

    /// Links each half-edge to the opposing use of the same edge. Edges used by
    /// more than two faces are non-manifold and are left unpaired rather than
    /// picking a neighbour arbitrarily.
    fn pair_twins(&mut self) {
        let mut uses: HashMap<EdgeId, Vec<usize>> = HashMap::new();
        for half_edge in &self.half_edges {
            uses.entry(half_edge.edge_id).or_default().push(half_edge.id);
        }
        for (_, group) in uses {
            if group.len() != 2 {
                continue;
            }
            let (a, b) = (group[0], group[1]);
            if self.half_edges[a].orientation == self.half_edges[b].orientation {
                // Both faces walk the edge the same way, so their normals
                // disagree. Not a manifold pairing.
                continue;
            }
            self.half_edges[a].twin = Some(b);
            self.half_edges[b].twin = Some(a);
        }
    }

    /// Groups faces into connected shells by walking twin links.
    fn rebuild_shells(&mut self) {
        self.shells.clear();
        if self.faces.is_empty() {
            return;
        }

        let mut adjacency: Vec<Vec<FaceId>> = vec![Vec::new(); self.faces.len()];
        for half_edge in &self.half_edges {
            if let Some(twin) = half_edge.twin {
                let neighbour = self.half_edges[twin].face_id;
                adjacency[half_edge.face_id].push(neighbour);
            }
        }

        let mut shell_of: Vec<Option<usize>> = vec![None; self.faces.len()];
        for start in 0..self.faces.len() {
            if shell_of[start].is_some() {
                continue;
            }
            let shell_index = self.shells.len();
            let mut members = Vec::new();
            let mut stack = vec![start];
            shell_of[start] = Some(shell_index);
            while let Some(face) = stack.pop() {
                members.push(face);
                for &neighbour in &adjacency[face] {
                    if shell_of[neighbour].is_none() {
                        shell_of[neighbour] = Some(shell_index);
                        stack.push(neighbour);
                    }
                }
            }
            members.sort_unstable();
            self.shells.push(Shell::new(shell_index, members, false));
        }

        // A shell is closed when none of its half-edges lack a twin.
        let mut open: Vec<bool> = vec![false; self.shells.len()];
        for half_edge in &self.half_edges {
            if half_edge.twin.is_none() {
                if let Some(shell) = shell_of[half_edge.face_id] {
                    open[shell] = true;
                }
            }
        }
        for (index, shell) in self.shells.iter_mut().enumerate() {
            shell.closed = !open[index];
        }
    }

    /// Every triangle of every face, as vertex ids wound outwards.
    pub fn triangles(&self) -> Vec<[VertexId; 3]> {
        self.faces
            .iter()
            .flat_map(|face| face.triangulate(&self.vertices))
            .collect()
    }

    pub fn bounding_box(&self) -> BoundingBox {
        BoundingBox::from_points(self.vertices.iter().map(|vertex| vertex.position))
    }

    /// True when every edge is shared by exactly two oppositely-wound faces —
    /// the condition for the body to enclose a volume.
    pub fn is_solid(&self) -> bool {
        !self.faces.is_empty()
            && !self.half_edges.is_empty()
            && self.half_edges.iter().all(|half| half.twin.is_some())
    }

    /// True when the topology is internally consistent: no dangling vertex
    /// references, no degenerate loops, and every face carries a real normal.
    pub fn is_valid(&self) -> bool {
        // Nothing to be inconsistent with. Loose vertices left behind by a weld
        // are unused points, not a broken topology.
        if self.faces.is_empty() {
            return true;
        }
        for face in &self.faces {
            if face.loops.is_empty() || face.outer_loop().len() < 3 {
                return false;
            }
            if !face.normal.is_finite() || face.normal.length() < 0.5 {
                return false;
            }
            for face_loop in &face.loops {
                for &vertex in &face_loop.vertex_ids {
                    if vertex >= self.vertices.len() {
                        return false;
                    }
                }
            }
        }
        self.vertices.iter().all(|vertex| vertex.position.is_finite())
    }

    /// The boundary edges — those with a face on one side only. Empty for a
    /// closed solid.
    pub fn boundary_edges(&self) -> Vec<EdgeId> {
        let mut ids: Vec<EdgeId> = self
            .half_edges
            .iter()
            .filter(|half| half.twin.is_none())
            .map(|half| half.edge_id)
            .collect();
        ids.sort_unstable();
        ids.dedup();
        ids
    }

    pub fn surface_area(&self) -> f64 {
        self.faces
            .iter()
            .map(|face| face.area(&self.vertices))
            .sum()
    }

    /// Enclosed volume, by the divergence theorem over the triangulated
    /// boundary. Zero for an open shell, and negative if the faces are wound
    /// inwards — the sign is a useful check that orientation survived an
    /// operation, so it is not taken as an absolute value here.
    pub fn signed_volume(&self) -> f64 {
        let mut total = 0.0;
        for [a, b, c] in self.triangles() {
            let (pa, pb, pc) = (self.position(a), self.position(b), self.position(c));
            total += pa.dot(pb.cross(pc));
        }
        total / 6.0
    }

    pub fn volume(&self) -> f64 {
        self.signed_volume().abs()
    }

    /// Volume, surface area, centre of mass and inertia in one pass.
    ///
    /// Each boundary triangle is closed into a tetrahedron at the origin and
    /// the signed contributions are summed, so the parts of the model that face
    /// away cancel the parts that face towards — the same trick as the volume,
    /// carried through to the second moments.
    pub fn mass_properties(&self) -> MassProperties {
        // Covariance about the origin, accumulated over the tetrahedra.
        let mut covariance = [[0.0f64; 3]; 3];
        let mut volume = 0.0;
        let mut weighted_center = Vec3::ZERO;

        // The covariance of the canonical tetrahedron (0, e1, e2, e3).
        const CANONICAL: [[f64; 3]; 3] = [
            [1.0 / 60.0, 1.0 / 120.0, 1.0 / 120.0],
            [1.0 / 120.0, 1.0 / 60.0, 1.0 / 120.0],
            [1.0 / 120.0, 1.0 / 120.0, 1.0 / 60.0],
        ];

        for [ia, ib, ic] in self.triangles() {
            let (a, b, c) = (self.position(ia), self.position(ib), self.position(ic));
            let determinant = a.dot(b.cross(c));
            let tetrahedron_volume = determinant / 6.0;
            volume += tetrahedron_volume;
            weighted_center += a.add(b).add(c).scale(tetrahedron_volume / 4.0);

            // columns of A
            let matrix = [[a.x, b.x, c.x], [a.y, b.y, c.y], [a.z, b.z, c.z]];
            // A * CANONICAL * A^T, scaled by det(A).
            for row in 0..3 {
                for col in 0..3 {
                    let mut sum = 0.0;
                    for i in 0..3 {
                        for j in 0..3 {
                            sum += matrix[row][i] * CANONICAL[i][j] * matrix[col][j];
                        }
                    }
                    covariance[row][col] += determinant * sum;
                }
            }
        }

        let center_of_mass = if volume.abs() > crate::math::EPSILON {
            weighted_center.scale(1.0 / volume)
        } else {
            self.bounding_box().center()
        };

        // Shift the covariance to the centre of mass, then convert to inertia.
        let com = center_of_mass.to_array();
        let mut central = covariance;
        for row in 0..3 {
            for col in 0..3 {
                central[row][col] -= volume * com[row] * com[col];
            }
        }
        let trace = central[0][0] + central[1][1] + central[2][2];
        let mut inertia = [0.0f64; 9];
        for row in 0..3 {
            for col in 0..3 {
                let diagonal = if row == col { trace } else { 0.0 };
                inertia[row * 3 + col] = diagonal - central[row][col];
            }
        }

        // A body wound inwards reports a negative volume; the mass and its
        // moments are still positive quantities.
        if volume < 0.0 {
            for value in inertia.iter_mut() {
                *value = -*value;
            }
        }

        MassProperties {
            volume: volume.abs(),
            surface_area: self.surface_area(),
            center_of_mass,
            inertia,
        }
    }

    /// Moves every vertex, and carries the faces' surfaces and normals with it.
    pub fn transform(&mut self, transform: &Mat4) {
        for vertex in &mut self.vertices {
            vertex.position = transform.transform_point(vertex.position);
        }
        self.faces = self
            .faces
            .iter()
            .map(|face| face.transformed(transform))
            .collect();
        self.rebuild_topology();
    }

    pub fn transformed(&self, transform: &Mat4) -> Self {
        let mut moved = self.clone();
        moved.transform(transform);
        moved
    }

    /// Turns the body inside out.
    pub fn reverse(&mut self) {
        for face in &mut self.faces {
            face.reverse();
        }
        self.rebuild_topology();
    }

    /// Appends another body's geometry, shifting its vertex references.
    pub fn merge(&mut self, other: &Self) {
        let offset = self.vertices.len();
        for vertex in &other.vertices {
            let id = self.vertices.len();
            self.vertices.push(Vertex::new(id, vertex.position));
        }
        for face in &other.faces {
            let mut shifted = face.clone();
            shifted.id = self.faces.len();
            for face_loop in &mut shifted.loops {
                for vertex in &mut face_loop.vertex_ids {
                    *vertex += offset;
                }
            }
            self.faces.push(shifted);
        }
        self.rebuild_topology();
    }

    /// Fuses vertices closer than `tolerance`, drops the loop entries and faces
    /// that collapse as a result, and rebuilds.
    ///
    /// Operations that cut geometry — booleans above all — produce the same
    /// point independently on each side of a cut. Until those duplicates are
    /// fused the faces share no vertex ids, so no edge is shared, and the
    /// result looks like a pile of loose triangles rather than a solid.
    pub fn weld(&mut self, tolerance: f64) {
        if self.vertices.is_empty() {
            return;
        }
        let tolerance = tolerance.max(crate::math::EPSILON);
        // A grid one tolerance wide: coincident points land in the same cell or
        // an adjacent one, so only 27 cells need checking per point.
        let cell = tolerance * 2.0;
        let key_of = |position: Vec3| {
            (
                (position.x / cell).floor() as i64,
                (position.y / cell).floor() as i64,
                (position.z / cell).floor() as i64,
            )
        };

        let mut buckets: HashMap<(i64, i64, i64), Vec<VertexId>> = HashMap::new();
        let mut remap = vec![usize::MAX; self.vertices.len()];
        let mut kept: Vec<Vertex> = Vec::with_capacity(self.vertices.len());

        for (index, vertex) in self.vertices.iter().enumerate() {
            let key = key_of(vertex.position);
            let mut found = None;
            'search: for dx in -1..=1 {
                for dy in -1..=1 {
                    for dz in -1..=1 {
                        let neighbour = (key.0 + dx, key.1 + dy, key.2 + dz);
                        for &candidate in buckets.get(&neighbour).into_iter().flatten() {
                            if kept[candidate].position.distance(vertex.position) <= tolerance {
                                found = Some(candidate);
                                break 'search;
                            }
                        }
                    }
                }
            }
            let target = found.unwrap_or_else(|| {
                let id = kept.len();
                kept.push(Vertex::new(id, vertex.position));
                buckets.entry(key).or_default().push(id);
                id
            });
            remap[index] = target;
        }

        self.vertices = kept;
        for face in &mut self.faces {
            for face_loop in &mut face.loops {
                let mut rewritten: Vec<VertexId> = face_loop
                    .vertex_ids
                    .iter()
                    .map(|&id| remap.get(id).copied().unwrap_or(id))
                    .collect();
                rewritten.dedup();
                // The loop wraps, so a repeat across the seam collapses too.
                while rewritten.len() > 1 && rewritten.first() == rewritten.last() {
                    rewritten.pop();
                }
                face_loop.vertex_ids = rewritten;
            }
            face.loops.retain(|face_loop| face_loop.len() >= 3);
        }
        self.faces
            .retain(|face| !face.loops.is_empty() && face.outer_loop().len() >= 3);
        self.rebuild_topology();
    }

    /// Adds a loop entry wherever one face's corner lands part-way along
    /// another face's edge, so the two share an edge instead of crossing it.
    ///
    /// Cutting geometry leaves these T-junctions everywhere: a boolean splits
    /// the facet it cuts through but not the untouched facet next door, so the
    /// long edge and the two short ones that lie along it are three different
    /// edges and none of them pairs up. The body is watertight to look at and
    /// reports itself open. Inserting the corner into the long edge costs one
    /// collinear point and makes the pairing come out.
    pub fn heal_t_junctions(&mut self, tolerance: f64) {
        if self.vertices.is_empty() || self.faces.is_empty() {
            return;
        }
        let tolerance = tolerance.max(crate::math::EPSILON);
        // Coarse enough that a long edge does not walk thousands of cells, fine
        // enough that a cell holds a handful of points rather than all of them.
        let cell = (self.bounding_box().diagonal() / 64.0).max(tolerance * 4.0);

        let positions: Vec<Vec3> = self.vertices.iter().map(|v| v.position).collect();
        let mut grid: HashMap<(i64, i64, i64), Vec<VertexId>> = HashMap::new();
        for (id, &position) in positions.iter().enumerate() {
            grid.entry(cell_of(position, cell)).or_default().push(id);
        }

        let mut inserted = 0usize;
        for face in &mut self.faces {
            for face_loop in &mut face.loops {
                let count = face_loop.vertex_ids.len();
                let mut rebuilt = Vec::with_capacity(count);
                for index in 0..count {
                    let start = face_loop.vertex_ids[index];
                    let end = face_loop.vertex_ids[(index + 1) % count];
                    rebuilt.push(start);

                    let (from, to) = (positions[start], positions[end]);
                    let span = to.sub(from);
                    let length_squared = span.length_squared();
                    if length_squared <= tolerance * tolerance {
                        continue;
                    }

                    let mut landing: Vec<(f64, VertexId)> = Vec::new();
                    for candidate in near_segment(&grid, cell, from, to) {
                        if candidate == start || candidate == end {
                            continue;
                        }
                        let point = positions[candidate];
                        let along = point.sub(from).dot(span) / length_squared;
                        if !(0.0..=1.0).contains(&along) {
                            continue;
                        }
                        if from.lerp(to, along).distance(point) > tolerance {
                            continue;
                        }
                        // Within tolerance of an end is that end, not a junction.
                        if point.distance(from) <= tolerance || point.distance(to) <= tolerance {
                            continue;
                        }
                        landing.push((along, candidate));
                    }
                    landing.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(Ordering::Equal));
                    landing.dedup_by_key(|entry| entry.1);
                    inserted += landing.len();
                    rebuilt.extend(landing.into_iter().map(|entry| entry.1));
                }
                face_loop.vertex_ids = rebuilt;
            }
        }

        if inserted > 0 {
            self.rebuild_topology();
        }
    }

    /// Drops faces with no area — the slivers a cut leaves behind.
    pub fn remove_degenerate_faces(&mut self, tolerance: f64) {
        let vertices = self.vertices.clone();
        self.faces
            .retain(|face| face.area(&vertices) > tolerance * tolerance);
        self.rebuild_topology();
    }

    /// Discards vertices no face refers to.
    pub fn compact(&mut self) {
        let mut used = vec![false; self.vertices.len()];
        for face in &self.faces {
            for vertex in face.vertex_ids() {
                if vertex < used.len() {
                    used[vertex] = true;
                }
            }
        }
        let mut remap = vec![usize::MAX; self.vertices.len()];
        let mut kept = Vec::new();
        for (old, &is_used) in used.iter().enumerate() {
            if is_used {
                remap[old] = kept.len();
                kept.push(Vertex::new(kept.len(), self.vertices[old].position));
            }
        }
        self.vertices = kept;
        for face in &mut self.faces {
            for face_loop in &mut face.loops {
                for vertex in &mut face_loop.vertex_ids {
                    *vertex = remap.get(*vertex).copied().unwrap_or(0);
                }
            }
        }
        self.rebuild_topology();
    }

    /// Stable, geometry-derived identifiers for the body's cells.
    ///
    /// The ids are hashes of quantized geometry, not indices, so a selection
    /// made before a rebuild still names the same face afterwards as long as
    /// that face did not move — which is what fillet, shell and draft need in
    /// order to reference a face across a parametric edit.
    pub fn topology_ids(&self) -> Topology {
        let mut seen: HashMap<String, usize> = HashMap::new();
        let mut disambiguate = |id: String| -> String {
            let count = seen.entry(id.clone()).or_insert(0);
            *count += 1;
            if *count == 1 {
                id
            } else {
                format!("{id}~{}", *count - 1)
            }
        };

        let face_ids = self
            .faces
            .iter()
            .map(|face| {
                let centroid = face.centroid(&self.vertices);
                let area = face.area(&self.vertices);
                disambiguate(hash_id(
                    "f",
                    &[
                        centroid.x,
                        centroid.y,
                        centroid.z,
                        face.normal.x,
                        face.normal.y,
                        face.normal.z,
                        area,
                    ],
                ))
            })
            .collect();

        let edge_ids = self
            .edges
            .iter()
            .map(|edge| {
                let a = self.position(edge.start()).to_array();
                let b = self.position(edge.end()).to_array();
                // Sorted so the id does not depend on which face got there first.
                let (low, high) = if a <= b { (a, b) } else { (b, a) };
                disambiguate(hash_id(
                    "e",
                    &[low[0], low[1], low[2], high[0], high[1], high[2]],
                ))
            })
            .collect();

        let vertex_ids = self
            .vertices
            .iter()
            .map(|vertex| {
                disambiguate(hash_id(
                    "v",
                    &[vertex.position.x, vertex.position.y, vertex.position.z],
                ))
            })
            .collect();

        Topology { face_ids, edge_ids, vertex_ids }
    }

    /// The index of the face carrying `id`, as reported by [`Body::topology_ids`].
    pub fn face_by_id(&self, id: &str) -> Option<FaceId> {
        self.topology_ids()
            .face_ids
            .iter()
            .position(|candidate| candidate == id)
    }

    /// The index of the edge carrying `id`.
    pub fn edge_by_id(&self, id: &str) -> Option<EdgeId> {
        self.topology_ids()
            .edge_ids
            .iter()
            .position(|candidate| candidate == id)
    }

    /// The two faces meeting at an edge, if it has two.
    pub fn faces_of_edge(&self, edge: EdgeId) -> Vec<FaceId> {
        let mut faces: Vec<FaceId> = self
            .half_edges
            .iter()
            .filter(|half| half.edge_id == edge)
            .map(|half| half.face_id)
            .collect();
        faces.sort_unstable();
        faces.dedup();
        faces
    }

    /// Direction and length of an edge, and the curve it follows.
    pub fn edge_geometry(&self, edge: EdgeId) -> Option<(Vec3, Vec3, f64, CurveType)> {
        let edge = self.edges.get(edge)?;
        let start = self.position(edge.start());
        let end = self.position(edge.end());
        Some((start, end, edge.length(start, end), edge.curve))
    }

    /// The angle between the two faces at an edge, in radians. Greater than pi
    /// means the edge is concave — a fillet there adds material rather than
    /// removing it, which is the distinction fillet and chamfer both turn on.
    pub fn dihedral_angle(&self, edge: EdgeId) -> Option<f64> {
        let faces = self.faces_of_edge(edge);
        if faces.len() != 2 {
            return None;
        }
        let a = &self.faces[faces[0]];
        let b = &self.faces[faces[1]];
        let stored = self.edges.get(edge)?;
        let middle = self
            .position(stored.start())
            .lerp(self.position(stored.end()), 0.5);

        // Normals taken at the edge itself, not at the faces' middles, so a
        // curved face is measured where it actually meets its neighbour.
        let normal_a = a.normal_at(middle);
        let normal_b = b.normal_at(middle);
        let interior = core::f64::consts::PI - normal_a.angle_to(normal_b);

        // Convex or concave: a neighbour that leans behind this face's tangent
        // plane is folding away from the material, which is a convex edge.
        let tangent = Plane::from_point_normal(middle, normal_a);
        if tangent.distance_to(b.centroid(&self.vertices)) > crate::math::EPSILON {
            Some(core::f64::consts::TAU - interior)
        } else {
            Some(interior)
        }
    }
}

impl Default for Body {
    fn default() -> Self {
        Self::empty()
    }
}

/// Which cell of a uniform grid a point falls in.
fn cell_of(position: Vec3, cell: f64) -> (i64, i64, i64) {
    (
        (position.x / cell).floor() as i64,
        (position.y / cell).floor() as i64,
        (position.z / cell).floor() as i64,
    )
}

/// Every vertex in a cell the segment passes through, or next to one.
///
/// Walking the segment cell by cell rather than filling its bounding box is
/// what keeps a long thin edge cheap: a box across the model would sweep up
/// most of the grid, and the edge only ever touches a line through it.
fn near_segment(
    grid: &HashMap<(i64, i64, i64), Vec<VertexId>>,
    cell: f64,
    from: Vec3,
    to: Vec3,
) -> Vec<VertexId> {
    let steps = (from.distance(to) / cell).ceil().max(1.0) as usize;
    let mut cells: Vec<(i64, i64, i64)> = Vec::new();
    for step in 0..=steps {
        let sample = from.lerp(to, step as f64 / steps as f64);
        let key = cell_of(sample, cell);
        for dx in -1..=1 {
            for dy in -1..=1 {
                for dz in -1..=1 {
                    cells.push((key.0 + dx, key.1 + dy, key.2 + dz));
                }
            }
        }
    }
    cells.sort_unstable();
    cells.dedup();

    let mut found: Vec<VertexId> = cells
        .into_iter()
        .filter_map(|key| grid.get(&key))
        .flatten()
        .copied()
        .collect();
    found.sort_unstable();
    found.dedup();
    found
}

/// Hashes quantized coordinates into a short stable string.
///
/// Quantizing to a micron before hashing is what makes the id survive a
/// rebuild: the same face recomputed through a different code path lands on
/// bit-different coordinates but the same micron.
fn hash_id(prefix: &str, values: &[f64]) -> String {
    const QUANTUM: f64 = 1e-6;
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for &value in values {
        let quantized = (value / QUANTUM).round() as i64;
        for byte in quantized.to_le_bytes() {
            hash ^= byte as u64;
            hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
        }
    }
    format!("{prefix}{hash:016x}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::math::{PlaneFrame, TOLERANCE};

    const TOL: f64 = 1e-9;

    /// An axis-aligned box from (0,0,0) to `size`, wound outwards.
    fn unit_box(size: Vec3) -> Body {
        let (x, y, z) = (size.x, size.y, size.z);
        let corners = [
            Vec3::new(0.0, 0.0, 0.0),
            Vec3::new(x, 0.0, 0.0),
            Vec3::new(x, y, 0.0),
            Vec3::new(0.0, y, 0.0),
            Vec3::new(0.0, 0.0, z),
            Vec3::new(x, 0.0, z),
            Vec3::new(x, y, z),
            Vec3::new(0.0, y, z),
        ];
        let vertices: Vec<Vertex> = corners
            .iter()
            .enumerate()
            .map(|(id, &position)| Vertex::new(id, position))
            .collect();
        let loops = [
            vec![0, 3, 2, 1], // bottom, facing -z
            vec![4, 5, 6, 7], // top, facing +z
            vec![0, 1, 5, 4], // front, facing -y
            vec![1, 2, 6, 5], // right, facing +x
            vec![2, 3, 7, 6], // back, facing +y
            vec![3, 0, 4, 7], // left, facing -x
        ];
        let faces = loops
            .into_iter()
            .enumerate()
            .map(|(id, vertex_ids)| Face::planar(id, vertex_ids, &vertices))
            .collect();
        Body::new(vertices, faces)
    }

    /// A unit box whose top face is split down the middle, leaving the four
    /// walls meeting the split point part-way along their top edge.
    fn box_with_a_split_lid() -> Body {
        let mut body = unit_box(Vec3::ONE);
        // Two extra points halfway along the top's front and back edges.
        let front = body.add_vertex(Vec3::new(0.5, 0.0, 1.0));
        let back = body.add_vertex(Vec3::new(0.5, 1.0, 1.0));
        // Replace the single top face with the two halves it splits into.
        body.faces.remove(1);
        body.add_face(vec![4, front, back, 7]);
        body.add_face(vec![front, 5, 6, back]);
        body.rebuild_topology();
        body
    }

    #[test]
    fn a_t_junction_leaves_a_watertight_body_reporting_itself_open() {
        let body = box_with_a_split_lid();
        assert!((body.volume() - 1.0).abs() < TOL);
        // The front wall's top edge runs the full width; the lid halves meet it
        // at a point in the middle. Three edges lie along one line and none of
        // them pairs up.
        assert!(!body.is_solid());
        assert!(!body.boundary_edges().is_empty());
    }

    #[test]
    fn healing_a_t_junction_closes_the_body_without_moving_it() {
        let mut body = box_with_a_split_lid();
        let before = body.volume();
        body.heal_t_junctions(TOLERANCE);

        assert!(body.is_solid());
        assert!(body.is_valid());
        assert!(body.boundary_edges().is_empty());
        assert!((body.volume() - before).abs() < TOL);
        // Nothing moved: the split point was threaded into the walls' top edges,
        // so those loops gained a corner and no vertex was added.
        assert_eq!(body.vertices.len(), 10);
        assert_eq!(body.faces[3].outer_loop().len(), 5);
    }

    #[test]
    fn healing_a_body_with_nothing_to_heal_leaves_it_alone() {
        let mut body = unit_box(Vec3::ONE);
        let before = body.clone();
        body.heal_t_junctions(TOLERANCE);
        assert_eq!(body, before);

        // And an empty body is not something to divide a grid over.
        let mut empty = Body::empty();
        empty.heal_t_junctions(TOLERANCE);
        assert!(empty.is_empty());
    }

    #[test]
    fn an_empty_body_has_nothing_in_it() {
        let body = Body::empty();
        assert!(body.is_empty());
        assert!(!body.is_solid());
        assert!(body.is_valid());
        assert_eq!(body.volume(), 0.0);
        assert!(body.bounding_box().is_empty());
        assert_eq!(Body::default(), Body::empty());
    }

    #[test]
    fn a_box_has_six_faces_twelve_edges_and_eight_vertices() {
        let body = unit_box(Vec3::ONE);
        assert_eq!(body.faces.len(), 6);
        assert_eq!(body.vertices.len(), 8);
        assert_eq!(body.edges.len(), 12);
        // Every edge is used twice.
        assert_eq!(body.half_edges.len(), 24);
        assert_eq!(body.shells.len(), 1);
        assert!(body.shells[0].closed);
    }

    #[test]
    fn a_box_is_a_closed_valid_solid() {
        let body = unit_box(Vec3::ONE);
        assert!(body.is_solid());
        assert!(body.is_valid());
        assert!(body.boundary_edges().is_empty());
        assert!(body.half_edges.iter().all(|half| !half.is_boundary()));
    }

    #[test]
    fn box_faces_all_point_outwards() {
        let body = unit_box(Vec3::splat(2.0));
        let center = body.bounding_box().center();
        for face in &body.faces {
            let outward = face.centroid(&body.vertices).sub(center);
            assert!(
                face.normal.dot(outward) > 0.0,
                "face {} points inwards",
                face.id
            );
        }
    }

    #[test]
    fn volume_and_area_of_a_box_are_exact() {
        let body = unit_box(Vec3::new(2.0, 3.0, 4.0));
        assert!((body.volume() - 24.0).abs() < TOL);
        assert!(body.signed_volume() > 0.0, "outward winding should be positive");
        // 2*(2*3 + 3*4 + 2*4)
        assert!((body.surface_area() - 52.0).abs() < TOL);
    }

    #[test]
    fn an_inward_wound_body_has_negative_signed_volume() {
        let mut body = unit_box(Vec3::ONE);
        body.reverse();
        assert!(body.signed_volume() < 0.0);
        assert!((body.volume() - 1.0).abs() < TOL);
        // Reversing does not break the manifold, only the side it faces.
        assert!(body.is_solid());
    }

    #[test]
    fn a_shell_with_a_missing_face_is_not_solid() {
        let mut body = unit_box(Vec3::ONE);
        body.faces.pop();
        body.rebuild_topology();
        assert!(!body.is_solid());
        assert_eq!(body.boundary_edges().len(), 4);
        assert!(!body.shells[0].closed);
    }

    #[test]
    fn two_separate_boxes_form_two_shells() {
        let mut body = unit_box(Vec3::ONE);
        let mut far = unit_box(Vec3::ONE);
        far.transform(&Mat4::translation(Vec3::new(10.0, 0.0, 0.0)));
        body.merge(&far);

        assert_eq!(body.faces.len(), 12);
        assert_eq!(body.vertices.len(), 16);
        assert_eq!(body.shells.len(), 2);
        assert!(body.shells.iter().all(|shell| shell.closed));
        assert!(body.is_solid());
        assert!((body.volume() - 2.0).abs() < TOL);
    }

    #[test]
    fn mass_properties_of_a_cube_match_the_closed_form() {
        // A 2x2x2 cube centred on the origin: m = 8, I = m*(a^2+a^2)/12 per axis
        // with a = 2, so each diagonal term is 8 * 8 / 12.
        let mut body = unit_box(Vec3::splat(2.0));
        body.transform(&Mat4::translation(Vec3::splat(-1.0)));
        let properties = body.mass_properties();

        assert!((properties.volume - 8.0).abs() < TOL);
        assert!((properties.surface_area - 24.0).abs() < TOL);
        assert!(properties.center_of_mass.approx_eq(Vec3::ZERO, TOL));

        let expected = 8.0 * (4.0 + 4.0) / 12.0;
        for axis in 0..3 {
            assert!(
                (properties.inertia[axis * 4] - expected).abs() < 1e-9,
                "diagonal {axis}: {}",
                properties.inertia[axis * 4]
            );
        }
        // Off-diagonal terms vanish for a body symmetric about its axes.
        for (row, col) in [(0, 1), (0, 2), (1, 2)] {
            assert!(properties.inertia[row * 3 + col].abs() < 1e-9);
            // ...and the tensor is symmetric.
            assert!(
                (properties.inertia[row * 3 + col] - properties.inertia[col * 3 + row]).abs() < TOL
            );
        }
    }

    #[test]
    fn the_centre_of_mass_follows_the_body() {
        let body = unit_box(Vec3::splat(2.0)).transformed(&Mat4::translation(Vec3::new(5.0, 0.0, 0.0)));
        let properties = body.mass_properties();
        assert!(properties
            .center_of_mass
            .approx_eq(Vec3::new(6.0, 1.0, 1.0), TOL));
    }

    #[test]
    fn mass_properties_stay_positive_for_an_inward_wound_body() {
        let mut body = unit_box(Vec3::splat(2.0));
        body.transform(&Mat4::translation(Vec3::splat(-1.0)));
        let outward = body.mass_properties();
        body.reverse();
        let inward = body.mass_properties();

        assert!((inward.volume - outward.volume).abs() < TOL);
        for index in 0..9 {
            assert!((inward.inertia[index] - outward.inertia[index]).abs() < 1e-9);
        }
    }

    #[test]
    fn mass_properties_of_an_open_shell_fall_back_to_the_bounding_box_centre() {
        let mut body = unit_box(Vec3::ONE);
        body.faces.truncate(1);
        body.rebuild_topology();
        let properties = body.mass_properties();
        assert!(properties.volume < TOL);
        assert!(properties.center_of_mass.is_finite());
    }

    #[test]
    fn transforming_moves_the_geometry_and_keeps_it_solid() {
        let body = unit_box(Vec3::ONE)
            .transformed(&Mat4::translation(Vec3::new(0.0, 0.0, 5.0)));
        assert!((body.bounding_box().min.z - 5.0).abs() < TOL);
        assert!(body.is_solid());
        assert!((body.volume() - 1.0).abs() < TOL);
        assert!(body.signed_volume() > 0.0);
    }

    #[test]
    fn mirroring_keeps_the_normals_outward() {
        let body = unit_box(Vec3::ONE).transformed(&Mat4::reflection(Vec3::ZERO, Vec3::X));
        assert!(body.is_solid());
        // Winding was reversed to compensate, so the volume stays positive.
        assert!(body.signed_volume() > 0.0, "mirroring turned the solid inside out");
        let center = body.bounding_box().center();
        for face in &body.faces {
            let outward = face.centroid(&body.vertices).sub(center);
            assert!(face.normal.dot(outward) > 0.0);
        }
    }

    #[test]
    fn welding_fuses_split_duplicates_into_a_solid() {
        // Two half-boxes meeting at x = 1, each with its own copy of the shared
        // corners. Before welding they are two open shells.
        let mut body = unit_box(Vec3::new(1.0, 1.0, 1.0));
        let right = unit_box(Vec3::new(1.0, 1.0, 1.0))
            .transformed(&Mat4::translation(Vec3::new(1.0, 0.0, 0.0)));
        body.merge(&right);
        assert_eq!(body.vertices.len(), 16);

        body.weld(TOLERANCE);
        // The four shared corners fused.
        assert_eq!(body.vertices.len(), 12);
        assert!((body.volume() - 2.0).abs() < TOL);
    }

    #[test]
    fn welding_drops_loops_that_collapse() {
        let vertices = vec![
            Vertex::new(0, Vec3::ZERO),
            Vertex::new(1, Vec3::new(1e-12, 0.0, 0.0)),
            Vertex::new(2, Vec3::new(0.0, 1e-12, 0.0)),
        ];
        let faces = vec![Face::planar(0, vec![0, 1, 2], &vertices)];
        let mut body = Body { vertices, faces, ..Body::empty() };
        body.weld(1e-6);
        assert!(body.faces.is_empty());
        assert!(body.is_valid());
    }

    #[test]
    fn welding_an_empty_body_is_a_no_op() {
        let mut body = Body::empty();
        body.weld(TOLERANCE);
        assert!(body.is_empty());
    }

    #[test]
    fn compact_drops_unreferenced_vertices() {
        let mut body = unit_box(Vec3::ONE);
        body.add_vertex(Vec3::new(50.0, 50.0, 50.0));
        assert_eq!(body.vertices.len(), 9);
        body.compact();
        assert_eq!(body.vertices.len(), 8);
        assert!((body.volume() - 1.0).abs() < TOL);
    }

    #[test]
    fn degenerate_faces_are_removed() {
        let mut body = unit_box(Vec3::ONE);
        let a = body.add_vertex(Vec3::new(5.0, 0.0, 0.0));
        let b = body.add_vertex(Vec3::new(5.0 + 1e-9, 0.0, 0.0));
        let c = body.add_vertex(Vec3::new(5.0, 1e-9, 0.0));
        body.add_face(vec![a, b, c]);
        assert_eq!(body.faces.len(), 7);
        body.remove_degenerate_faces(1e-4);
        assert_eq!(body.faces.len(), 6);
    }

    #[test]
    fn an_invalid_body_is_reported_as_such() {
        let mut body = unit_box(Vec3::ONE);
        body.faces[0].loops[0].vertex_ids.push(999);
        assert!(!body.is_valid());

        let mut short = unit_box(Vec3::ONE);
        short.faces[0].loops[0].vertex_ids.truncate(2);
        assert!(!short.is_valid());

        let mut broken_normal = unit_box(Vec3::ONE);
        broken_normal.faces[0].normal = Vec3::ZERO;
        assert!(!broken_normal.is_valid());

        let mut broken_vertex = unit_box(Vec3::ONE);
        broken_vertex.vertices[0].position = Vec3::new(f64::NAN, 0.0, 0.0);
        assert!(!broken_vertex.is_valid());
    }

    #[test]
    fn topology_ids_are_stable_across_a_rebuild() {
        let mut body = unit_box(Vec3::ONE);
        let before = body.topology_ids();
        body.rebuild_topology();
        let after = body.topology_ids();
        assert_eq!(before, after);
        assert_eq!(before.face_ids.len(), 6);
        assert_eq!(before.edge_ids.len(), 12);
        assert_eq!(before.vertex_ids.len(), 8);
    }

    #[test]
    fn topology_ids_are_recomputed_the_same_way_by_an_independent_build() {
        // The same box built twice must name its faces identically, which is
        // what lets a selection survive a parametric rebuild.
        assert_eq!(
            unit_box(Vec3::ONE).topology_ids(),
            unit_box(Vec3::ONE).topology_ids()
        );
    }

    #[test]
    fn topology_ids_change_when_the_geometry_does() {
        let small = unit_box(Vec3::ONE).topology_ids();
        let large = unit_box(Vec3::splat(2.0)).topology_ids();
        assert_ne!(small.face_ids, large.face_ids);
    }

    #[test]
    fn topology_ids_are_unique_even_when_geometry_coincides() {
        // Two identical boxes stacked exactly on top of each other: the hashes
        // collide, so the disambiguator has to separate them.
        let mut body = unit_box(Vec3::ONE);
        let duplicate = unit_box(Vec3::ONE);
        body.merge(&duplicate);
        let ids = body.topology_ids();
        let mut unique = ids.face_ids.clone();
        unique.sort();
        unique.dedup();
        assert_eq!(unique.len(), ids.face_ids.len());
    }

    #[test]
    fn faces_and_edges_can_be_looked_up_by_id() {
        let body = unit_box(Vec3::ONE);
        let ids = body.topology_ids();
        assert_eq!(body.face_by_id(&ids.face_ids[3]), Some(3));
        assert_eq!(body.edge_by_id(&ids.edge_ids[5]), Some(5));
        assert_eq!(body.face_by_id("nonsense"), None);
        assert_eq!(body.edge_by_id("nonsense"), None);
    }

    #[test]
    fn every_edge_of_a_box_joins_exactly_two_faces() {
        let body = unit_box(Vec3::ONE);
        for edge in 0..body.edges.len() {
            assert_eq!(body.faces_of_edge(edge).len(), 2, "edge {edge}");
        }
    }

    #[test]
    fn a_box_edge_is_a_right_angle_and_convex() {
        let body = unit_box(Vec3::ONE);
        for edge in 0..body.edges.len() {
            let angle = body.dihedral_angle(edge).expect("two faces");
            assert!(
                (angle - core::f64::consts::FRAC_PI_2).abs() < 1e-9,
                "edge {edge} measured {angle}"
            );
        }
    }

    #[test]
    fn a_concave_edge_measures_more_than_a_straight_one() {
        // An L-shaped prism: the inner corner is reflex.
        let profile = [
            (0.0, 0.0),
            (2.0, 0.0),
            (2.0, 1.0),
            (1.0, 1.0),
            (1.0, 2.0),
            (0.0, 2.0),
        ];
        let body = crate::ops::extrude(&crate::ops::ExtrudeParams::new(
            crate::Profile::from_points(
                profile
                    .iter()
                    .map(|&(x, y)| crate::math::Vec2::new(x, y))
                    .collect(),
            ),
            1.0,
        ))
        .unwrap();

        let concave = (0..body.edges.len())
            .filter_map(|edge| body.dihedral_angle(edge))
            .filter(|&angle| angle > core::f64::consts::PI + 0.1)
            .count();
        assert_eq!(concave, 1, "the inner corner should be the only reflex edge");
    }

    #[test]
    fn the_dihedral_angle_of_a_boundary_edge_is_unknown() {
        let mut body = unit_box(Vec3::ONE);
        body.faces.pop();
        body.rebuild_topology();
        let boundary = body.boundary_edges()[0];
        assert_eq!(body.dihedral_angle(boundary), None);
    }

    #[test]
    fn edge_geometry_reports_endpoints_and_length() {
        let body = unit_box(Vec3::new(3.0, 1.0, 1.0));
        let lengths: Vec<f64> = (0..body.edges.len())
            .filter_map(|edge| body.edge_geometry(edge).map(|(_, _, length, _)| length))
            .collect();
        assert_eq!(lengths.len(), 12);
        assert_eq!(lengths.iter().filter(|&&l| (l - 3.0).abs() < TOL).count(), 4);
        assert!(body.edge_geometry(999).is_none());
    }

    #[test]
    fn faces_can_be_added_one_at_a_time() {
        let mut body = Body::empty();
        let a = body.add_vertex(Vec3::ZERO);
        let b = body.add_vertex(Vec3::X);
        let c = body.add_vertex(Vec3::Y);
        let face = body.add_face(vec![a, b, c]);
        body.rebuild_topology();
        assert_eq!(face, 0);
        assert_eq!(body.faces.len(), 1);
        assert!(body.faces[0].normal.approx_eq(Vec3::Z, TOL));
        assert!(!body.is_solid());
        assert_eq!(body.position(99), Vec3::ZERO);
    }

    #[test]
    fn push_face_renumbers_into_the_body() {
        let mut body = Body::empty();
        body.add_vertex(Vec3::ZERO);
        body.add_vertex(Vec3::X);
        body.add_vertex(Vec3::Y);
        let borrowed = Face::planar(42, vec![0, 1, 2], &body.vertices);
        assert_eq!(body.push_face(borrowed), 0);
        assert_eq!(body.faces[0].id, 0);
    }

    #[test]
    fn an_id_can_be_attached_to_a_body() {
        assert_eq!(unit_box(Vec3::ONE).with_id("shape-1").id, "shape-1");
    }

    #[test]
    fn a_non_manifold_edge_is_left_unpaired() {
        // Three faces meeting along one edge: no two of them are a pair.
        let vertices = vec![
            Vertex::new(0, Vec3::ZERO),
            Vertex::new(1, Vec3::Z),
            Vertex::new(2, Vec3::X),
            Vertex::new(3, Vec3::Y),
            Vertex::new(4, Vec3::new(-1.0, -1.0, 0.0)),
        ];
        let faces = vec![
            Face::planar(0, vec![0, 1, 2], &vertices),
            Face::planar(1, vec![0, 1, 3], &vertices),
            Face::planar(2, vec![0, 1, 4], &vertices),
        ];
        let body = Body::new(vertices, faces);
        assert!(!body.is_solid());
        assert!(body.boundary_edges().contains(&0));
    }

    #[test]
    fn hash_ids_are_deterministic_and_prefixed() {
        assert_eq!(hash_id("f", &[1.0, 2.0]), hash_id("f", &[1.0, 2.0]));
        assert_ne!(hash_id("f", &[1.0, 2.0]), hash_id("e", &[1.0, 2.0]));
        assert_ne!(hash_id("f", &[1.0, 2.0]), hash_id("f", &[1.0, 2.001]));
        // Below the quantum, coordinates are the same point.
        assert_eq!(hash_id("v", &[1.0]), hash_id("v", &[1.0 + 1e-9]));
        // Signed zero must not split an id.
        assert_eq!(hash_id("v", &[0.0]), hash_id("v", &[-0.0]));
        assert!(hash_id("f", &[1.0]).starts_with('f'));
    }

    #[test]
    fn a_frame_built_body_round_trips_through_json() {
        let body = unit_box(Vec3::ONE);
        let json = serde_json::to_string(&body).unwrap();
        let restored: Body = serde_json::from_str(&json).unwrap();
        assert_eq!(restored, body);
        assert!(restored.is_solid());
        assert!((restored.volume() - 1.0).abs() < TOL);
        // The frame type is unused here beyond proving the import compiles.
        assert!(PlaneFrame::WORLD_XY.normal().approx_eq(Vec3::Z, TOL));
    }
}
