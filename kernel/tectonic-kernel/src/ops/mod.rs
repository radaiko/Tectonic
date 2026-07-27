//! Modelling operations — the verbs of the kernel.

mod builder;
mod extrude;
mod revolve;
mod sweep;
mod profile;

pub use extrude::{extrude, ExtrudeParams, ExtrudeSide};
pub use revolve::{revolve, RevolveAxis, RevolveParams};
pub use sweep::{sweep, SweepOrientation, SweepParams};
pub use profile::Profile;

pub(crate) use builder::{ensure_outward, skin, tag_surface, Ends, Section, SideFace, SweptBody};
