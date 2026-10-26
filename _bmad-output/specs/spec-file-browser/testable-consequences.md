# Testable consequences per capability

Each bullet is a test or demonstration a capability must pass. CAP-N corresponds to PRD FR-N.

## CAP-1 Pick a folder
- The picker is called with `mode: 'read'`.
- No write API (`createWritable`, `removeEntry`, `getFileHandle` with `create: true`) is used anywhere.
- Where the API is missing, an "unsupported" message shows and no picker is offered.

## CAP-2 One folder tree per sub-folder
- Each sub-folder renders as its own tree.
- Directories sort before files, then alphabetical.
- Selection and expansion are keyed by `TreeNode.path`.
- Files directly in the chosen folder appear in a root group.

## CAP-3 Keyboard list view
- Elements use `tree` and `treeitem` roles.
- Selecting a node updates the detail pane.

## CAP-4 3D view with fallback
- The scene is lazy-loaded.
- If WebGL is unavailable or the scene throws, the list view shows instead.
- Reduced-motion preference is honored.
- Every file is also reachable in the list view.

## CAP-5 Filter by name
- Only matching files remain visible; clearing the filter restores them.
- Filter logic is pure and lives in `src/lib/`.
- The query is owned by `App`; the 3D sign and the list filter edit the same query; a new pick clears it.

## CAP-6 File metadata
- Name, size, type and last modified show for every file kind.
- Metadata extraction is pure, lives in `src/lib/`, and is tested with in-memory `File` fixtures.

## CAP-7 Image preview, dimensions, EXIF
- Every object URL created for a preview is revoked.
- A stale async result never replaces the current selection.

## CAP-8 PDF rendering
- The PDF worker is bundled, not fetched.
- A render failure shows an explicit message.

## CAP-9 Mini-player
- WHEN a folder contains compatible audio or video files, the system displays an integrated mini-player allowing playback without leaving the file browser.

## CAP-10 Playback controls
- WHILE an audio or video file is playing, the system displays play/pause, seek, volume and playback duration, IF the selected media supports these controls.
- Each control is present and operable by keyboard.
- The media URL is revoked when the selection changes or the player unmounts, and kept when playback ends so the user can replay.

## CAP-11 Stop and error handling
- WHILE the user navigates between folders, IF the selected media is no longer available or cannot be played, THEN the system stops playback, resets the player state and displays an explicit error message when playback fails.
- Changing selection stops playback and resets the state.
- A playback failure shows an explicit error message.
