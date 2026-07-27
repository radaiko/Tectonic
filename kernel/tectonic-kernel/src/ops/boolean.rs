//! Booleans — combining two solids into one.
//!
//! The method is the classic BSP one. Each body is partitioned into a binary
//! space partitioning tree, then each tree is used to clip the other's faces
//! into the parts that lie inside and the parts that lie outside. Whichever
//! parts the operation wants are kept, and the survivors are stitched back into
//! a body.
//!
//! Everything here works on the faceted boundary, so the result is faceted too:
//! a cut through a cylinder comes back as the polygon the facets make, not as an
//! ellipse. That is the same compromise the rest of the kernel makes, and the
//! analytic tags a cut face inherits are dropped rather than guessed at.

use serde::{Deserialize, Serialize};

use crate::bail;
use crate::brep::{Body, Face, Vertex};
use crate::error::KernelResult;
use crate::math::{Plane, Vec3, EPSILON, TOLERANCE};

/// Which combination of the two bodies to keep.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum BooleanOp {
    /// Everything in either body.
    Union,
    /// The first body with the second removed from it.
    Subtract,
    /// Only what the two have in common.
    Intersect,
}

impl BooleanOp {
    pub fn name(&self) -> &'static str {
        match self {
            Self::Union => "union",
            Self::Subtract => "subtract",
            Self::Intersect => "intersect",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BooleanParams {
    pub operation: BooleanOp,
}

/// Beyond this the input was not a part, and carrying on would only run the host
/// out of memory a long way further in.
const MAX_POLYGONS: usize = 400_000;

/// Everything in either body.
pub fn union(a: &Body, b: &Body) -> KernelResult<Body> {
    boolean(a, b, BooleanOp::Union)
}

/// `target` with `tool` cut away from it.
pub fn subtract(target: &Body, tool: &Body) -> KernelResult<Body> {
    boolean(target, tool, BooleanOp::Subtract)
}

/// Only the material the two bodies share.
pub fn intersect(a: &Body, b: &Body) -> KernelResult<Body> {
    boolean(a, b, BooleanOp::Intersect)
}

/// Combines two solids.
pub fn boolean(a: &Body, b: &Body, operation: BooleanOp) -> KernelResult<Body> {
    let name = operation.name();
    if a.is_empty() {
        bail!(name, "the first body is empty");
    }
    if b.is_empty() {
        bail!(name, "the second body is empty");
    }

    // Bodies that do not even share a bounding box cannot cut each other, and
    // saying so here is both faster and exact — a BSP run over two solids that
    // never meet spends its time proving what the boxes already showed.
    if !a.bounding_box().intersects(&b.bounding_box()) {
        return match operation {
            BooleanOp::Union => {
                let mut joined = a.clone();
                joined.merge(b);
                Ok(joined)
            }
            BooleanOp::Subtract => Ok(a.clone()),
            BooleanOp::Intersect => Err(crate::kernel_error!(
                name,
                "the bodies do not overlap, so the intersection is empty"
            )),
        };
    }

    let left = polygons_of(a);
    let right = polygons_of(b);
    if left.is_empty() || right.is_empty() {
        bail!(name, "a body has no faces with any area");
    }
    if left.len() + right.len() > MAX_POLYGONS {
        bail!(
            name,
            "the two bodies come to {} facets, more than this operation will attempt",
            left.len() + right.len()
        );
    }

    let mut left = Bsp::from_polygons(left);
    let mut right = Bsp::from_polygons(right);
    let combined = match operation {
        BooleanOp::Union => {
            left.clip_to(&right);
            right.clip_to(&left);
            // The far side of `right` now lies inside `left`; dropping it there
            // is what stops the join keeping a wall through its own middle.
            right.invert();
            right.clip_to(&left);
            right.invert();
            left.build(right.all_polygons());
            left.all_polygons()
        }
        BooleanOp::Subtract => {
            left.invert();
            left.clip_to(&right);
            right.clip_to(&left);
            right.invert();
            right.clip_to(&left);
            right.invert();
            left.build(right.all_polygons());
            left.invert();
            left.all_polygons()
        }
        BooleanOp::Intersect => {
            left.invert();
            right.clip_to(&left);
            right.invert();
            left.clip_to(&right);
            right.clip_to(&left);
            left.build(right.all_polygons());
            left.invert();
            left.all_polygons()
        }
    };

    let body = body_of(combined);
    if body.is_empty() {
        bail!(
            name,
            "nothing was left of the two bodies — they may not overlap"
        );
    }
    Ok(body)
}

/// A convex facet of a body's boundary, with the plane it lies in.
#[derive(Debug, Clone)]
struct Polygon {
    points: Vec<Vec3>,
    plane: Plane,
}

impl Polygon {
    fn new(points: Vec<Vec3>) -> Option<Self> {
        let plane = Plane::from_points(points[0], points[1], points[2])?;
        Some(Self { points, plane })
    }

    fn flip(&mut self) {
        self.points.reverse();
        self.plane = self.plane.flip();
    }
}

/// The body's boundary as triangles.
///
/// Triangles rather than the faces themselves because a face may be concave or
/// carry holes, and splitting either against a plane is a great deal more work
/// than splitting a triangle. The faces are rebuilt from what survives.
fn polygons_of(body: &Body) -> Vec<Polygon> {
    body.triangles()
        .into_iter()
        .filter_map(|[a, b, c]| {
            Polygon::new(vec![body.position(a), body.position(b), body.position(c)])
        })
        .collect()
}

/// Stitches loose facets back into a body.
fn body_of(polygons: Vec<Polygon>) -> Body {
    let mut vertices = Vec::new();
    let mut faces = Vec::new();
    for polygon in polygons {
        if polygon.points.len() < 3 {
            continue;
        }
        let ids: Vec<usize> = polygon
            .points
            .iter()
            .map(|&position| {
                let id = vertices.len();
                vertices.push(Vertex::new(id, position));
                id
            })
            .collect();
        faces.push(Face::planar(faces.len(), ids, &vertices));
    }

    let mut body = Body::new(vertices, faces);
    // Each facet was cut independently, so the two sides of every cut carry
    // their own copy of the same point. Until those are fused there are no
    // shared edges and the result is a pile of triangles rather than a solid.
    body.weld(TOLERANCE);
    body.remove_degenerate_faces(TOLERANCE);
    body.compact();
    // A cut splits the facet it passes through and leaves the one beside it
    // whole, so the two no longer share an edge until the corner is threaded
    // back into it.
    body.heal_t_junctions(TOLERANCE);
    body
}

/// A binary space partition of one body's facets.
///
/// The tree is held in a flat arena rather than as boxed children so that
/// building and clipping can walk it with an explicit stack. A tree over a
/// pathological input can be thousands of levels deep, which is a stack
/// overflow in WebAssembly and not a recoverable one.
#[derive(Debug, Default)]
struct Bsp {
    nodes: Vec<Node>,
}

#[derive(Debug, Default)]
struct Node {
    plane: Option<Plane>,
    front: Option<usize>,
    back: Option<usize>,
    polygons: Vec<Polygon>,
}

impl Bsp {
    fn from_polygons(polygons: Vec<Polygon>) -> Self {
        let mut tree = Self { nodes: vec![Node::default()] };
        tree.build(polygons);
        tree
    }

    /// Adds facets to the tree, splitting them against the planes already in it
    /// and choosing a plane for any node that does not have one yet.
    fn build(&mut self, polygons: Vec<Polygon>) {
        let mut pending = vec![(0usize, polygons)];
        while let Some((index, polygons)) = pending.pop() {
            if polygons.is_empty() {
                continue;
            }
            if self.nodes[index].plane.is_none() {
                self.nodes[index].plane = Some(polygons[0].plane);
            }
            let plane = self.nodes[index].plane.expect("just set");

            let mut parts = Split::default();
            for polygon in &polygons {
                split(&plane, polygon, &mut parts);
            }
            // A facet in the node's own plane belongs to the node, whichever way
            // round it faces.
            self.nodes[index].polygons.append(&mut parts.coplanar_front);
            self.nodes[index].polygons.append(&mut parts.coplanar_back);

            for (children, target) in [(parts.front, true), (parts.back, false)] {
                if children.is_empty() {
                    continue;
                }
                let existing = if target {
                    self.nodes[index].front
                } else {
                    self.nodes[index].back
                };
                let child = existing.unwrap_or_else(|| {
                    self.nodes.push(Node::default());
                    self.nodes.len() - 1
                });
                if target {
                    self.nodes[index].front = Some(child);
                } else {
                    self.nodes[index].back = Some(child);
                }
                pending.push((child, children));
            }
        }
    }

    /// Turns the tree inside out, so what it called solid it now calls empty.
    fn invert(&mut self) {
        for node in &mut self.nodes {
            for polygon in &mut node.polygons {
                polygon.flip();
            }
            node.plane = node.plane.map(|plane| plane.flip());
            core::mem::swap(&mut node.front, &mut node.back);
        }
    }

    /// The parts of `polygons` that lie outside the volume this tree bounds.
    fn clip_polygons(&self, polygons: Vec<Polygon>) -> Vec<Polygon> {
        if self.nodes.is_empty() {
            return polygons;
        }
        let mut kept = Vec::new();
        let mut pending = vec![(0usize, polygons)];
        while let Some((index, polygons)) = pending.pop() {
            let node = &self.nodes[index];
            let Some(plane) = node.plane else {
                kept.extend(polygons);
                continue;
            };

            let mut parts = Split::default();
            for polygon in &polygons {
                split(&plane, polygon, &mut parts);
            }
            // Facets lying in this very plane go with the side they face, so a
            // shared wall is kept once rather than twice or not at all.
            let mut front = parts.front;
            front.append(&mut parts.coplanar_front);
            let mut back = parts.back;
            back.append(&mut parts.coplanar_back);

            match node.front {
                Some(child) if !front.is_empty() => pending.push((child, front)),
                // Nothing in front means nothing more of this body to cut
                // against, so what got here is outside and stays.
                _ => kept.extend(front),
            }
            // Behind the last plane is inside the solid, and is dropped.
            if let Some(child) = node.back {
                if !back.is_empty() {
                    pending.push((child, back));
                }
            }
        }
        kept
    }

    /// Removes everything of this tree's own that lies inside `other`.
    fn clip_to(&mut self, other: &Self) {
        for index in 0..self.nodes.len() {
            let polygons = core::mem::take(&mut self.nodes[index].polygons);
            self.nodes[index].polygons = other.clip_polygons(polygons);
        }
    }

    fn all_polygons(&self) -> Vec<Polygon> {
        self.nodes
            .iter()
            .flat_map(|node| node.polygons.iter().cloned())
            .collect()
    }
}

const COPLANAR: u8 = 0;
const FRONT: u8 = 1;
const BACK: u8 = 2;
const SPANNING: u8 = 3;

/// The four buckets a plane sorts facets into. The two coplanar ones are kept
/// apart because which of them counts as inside depends on the caller: building
/// the tree keeps both, clipping sends each to the side it faces.
#[derive(Debug, Default)]
struct Split {
    coplanar_front: Vec<Polygon>,
    coplanar_back: Vec<Polygon>,
    front: Vec<Polygon>,
    back: Vec<Polygon>,
}

/// Sorts a facet into those buckets, cutting it in two where it straddles the
/// plane.
fn split(plane: &Plane, polygon: &Polygon, out: &mut Split) {
    let mut combined = COPLANAR;
    let sides: Vec<u8> = polygon
        .points
        .iter()
        .map(|&point| {
            let distance = plane.distance_to(point);
            let side = if distance < -TOLERANCE {
                BACK
            } else if distance > TOLERANCE {
                FRONT
            } else {
                COPLANAR
            };
            combined |= side;
            side
        })
        .collect();

    match combined {
        COPLANAR => {
            if plane.normal.dot(polygon.plane.normal) > 0.0 {
                out.coplanar_front.push(polygon.clone());
            } else {
                out.coplanar_back.push(polygon.clone());
            }
        }
        FRONT => out.front.push(polygon.clone()),
        BACK => out.back.push(polygon.clone()),
        _ => {
            let count = polygon.points.len();
            let (mut ahead, mut behind) = (Vec::new(), Vec::new());
            for index in 0..count {
                let next = (index + 1) % count;
                let (here, there) = (sides[index], sides[next]);
                let (from, to) = (polygon.points[index], polygon.points[next]);
                if here != BACK {
                    ahead.push(from);
                }
                if here != FRONT {
                    behind.push(from);
                }
                if here | there == SPANNING {
                    let along = plane.distance_to(from) / (plane.distance_to(from) - plane.distance_to(to));
                    let crossing = from.lerp(to, along);
                    ahead.push(crossing);
                    behind.push(crossing);
                }
            }
            // A cut can shave a corner so fine that one side is a sliver with no
            // area. Rebuilding from the points drops it rather than carrying a
            // facet with no plane through the rest of the tree.
            if ahead.len() >= 3 {
                if let Some(piece) = rebuilt(polygon, ahead) {
                    out.front.push(piece);
                }
            }
            if behind.len() >= 3 {
                if let Some(piece) = rebuilt(polygon, behind) {
                    out.back.push(piece);
                }
            }
        }
    }
}

/// One half of a cut facet, keeping the plane of the facet it came from so that
/// a sliver does not derive a plane of its own from rounding error.
fn rebuilt(source: &Polygon, points: Vec<Vec3>) -> Option<Polygon> {
    let mut extent = 0.0f64;
    for index in 1..points.len() {
        extent = extent.max(points[0].distance(points[index]));
    }
    if extent < EPSILON {
        return None;
    }
    Some(Polygon { points, plane: source.plane })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::math::Vec2;
    use crate::ops::{extrude, ExtrudeParams};
    use crate::Profile;

    const TOL: f64 = 1e-6;

    /// A box with its lower corner at `origin` and the given size.
    fn cube(origin: Vec3, size: Vec3) -> Body {
        let profile = Profile::rectangle(Vec2::new(origin.x, origin.y), size.x, size.y);
        let params = ExtrudeParams::new(profile, size.z)
            .on_plane(crate::math::PlaneFrame::new(
                Vec3::new(0.0, 0.0, origin.z),
                Vec3::X,
                Vec3::Y,
            ));
        extrude(&params).unwrap()
    }

    #[test]
    fn the_union_of_two_overlapping_boxes_counts_the_overlap_once() {
        let a = cube(Vec3::ZERO, Vec3::new(10.0, 10.0, 10.0));
        let b = cube(Vec3::new(5.0, 2.0, 2.0), Vec3::new(10.0, 6.0, 6.0));
        let joined = union(&a, &b).unwrap();

        // 1000 + 360 for the bar, less the 180 of it already inside the box.
        assert!((joined.volume() - (1000.0 + 360.0 - 180.0)).abs() < TOL, "{}", joined.volume());
        assert!(joined.is_valid());
        assert!(joined.is_solid());
    }

    #[test]
    fn subtracting_a_bar_leaves_the_slot_it_cut() {
        let a = cube(Vec3::ZERO, Vec3::new(10.0, 10.0, 10.0));
        let b = cube(Vec3::new(5.0, 2.0, 2.0), Vec3::new(10.0, 6.0, 6.0));
        let cut = subtract(&a, &b).unwrap();

        assert!((cut.volume() - (1000.0 - 180.0)).abs() < TOL, "{}", cut.volume());
        assert!(cut.is_valid());
        assert!(cut.is_solid());
        // The slot is open at x = 10, so the body still reaches that far.
        assert!((cut.bounding_box().max.x - 10.0).abs() < TOL);
    }

    #[test]
    fn intersecting_two_boxes_keeps_only_what_they_share() {
        let a = cube(Vec3::ZERO, Vec3::new(10.0, 10.0, 10.0));
        let b = cube(Vec3::new(5.0, 2.0, 2.0), Vec3::new(10.0, 6.0, 6.0));
        let shared = intersect(&a, &b).unwrap();

        assert!((shared.volume() - 180.0).abs() < TOL, "{}", shared.volume());
        assert!(shared.is_solid());
        let bounds = shared.bounding_box();
        assert!(bounds.min.approx_eq(Vec3::new(5.0, 2.0, 2.0), TOL));
        assert!(bounds.max.approx_eq(Vec3::new(10.0, 8.0, 8.0), TOL));
    }

    #[test]
    fn a_hole_bored_right_through_leaves_a_body_with_a_bore() {
        let block = cube(Vec3::ZERO, Vec3::new(10.0, 10.0, 4.0));
        // A square bar standing proud of the block at both ends.
        let drill = cube(Vec3::new(4.0, 4.0, -1.0), Vec3::new(2.0, 2.0, 6.0));
        let bored = subtract(&block, &drill).unwrap();

        assert!((bored.volume() - (400.0 - 16.0)).abs() < TOL, "{}", bored.volume());
        assert!(bored.is_solid());
        // The block is unchanged on the outside.
        assert!(bored.bounding_box().max.approx_eq(Vec3::new(10.0, 10.0, 4.0), TOL));
    }

    #[test]
    fn boxes_that_share_a_face_still_combine_cleanly() {
        // Coplanar faces are the case a BSP has to get right by agreeing which
        // way each one points rather than by cutting anything.
        let a = cube(Vec3::ZERO, Vec3::new(10.0, 10.0, 10.0));
        let b = cube(Vec3::new(10.0, 0.0, 0.0), Vec3::new(10.0, 10.0, 10.0));

        let joined = union(&a, &b).unwrap();
        assert!((joined.volume() - 2000.0).abs() < TOL, "{}", joined.volume());
        assert!(joined.is_solid());

        // Touching is not overlapping: nothing is taken away and nothing shared.
        assert!((subtract(&a, &b).unwrap().volume() - 1000.0).abs() < TOL);
        assert!(intersect(&a, &b).is_err());
    }

    #[test]
    fn bodies_that_never_meet_are_left_alone() {
        let a = cube(Vec3::ZERO, Vec3::new(2.0, 2.0, 2.0));
        let b = cube(Vec3::new(50.0, 50.0, 50.0), Vec3::new(2.0, 2.0, 2.0));

        let joined = union(&a, &b).unwrap();
        assert!((joined.volume() - 16.0).abs() < TOL);
        assert_eq!(joined.shells.len(), 2);

        let cut = subtract(&a, &b).unwrap();
        assert!((cut.volume() - 8.0).abs() < TOL);
        assert_eq!(cut.faces.len(), a.faces.len());

        let error = intersect(&a, &b).unwrap_err();
        assert_eq!(error.operation, "intersect");
        assert!(error.message.contains("do not overlap"));
    }

    #[test]
    fn subtracting_a_body_from_itself_leaves_nothing() {
        let a = cube(Vec3::ZERO, Vec3::new(4.0, 4.0, 4.0));
        let error = subtract(&a, &a.clone()).unwrap_err();
        assert!(error.message.contains("nothing was left"), "{}", error.message);
    }

    #[test]
    fn an_empty_body_is_refused_rather_than_silently_ignored() {
        let a = cube(Vec3::ZERO, Vec3::new(4.0, 4.0, 4.0));
        let empty = Body::empty();

        assert!(union(&empty, &a).unwrap_err().message.contains("first body"));
        assert!(union(&a, &empty).unwrap_err().message.contains("second body"));
        assert_eq!(subtract(&empty, &a).unwrap_err().operation, "subtract");
    }

    #[test]
    fn a_cut_across_a_faceted_cylinder_keeps_its_volume() {
        // The kernel is faceted, so a "cylinder" is a prism and its volume is
        // the prism's — the point is that the cut takes exactly half of it.
        let round = extrude(&ExtrudeParams::new(
            Profile::circle(Vec2::ZERO, 5.0, 32),
            10.0,
        ))
        .unwrap();
        let knife = cube(Vec3::new(0.0, -10.0, -1.0), Vec3::new(10.0, 20.0, 12.0));

        let half = subtract(&round, &knife).unwrap();
        assert!((half.volume() - round.volume() / 2.0).abs() < 1e-6, "{}", half.volume());
        assert!(half.is_solid());
        assert!(half.bounding_box().max.x < TOL);
    }

    #[test]
    fn the_operation_names_itself_and_round_trips_through_json() {
        assert_eq!(BooleanOp::Union.name(), "union");
        assert_eq!(BooleanOp::Subtract.name(), "subtract");
        assert_eq!(BooleanOp::Intersect.name(), "intersect");

        let params = BooleanParams { operation: BooleanOp::Subtract };
        let json = serde_json::to_string(&params).unwrap();
        assert!(json.contains("subtract"));
        assert_eq!(serde_json::from_str::<BooleanParams>(&json).unwrap(), params);
    }
}
