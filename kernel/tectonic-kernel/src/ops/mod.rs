//! Modelling operations — the verbs of the kernel.

mod blend;
mod boolean;
mod builder;
mod chamfer;
mod extrude;
mod fillet;
mod loft;
mod revolve;
mod shell;
mod sweep;
mod profile;

pub use boolean::{boolean, intersect, subtract, union, BooleanOp, BooleanParams};
pub use chamfer::{chamfer, ChamferParams};
pub use extrude::{extrude, ExtrudeParams, ExtrudeSide};
pub use fillet::{fillet, FilletParams};
pub use loft::{loft, LoftParams, LoftSection};
pub use revolve::{revolve, RevolveAxis, RevolveParams};
pub use shell::{shell, ShellParams};
pub use sweep::{sweep, SweepOrientation, SweepParams};
pub use profile::Profile;

pub(crate) use builder::{ensure_outward, skin, tag_surface, Ends, Section, SideFace, SweptBody};
