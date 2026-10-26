# Glossary

- **Chosen folder**: the directory the user picks, opened read-only.
- **Tree**: the hierarchy of **nodes** under a folder. Directories sort first, then alphabetical. A node's `path` (slash-joined, relative to the chosen folder) is its identity.
- **Folder tree**: the tree of one direct sub-folder of the chosen folder. The chosen folder yields one per sub-folder; files directly in it form a root group.
- **List view**: the keyboard-accessible tree (`tree`/`treeitem`).
- **3D view**: the lazy-loaded 3D scene of the same trees. In it a folder is an Island, its sub-folders are Trees, a tree's entries are Branches, and a file opens as a Leaf.
- **Detail pane**: shows metadata and previews for the selected file; the same pane mounts in the list layout and inside the 3D Leaf.
- **Filter**: name-based narrowing of visible files, one query shared by the 3D sign and the list input.
- **Mini-player**: the integrated audio/video player, in the detail pane.
- **FileKind**: the single classification of a file as `image | pdf | audio | video | other` (AD-5).
- **AD-n**: an architecture decision in `ARCHITECTURE-SPINE.md`; IDs are stable.
- **CAP-n**: a capability in this spec; CAP-N corresponds to PRD FR-N.
