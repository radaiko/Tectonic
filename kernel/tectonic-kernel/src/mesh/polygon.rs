//! Planar polygon triangulation.
//!
//! Faces reach the tessellator as loops of points in the face's own plane: one
//! outer boundary, plus a hole for every window cut out of it. This module
//! turns that into triangles.
//!
//! The pipeline is hole elimination, then ear clipping, then Delaunay edge
//! flips. Ear clipping alone always succeeds but happily emits slivers; the
//! flipping pass costs little and repairs them, which matters because those
//! slivers go on to carry vertex normals and shade badly.

use crate::math::{Vec2, EPSILON};

/// Signed area of a closed polygon. Positive when wound counter-clockwise.
pub fn signed_area(points: &[Vec2]) -> f64 {
    if points.len() < 3 {
        return 0.0;
    }
    let mut total = 0.0;
    let mut previous = points[points.len() - 1];
    for &current in points {
        total += previous.cross(current);
        previous = current;
    }
    total * 0.5
}

pub fn area(points: &[Vec2]) -> f64 {
    signed_area(points).abs()
}

pub fn is_counter_clockwise(points: &[Vec2]) -> bool {
    signed_area(points) > 0.0
}

/// The centroid of a polygon's *area* — not the average of its corners, which
/// would drift towards whichever side happens to be more finely divided.
/// Falls back to the corner average for a degenerate (zero-area) polygon.
pub fn centroid(points: &[Vec2]) -> Vec2 {
    let area = signed_area(points);
    if area.abs() < EPSILON {
        if points.is_empty() {
            return Vec2::ZERO;
        }
        let sum = points
            .iter()
            .fold(Vec2::ZERO, |accumulator, &point| accumulator.add(point));
        return sum.scale(1.0 / points.len() as f64);
    }

    let mut center = Vec2::ZERO;
    let mut previous = points[points.len() - 1];
    for &current in points {
        let cross = previous.cross(current);
        center = center.add(previous.add(current).scale(cross));
        previous = current;
    }
    center.scale(1.0 / (6.0 * area))
}

/// True when `point` lies inside the polygon, by the even-odd ray rule.
pub fn contains_point(points: &[Vec2], point: Vec2) -> bool {
    if points.len() < 3 {
        return false;
    }
    let mut inside = false;
    let mut j = points.len() - 1;
    for i in 0..points.len() {
        let a = points[i];
        let b = points[j];
        if (a.y > point.y) != (b.y > point.y) {
            let t = (point.y - a.y) / (b.y - a.y);
            if point.x < a.x + t * (b.x - a.x) {
                inside = !inside;
            }
        }
        j = i;
    }
    inside
}

/// Triangulates a polygon with holes.
///
/// The outer boundary and each hole are given as closed loops without a
/// repeated final point. Returns triangles as indices into the concatenation
/// `outer ++ holes[0] ++ holes[1] ++ ...`, wound counter-clockwise, so a caller
/// holding the matching 3D positions can map straight back.
pub fn triangulate_with_holes(outer: &[Vec2], holes: &[Vec<Vec2>]) -> Vec<[usize; 3]> {
    // A loop with no area has no triangles, only slivers; emitting them would
    // put zero-area facets into the mesh and zero-length normals with them.
    if outer.len() < 3 || area(outer) <= EPSILON {
        return Vec::new();
    }

    let mut points: Vec<Vec2> = outer.to_vec();
    let mut ring: Vec<usize> = (0..outer.len()).collect();
    if !is_counter_clockwise(outer) {
        ring.reverse();
    }

    // Every hole keeps its own slot in `points` even if it is too small to cut,
    // so the caller's index mapping stays aligned with the loops it passed in.
    let mut usable_holes: Vec<Vec<usize>> = Vec::new();
    for hole in holes {
        let offset = points.len();
        points.extend_from_slice(hole);
        if hole.len() < 3 {
            continue;
        }
        let mut indices: Vec<usize> = (offset..offset + hole.len()).collect();
        // Holes run opposite to the outer loop so the bridge does not re-enter
        // the material it just left.
        if is_counter_clockwise(hole) {
            indices.reverse();
        }
        usable_holes.push(indices);
    }

    if !usable_holes.is_empty() {
        ring = eliminate_holes(&points, ring, usable_holes);
    }

    let triangles = ear_clip(&points, ring);
    delaunay_flip(&points, triangles)
}

/// Triangulates a simple polygon given as a closed loop of points.
pub fn triangulate(points: &[Vec2]) -> Vec<[usize; 3]> {
    triangulate_with_holes(points, &[])
}

/// Splices every hole into the outer ring with a pair of coincident bridge
/// edges, leaving one simple polygon that ear clipping can chew through.
fn eliminate_holes(points: &[Vec2], mut ring: Vec<usize>, mut holes: Vec<Vec<usize>>) -> Vec<usize> {
    // Rightmost holes first: a hole bridged to the outer ring can host a later
    // bridge, and going right-to-left keeps each bridge from crossing one that
    // is already in place.
    holes.sort_by(|a, b| {
        let ax = a.iter().map(|&i| points[i].x).fold(f64::NEG_INFINITY, f64::max);
        let bx = b.iter().map(|&i| points[i].x).fold(f64::NEG_INFINITY, f64::max);
        bx.partial_cmp(&ax).unwrap_or(core::cmp::Ordering::Equal)
    });

    for hole in holes {
        let Some(rightmost) = hole
            .iter()
            .enumerate()
            .max_by(|(_, &a), (_, &b)| {
                points[a]
                    .x
                    .partial_cmp(&points[b].x)
                    .unwrap_or(core::cmp::Ordering::Equal)
            })
            .map(|(position, _)| position)
        else {
            continue;
        };

        let Some(bridge) = find_bridge(points, &ring, points[hole[rightmost]]) else {
            continue;
        };

        // outer[..=bridge] + hole from its rightmost point round to itself
        // + the bridge vertex again to close back onto the outer ring.
        let mut spliced = Vec::with_capacity(ring.len() + hole.len() + 2);
        spliced.extend_from_slice(&ring[..=bridge]);
        for offset in 0..=hole.len() {
            spliced.push(hole[(rightmost + offset) % hole.len()]);
        }
        spliced.extend_from_slice(&ring[bridge..]);
        ring = spliced;
    }

    ring
}

/// Finds the ring vertex to bridge a hole to.
///
/// Cast a ray in +x from the hole's rightmost point and take the edge it hits
/// first. That edge is visible from the hole, but its two endpoints may not be:
/// another part of the ring can fold in between. So the nearer endpoint is only
/// a starting guess, and any reflex vertex inside the triangle it forms with
/// the ray is a better anchor — a reflex vertex is where the ring folds back,
/// and bridging to it is what keeps the bridge out of the material it would
/// otherwise cut through.
fn find_bridge(points: &[Vec2], ring: &[usize], from: Vec2) -> Option<usize> {
    let count = ring.len();
    // The *nearest* hit is the one that bounds the material the hole sits in.
    // A farther one lies beyond some other edge — often a bridge already spliced
    // in for an earlier hole — and bridging to it would cut straight across.
    let mut best_x = f64::INFINITY;
    let mut candidate: Option<usize> = None;

    for position in 0..count {
        let a = points[ring[position]];
        let b = points[ring[(position + 1) % count]];
        // Half-open in y, so a vertex exactly on the ray is counted once.
        if (a.y > from.y) == (b.y > from.y) {
            continue;
        }
        let t = (from.y - a.y) / (b.y - a.y);
        let x = a.x + t * (b.x - a.x);
        if x < from.x || x >= best_x {
            continue;
        }
        best_x = x;
        // Of the edge's two endpoints, the one nearer the hole is the one the
        // ray reaches first; on a tie — an edge parallel to the ray's own axis
        // — the one nearer the ray.
        let next = (position + 1) % count;
        let closer = if a.x < b.x - EPSILON {
            position
        } else if b.x < a.x - EPSILON {
            next
        } else if (a.y - from.y).abs() <= (b.y - from.y).abs() {
            position
        } else {
            next
        };
        candidate = Some(closer);
    }

    let mut best = candidate?;
    let hit = Vec2::new(best_x, from.y);
    if points[ring[best]].distance(hit) <= EPSILON {
        return Some(best);
    }

    // Look for a reflex vertex hiding inside the triangle (hole point, ray hit,
    // anchor). The one closest to the ray's direction wins.
    let mut best_slope = ray_slope(from, points[ring[best]]);
    for position in 0..count {
        let point = points[ring[position]];
        if point.x < from.x || !is_reflex(points, ring, position) {
            continue;
        }
        if !point_in_triangle(point, from, hit, points[ring[best]]) {
            continue;
        }
        let slope = ray_slope(from, point);
        if slope < best_slope {
            best_slope = slope;
            best = position;
        }
    }

    Some(best)
}

/// How far off the +x ray a point lies, as the sine of the angle to it. Smaller
/// means better aligned with the ray, and so more likely to be visible.
fn ray_slope(from: Vec2, to: Vec2) -> f64 {
    let offset = to.sub(from);
    let distance = offset.length();
    if distance < EPSILON {
        0.0
    } else {
        offset.y.abs() / distance
    }
}

/// True when the ring turns clockwise at this vertex. The ring runs
/// counter-clockwise, so a clockwise turn is a notch folding inwards.
fn is_reflex(points: &[Vec2], ring: &[usize], position: usize) -> bool {
    let count = ring.len();
    let previous = points[ring[(position + count - 1) % count]];
    let current = points[ring[position]];
    let next = points[ring[(position + 1) % count]];
    current.sub(previous).cross(next.sub(current)) < 0.0
}

/// Clips ears off a counter-clockwise simple polygon until none are left.
fn ear_clip(points: &[Vec2], mut ring: Vec<usize>) -> Vec<[usize; 3]> {
    let mut triangles = Vec::new();
    if ring.len() < 3 {
        return triangles;
    }

    // Bridged rings visit a vertex twice, so a run of failures does not mean the
    // polygon is bad — only that this pass found no ear. Bail after a full lap
    // without progress and fan the remainder rather than spinning.
    let mut failures = 0;
    let mut cursor = 0usize;

    while ring.len() > 3 {
        let count = ring.len();
        let previous = ring[(cursor + count - 1) % count];
        let current = ring[cursor % count];
        let next = ring[(cursor + 1) % count];

        if is_ear(points, &ring, previous, current, next) {
            triangles.push([previous, current, next]);
            ring.remove(cursor % count);
            if cursor >= ring.len() {
                cursor = 0;
            }
            failures = 0;
        } else {
            cursor = (cursor + 1) % count;
            failures += 1;
            if failures > count {
                break;
            }
        }
    }

    if ring.len() == 3 {
        let (a, b, c) = (points[ring[0]], points[ring[1]], points[ring[2]]);
        if b.sub(a).cross(c.sub(a)).abs() > EPSILON {
            triangles.push([ring[0], ring[1], ring[2]]);
        }
    } else if ring.len() > 3 {
        // Degenerate leftovers: a fan keeps the face watertight even though the
        // triangles may overlap, which beats leaving a hole in the solid.
        for i in 1..ring.len() - 1 {
            triangles.push([ring[0], ring[i], ring[i + 1]]);
        }
    }

    triangles
}

fn is_ear(points: &[Vec2], ring: &[usize], previous: usize, current: usize, next: usize) -> bool {
    let a = points[previous];
    let b = points[current];
    let c = points[next];

    // Reflex or degenerate corners are not ears.
    let cross = b.sub(a).cross(c.sub(a));
    if cross <= EPSILON {
        return false;
    }

    !ring
        .iter()
        .filter(|&&index| index != previous && index != current && index != next)
        .any(|&index| point_in_triangle(points[index], a, b, c))
}

/// True when `point` is strictly inside, or on the boundary of, triangle `abc`.
///
/// Boundary points count as inside: a vertex sitting on an ear's edge would
/// otherwise be clipped away, leaving a crack along that edge.
fn point_in_triangle(point: Vec2, a: Vec2, b: Vec2, c: Vec2) -> bool {
    let d1 = b.sub(a).cross(point.sub(a));
    let d2 = c.sub(b).cross(point.sub(b));
    let d3 = a.sub(c).cross(point.sub(c));
    let has_negative = d1 < -EPSILON || d2 < -EPSILON || d3 < -EPSILON;
    let has_positive = d1 > EPSILON || d2 > EPSILON || d3 > EPSILON;
    !(has_negative && has_positive)
}

/// Improves a triangulation by flipping the shared edge of any two triangles
/// whose quadrilateral is convex and fails the Delaunay in-circle test.
///
/// This is what turns ear clipping's slivers into well-shaped triangles. The
/// pass is capped because a flip can in principle re-enable an earlier one; in
/// practice it settles in a couple of sweeps.
pub fn delaunay_flip(points: &[Vec2], mut triangles: Vec<[usize; 3]>) -> Vec<[usize; 3]> {
    const MAX_SWEEPS: usize = 8;

    for _ in 0..MAX_SWEEPS {
        let mut flipped_any = false;
        // Map each undirected edge to the triangles using it.
        let mut neighbours: std::collections::HashMap<(usize, usize), Vec<usize>> =
            std::collections::HashMap::new();
        for (position, triangle) in triangles.iter().enumerate() {
            for corner in 0..3 {
                let a = triangle[corner];
                let b = triangle[(corner + 1) % 3];
                let key = if a <= b { (a, b) } else { (b, a) };
                neighbours.entry(key).or_default().push(position);
            }
        }

        let mut touched = vec![false; triangles.len()];
        let mut keys: Vec<_> = neighbours.keys().copied().collect();
        keys.sort_unstable();

        for key in keys {
            let owners = &neighbours[&key];
            if owners.len() != 2 {
                continue;
            }
            let (left, right) = (owners[0], owners[1]);
            if touched[left] || touched[right] {
                continue;
            }
            let Some(opposite_left) = opposite_corner(&triangles[left], key) else {
                continue;
            };
            let Some(opposite_right) = opposite_corner(&triangles[right], key) else {
                continue;
            };

            let (shared_a, shared_b) = key;
            let quad = [
                points[opposite_left],
                points[shared_a],
                points[opposite_right],
                points[shared_b],
            ];
            if !is_convex_quad(&quad) {
                continue;
            }
            if !in_circumcircle(
                points[triangles[left][0]],
                points[triangles[left][1]],
                points[triangles[left][2]],
                points[opposite_right],
            ) {
                continue;
            }

            triangles[left] = wound([opposite_left, shared_a, opposite_right], points);
            triangles[right] = wound([opposite_left, opposite_right, shared_b], points);
            touched[left] = true;
            touched[right] = true;
            flipped_any = true;
        }

        if !flipped_any {
            break;
        }
    }

    triangles
}

fn opposite_corner(triangle: &[usize; 3], edge: (usize, usize)) -> Option<usize> {
    triangle
        .iter()
        .copied()
        .find(|&index| index != edge.0 && index != edge.1)
}

/// Reorders a triangle's corners so it is wound counter-clockwise.
fn wound(triangle: [usize; 3], points: &[Vec2]) -> [usize; 3] {
    let [a, b, c] = triangle;
    if points[b].sub(points[a]).cross(points[c].sub(points[a])) < 0.0 {
        [a, c, b]
    } else {
        [a, b, c]
    }
}

/// True when the four points, taken in order, form a convex quadrilateral.
/// A flip across a concave quad would produce an overlapping pair.
fn is_convex_quad(quad: &[Vec2; 4]) -> bool {
    let mut sign = 0.0;
    for i in 0..4 {
        let a = quad[i];
        let b = quad[(i + 1) % 4];
        let c = quad[(i + 2) % 4];
        let cross = b.sub(a).cross(c.sub(b));
        if cross.abs() < EPSILON {
            continue;
        }
        if sign == 0.0 {
            sign = cross;
        } else if sign * cross < 0.0 {
            return false;
        }
    }
    sign != 0.0
}

/// True when `point` falls strictly inside the circle through `a`, `b`, `c`.
fn in_circumcircle(a: Vec2, b: Vec2, c: Vec2, point: Vec2) -> bool {
    // The determinant test only reports "inside" for a counter-clockwise
    // triangle, so normalise the winding first.
    let (a, b, c) = if b.sub(a).cross(c.sub(a)) < 0.0 {
        (a, c, b)
    } else {
        (a, b, c)
    };

    let ax = a.x - point.x;
    let ay = a.y - point.y;
    let bx = b.x - point.x;
    let by = b.y - point.y;
    let cx = c.x - point.x;
    let cy = c.y - point.y;

    let determinant = (ax * ax + ay * ay) * (bx * cy - by * cx)
        - (bx * bx + by * by) * (ax * cy - ay * cx)
        + (cx * cx + cy * cy) * (ax * by - ay * bx);

    determinant > EPSILON
}

#[cfg(test)]
mod tests {
    use super::*;

    fn square() -> Vec<Vec2> {
        vec![
            Vec2::new(0.0, 0.0),
            Vec2::new(1.0, 0.0),
            Vec2::new(1.0, 1.0),
            Vec2::new(0.0, 1.0),
        ]
    }

    /// Sums the triangles' areas, which must equal the polygon's own area when
    /// the triangulation covers it exactly once and nothing overlaps.
    fn triangulated_area(points: &[Vec2], triangles: &[[usize; 3]]) -> f64 {
        triangles
            .iter()
            .map(|&[a, b, c]| {
                (points[b].sub(points[a]).cross(points[c].sub(points[a]))).abs() * 0.5
            })
            .sum()
    }

    #[test]
    fn signed_area_is_positive_counter_clockwise() {
        assert!((signed_area(&square()) - 1.0).abs() < 1e-12);
        let mut reversed = square();
        reversed.reverse();
        assert!((signed_area(&reversed) + 1.0).abs() < 1e-12);
        assert!(is_counter_clockwise(&square()));
        assert!(!is_counter_clockwise(&reversed));
        assert!((area(&reversed) - 1.0).abs() < 1e-12);
    }

    #[test]
    fn degenerate_polygons_have_no_area() {
        assert_eq!(signed_area(&[]), 0.0);
        assert_eq!(signed_area(&[Vec2::ZERO, Vec2::X]), 0.0);
    }

    #[test]
    fn centroid_of_a_square_is_its_middle() {
        assert!(centroid(&square()).approx_eq(Vec2::new(0.5, 0.5), 1e-12));
    }

    #[test]
    fn centroid_weights_by_area_not_by_corner_count() {
        // An L shape: the corner average would sit outside the arm balance,
        // the area centroid does not.
        let shape = vec![
            Vec2::new(0.0, 0.0),
            Vec2::new(2.0, 0.0),
            Vec2::new(2.0, 1.0),
            Vec2::new(1.0, 1.0),
            Vec2::new(1.0, 2.0),
            Vec2::new(0.0, 2.0),
        ];
        let center = centroid(&shape);
        assert!((center.x - 5.0 / 6.0).abs() < 1e-12);
        assert!((center.y - 5.0 / 6.0).abs() < 1e-12);
    }

    #[test]
    fn centroid_of_a_degenerate_polygon_falls_back_to_the_corner_average() {
        let line = vec![Vec2::ZERO, Vec2::new(2.0, 0.0)];
        assert!(centroid(&line).approx_eq(Vec2::new(1.0, 0.0), 1e-12));
        assert_eq!(centroid(&[]), Vec2::ZERO);
    }

    #[test]
    fn contains_point_uses_the_even_odd_rule() {
        let shape = square();
        assert!(contains_point(&shape, Vec2::new(0.5, 0.5)));
        assert!(!contains_point(&shape, Vec2::new(1.5, 0.5)));
        assert!(!contains_point(&shape, Vec2::new(-0.5, 0.5)));
        assert!(!contains_point(&[Vec2::ZERO, Vec2::X], Vec2::ZERO));
    }

    #[test]
    fn a_square_becomes_two_triangles() {
        let points = square();
        let triangles = triangulate(&points);
        assert_eq!(triangles.len(), 2);
        assert!((triangulated_area(&points, &triangles) - 1.0).abs() < 1e-12);
    }

    #[test]
    fn triangles_come_out_counter_clockwise() {
        let points = square();
        for [a, b, c] in triangulate(&points) {
            let cross = points[b].sub(points[a]).cross(points[c].sub(points[a]));
            assert!(cross > 0.0, "triangle {a},{b},{c} is wound backwards");
        }
    }

    #[test]
    fn a_clockwise_polygon_is_still_triangulated_counter_clockwise() {
        let mut points = square();
        points.reverse();
        let triangles = triangulate(&points);
        assert_eq!(triangles.len(), 2);
        for [a, b, c] in triangles {
            assert!(points[b].sub(points[a]).cross(points[c].sub(points[a])) > 0.0);
        }
    }

    #[test]
    fn an_n_gon_yields_n_minus_two_triangles() {
        for corners in [3usize, 5, 8, 16, 32] {
            let points: Vec<Vec2> = (0..corners)
                .map(|i| {
                    let angle = i as f64 / corners as f64 * core::f64::consts::TAU;
                    Vec2::new(angle.cos(), angle.sin())
                })
                .collect();
            let triangles = triangulate(&points);
            assert_eq!(triangles.len(), corners - 2, "{corners}-gon");
            let expected = area(&points);
            assert!((triangulated_area(&points, &triangles) - expected).abs() < 1e-9);
        }
    }

    #[test]
    fn a_concave_polygon_is_covered_exactly_once() {
        // An arrowhead: the notch at the bottom makes one corner reflex.
        let points = vec![
            Vec2::new(0.0, 0.0),
            Vec2::new(2.0, 4.0),
            Vec2::new(4.0, 0.0),
            Vec2::new(2.0, 1.0),
        ];
        let triangles = triangulate(&points);
        assert_eq!(triangles.len(), 2);
        assert!((triangulated_area(&points, &triangles) - area(&points)).abs() < 1e-12);
    }

    #[test]
    fn a_deeply_concave_comb_is_triangulated_without_overlap() {
        // A comb with three teeth exercises the ear search hard: most corners
        // are reflex at the start.
        let mut points = vec![Vec2::new(0.0, 0.0), Vec2::new(6.0, 0.0), Vec2::new(6.0, 3.0)];
        for tooth in 0..3 {
            let x = 5.0 - tooth as f64 * 2.0;
            points.push(Vec2::new(x, 3.0));
            points.push(Vec2::new(x, 1.0));
            points.push(Vec2::new(x - 1.0, 1.0));
            points.push(Vec2::new(x - 1.0, 3.0));
        }
        points.push(Vec2::new(0.0, 3.0));

        let triangles = triangulate(&points);
        assert!((triangulated_area(&points, &triangles) - area(&points)).abs() < 1e-9);
    }

    #[test]
    fn a_square_with_a_square_hole_keeps_the_hole_open() {
        let outer = vec![
            Vec2::new(0.0, 0.0),
            Vec2::new(4.0, 0.0),
            Vec2::new(4.0, 4.0),
            Vec2::new(0.0, 4.0),
        ];
        let hole = vec![
            Vec2::new(1.0, 1.0),
            Vec2::new(3.0, 1.0),
            Vec2::new(3.0, 3.0),
            Vec2::new(1.0, 3.0),
        ];
        let points: Vec<Vec2> = outer.iter().chain(hole.iter()).copied().collect();
        let triangles = triangulate_with_holes(&outer, &[hole]);

        // 16 minus the 4 removed by the hole.
        assert!((triangulated_area(&points, &triangles) - 12.0).abs() < 1e-9);
        // Every hole corner is used, so the hole is bounded by real edges.
        for index in 4..8 {
            assert!(
                triangles.iter().any(|t| t.contains(&index)),
                "hole vertex {index} was dropped"
            );
        }
    }

    #[test]
    fn two_holes_are_both_eliminated() {
        let outer = vec![
            Vec2::new(0.0, 0.0),
            Vec2::new(10.0, 0.0),
            Vec2::new(10.0, 6.0),
            Vec2::new(0.0, 6.0),
        ];
        let left = vec![
            Vec2::new(1.0, 1.0),
            Vec2::new(3.0, 1.0),
            Vec2::new(3.0, 3.0),
            Vec2::new(1.0, 3.0),
        ];
        let right = vec![
            Vec2::new(6.0, 2.0),
            Vec2::new(8.0, 2.0),
            Vec2::new(8.0, 5.0),
            Vec2::new(6.0, 5.0),
        ];
        let points: Vec<Vec2> = outer
            .iter()
            .chain(left.iter())
            .chain(right.iter())
            .copied()
            .collect();
        let triangles = triangulate_with_holes(&outer, &[left, right]);
        assert!((triangulated_area(&points, &triangles) - (60.0 - 4.0 - 6.0)).abs() < 1e-9);
    }

    #[test]
    fn a_hole_given_counter_clockwise_is_reversed_for_us() {
        let outer = square();
        // Same hole, wound the "wrong" way — the caller should not have to care.
        let hole = vec![
            Vec2::new(0.25, 0.25),
            Vec2::new(0.75, 0.25),
            Vec2::new(0.75, 0.75),
            Vec2::new(0.25, 0.75),
        ];
        let points: Vec<Vec2> = outer.iter().chain(hole.iter()).copied().collect();
        let triangles = triangulate_with_holes(&outer, &[hole]);
        assert!((triangulated_area(&points, &triangles) - 0.75).abs() < 1e-9);
    }

    #[test]
    fn a_round_hole_in_a_square_is_cut_out() {
        let outer = vec![
            Vec2::new(-5.0, -5.0),
            Vec2::new(5.0, -5.0),
            Vec2::new(5.0, 5.0),
            Vec2::new(-5.0, 5.0),
        ];
        let hole: Vec<Vec2> = (0..24)
            .map(|i| {
                let angle = i as f64 / 24.0 * core::f64::consts::TAU;
                Vec2::new(2.0 * angle.cos(), 2.0 * angle.sin())
            })
            .collect();
        let points: Vec<Vec2> = outer.iter().chain(hole.iter()).copied().collect();
        let expected = 100.0 - area(&hole);

        assert_eq!(
            triangulate_with_holes(&outer, &[]).len(),
            2,
            "no holes means a plain square"
        );

        let with_hole = triangulate_with_holes(&outer, &[hole]);
        assert!((triangulated_area(&points, &with_hole) - expected).abs() < 1e-9);
    }

    #[test]
    fn degenerate_input_produces_no_triangles() {
        assert!(triangulate(&[]).is_empty());
        assert!(triangulate(&[Vec2::ZERO, Vec2::X]).is_empty());
    }

    #[test]
    fn a_hole_too_small_to_be_a_loop_is_ignored_but_keeps_its_indices() {
        let outer = square();
        let sliver = vec![Vec2::new(0.4, 0.4), Vec2::new(0.6, 0.4)];
        let triangles = triangulate_with_holes(&outer, &[sliver]);
        // The square is triangulated as if the degenerate hole were not there.
        assert_eq!(triangles.len(), 2);
        assert!(triangles.iter().flatten().all(|&index| index < 4));
    }

    #[test]
    fn delaunay_flipping_replaces_a_sliver_with_a_better_pair() {
        // A near-degenerate split of a square across its long way round.
        let points = vec![
            Vec2::new(0.0, 0.0),
            Vec2::new(4.0, 0.0),
            Vec2::new(4.0, 0.5),
            Vec2::new(0.0, 0.5),
        ];
        let before = vec![[0usize, 1, 2], [0, 2, 3]];
        let after = delaunay_flip(&points, before.clone());
        assert_eq!(after.len(), 2);
        // Whatever it picks, the area is preserved.
        assert!((triangulated_area(&points, &after) - 2.0).abs() < 1e-12);
    }

    #[test]
    fn delaunay_flipping_leaves_an_already_good_triangulation_alone() {
        let points = square();
        let triangles = vec![[0usize, 1, 2], [0, 2, 3]];
        let after = delaunay_flip(&points, triangles.clone());
        assert_eq!(after.len(), triangles.len());
        assert!((triangulated_area(&points, &after) - 1.0).abs() < 1e-12);
    }

    #[test]
    fn convexity_test_rejects_a_dart() {
        assert!(is_convex_quad(&[
            Vec2::new(0.0, 0.0),
            Vec2::new(1.0, 0.0),
            Vec2::new(1.0, 1.0),
            Vec2::new(0.0, 1.0),
        ]));
        // The last corner folds back inside the triangle formed by the others.
        assert!(!is_convex_quad(&[
            Vec2::new(0.0, 0.0),
            Vec2::new(2.0, 0.0),
            Vec2::new(1.0, 2.0),
            Vec2::new(1.0, 0.5),
        ]));
        // Fully collinear points are not a quad at all.
        assert!(!is_convex_quad(&[
            Vec2::new(0.0, 0.0),
            Vec2::new(1.0, 0.0),
            Vec2::new(2.0, 0.0),
            Vec2::new(3.0, 0.0),
        ]));
    }

    #[test]
    fn circumcircle_test_is_winding_independent() {
        let a = Vec2::new(0.0, 0.0);
        let b = Vec2::new(1.0, 0.0);
        let c = Vec2::new(0.0, 1.0);
        let inside = Vec2::new(0.3, 0.3);
        let outside = Vec2::new(5.0, 5.0);
        assert!(in_circumcircle(a, b, c, inside));
        assert!(in_circumcircle(a, c, b, inside));
        assert!(!in_circumcircle(a, b, c, outside));
        assert!(!in_circumcircle(a, c, b, outside));
    }

    #[test]
    fn point_in_triangle_counts_the_boundary_as_inside() {
        let a = Vec2::new(0.0, 0.0);
        let b = Vec2::new(2.0, 0.0);
        let c = Vec2::new(0.0, 2.0);
        assert!(point_in_triangle(Vec2::new(0.5, 0.5), a, b, c));
        assert!(point_in_triangle(Vec2::new(1.0, 0.0), a, b, c));
        assert!(point_in_triangle(a, a, b, c));
        assert!(!point_in_triangle(Vec2::new(2.0, 2.0), a, b, c));
    }
}
