//! Edges and the curves they follow.

use serde::{Deserialize, Serialize};

use crate::math::{Vec3, EPSILON};

use super::{EdgeId, VertexId};

/// The curve an edge runs along, together with the parameters that describe it.
///
/// Geometry is faceted when it is built, so a circular edge arrives as a chain
/// of short segments. Keeping the analytic curve alongside them is what lets
/// tessellation refine the chain back towards the true arc, and lets the host
/// report "circle" rather than "line" when the user picks the edge.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum CurveType {
    /// A straight segment between the edge's two vertices.
    Line,
    /// Part of a circle. `start_angle` and `sweep` are measured in the plane
    /// perpendicular to `axis`, from an arbitrary but fixed reference.
    #[serde(rename_all = "camelCase")]
    Arc {
        center: Vec3,
        /// Unit normal of the arc's plane; the sweep is right-handed about it.
        axis: Vec3,
        radius: f64,
        start_angle: f64,
        sweep: f64,
    },
    /// A full circle. Its two vertices coincide.
    #[serde(rename_all = "camelCase")]
    Circle { center: Vec3, axis: Vec3, radius: f64 },
    /// A segment of a freeform curve. The control points are kept so a
    /// re-tessellation can follow the original curve rather than the facets.
    Spline,
}

impl CurveType {
    /// The name the host shows for this curve, matching the strings the
    /// TypeScript `EdgeInfo.kind` field is expected to carry.
    pub fn name(&self) -> &'static str {
        match self {
            Self::Line => "line",
            Self::Arc { .. } => "arc",
            Self::Circle { .. } => "circle",
            Self::Spline => "spline",
        }
    }

    pub fn is_linear(&self) -> bool {
        matches!(self, Self::Line)
    }

    /// The radius of a circular curve, or `None` for the others.
    pub fn radius(&self) -> Option<f64> {
        match self {
            Self::Arc { radius, .. } | Self::Circle { radius, .. } => Some(*radius),
            _ => None,
        }
    }
}

/// A one-dimensional cell: the curve between two vertices.
///
/// Edges are derived from the faces rather than authored directly — every loop
/// segment shared by two faces becomes one edge, which is what makes the
/// half-edge traversal and the manifold check possible.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Edge {
    pub id: EdgeId,
    /// Start and end vertices. Equal for a closed circular edge.
    pub vertex_ids: [VertexId; 2],
    pub curve: CurveType,
}

impl Edge {
    pub fn new(id: EdgeId, start: VertexId, end: VertexId, curve: CurveType) -> Self {
        Self { id, vertex_ids: [start, end], curve }
    }

    pub fn line(id: EdgeId, start: VertexId, end: VertexId) -> Self {
        Self::new(id, start, end, CurveType::Line)
    }

    pub fn start(&self) -> VertexId {
        self.vertex_ids[0]
    }

    pub fn end(&self) -> VertexId {
        self.vertex_ids[1]
    }

    /// True when the edge starts and ends at the same vertex.
    pub fn is_closed(&self) -> bool {
        self.vertex_ids[0] == self.vertex_ids[1]
    }

    /// The other endpoint, or `None` when `vertex` is not on this edge.
    pub fn other_vertex(&self, vertex: VertexId) -> Option<VertexId> {
        if self.vertex_ids[0] == vertex {
            Some(self.vertex_ids[1])
        } else if self.vertex_ids[1] == vertex {
            Some(self.vertex_ids[0])
        } else {
            None
        }
    }

    /// The endpoints as an unordered key, so the two faces sharing an edge
    /// agree on it whichever way round each of them walks it.
    pub fn key(&self) -> (VertexId, VertexId) {
        let [a, b] = self.vertex_ids;
        if a <= b {
            (a, b)
        } else {
            (b, a)
        }
    }

    /// Arc length, given the positions of its endpoints.
    ///
    /// Circular edges are measured along the arc, not across the chord — a
    /// half-circle's length is `pi * r`, which is what a dimension annotation
    /// on that edge should read.
    pub fn length(&self, start: Vec3, end: Vec3) -> f64 {
        match self.curve {
            CurveType::Arc { radius, sweep, .. } => radius * sweep.abs(),
            CurveType::Circle { radius, .. } => 2.0 * core::f64::consts::PI * radius,
            _ => start.distance(end),
        }
    }

    /// The point half way along the edge.
    pub fn midpoint(&self, start: Vec3, end: Vec3) -> Vec3 {
        match self.curve {
            CurveType::Arc { center, radius, .. } => {
                // Push the chord's midpoint out to the arc.
                let chord_middle = start.lerp(end, 0.5);
                let outward = chord_middle.sub(center);
                if outward.length() < EPSILON {
                    chord_middle
                } else {
                    center.add(outward.normalize().scale(radius))
                }
            }
            _ => start.lerp(end, 0.5),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use core::f64::consts::PI;

    const TOL: f64 = 1e-12;

    #[test]
    fn a_line_edge_reports_its_endpoints() {
        let edge = Edge::line(0, 1, 2);
        assert_eq!(edge.start(), 1);
        assert_eq!(edge.end(), 2);
        assert!(!edge.is_closed());
        assert_eq!(edge.curve.name(), "line");
        assert!(edge.curve.is_linear());
        assert_eq!(edge.curve.radius(), None);
    }

    #[test]
    fn other_vertex_walks_across_the_edge() {
        let edge = Edge::line(0, 4, 7);
        assert_eq!(edge.other_vertex(4), Some(7));
        assert_eq!(edge.other_vertex(7), Some(4));
        assert_eq!(edge.other_vertex(9), None);
    }

    #[test]
    fn the_key_is_order_independent() {
        assert_eq!(Edge::line(0, 2, 5).key(), Edge::line(1, 5, 2).key());
        assert_eq!(Edge::line(0, 2, 5).key(), (2, 5));
    }

    #[test]
    fn a_closed_edge_has_matching_endpoints() {
        let circle = Edge::new(
            0,
            3,
            3,
            CurveType::Circle { center: Vec3::ZERO, axis: Vec3::Z, radius: 2.0 },
        );
        assert!(circle.is_closed());
        assert_eq!(circle.curve.name(), "circle");
        assert_eq!(circle.curve.radius(), Some(2.0));
    }

    #[test]
    fn line_length_is_the_distance_between_endpoints() {
        let edge = Edge::line(0, 0, 1);
        assert!((edge.length(Vec3::ZERO, Vec3::new(3.0, 4.0, 0.0)) - 5.0).abs() < TOL);
    }

    #[test]
    fn arc_length_follows_the_arc_not_the_chord() {
        let edge = Edge::new(
            0,
            0,
            1,
            CurveType::Arc {
                center: Vec3::ZERO,
                axis: Vec3::Z,
                radius: 2.0,
                start_angle: 0.0,
                sweep: PI,
            },
        );
        // Half a circle of radius 2: arc is 2*pi, the chord would be only 4.
        assert!((edge.length(Vec3::new(2.0, 0.0, 0.0), Vec3::new(-2.0, 0.0, 0.0)) - 2.0 * PI).abs() < TOL);
        assert_eq!(edge.curve.name(), "arc");
        assert!(!edge.curve.is_linear());
    }

    #[test]
    fn circle_length_is_the_full_circumference() {
        let edge = Edge::new(
            0,
            0,
            0,
            CurveType::Circle { center: Vec3::ZERO, axis: Vec3::Z, radius: 3.0 },
        );
        let point = Vec3::new(3.0, 0.0, 0.0);
        assert!((edge.length(point, point) - 6.0 * PI).abs() < TOL);
    }

    #[test]
    fn a_line_midpoint_is_half_way_along() {
        let edge = Edge::line(0, 0, 1);
        assert!(edge
            .midpoint(Vec3::ZERO, Vec3::new(2.0, 0.0, 0.0))
            .approx_eq(Vec3::new(1.0, 0.0, 0.0), TOL));
    }

    #[test]
    fn an_arc_midpoint_sits_on_the_arc_not_the_chord() {
        let edge = Edge::new(
            0,
            0,
            1,
            CurveType::Arc {
                center: Vec3::ZERO,
                axis: Vec3::Z,
                radius: 1.0,
                start_angle: 0.0,
                sweep: core::f64::consts::FRAC_PI_2,
            },
        );
        let middle = edge.midpoint(Vec3::new(1.0, 0.0, 0.0), Vec3::new(0.0, 1.0, 0.0));
        assert!((middle.length() - 1.0).abs() < TOL);
        let expected = core::f64::consts::FRAC_1_SQRT_2;
        assert!(middle.approx_eq(Vec3::new(expected, expected, 0.0), TOL));
    }

    #[test]
    fn an_arc_midpoint_degenerates_gracefully_at_its_own_centre() {
        let edge = Edge::new(
            0,
            0,
            1,
            CurveType::Arc {
                center: Vec3::ZERO,
                axis: Vec3::Z,
                radius: 1.0,
                start_angle: 0.0,
                sweep: core::f64::consts::PI,
            },
        );
        // Endpoints straddling the centre put the chord midpoint on it, where
        // there is no outward direction to push along.
        let middle = edge.midpoint(Vec3::new(1.0, 0.0, 0.0), Vec3::new(-1.0, 0.0, 0.0));
        assert!(middle.is_finite());
    }

    #[test]
    fn round_trips_through_json_with_a_tagged_curve() {
        let edge = Edge::new(
            2,
            0,
            1,
            CurveType::Arc {
                center: Vec3::ZERO,
                axis: Vec3::Z,
                radius: 1.0,
                start_angle: 0.0,
                sweep: 1.0,
            },
        );
        let json = serde_json::to_string(&edge).unwrap();
        assert!(json.contains(r#""kind":"arc""#));
        assert!(json.contains("startAngle"));
        assert_eq!(serde_json::from_str::<Edge>(&json).unwrap(), edge);
    }
}
