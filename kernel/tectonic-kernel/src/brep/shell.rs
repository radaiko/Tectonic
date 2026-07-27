//! Shells — connected sets of faces.

use serde::{Deserialize, Serialize};

use super::{FaceId, ShellId};

/// A connected run of faces joined along shared edges.
///
/// A body can hold several: a hollowed part has an outer shell and an inner
/// one, and a boolean can leave two pieces that no longer touch. Splitting the
/// faces into shells is what lets [`super::Body::is_solid`] distinguish "two
/// closed lumps" from "one lump with a hole in its surface".
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Shell {
    pub id: ShellId,
    pub face_ids: Vec<FaceId>,
    /// True when the shell has no boundary edges — it encloses a volume.
    pub closed: bool,
}

impl Shell {
    pub fn new(id: ShellId, face_ids: Vec<FaceId>, closed: bool) -> Self {
        Self { id, face_ids, closed }
    }

    pub fn len(&self) -> usize {
        self.face_ids.len()
    }

    pub fn is_empty(&self) -> bool {
        self.face_ids.is_empty()
    }

    pub fn contains(&self, face: FaceId) -> bool {
        self.face_ids.contains(&face)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_shell_lists_its_faces() {
        let shell = Shell::new(0, vec![1, 2, 3], true);
        assert_eq!(shell.len(), 3);
        assert!(!shell.is_empty());
        assert!(shell.contains(2));
        assert!(!shell.contains(9));
        assert!(shell.closed);
    }

    #[test]
    fn an_empty_shell_is_empty() {
        assert!(Shell::new(0, Vec::new(), false).is_empty());
    }

    #[test]
    fn round_trips_through_json() {
        let shell = Shell::new(1, vec![0, 4], false);
        let json = serde_json::to_string(&shell).unwrap();
        assert!(json.contains("faceIds"));
        assert_eq!(serde_json::from_str::<Shell>(&json).unwrap(), shell);
    }
}
