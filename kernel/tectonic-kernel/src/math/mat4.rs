//! 4x4 transformation matrices.

use core::ops::Mul;
use serde::{Deserialize, Serialize};

use super::{Vec3, EPSILON};

/// A 4x4 matrix in **column-major** order, matching WebGL and three.js.
///
/// Element `(row, col)` lives at index `col * 4 + row`, so a translation's
/// components sit at indices 12, 13 and 14 and the array can be handed to a GPU
/// uniform without transposing.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Mat4 {
    pub elements: [f64; 16],
}

impl Mat4 {
    pub const IDENTITY: Self = Self {
        elements: [
            1.0, 0.0, 0.0, 0.0, //
            0.0, 1.0, 0.0, 0.0, //
            0.0, 0.0, 1.0, 0.0, //
            0.0, 0.0, 0.0, 1.0,
        ],
    };

    pub const ZERO: Self = Self { elements: [0.0; 16] };

    /// Wraps a column-major array.
    pub const fn from_columns(elements: [f64; 16]) -> Self {
        Self { elements }
    }

    /// Reads a row-major array, transposing it into the internal layout. This
    /// is the constructor to use when transcribing a matrix written out by hand,
    /// because source code reads in rows.
    pub fn from_rows(rows: [f64; 16]) -> Self {
        let mut elements = [0.0; 16];
        for row in 0..4 {
            for col in 0..4 {
                elements[col * 4 + row] = rows[row * 4 + col];
            }
        }
        Self { elements }
    }

    pub const fn identity() -> Self {
        Self::IDENTITY
    }

    #[inline]
    pub fn get(&self, row: usize, col: usize) -> f64 {
        self.elements[col * 4 + row]
    }

    #[inline]
    pub fn set(&mut self, row: usize, col: usize, value: f64) {
        self.elements[col * 4 + row] = value;
    }

    /// `self * other` — the transform that applies `other` first, then `self`.
    pub fn multiply(&self, other: &Self) -> Self {
        let mut elements = [0.0; 16];
        for col in 0..4 {
            for row in 0..4 {
                let mut sum = 0.0;
                for k in 0..4 {
                    sum += self.elements[k * 4 + row] * other.elements[col * 4 + k];
                }
                elements[col * 4 + row] = sum;
            }
        }
        Self { elements }
    }

    pub fn translation(offset: Vec3) -> Self {
        let mut m = Self::IDENTITY;
        m.elements[12] = offset.x;
        m.elements[13] = offset.y;
        m.elements[14] = offset.z;
        m
    }

    pub fn scaling(factors: Vec3) -> Self {
        let mut m = Self::IDENTITY;
        m.elements[0] = factors.x;
        m.elements[5] = factors.y;
        m.elements[10] = factors.z;
        m
    }

    pub fn uniform_scaling(factor: f64) -> Self {
        Self::scaling(Vec3::splat(factor))
    }

    pub fn rotation_x(radians: f64) -> Self {
        let (sin, cos) = radians.sin_cos();
        Self::from_rows([
            1.0, 0.0, 0.0, 0.0, //
            0.0, cos, -sin, 0.0, //
            0.0, sin, cos, 0.0, //
            0.0, 0.0, 0.0, 1.0,
        ])
    }

    pub fn rotation_y(radians: f64) -> Self {
        let (sin, cos) = radians.sin_cos();
        Self::from_rows([
            cos, 0.0, sin, 0.0, //
            0.0, 1.0, 0.0, 0.0, //
            -sin, 0.0, cos, 0.0, //
            0.0, 0.0, 0.0, 1.0,
        ])
    }

    pub fn rotation_z(radians: f64) -> Self {
        let (sin, cos) = radians.sin_cos();
        Self::from_rows([
            cos, -sin, 0.0, 0.0, //
            sin, cos, 0.0, 0.0, //
            0.0, 0.0, 1.0, 0.0, //
            0.0, 0.0, 0.0, 1.0,
        ])
    }

    /// Right-handed rotation about an arbitrary axis through the origin
    /// (Rodrigues' rotation formula in matrix form).
    pub fn rotation(axis: Vec3, radians: f64) -> Self {
        let axis = axis.normalize();
        if axis == Vec3::ZERO {
            return Self::IDENTITY;
        }
        let (sin, cos) = radians.sin_cos();
        let one_minus_cos = 1.0 - cos;
        let (x, y, z) = (axis.x, axis.y, axis.z);
        Self::from_rows([
            cos + x * x * one_minus_cos,
            x * y * one_minus_cos - z * sin,
            x * z * one_minus_cos + y * sin,
            0.0,
            y * x * one_minus_cos + z * sin,
            cos + y * y * one_minus_cos,
            y * z * one_minus_cos - x * sin,
            0.0,
            z * x * one_minus_cos - y * sin,
            z * y * one_minus_cos + x * sin,
            cos + z * z * one_minus_cos,
            0.0,
            0.0,
            0.0,
            0.0,
            1.0,
        ])
    }

    /// Rotation about an axis that does not pass through the origin.
    pub fn rotation_about(origin: Vec3, axis: Vec3, radians: f64) -> Self {
        Self::translation(origin)
            .multiply(&Self::rotation(axis, radians))
            .multiply(&Self::translation(-origin))
    }

    /// Builds a frame whose columns are the given axes, placed at `origin`.
    /// This is how a sketch plane becomes a local-to-world transform.
    pub fn from_frame(origin: Vec3, x_axis: Vec3, y_axis: Vec3, z_axis: Vec3) -> Self {
        Self::from_columns([
            x_axis.x, x_axis.y, x_axis.z, 0.0, //
            y_axis.x, y_axis.y, y_axis.z, 0.0, //
            z_axis.x, z_axis.y, z_axis.z, 0.0, //
            origin.x, origin.y, origin.z, 1.0,
        ])
    }

    /// Mirror in the plane through `point` with unit `normal` (Householder).
    pub fn reflection(point: Vec3, normal: Vec3) -> Self {
        let n = normal.normalize();
        if n == Vec3::ZERO {
            return Self::IDENTITY;
        }
        let d = n.dot(point);
        Self::from_rows([
            1.0 - 2.0 * n.x * n.x,
            -2.0 * n.x * n.y,
            -2.0 * n.x * n.z,
            2.0 * d * n.x,
            -2.0 * n.y * n.x,
            1.0 - 2.0 * n.y * n.y,
            -2.0 * n.y * n.z,
            2.0 * d * n.y,
            -2.0 * n.z * n.x,
            -2.0 * n.z * n.y,
            1.0 - 2.0 * n.z * n.z,
            2.0 * d * n.z,
            0.0,
            0.0,
            0.0,
            1.0,
        ])
    }

    /// Right-handed perspective projection onto clip depth `[-1, 1]`.
    /// `fov_y` is the vertical field of view in radians.
    pub fn perspective(fov_y: f64, aspect: f64, near: f64, far: f64) -> Self {
        let f = 1.0 / (fov_y / 2.0).tan();
        let range = 1.0 / (near - far);
        Self::from_rows([
            f / aspect,
            0.0,
            0.0,
            0.0,
            0.0,
            f,
            0.0,
            0.0,
            0.0,
            0.0,
            (far + near) * range,
            2.0 * far * near * range,
            0.0,
            0.0,
            -1.0,
            0.0,
        ])
    }

    /// Right-handed orthographic projection onto clip depth `[-1, 1]`.
    pub fn orthographic(
        left: f64,
        right: f64,
        bottom: f64,
        top: f64,
        near: f64,
        far: f64,
    ) -> Self {
        let width = right - left;
        let height = top - bottom;
        let depth = far - near;
        Self::from_rows([
            2.0 / width,
            0.0,
            0.0,
            -(right + left) / width,
            0.0,
            2.0 / height,
            0.0,
            -(top + bottom) / height,
            0.0,
            0.0,
            -2.0 / depth,
            -(far + near) / depth,
            0.0,
            0.0,
            0.0,
            1.0,
        ])
    }

    /// View matrix for a camera at `eye` looking at `target`.
    pub fn look_at(eye: Vec3, target: Vec3, up: Vec3) -> Self {
        let forward = eye.sub(target).normalize();
        let right = up.cross(forward).normalize();
        let true_up = forward.cross(right);
        Self::from_rows([
            right.x,
            right.y,
            right.z,
            -right.dot(eye),
            true_up.x,
            true_up.y,
            true_up.z,
            -true_up.dot(eye),
            forward.x,
            forward.y,
            forward.z,
            -forward.dot(eye),
            0.0,
            0.0,
            0.0,
            1.0,
        ])
    }

    pub fn transpose(&self) -> Self {
        let mut elements = [0.0; 16];
        for row in 0..4 {
            for col in 0..4 {
                elements[row * 4 + col] = self.elements[col * 4 + row];
            }
        }
        Self { elements }
    }

    pub fn determinant(&self) -> f64 {
        let m = &self.elements;
        let (m00, m10, m20, m30) = (m[0], m[1], m[2], m[3]);
        let (m01, m11, m21, m31) = (m[4], m[5], m[6], m[7]);
        let (m02, m12, m22, m32) = (m[8], m[9], m[10], m[11]);
        let (m03, m13, m23, m33) = (m[12], m[13], m[14], m[15]);

        m30 * (m03 * m12 * m21 - m02 * m13 * m21 - m03 * m11 * m22
            + m01 * m13 * m22
            + m02 * m11 * m23
            - m01 * m12 * m23)
            + m31
                * (m02 * m13 * m20 - m03 * m12 * m20 + m03 * m10 * m22
                    - m00 * m13 * m22
                    - m02 * m10 * m23
                    + m00 * m12 * m23)
            + m32
                * (m03 * m11 * m20 - m01 * m13 * m20 - m03 * m10 * m21
                    + m00 * m13 * m21
                    + m01 * m10 * m23
                    - m00 * m11 * m23)
            + m33
                * (m01 * m12 * m20 - m02 * m11 * m20 + m02 * m10 * m21
                    - m00 * m12 * m21
                    - m01 * m10 * m22
                    + m00 * m11 * m22)
    }

    /// The inverse, or `None` when the matrix is singular.
    ///
    /// Returning an option rather than a garbage matrix matters here: a
    /// degenerate transform reaching a modelling operation would silently
    /// produce NaN geometry that only shows up much later as an empty mesh.
    pub fn inverse(&self) -> Option<Self> {
        let m = &self.elements;
        let mut inv = [0.0f64; 16];

        inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15]
            + m[9] * m[7] * m[14]
            + m[13] * m[6] * m[11]
            - m[13] * m[7] * m[10];
        inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15]
            - m[8] * m[7] * m[14]
            - m[12] * m[6] * m[11]
            + m[12] * m[7] * m[10];
        inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15]
            + m[8] * m[7] * m[13]
            + m[12] * m[5] * m[11]
            - m[12] * m[7] * m[9];
        inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14]
            - m[8] * m[6] * m[13]
            - m[12] * m[5] * m[10]
            + m[12] * m[6] * m[9];
        inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15]
            - m[9] * m[3] * m[14]
            - m[13] * m[2] * m[11]
            + m[13] * m[3] * m[10];
        inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15]
            + m[8] * m[3] * m[14]
            + m[12] * m[2] * m[11]
            - m[12] * m[3] * m[10];
        inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15]
            - m[8] * m[3] * m[13]
            - m[12] * m[1] * m[11]
            + m[12] * m[3] * m[9];
        inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14]
            + m[8] * m[2] * m[13]
            + m[12] * m[1] * m[10]
            - m[12] * m[2] * m[9];
        inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15]
            + m[5] * m[3] * m[14]
            + m[13] * m[2] * m[7]
            - m[13] * m[3] * m[6];
        inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15]
            - m[4] * m[3] * m[14]
            - m[12] * m[2] * m[7]
            + m[12] * m[3] * m[6];
        inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15]
            + m[4] * m[3] * m[13]
            + m[12] * m[1] * m[7]
            - m[12] * m[3] * m[5];
        inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14]
            - m[4] * m[2] * m[13]
            - m[12] * m[1] * m[6]
            + m[12] * m[2] * m[5];
        inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11]
            - m[5] * m[3] * m[10]
            - m[9] * m[2] * m[7]
            + m[9] * m[3] * m[6];
        inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11]
            + m[4] * m[3] * m[10]
            + m[8] * m[2] * m[7]
            - m[8] * m[3] * m[6];
        inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11]
            - m[4] * m[3] * m[9]
            - m[8] * m[1] * m[7]
            + m[8] * m[3] * m[5];
        inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10]
            + m[4] * m[2] * m[9]
            + m[8] * m[1] * m[6]
            - m[8] * m[2] * m[5];

        let determinant = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
        if determinant.abs() < EPSILON {
            return None;
        }

        let scale = 1.0 / determinant;
        for value in inv.iter_mut() {
            *value *= scale;
        }
        Some(Self { elements: inv })
    }

    /// Transforms a position — translation applies, and the result is divided
    /// through by w so projective matrices work too.
    pub fn transform_point(&self, point: Vec3) -> Vec3 {
        let m = &self.elements;
        let x = m[0] * point.x + m[4] * point.y + m[8] * point.z + m[12];
        let y = m[1] * point.x + m[5] * point.y + m[9] * point.z + m[13];
        let z = m[2] * point.x + m[6] * point.y + m[10] * point.z + m[14];
        let w = m[3] * point.x + m[7] * point.y + m[11] * point.z + m[15];
        if (w - 1.0).abs() < EPSILON || w.abs() < EPSILON {
            Vec3::new(x, y, z)
        } else {
            Vec3::new(x / w, y / w, z / w)
        }
    }

    /// Transforms a direction — translation is ignored.
    pub fn transform_vector(&self, vector: Vec3) -> Vec3 {
        let m = &self.elements;
        Vec3::new(
            m[0] * vector.x + m[4] * vector.y + m[8] * vector.z,
            m[1] * vector.x + m[5] * vector.y + m[9] * vector.z,
            m[2] * vector.x + m[6] * vector.y + m[10] * vector.z,
        )
    }

    /// Transforms a surface normal.
    ///
    /// Normals follow the inverse transpose, not the matrix itself: under a
    /// non-uniform scale the plain transform tilts a normal off its surface.
    /// Falls back to the direct transform when the matrix is singular.
    pub fn transform_normal(&self, normal: Vec3) -> Vec3 {
        match self.inverse() {
            Some(inverse) => inverse.transpose().transform_vector(normal).normalize(),
            None => self.transform_vector(normal).normalize(),
        }
    }

    /// True when the transform flips handedness — a mirror, or a negative
    /// scale. Faces built under such a transform need their winding reversed to
    /// keep their normals pointing outwards.
    pub fn flips_orientation(&self) -> bool {
        self.determinant() < 0.0
    }

    pub fn approx_eq(&self, other: &Self, tolerance: f64) -> bool {
        self.elements
            .iter()
            .zip(other.elements.iter())
            .all(|(a, b)| (a - b).abs() <= tolerance)
    }

    pub fn is_finite(&self) -> bool {
        self.elements.iter().all(|value| value.is_finite())
    }
}

impl Default for Mat4 {
    fn default() -> Self {
        Self::IDENTITY
    }
}

impl Mul for Mat4 {
    type Output = Self;
    fn mul(self, other: Self) -> Self {
        self.multiply(&other)
    }
}

impl Mul<Vec3> for Mat4 {
    type Output = Vec3;
    fn mul(self, point: Vec3) -> Vec3 {
        self.transform_point(point)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use core::f64::consts::{FRAC_PI_2, PI};

    #[test]
    fn identity_leaves_points_alone() {
        let point = Vec3::new(1.0, 2.0, 3.0);
        assert_eq!(Mat4::identity().transform_point(point), point);
        assert_eq!(Mat4::IDENTITY.transform_vector(point), point);
    }

    #[test]
    fn column_major_layout_puts_translation_at_index_twelve() {
        let m = Mat4::translation(Vec3::new(5.0, 6.0, 7.0));
        assert_eq!(m.elements[12], 5.0);
        assert_eq!(m.elements[13], 6.0);
        assert_eq!(m.elements[14], 7.0);
        assert_eq!(m.get(0, 3), 5.0);
    }

    #[test]
    fn from_rows_transposes_into_column_major() {
        let m = Mat4::from_rows([
            1.0, 2.0, 3.0, 4.0, //
            5.0, 6.0, 7.0, 8.0, //
            9.0, 10.0, 11.0, 12.0, //
            13.0, 14.0, 15.0, 16.0,
        ]);
        assert_eq!(m.get(0, 1), 2.0);
        assert_eq!(m.get(1, 0), 5.0);
        assert_eq!(m.elements[0], 1.0);
        assert_eq!(m.elements[1], 5.0);
    }

    #[test]
    fn set_writes_through_get() {
        let mut m = Mat4::identity();
        m.set(2, 1, 9.0);
        assert_eq!(m.get(2, 1), 9.0);
    }

    #[test]
    fn translation_moves_points_but_not_vectors() {
        let m = Mat4::translation(Vec3::new(1.0, 2.0, 3.0));
        assert_eq!(m.transform_point(Vec3::ZERO), Vec3::new(1.0, 2.0, 3.0));
        assert_eq!(m.transform_vector(Vec3::X), Vec3::X);
    }

    #[test]
    fn scaling_multiplies_each_axis() {
        let m = Mat4::scaling(Vec3::new(2.0, 3.0, 4.0));
        assert_eq!(m.transform_point(Vec3::ONE), Vec3::new(2.0, 3.0, 4.0));
        assert_eq!(
            Mat4::uniform_scaling(2.0).transform_point(Vec3::ONE),
            Vec3::new(2.0, 2.0, 2.0)
        );
    }

    #[test]
    fn axis_rotations_turn_the_right_way() {
        assert!(Mat4::rotation_x(FRAC_PI_2)
            .transform_point(Vec3::Y)
            .approx_eq(Vec3::Z, 1e-12));
        assert!(Mat4::rotation_y(FRAC_PI_2)
            .transform_point(Vec3::Z)
            .approx_eq(Vec3::X, 1e-12));
        assert!(Mat4::rotation_z(FRAC_PI_2)
            .transform_point(Vec3::X)
            .approx_eq(Vec3::Y, 1e-12));
    }

    #[test]
    fn arbitrary_axis_rotation_agrees_with_the_axis_specific_ones() {
        for angle in [0.3, 1.0, PI] {
            assert!(Mat4::rotation(Vec3::X, angle).approx_eq(&Mat4::rotation_x(angle), 1e-12));
            assert!(Mat4::rotation(Vec3::Y, angle).approx_eq(&Mat4::rotation_y(angle), 1e-12));
            assert!(Mat4::rotation(Vec3::Z, angle).approx_eq(&Mat4::rotation_z(angle), 1e-12));
        }
    }

    #[test]
    fn rotation_about_a_degenerate_axis_is_the_identity() {
        assert_eq!(Mat4::rotation(Vec3::ZERO, 1.0), Mat4::IDENTITY);
    }

    #[test]
    fn rotation_about_an_offset_axis_leaves_that_axis_fixed() {
        let origin = Vec3::new(5.0, 0.0, 0.0);
        let m = Mat4::rotation_about(origin, Vec3::Z, FRAC_PI_2);
        assert!(m.transform_point(origin).approx_eq(origin, 1e-12));
        assert!(m
            .transform_point(Vec3::new(6.0, 0.0, 0.0))
            .approx_eq(Vec3::new(5.0, 1.0, 0.0), 1e-12));
    }

    #[test]
    fn multiply_applies_the_right_operand_first() {
        let translate = Mat4::translation(Vec3::X);
        let rotate = Mat4::rotation_z(FRAC_PI_2);
        // rotate * translate: move along +X, then rotate that onto +Y.
        let rotate_then = rotate.multiply(&translate);
        assert!(rotate_then.transform_point(Vec3::ZERO).approx_eq(Vec3::Y, 1e-12));
        // translate * rotate: rotate first (origin is fixed), then move along +X.
        let translate_then = translate.multiply(&rotate);
        assert!(translate_then
            .transform_point(Vec3::ZERO)
            .approx_eq(Vec3::X, 1e-12));
    }

    #[test]
    fn multiply_operator_matches_the_method() {
        let a = Mat4::rotation_x(0.4);
        let b = Mat4::translation(Vec3::new(1.0, 2.0, 3.0));
        assert_eq!(a * b, a.multiply(&b));
        assert_eq!((a * b) * Vec3::ONE, a.multiply(&b).transform_point(Vec3::ONE));
    }

    #[test]
    fn multiplying_by_the_identity_changes_nothing() {
        let m = Mat4::rotation(Vec3::new(1.0, 2.0, 3.0), 0.7);
        assert!(m.multiply(&Mat4::IDENTITY).approx_eq(&m, 1e-12));
        assert!(Mat4::IDENTITY.multiply(&m).approx_eq(&m, 1e-12));
    }

    #[test]
    fn transpose_is_its_own_inverse() {
        let m = Mat4::from_rows([
            1.0, 2.0, 3.0, 4.0, //
            5.0, 6.0, 7.0, 8.0, //
            9.0, 10.0, 11.0, 12.0, //
            13.0, 14.0, 15.0, 16.0,
        ]);
        assert_eq!(m.transpose().transpose(), m);
        assert_eq!(m.transpose().get(1, 0), m.get(0, 1));
    }

    #[test]
    fn determinant_of_identity_is_one_and_of_a_scale_is_its_volume() {
        assert!((Mat4::IDENTITY.determinant() - 1.0).abs() < 1e-12);
        let scale = Mat4::scaling(Vec3::new(2.0, 3.0, 4.0));
        assert!((scale.determinant() - 24.0).abs() < 1e-12);
        assert!((Mat4::rotation_z(0.9).determinant() - 1.0).abs() < 1e-12);
    }

    #[test]
    fn inverse_undoes_the_transform() {
        let m = Mat4::translation(Vec3::new(1.0, 2.0, 3.0))
            .multiply(&Mat4::rotation(Vec3::new(1.0, 1.0, 0.0), 0.7))
            .multiply(&Mat4::scaling(Vec3::new(2.0, 3.0, 4.0)));
        let inverse = m.inverse().expect("invertible");
        assert!(m.multiply(&inverse).approx_eq(&Mat4::IDENTITY, 1e-10));
        let point = Vec3::new(3.0, -1.0, 2.0);
        assert!(inverse.transform_point(m.transform_point(point)).approx_eq(point, 1e-10));
    }

    #[test]
    fn inverse_of_a_singular_matrix_is_none() {
        assert!(Mat4::ZERO.inverse().is_none());
        // Collapsing an axis destroys the volume, so there is nothing to invert.
        assert!(Mat4::scaling(Vec3::new(1.0, 1.0, 0.0)).inverse().is_none());
    }

    #[test]
    fn perspective_maps_the_near_plane_to_minus_one() {
        let m = Mat4::perspective(FRAC_PI_2, 1.0, 1.0, 100.0);
        let near = m.transform_point(Vec3::new(0.0, 0.0, -1.0));
        assert!((near.z + 1.0).abs() < 1e-9);
        let far = m.transform_point(Vec3::new(0.0, 0.0, -100.0));
        assert!((far.z - 1.0).abs() < 1e-9);
    }

    #[test]
    fn orthographic_maps_its_box_onto_the_unit_cube() {
        let m = Mat4::orthographic(-2.0, 2.0, -1.0, 1.0, 1.0, 11.0);
        assert!(m
            .transform_point(Vec3::new(2.0, 1.0, -1.0))
            .approx_eq(Vec3::new(1.0, 1.0, -1.0), 1e-9));
        assert!(m
            .transform_point(Vec3::new(-2.0, -1.0, -11.0))
            .approx_eq(Vec3::new(-1.0, -1.0, 1.0), 1e-9));
    }

    #[test]
    fn look_at_places_the_eye_at_the_origin_of_view_space() {
        let eye = Vec3::new(0.0, 0.0, 10.0);
        let view = Mat4::look_at(eye, Vec3::ZERO, Vec3::Y);
        assert!(view.transform_point(eye).approx_eq(Vec3::ZERO, 1e-12));
        // The target sits straight down the -Z axis of view space.
        let target = view.transform_point(Vec3::ZERO);
        assert!((target.z + 10.0).abs() < 1e-12);
    }

    #[test]
    fn from_frame_maps_local_axes_onto_world_axes() {
        let frame = Mat4::from_frame(Vec3::new(1.0, 0.0, 0.0), Vec3::Y, Vec3::Z, Vec3::X);
        assert!(frame
            .transform_point(Vec3::new(1.0, 0.0, 0.0))
            .approx_eq(Vec3::new(1.0, 1.0, 0.0), 1e-12));
        assert!(frame.transform_vector(Vec3::Z).approx_eq(Vec3::X, 1e-12));
    }

    #[test]
    fn reflection_mirrors_through_a_plane_and_flips_orientation() {
        let mirror = Mat4::reflection(Vec3::ZERO, Vec3::Z);
        assert!(mirror
            .transform_point(Vec3::new(1.0, 2.0, 3.0))
            .approx_eq(Vec3::new(1.0, 2.0, -3.0), 1e-12));
        assert!(mirror.flips_orientation());
        assert!(!Mat4::IDENTITY.flips_orientation());
        // Points on the plane are fixed.
        let offset = Mat4::reflection(Vec3::new(0.0, 0.0, 5.0), Vec3::Z);
        assert!(offset
            .transform_point(Vec3::new(1.0, 1.0, 5.0))
            .approx_eq(Vec3::new(1.0, 1.0, 5.0), 1e-12));
        assert!(offset
            .transform_point(Vec3::new(0.0, 0.0, 6.0))
            .approx_eq(Vec3::new(0.0, 0.0, 4.0), 1e-12));
    }

    #[test]
    fn reflection_in_a_degenerate_plane_is_the_identity() {
        assert_eq!(Mat4::reflection(Vec3::ZERO, Vec3::ZERO), Mat4::IDENTITY);
    }

    #[test]
    fn normals_survive_a_non_uniform_scale() {
        // A 45-degree slope scaled 4x in x: the plain transform tilts the normal
        // the wrong way, the inverse transpose keeps it on the surface.
        let scale = Mat4::scaling(Vec3::new(4.0, 1.0, 1.0));
        let normal = Vec3::new(1.0, 1.0, 0.0).normalize();
        let tangent = Vec3::new(1.0, -1.0, 0.0).normalize();

        let moved_normal = scale.transform_normal(normal);
        let moved_tangent = scale.transform_vector(tangent);
        assert!(moved_normal.dot(moved_tangent).abs() < 1e-12);
        assert!((moved_normal.length() - 1.0).abs() < 1e-12);

        // The naive transform does not stay perpendicular.
        assert!(scale.transform_vector(normal).dot(moved_tangent).abs() > 1e-3);
    }

    #[test]
    fn transform_normal_falls_back_when_the_matrix_is_singular() {
        let singular = Mat4::scaling(Vec3::new(1.0, 1.0, 0.0));
        assert!(singular.transform_normal(Vec3::X).approx_eq(Vec3::X, 1e-12));
    }

    #[test]
    fn transform_point_divides_through_by_w() {
        let m = Mat4::perspective(FRAC_PI_2, 1.0, 1.0, 100.0);
        let projected = m.transform_point(Vec3::new(1.0, 0.0, -2.0));
        assert!(projected.is_finite());
        assert!((projected.x - 0.5).abs() < 1e-9);
    }

    #[test]
    fn round_trips_through_json_as_a_flat_array() {
        let m = Mat4::translation(Vec3::new(1.0, 2.0, 3.0));
        let json = serde_json::to_string(&m).unwrap();
        assert!(json.starts_with('['));
        assert_eq!(serde_json::from_str::<Mat4>(&json).unwrap(), m);
    }

    #[test]
    fn default_is_the_identity_and_finite() {
        assert_eq!(Mat4::default(), Mat4::IDENTITY);
        assert!(Mat4::IDENTITY.is_finite());
    }
}
