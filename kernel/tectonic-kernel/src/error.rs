//! The kernel's error type.

use core::fmt;
use serde::{Deserialize, Serialize};

/// What went wrong, and which operation it went wrong in.
///
/// Operations return `Result` rather than an empty body so a failed feature can
/// be reported to the user against the feature that caused it, instead of
/// silently leaving a hole in the model.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct KernelError {
    /// The operation that failed, e.g. `"extrude"`.
    pub operation: String,
    pub message: String,
}

impl KernelError {
    pub fn new(operation: impl Into<String>, message: impl Into<String>) -> Self {
        Self { operation: operation.into(), message: message.into() }
    }
}

impl fmt::Display for KernelError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}: {}", self.operation, self.message)
    }
}

impl std::error::Error for KernelError {}

pub type KernelResult<T> = Result<T, KernelError>;

/// Builds a [`KernelError`] with `format!`-style arguments.
#[macro_export]
macro_rules! kernel_error {
    ($operation:expr, $($argument:tt)*) => {
        $crate::KernelError::new($operation, format!($($argument)*))
    };
}

/// Returns a [`KernelError`] from the enclosing function.
#[macro_export]
macro_rules! bail {
    ($operation:expr, $($argument:tt)*) => {
        return Err($crate::kernel_error!($operation, $($argument)*))
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn displays_operation_and_message() {
        let error = KernelError::new("extrude", "profile has fewer than three points");
        assert_eq!(
            error.to_string(),
            "extrude: profile has fewer than three points"
        );
    }

    #[test]
    fn the_macro_formats_its_arguments() {
        let error = crate::kernel_error!("fillet", "radius {} is not positive", -1.0);
        assert_eq!(error.operation, "fillet");
        assert_eq!(error.message, "radius -1 is not positive");
    }

    #[test]
    fn bail_returns_early() {
        fn failing() -> KernelResult<u32> {
            crate::bail!("shell", "thickness {} exceeds the wall", 5.0);
        }
        assert_eq!(
            failing().unwrap_err(),
            KernelError::new("shell", "thickness 5 exceeds the wall")
        );
    }

    #[test]
    fn round_trips_through_json() {
        let error = KernelError::new("boolean", "empty result");
        let json = serde_json::to_string(&error).unwrap();
        assert_eq!(serde_json::from_str::<KernelError>(&json).unwrap(), error);
    }
}
