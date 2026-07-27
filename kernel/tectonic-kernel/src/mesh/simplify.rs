//! Mesh decimation by quadric error edge collapse.
//!
//! A large assembly tessellated for close inspection is far heavier than a
//! distant view of it needs. This reduces the triangle count while keeping the
//! silhouette, using Garland and Heckbert's quadric error metric: each vertex
//! carries the summed squared distance to the planes of the faces that once met
//! there, and the cheapest edge to collapse is the one that moves least
//! relative to those planes.

use std::cmp::Ordering;
use std::collections::{BinaryHeap, HashMap, HashSet};

use crate::math::{Vec2, Vec3, EPSILON};

use super::MeshData;

/// A symmetric 4x4 quadric, stored as its ten distinct coefficients in the
/// order `(0,0) (0,1) (0,2) (0,3) (1,1) (1,2) (1,3) (2,2) (2,3) (3,3)`.
#[derive(Debug, Clone, Copy, PartialEq, Default)]
struct Quadric([f64; 10]);

impl Quadric {
    /// The quadric of the plane `n · x + d = 0` — the outer product of its
    /// coefficient vector with itself.
    fn from_plane(normal: Vec3, offset: f64) -> Self {
        let (a, b, c, d) = (normal.x, normal.y, normal.z, offset);
        Self([
            a * a,
            a * b,
            a * c,
            a * d,
            b * b,
            b * c,
            b * d,
            c * c,
            c * d,
            d * d,
        ])
    }

    fn add(&self, other: &Self) -> Self {
        let mut sum = [0.0; 10];
        for index in 0..10 {
            sum[index] = self.0[index] + other.0[index];
        }
        Self(sum)
    }

    /// The squared distance from `point` to the planes this quadric sums.
    fn error_at(&self, point: Vec3) -> f64 {
        let q = &self.0;
        let (x, y, z) = (point.x, point.y, point.z);
        q[0] * x * x
            + 2.0 * q[1] * x * y
            + 2.0 * q[2] * x * z
            + 2.0 * q[3] * x
            + q[4] * y * y
            + 2.0 * q[5] * y * z
            + 2.0 * q[6] * y
            + q[7] * z * z
            + 2.0 * q[8] * z
            + q[9]
    }
}

/// A pending collapse, ordered so the cheapest comes off the heap first.
#[derive(Debug, Clone, Copy, PartialEq)]
struct Candidate {
    cost: f64,
    from: usize,
    into: usize,
    target: Vec3,
    /// The edit counts of both endpoints when this was queued. A candidate
    /// whose endpoints have moved since is stale and gets discarded rather than
    /// applied against geometry it no longer describes.
    stamp: (u32, u32),
}

impl Eq for Candidate {}

impl Ord for Candidate {
    fn cmp(&self, other: &Self) -> Ordering {
        // Reversed: `BinaryHeap` is a max-heap and the cheapest should win.
        other
            .cost
            .partial_cmp(&self.cost)
            .unwrap_or(Ordering::Equal)
            .then_with(|| self.from.cmp(&other.from))
            .then_with(|| self.into.cmp(&other.into))
    }
}

impl PartialOrd for Candidate {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

/// Reduces a mesh to `ratio` of its triangles, where `ratio` is in `(0, 1]`.
pub fn simplify(mesh: &MeshData, ratio: f64) -> MeshData {
    let target = ((mesh.triangle_count() as f64) * ratio.clamp(0.0, 1.0)).round() as usize;
    simplify_to(mesh, target)
}

/// Reduces a mesh towards `target_triangles`.
///
/// The target is a goal, not a guarantee: collapses that would tear the surface
/// or turn a triangle inside out are refused, so a mesh can run out of safe
/// collapses while still above the target.
pub fn simplify_to(mesh: &MeshData, target_triangles: usize) -> MeshData {
    // Four triangles is the fewest that can still bound a volume, so a caller
    // asking for less gets the smallest closed thing rather than nothing.
    let target_triangles = target_triangles.max(4);
    if mesh.triangle_count() <= target_triangles {
        return mesh.clone();
    }

    // Collapsing needs vertices shared between adjacent faces; the tessellator
    // deliberately splits them so edges shade crisply. Fuse on position alone
    // for the duration, and rebuild normals from the result.
    let (mut positions, mut triangles) = weld_by_position(mesh);
    if triangles.len() <= target_triangles {
        return mesh.clone();
    }

    let mut quadrics = vec![Quadric::default(); positions.len()];
    for &[a, b, c] in &triangles {
        let (pa, pb, pc) = (positions[a], positions[b], positions[c]);
        let normal = pb.sub(pa).cross(pc.sub(pa));
        let area = normal.length();
        if area < EPSILON {
            continue;
        }
        let unit = normal.scale(1.0 / area);
        // Weighting by area lets a large face resist being moved by a small one.
        let plane = Quadric::from_plane(unit.scale(area), -unit.dot(pa) * area);
        for &corner in &[a, b, c] {
            quadrics[corner] = quadrics[corner].add(&plane);
        }
    }

    // Only edges on the boundary of exactly two triangles may collapse; an edge
    // used once is a hole's rim and collapsing it would eat into the outline.
    let mut edge_uses: HashMap<(usize, usize), usize> = HashMap::new();
    for &[a, b, c] in &triangles {
        for (from, to) in [(a, b), (b, c), (c, a)] {
            *edge_uses.entry(ordered(from, to)).or_insert(0) += 1;
        }
    }

    let mut incident: Vec<HashSet<usize>> = vec![HashSet::new(); positions.len()];
    for (index, &[a, b, c]) in triangles.iter().enumerate() {
        incident[a].insert(index);
        incident[b].insert(index);
        incident[c].insert(index);
    }

    // Faces are tessellated one at a time and to their own depth, so a fine face
    // meeting a coarse one leaves vertices sitting part-way along the coarse
    // face's edge. Welding cannot join those, and the seam shows up here as
    // edges with one owner. Moving a vertex on such a seam opens a real gap in
    // what was a watertight surface, so the seams are held still and everything
    // inside them is free to go.
    let mut pinned = vec![false; positions.len()];
    for (&(a, b), &uses) in &edge_uses {
        if uses != 2 {
            pinned[a] = true;
            pinned[b] = true;
        }
    }

    let mut alive = vec![true; positions.len()];
    let mut stamps = vec![0u32; positions.len()];
    let mut live_triangles = triangles.len();

    let mut heap: BinaryHeap<Candidate> = BinaryHeap::new();
    for (&(a, b), &uses) in &edge_uses {
        if uses == 2 {
            if let Some(candidate) = plan(a, b, &positions, &quadrics, &stamps, &pinned) {
                heap.push(candidate);
            }
        }
    }

    while live_triangles > target_triangles {
        let Some(candidate) = heap.pop() else { break };
        let (from, into) = (candidate.from, candidate.into);
        if !alive[from] || !alive[into] {
            continue;
        }
        if candidate.stamp != (stamps[from], stamps[into]) {
            continue;
        }
        if would_flip(from, into, candidate.target, &positions, &triangles, &incident) {
            continue;
        }

        // Move the survivor to the target and fold `from` into it.
        positions[into] = candidate.target;
        quadrics[into] = quadrics[into].add(&quadrics[from]);
        alive[from] = false;

        let moved: Vec<usize> = incident[from].iter().copied().collect();
        for index in moved {
            let triangle = &mut triangles[index];
            for corner in triangle.iter_mut() {
                if *corner == from {
                    *corner = into;
                }
            }
            let [a, b, c] = *triangle;
            if a == b || b == c || a == c {
                // The two triangles that shared the collapsed edge fold away.
                live_triangles -= 1;
                for corner in [a, b, c] {
                    incident[corner].remove(&index);
                }
                triangles[index] = [usize::MAX; 3];
            } else {
                incident[into].insert(index);
            }
        }
        incident[from].clear();

        stamps[into] = stamps[into].wrapping_add(1);

        // Re-price the survivor's remaining edges.
        let mut neighbours: HashSet<usize> = HashSet::new();
        for &index in &incident[into] {
            for corner in triangles[index] {
                if corner != into && corner != usize::MAX && alive[corner] {
                    neighbours.insert(corner);
                }
            }
        }
        for neighbour in neighbours {
            if edge_uses
                .get(&ordered(into, neighbour))
                .copied()
                .unwrap_or(0)
                == 0
            {
                // The edge did not exist before the collapse; inherit the
                // manifold status of the edges that merged into it.
                edge_uses.insert(ordered(into, neighbour), 2);
            }
            if let Some(next) = plan(into, neighbour, &positions, &quadrics, &stamps, &pinned) {
                heap.push(next);
            }
        }
    }

    rebuild(&positions, &triangles, &alive)
}

fn ordered(a: usize, b: usize) -> (usize, usize) {
    if a <= b {
        (a, b)
    } else {
        (b, a)
    }
}

/// Prices a collapse, honouring the vertices that have to stay where they are.
///
/// A pinned vertex can still absorb its neighbours — that thins the mesh right
/// up to the seam without moving the seam itself — but two pinned vertices
/// never merge, since that would either drag the seam or pinch it shut.
fn plan(
    a: usize,
    b: usize,
    positions: &[Vec3],
    quadrics: &[Quadric],
    stamps: &[u32],
    pinned: &[bool],
) -> Option<Candidate> {
    match (pinned[a], pinned[b]) {
        (false, false) => evaluate(a, b, positions, quadrics, stamps),
        (true, true) => None,
        // The free vertex folds into the pinned one, which does not budge.
        (true, false) => Some(fold_into(b, a, positions, quadrics, stamps)),
        (false, true) => Some(fold_into(a, b, positions, quadrics, stamps)),
    }
}

/// Prices dropping `from` onto `into`, leaving `into` exactly where it is.
fn fold_into(
    from: usize,
    into: usize,
    positions: &[Vec3],
    quadrics: &[Quadric],
    stamps: &[u32],
) -> Candidate {
    let target = positions[into];
    let cost = quadrics[from].add(&quadrics[into]).error_at(target);
    Candidate {
        cost: cost.max(0.0),
        from,
        into,
        target,
        stamp: (stamps[from], stamps[into]),
    }
}

/// Prices a collapse, trying both endpoints and the midpoint as the survivor's
/// new home and keeping whichever distorts the surface least.
fn evaluate(
    a: usize,
    b: usize,
    positions: &[Vec3],
    quadrics: &[Quadric],
    stamps: &[u32],
) -> Option<Candidate> {
    if a == b {
        return None;
    }
    let combined = quadrics[a].add(&quadrics[b]);
    let options = [
        positions[a],
        positions[b],
        positions[a].lerp(positions[b], 0.5),
    ];
    let (target, cost) = options
        .into_iter()
        .map(|point| (point, combined.error_at(point)))
        .min_by(|(_, left), (_, right)| left.partial_cmp(right).unwrap_or(Ordering::Equal))?;

    Some(Candidate {
        cost: cost.max(0.0),
        from: a,
        into: b,
        target,
        stamp: (stamps[a], stamps[b]),
    })
}

/// True when moving `from` onto `target` would turn one of the triangles that
/// survive the collapse inside out.
fn would_flip(
    from: usize,
    into: usize,
    target: Vec3,
    positions: &[Vec3],
    triangles: &[[usize; 3]],
    incident: &[HashSet<usize>],
) -> bool {
    for &index in incident[from].iter().chain(incident[into].iter()) {
        let [a, b, c] = triangles[index];
        if a == usize::MAX {
            continue;
        }
        // Triangles containing both endpoints disappear, so their winding is
        // not a reason to refuse the collapse.
        let corners = [a, b, c];
        if corners.contains(&from) && corners.contains(&into) {
            continue;
        }
        let moved = |vertex: usize| {
            if vertex == from || vertex == into {
                target
            } else {
                positions[vertex]
            }
        };
        let before = positions[b].sub(positions[a]).cross(positions[c].sub(positions[a]));
        let after = moved(b).sub(moved(a)).cross(moved(c).sub(moved(a)));
        if after.length() < EPSILON || before.dot(after) <= 0.0 {
            return true;
        }
    }
    false
}

/// Fuses vertices sharing a position, ignoring their normals.
fn weld_by_position(mesh: &MeshData) -> (Vec<Vec3>, Vec<[usize; 3]>) {
    const QUANTUM: f64 = 1e-7;
    let mut lookup: HashMap<(i64, i64, i64), usize> = HashMap::new();
    let mut positions = Vec::new();
    let mut remap = vec![0usize; mesh.vertex_count()];

    for index in 0..mesh.vertex_count() {
        let position = mesh.position(index);
        let key = (
            (position.x / QUANTUM).round() as i64,
            (position.y / QUANTUM).round() as i64,
            (position.z / QUANTUM).round() as i64,
        );
        remap[index] = *lookup.entry(key).or_insert_with(|| {
            positions.push(position);
            positions.len() - 1
        });
    }

    let triangles = mesh
        .triangles()
        .map(|[a, b, c]| [remap[a], remap[b], remap[c]])
        .filter(|&[a, b, c]| a != b && b != c && a != c)
        .collect();

    (positions, triangles)
}

fn rebuild(positions: &[Vec3], triangles: &[[usize; 3]], alive: &[bool]) -> MeshData {
    let mut mesh = MeshData::new();
    let mut remap = vec![u32::MAX; positions.len()];

    for &[a, b, c] in triangles {
        if a == usize::MAX || !alive[a] || !alive[b] || !alive[c] {
            continue;
        }
        if a == b || b == c || a == c {
            continue;
        }
        let mut corner_indices = [0u32; 3];
        for (slot, corner) in corner_indices.iter_mut().zip([a, b, c]) {
            if remap[corner] == u32::MAX {
                remap[corner] = mesh.push_vertex(positions[corner], Vec3::ZERO, Vec2::ZERO);
            }
            *slot = remap[corner];
        }
        mesh.push_triangle(corner_indices[0], corner_indices[1], corner_indices[2]);
    }

    mesh.remove_degenerate_triangles();
    mesh.recompute_normals();
    mesh
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mesh::{triangulate, TessellationParams};
    use crate::ops::{self, ExtrudeParams};
    use crate::Profile;

    /// A disc-topped cylinder, subdivided enough to have something to remove.
    fn cylinder(segments: usize) -> MeshData {
        let profile = Profile::from_points(
            (0..segments)
                .map(|i| {
                    let angle = i as f64 / segments as f64 * core::f64::consts::TAU;
                    Vec2::new(10.0 * angle.cos(), 10.0 * angle.sin())
                })
                .collect(),
        );
        let body = ops::extrude(&ExtrudeParams::new(profile, 20.0)).unwrap();
        triangulate(&body, &TessellationParams::default()).unwrap()
    }

    fn box_mesh() -> MeshData {
        let profile = Profile::from_points(vec![
            Vec2::new(0.0, 0.0),
            Vec2::new(10.0, 0.0),
            Vec2::new(10.0, 10.0),
            Vec2::new(0.0, 10.0),
        ]);
        let body = ops::extrude(&ExtrudeParams::new(profile, 10.0)).unwrap();
        triangulate(&body, &TessellationParams::default()).unwrap()
    }

    #[test]
    fn a_plane_quadric_measures_distance_to_that_plane() {
        // The z = 0 plane: the error at height h should be h squared.
        let quadric = Quadric::from_plane(Vec3::Z, 0.0);
        assert!(quadric.error_at(Vec3::ZERO).abs() < 1e-12);
        assert!((quadric.error_at(Vec3::new(5.0, 5.0, 3.0)) - 9.0).abs() < 1e-9);
    }

    #[test]
    fn quadrics_add_their_errors() {
        let a = Quadric::from_plane(Vec3::Z, 0.0);
        let b = Quadric::from_plane(Vec3::X, 0.0);
        let sum = a.add(&b);
        let point = Vec3::new(3.0, 0.0, 4.0);
        assert!((sum.error_at(point) - (9.0 + 16.0)).abs() < 1e-9);
        assert_eq!(Quadric::default().error_at(point), 0.0);
    }

    #[test]
    fn simplifying_reduces_the_triangle_count() {
        let mesh = cylinder(48);
        let before = mesh.triangle_count();
        let simplified = simplify(&mesh, 0.5);
        assert!(
            simplified.triangle_count() < before,
            "{} did not shrink from {before}",
            simplified.triangle_count()
        );
        assert!(!simplified.is_empty());
    }

    #[test]
    fn simplifying_preserves_the_overall_shape() {
        let mesh = cylinder(64);
        let simplified = simplify(&mesh, 0.7);
        let before = mesh.bounding_box();
        let after = simplified.bounding_box();
        // The silhouette moves a little, but not far.
        assert!(after.min.approx_eq(before.min, 1.0));
        assert!(after.max.approx_eq(before.max, 1.0));
        // Decimation only ever cuts corners off, so the volume falls; how far
        // it falls is what the quadric metric is there to hold down.
        let ratio = simplified.volume() / mesh.volume();
        assert!((0.9..=1.0).contains(&ratio), "volume ratio {ratio}");
    }

    #[test]
    fn reducing_further_costs_more_shape() {
        let mesh = cylinder(64);
        let light = simplify(&mesh, 0.8);
        let heavy = simplify(&mesh, 0.3);
        assert!(heavy.triangle_count() < light.triangle_count());
        assert!(heavy.volume() < light.volume());
    }

    #[test]
    fn a_flat_box_keeps_its_corners_however_far_it_is_reduced() {
        // Every collapse on a box's flat faces is free, so the metric should
        // strip the interior of each face while the corners stay put.
        let mesh = box_mesh();
        let simplified = simplify_to(&mesh, 12);
        assert!(simplified.triangle_count() <= mesh.triangle_count());
        let before = mesh.bounding_box();
        let after = simplified.bounding_box();
        assert!(after.min.approx_eq(before.min, 1e-6));
        assert!(after.max.approx_eq(before.max, 1e-6));
    }

    #[test]
    fn simplifying_recomputes_usable_normals() {
        let simplified = simplify(&cylinder(32), 0.5);
        for index in 0..simplified.vertex_count() {
            let normal = simplified.normal(index);
            assert!(normal.is_finite());
            assert!((normal.length() - 1.0).abs() < 1e-6, "normal {normal:?}");
        }
    }

    #[test]
    fn a_mesh_already_at_the_target_is_returned_untouched() {
        let mesh = box_mesh();
        assert_eq!(simplify_to(&mesh, mesh.triangle_count()), mesh);
        assert_eq!(simplify_to(&mesh, 10_000), mesh);
        assert_eq!(simplify(&mesh, 1.0), mesh);
    }

    #[test]
    fn an_empty_mesh_simplifies_to_nothing() {
        let empty = MeshData::new();
        assert!(simplify(&empty, 0.5).is_empty());
        assert!(simplify_to(&empty, 0).is_empty());
    }

    #[test]
    fn a_ratio_of_zero_shrinks_as_far_as_the_surface_allows() {
        let mesh = cylinder(32);
        let simplified = simplify(&mesh, 0.0);
        assert!(simplified.triangle_count() < mesh.triangle_count());
        // Collapses that would tear the surface are refused, so something is
        // always left rather than the mesh vanishing.
        assert!(!simplified.is_empty());
    }

    #[test]
    fn welding_by_position_ignores_split_normals() {
        // The tessellator emits 24 vertices for a box; there are only 8 points.
        let (positions, triangles) = weld_by_position(&box_mesh());
        assert_eq!(positions.len(), 8);
        assert_eq!(triangles.len(), 12);
    }

    #[test]
    fn a_collapse_that_would_invert_a_triangle_is_refused() {
        let positions = vec![
            Vec3::ZERO,
            Vec3::new(1.0, 0.0, 0.0),
            Vec3::new(0.0, 1.0, 0.0),
            Vec3::new(1.0, 1.0, 0.0),
        ];
        let triangles = vec![[0usize, 1, 2], [1, 3, 2]];
        let mut incident: Vec<HashSet<usize>> = vec![HashSet::new(); 4];
        for (index, &[a, b, c]) in triangles.iter().enumerate() {
            incident[a].insert(index);
            incident[b].insert(index);
            incident[c].insert(index);
        }
        // Dragging vertex 0 far past the far edge turns triangle 0 over.
        assert!(would_flip(
            0,
            1,
            Vec3::new(5.0, 5.0, 0.0),
            &positions,
            &triangles,
            &incident
        ));
        // Nudging it a little does not.
        assert!(!would_flip(
            0,
            1,
            Vec3::new(0.1, 0.05, 0.0),
            &positions,
            &triangles,
            &incident
        ));
    }

    #[test]
    fn candidates_come_off_the_heap_cheapest_first() {
        let mut heap = BinaryHeap::new();
        for cost in [5.0, 1.0, 3.0] {
            heap.push(Candidate {
                cost,
                from: 0,
                into: 1,
                target: Vec3::ZERO,
                stamp: (0, 0),
            });
        }
        assert_eq!(heap.pop().unwrap().cost, 1.0);
        assert_eq!(heap.pop().unwrap().cost, 3.0);
        assert_eq!(heap.pop().unwrap().cost, 5.0);
    }

    #[test]
    fn evaluate_declines_a_self_edge() {
        let positions = vec![Vec3::ZERO];
        let quadrics = vec![Quadric::default()];
        assert!(evaluate(0, 0, &positions, &quadrics, &[0]).is_none());
    }
}
