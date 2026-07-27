//! The surfaces faces lie on.

use serde::{Deserialize, Serialize};

use crate::math::{Plane, Vec3, EPSILON};

/// The surface a face lies on, with the parameters that define it.
///
/// Faces are stored faceted — a cylinder is a fan of narrow planar strips — but
/// each one remembers the surface it was cut from. That tag does real work:
/// [`Surface::project`] pulls a subdivided point back onto the true surface so
/// tessellation can refine towards it, [`Surface::normal_at`] gives a smooth
/// normal instead of a facet's, and the host can tell the user it picked a
/// cylinder rather than a strip of planes.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Surface {
    /// A flat face. `normal` is the surface's own orientation; whether the face
    /// agrees with it is recorded on the face, not here.
    Plane { normal: Vec3, offset: f64 },
    /// An infinite circular cylinder about the line through `origin` along `axis`.
    Cylinder { origin: Vec3, axis: Vec3, radius: f64 },
    Sphere { center: Vec3, radius: f64 },
    /// A cone with its point at `apex`, opening along `axis`.
    /// `half_angle` is measured from the axis, in radians.
    #[serde(rename_all = "camelCase")]
    Cone { apex: Vec3, axis: Vec3, half_angle: f64 },
    #[serde(rename_all = "camelCase")]
    Torus {
        center: Vec3,
        axis: Vec3,
        /// Distance from the centre to the middle of the tube.
        major_radius: f64,
        /// Radius of the tube itself.
        minor_radius: f64,
    },
    /// A freeform surface whose analytic form was not retained — an imported
    /// mesh, or the result of a boolean. Its facets are the whole truth.
    Nurbs,
}

impl Surface {
    pub fn plane(point: Vec3, normal: Vec3) -> Self {
        let normal = normal.normalize();
        Self::Plane { normal, offset: normal.dot(point) }
    }

    pub fn from_plane(plane: Plane) -> Self {
        Self::Plane { normal: plane.normal, offset: plane.offset }
    }

    /// The name the host shows, matching TypeScript's `FaceInfo.kind`.
    pub fn name(&self) -> &'static str {
        match self {
            Self::Plane { .. } => "plane",
            Self::Cylinder { .. } => "cylinder",
            Self::Sphere { .. } => "sphere",
            Self::Cone { .. } => "cone",
            Self::Torus { .. } => "torus",
            Self::Nurbs => "nurbs",
        }
    }

    pub fn is_planar(&self) -> bool {
        matches!(self, Self::Plane { .. })
    }

    /// True when a face on this surface needs curvature-driven refinement.
    pub fn is_curved(&self) -> bool {
        !matches!(self, Self::Plane { .. } | Self::Nurbs)
    }

    pub fn as_plane(&self) -> Option<Plane> {
        match self {
            Self::Plane { normal, offset } => Some(Plane { normal: *normal, offset: *offset }),
            _ => None,
        }
    }

    /// The surface's own outward normal at (or nearest to) `point`.
    ///
    /// Returns [`Vec3::ZERO`] where the normal is genuinely undefined — on a
    /// cylinder's axis, at a cone's apex — so callers can fall back to a facet
    /// normal rather than propagating a NaN.
    pub fn normal_at(&self, point: Vec3) -> Vec3 {
        match *self {
            Self::Plane { normal, .. } => normal,
            Self::Cylinder { origin, axis, .. } => {
                let axis = axis.normalize();
                point.sub(origin).reject_from(axis).normalize()
            }
            Self::Sphere { center, .. } => point.sub(center).normalize(),
            Self::Cone { apex, axis, half_angle } => {
                let axis = axis.normalize();
                let radial = point.sub(apex).reject_from(axis).normalize();
                if radial == Vec3::ZERO {
                    return Vec3::ZERO;
                }
                let (sin, cos) = half_angle.sin_cos();
                radial.scale(cos).sub(axis.scale(sin)).normalize()
            }
            Self::Torus { center, axis, major_radius, .. } => {
                let axis = axis.normalize();
                let radial = point.sub(center).reject_from(axis).normalize();
                if radial == Vec3::ZERO {
                    return Vec3::ZERO;
                }
                let tube_center = center.add(radial.scale(major_radius));
                point.sub(tube_center).normalize()
            }
            Self::Nurbs => Vec3::ZERO,
        }
    }

    /// The point on the surface closest to `point`.
    ///
    /// This is what makes adaptive tessellation possible: split a facet edge,
    /// project the new midpoint, and the facet bulges out to meet the surface.
    /// Points where the projection is ambiguous are returned unchanged.
    pub fn project(&self, point: Vec3) -> Vec3 {
        match *self {
            Self::Plane { normal, offset } => point.sub(normal.scale(normal.dot(point) - offset)),
            Self::Cylinder { origin, axis, radius } => {
                let axis = axis.normalize();
                let relative = point.sub(origin);
                let along = axis.scale(relative.dot(axis));
                let radial = relative.sub(along);
                if radial.length() < EPSILON {
                    return point;
                }
                origin.add(along).add(radial.normalize().scale(radius))
            }
            Self::Sphere { center, radius } => {
                let outward = point.sub(center);
                if outward.length() < EPSILON {
                    return point;
                }
                center.add(outward.normalize().scale(radius))
            }
            Self::Cone { apex, axis, half_angle } => {
                let axis = axis.normalize();
                let relative = point.sub(apex);
                let along = relative.dot(axis);
                let radial = relative.sub(axis.scale(along));
                let radial_length = radial.length();
                if radial_length < EPSILON {
                    return point;
                }
                // Work in the (axis, radial) half-plane, where the cone is the
                // ray (t, t*tan a). Closest point is the ordinary projection of
                // (along, radial_length) onto that ray, clamped at the apex.
                let tangent = half_angle.tan();
                let t = ((along + radial_length * tangent) / (1.0 + tangent * tangent)).max(0.0);
                apex.add(axis.scale(t))
                    .add(radial.normalize().scale(t * tangent))
            }
            Self::Torus { center, axis, major_radius, minor_radius } => {
                let axis = axis.normalize();
                let radial = point.sub(center).reject_from(axis);
                if radial.length() < EPSILON {
                    return point;
                }
                let tube_center = center.add(radial.normalize().scale(major_radius));
                let outward = point.sub(tube_center);
                if outward.length() < EPSILON {
                    return point;
                }
                tube_center.add(outward.normalize().scale(minor_radius))
            }
            Self::Nurbs => point,
        }
    }

    /// How far `point` sits from the surface. Zero for a point on it.
    pub fn distance_to(&self, point: Vec3) -> f64 {
        point.distance(self.project(point))
    }

    /// The surface after a rigid transform. A non-uniform scale cannot be
    /// represented by these analytic forms, so anything that is not close to a
    /// rigid motion degrades to [`Surface::Nurbs`] and the facets take over.
    pub fn transformed(&self, transform: &crate::math::Mat4) -> Self {
        if !is_rigid(transform) {
            return Self::Nurbs;
        }
        let point = |p: Vec3| transform.transform_point(p);
        let direction = |d: Vec3| transform.transform_vector(d).normalize();
        // Rigid up to a uniform scale: measure it once from a unit vector.
        let scale = transform.transform_vector(Vec3::X).length();

        match *self {
            Self::Plane { normal, offset } => {
                Self::plane(point(normal.scale(offset)), direction(normal))
            }
            Self::Cylinder { origin, axis, radius } => Self::Cylinder {
                origin: point(origin),
                axis: direction(axis),
                radius: radius * scale,
            },
            Self::Sphere { center, radius } => Self::Sphere {
                center: point(center),
                radius: radius * scale,
            },
            Self::Cone { apex, axis, half_angle } => Self::Cone {
                apex: point(apex),
                axis: direction(axis),
                half_angle,
            },
            Self::Torus { center, axis, major_radius, minor_radius } => Self::Torus {
                center: point(center),
                axis: direction(axis),
                major_radius: major_radius * scale,
                minor_radius: minor_radius * scale,
            },
            Self::Nurbs => Self::Nurbs,
        }
    }
}

/// True when the transform is a rotation, translation and uniform scale — the
/// transforms under which an analytic surface stays the same kind of surface.
fn is_rigid(transform: &crate::math::Mat4) -> bool {
    let x = transform.transform_vector(Vec3::X);
    let y = transform.transform_vector(Vec3::Y);
    let z = transform.transform_vector(Vec3::Z);
    let scale = x.length();
    if scale < EPSILON {
        return false;
    }
    (y.length() - scale).abs() < 1e-9 * scale
        && (z.length() - scale).abs() < 1e-9 * scale
        && x.dot(y).abs() < 1e-9 * scale * scale
        && x.dot(z).abs() < 1e-9 * scale * scale
        && y.dot(z).abs() < 1e-9 * scale * scale
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::math::Mat4;
    use core::f64::consts::FRAC_PI_4;

    const TOL: f64 = 1e-9;

    #[test]
    fn names_match_the_host_side_strings() {
        assert_eq!(Surface::plane(Vec3::ZERO, Vec3::Z).name(), "plane");
        assert_eq!(
            Surface::Cylinder { origin: Vec3::ZERO, axis: Vec3::Z, radius: 1.0 }.name(),
            "cylinder"
        );
        assert_eq!(Surface::Sphere { center: Vec3::ZERO, radius: 1.0 }.name(), "sphere");
        assert_eq!(
            Surface::Cone { apex: Vec3::ZERO, axis: Vec3::Z, half_angle: 0.5 }.name(),
            "cone"
        );
        assert_eq!(
            Surface::Torus {
                center: Vec3::ZERO,
                axis: Vec3::Z,
                major_radius: 2.0,
                minor_radius: 0.5
            }
            .name(),
            "torus"
        );
        assert_eq!(Surface::Nurbs.name(), "nurbs");
    }

    #[test]
    fn planar_and_curved_classify_correctly() {
        let plane = Surface::plane(Vec3::ZERO, Vec3::Z);
        assert!(plane.is_planar());
        assert!(!plane.is_curved());
        let cylinder = Surface::Cylinder { origin: Vec3::ZERO, axis: Vec3::Z, radius: 1.0 };
        assert!(!cylinder.is_planar());
        assert!(cylinder.is_curved());
        // A freeform surface has no curvature model to refine against.
        assert!(!Surface::Nurbs.is_curved());
        assert!(!Surface::Nurbs.is_planar());
    }

    #[test]
    fn a_plane_projects_along_its_normal() {
        let surface = Surface::plane(Vec3::new(0.0, 0.0, 2.0), Vec3::Z);
        assert!(surface
            .project(Vec3::new(1.0, 1.0, 9.0))
            .approx_eq(Vec3::new(1.0, 1.0, 2.0), TOL));
        assert!(surface.normal_at(Vec3::ZERO).approx_eq(Vec3::Z, TOL));
        assert!((surface.distance_to(Vec3::new(0.0, 0.0, 5.0)) - 3.0).abs() < TOL);
        assert_eq!(surface.as_plane().unwrap().offset, 2.0);
        assert!(Surface::Nurbs.as_plane().is_none());
    }

    #[test]
    fn a_cylinder_projects_radially_and_keeps_the_axial_position() {
        let surface = Surface::Cylinder { origin: Vec3::ZERO, axis: Vec3::Z, radius: 2.0 };
        let projected = surface.project(Vec3::new(5.0, 0.0, 3.0));
        assert!(projected.approx_eq(Vec3::new(2.0, 0.0, 3.0), TOL));
        assert!(surface.normal_at(projected).approx_eq(Vec3::X, TOL));
        assert!(surface.distance_to(projected) < TOL);
        // Inside the cylinder, projection pushes outwards.
        assert!(surface
            .project(Vec3::new(0.5, 0.0, 0.0))
            .approx_eq(Vec3::new(2.0, 0.0, 0.0), TOL));
    }

    #[test]
    fn a_point_on_the_cylinder_axis_has_no_projection() {
        let surface = Surface::Cylinder { origin: Vec3::ZERO, axis: Vec3::Z, radius: 2.0 };
        let on_axis = Vec3::new(0.0, 0.0, 1.0);
        assert_eq!(surface.project(on_axis), on_axis);
        assert_eq!(surface.normal_at(on_axis), Vec3::ZERO);
    }

    #[test]
    fn a_sphere_projects_onto_its_shell() {
        let surface = Surface::Sphere { center: Vec3::new(1.0, 0.0, 0.0), radius: 3.0 };
        let projected = surface.project(Vec3::new(10.0, 0.0, 0.0));
        assert!(projected.approx_eq(Vec3::new(4.0, 0.0, 0.0), TOL));
        assert!(surface.normal_at(projected).approx_eq(Vec3::X, TOL));
        // The centre itself is ambiguous.
        assert_eq!(surface.project(Vec3::new(1.0, 0.0, 0.0)), Vec3::new(1.0, 0.0, 0.0));
    }

    #[test]
    fn a_cone_projects_onto_its_ruling_and_clamps_at_the_apex() {
        // 45 degrees: the surface passes through (r, 0, r).
        let surface = Surface::Cone { apex: Vec3::ZERO, axis: Vec3::Z, half_angle: FRAC_PI_4 };
        let on_surface = Vec3::new(2.0, 0.0, 2.0);
        assert!(surface.project(on_surface).approx_eq(on_surface, TOL));
        assert!(surface.distance_to(on_surface) < TOL);

        // Points behind the apex collapse onto it.
        let behind = surface.project(Vec3::new(0.001, 0.0, -5.0));
        assert!(behind.approx_eq(Vec3::ZERO, 1e-6));

        // The normal leans outwards and away from the opening direction.
        let normal = surface.normal_at(on_surface);
        assert!((normal.length() - 1.0).abs() < TOL);
        assert!(normal.x > 0.0 && normal.z < 0.0);
        assert!(normal.dot(Vec3::new(1.0, 0.0, 1.0).normalize()).abs() < TOL);
    }

    #[test]
    fn the_cone_apex_has_no_normal() {
        let surface = Surface::Cone { apex: Vec3::ZERO, axis: Vec3::Z, half_angle: FRAC_PI_4 };
        assert_eq!(surface.normal_at(Vec3::ZERO), Vec3::ZERO);
        assert_eq!(surface.project(Vec3::ZERO), Vec3::ZERO);
    }

    #[test]
    fn a_torus_projects_onto_its_tube() {
        let surface = Surface::Torus {
            center: Vec3::ZERO,
            axis: Vec3::Z,
            major_radius: 5.0,
            minor_radius: 1.0,
        };
        // Straight out along +x, the tube's outer equator is at x = 6.
        let projected = surface.project(Vec3::new(10.0, 0.0, 0.0));
        assert!(projected.approx_eq(Vec3::new(6.0, 0.0, 0.0), TOL));
        assert!(surface.normal_at(projected).approx_eq(Vec3::X, TOL));
        // Above the tube centre, the surface is one minor radius up.
        assert!(surface
            .project(Vec3::new(5.0, 0.0, 4.0))
            .approx_eq(Vec3::new(5.0, 0.0, 1.0), TOL));
        assert!(surface.distance_to(Vec3::new(6.0, 0.0, 0.0)) < TOL);
    }

    #[test]
    fn the_torus_axis_is_ambiguous() {
        let surface = Surface::Torus {
            center: Vec3::ZERO,
            axis: Vec3::Z,
            major_radius: 5.0,
            minor_radius: 1.0,
        };
        assert_eq!(surface.project(Vec3::ZERO), Vec3::ZERO);
        assert_eq!(surface.normal_at(Vec3::ZERO), Vec3::ZERO);
    }

    #[test]
    fn a_freeform_surface_answers_with_nothing_to_refine_against() {
        assert_eq!(Surface::Nurbs.project(Vec3::ONE), Vec3::ONE);
        assert_eq!(Surface::Nurbs.normal_at(Vec3::ONE), Vec3::ZERO);
        assert_eq!(Surface::Nurbs.distance_to(Vec3::ONE), 0.0);
    }

    #[test]
    fn rigid_transforms_carry_the_surface_along() {
        let cylinder = Surface::Cylinder { origin: Vec3::ZERO, axis: Vec3::Z, radius: 2.0 };
        let moved = cylinder.transformed(&Mat4::translation(Vec3::new(1.0, 0.0, 0.0)));
        assert!(moved
            .project(Vec3::new(10.0, 0.0, 0.0))
            .approx_eq(Vec3::new(3.0, 0.0, 0.0), TOL));

        let turned = cylinder.transformed(&Mat4::rotation_x(core::f64::consts::FRAC_PI_2));
        match turned {
            Surface::Cylinder { axis, radius, .. } => {
                assert!(axis.approx_eq(-Vec3::Y, TOL) || axis.approx_eq(Vec3::Y, TOL));
                assert!((radius - 2.0).abs() < TOL);
            }
            other => panic!("expected a cylinder, got {other:?}"),
        }
    }

    #[test]
    fn a_uniform_scale_scales_the_radii() {
        let sphere = Surface::Sphere { center: Vec3::ZERO, radius: 2.0 };
        match sphere.transformed(&Mat4::uniform_scaling(3.0)) {
            Surface::Sphere { radius, .. } => assert!((radius - 6.0).abs() < TOL),
            other => panic!("expected a sphere, got {other:?}"),
        }
    }

    #[test]
    fn a_non_uniform_scale_degrades_to_a_freeform_surface() {
        // An ellipsoid is not a sphere, so the analytic tag has to go.
        let sphere = Surface::Sphere { center: Vec3::ZERO, radius: 2.0 };
        let squashed = sphere.transformed(&Mat4::scaling(Vec3::new(1.0, 1.0, 3.0)));
        assert_eq!(squashed, Surface::Nurbs);
        assert!(!is_rigid(&Mat4::scaling(Vec3::new(1.0, 1.0, 3.0))));
        assert!(!is_rigid(&Mat4::ZERO));
        assert!(is_rigid(&Mat4::rotation_z(0.7)));
    }

    #[test]
    fn a_transformed_plane_still_passes_through_the_moved_point() {
        let plane = Surface::plane(Vec3::new(0.0, 0.0, 1.0), Vec3::Z);
        let moved = plane.transformed(&Mat4::translation(Vec3::new(0.0, 0.0, 4.0)));
        assert!(moved.distance_to(Vec3::new(3.0, 3.0, 5.0)) < TOL);
    }

    #[test]
    fn round_trips_through_json_with_a_tagged_kind() {
        for surface in [
            Surface::plane(Vec3::ZERO, Vec3::Z),
            Surface::Cylinder { origin: Vec3::ZERO, axis: Vec3::Z, radius: 1.0 },
            Surface::Cone { apex: Vec3::ZERO, axis: Vec3::Z, half_angle: 0.4 },
            Surface::Torus {
                center: Vec3::ZERO,
                axis: Vec3::Z,
                major_radius: 3.0,
                minor_radius: 1.0,
            },
            Surface::Nurbs,
        ] {
            let json = serde_json::to_string(&surface).unwrap();
            assert!(json.contains(surface.name()));
            assert_eq!(serde_json::from_str::<Surface>(&json).unwrap(), surface);
        }
    }
}
