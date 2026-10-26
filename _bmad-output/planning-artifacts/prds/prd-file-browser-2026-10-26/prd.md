---
title: "PRD: file-browser"
status: final
created: 2026-10-26
updated: 2026-10-26
---

# PRD: file-browser

## 0. Document Purpose

This PRD covers the whole file-browser app, including the audio/video mini-player on branch `feat/audio-video-preview`. It is written for the course grader, who reads the repo and the process behind it, and for downstream UX, architecture and story work. It builds on `briefs/brief-file-browser-2026-10-26/brief.md` and on the EARS requirements in `prompts/level-4/ears.md`. Features are grouped, FRs are numbered globally, and inferred points are tagged `[ASSUMPTION]` and indexed in §9.

## 1. Vision

file-browser is a browser-only explorer for a local folder. The user picks a folder and sees its structure as a tree, in a flat list or a 3D scene, with metadata for every file and richer previews for images, PDFs, audio and video. Nothing leaves the machine: no server, no network, no persistence, and the folder is opened read-only.

It is a single-user tool built by and for its author, and a graded course project. The grade is on Claude Code usage and AI engineering, so the product must work and be pleasant, but the point is a disciplined, AI-assisted build: written rules, a green `npm run check`, EARS specs, a review skill and small briefs.

## 2. Target User

### 2.1 Jobs To Be Done

- As the author, I want to see what is in a folder and how it is organized without installing or uploading anything.
- As the author, I want to inspect a file (metadata, preview, playback) without leaving the app.
- As the grader, I want to verify from the repo that the rules held: privacy by construction, a framework-free core, tokens-only styling, tests per behavior change.

### 2.2 Non-Users (v1)

Other end users, and anyone on Firefox or Safari (no File System Access API; they get an explicit "unsupported" message).

### 2.3 Key User Journeys

- **UJ-1. The author explores a project folder.** On Chromium, the author picks a folder with several sub-folders. A tree appears for each sub-folder. They switch to the 3D view, filter by name using the sign on the right, select a photo and read its dimensions and EXIF beside the preview. They select an MP3 and play it in the mini-player, seek, then select a PDF and the player stops. **Edge case:** if WebGL is missing, the app shows the list view instead.

## 3. Glossary

- **Chosen folder**: the directory the user picks, opened read-only.
- **Tree**: the hierarchy of **nodes** under a folder. Directories sort first, then alphabetical. A node's `path` is its identity.
- **Folder tree**: the tree of one direct sub-folder of the chosen folder. The chosen folder yields one per sub-folder.
- **List view**: the keyboard-accessible tree (`tree`/`treeitem`).
- **3D view**: the lazy-loaded 3D scene of the same trees.
- **Detail pane**: shows metadata and previews for the selected file.
- **Filter**: name-based narrowing of visible files, controlled by the 3D sign.
- **Mini-player**: the integrated audio/video player. `[ASSUMPTION: it lives in the detail pane.]`

## 4. Features

### 4.1 Folder access

**Description:** The user picks a folder through `showDirectoryPicker({ mode: 'read' })`. On unsupported browsers, an explicit message replaces the picker. Decided: the message alone is enough, and no `webkitdirectory` fallback exists (it was removed from the code).

#### FR-1: Pick a folder
The user can pick a local folder; the app reads it without any write access. Realizes UJ-1.

**Consequences (testable):**
- The picker is called with `mode: 'read'`.
- No write API (`createWritable`, `removeEntry`, `getFileHandle` with `create: true`) is used anywhere.
- Where the API is missing, an "unsupported" message is shown and no picker is offered.

### 4.2 Tree browsing

**Description:** The chosen folder is shown as one folder tree per direct sub-folder, in both the list and the 3D views. Both views share selection and filter state.

#### FR-2: One folder tree per sub-folder
When the chosen folder has sub-folders, the app shows one folder tree for each. Realizes UJ-1.

**Consequences (testable):**
- Each sub-folder is rendered as its own tree.
- Directories sort before files, then alphabetically.
- Selection and expansion are keyed by `TreeNode.path`.
- `[ASSUMPTION: files directly in the chosen folder are shown in a root group.]`

#### FR-3: Keyboard-accessible list view
The user can navigate and expand the list view using only the keyboard. Realizes UJ-1.

**Consequences (testable):**
- Elements use `tree` and `treeitem` roles.
- Selecting a node updates the detail pane.

#### FR-4: 3D view with fallback
The user can switch to a 3D view of the trees. Realizes UJ-1.

**Consequences (testable):**
- The scene is lazy-loaded.
- If WebGL is unavailable or the scene throws, the list view is shown instead.
- Reduced-motion preference is honored.
- Every file is also reachable in the list view.

#### FR-5: Filter by name
The user can filter files by name through a sign fixed on the right of the 3D view. Realizes UJ-1.

**Consequences (testable):**
- Only matching files remain visible; clearing the filter restores them.
- Filter logic is pure and lives in `src/lib/`.
- The query is owned by `App`; the 3D sign and the list view's filter input edit the same query, and a new pick clears it.

### 4.3 File inspection

**Description:** Selecting a file shows its details in the detail pane.

#### FR-6: File metadata
The user can see name, size, type and last modified date for any selected file. Realizes UJ-1.

**Consequences (testable):**
- All four fields are shown for every file kind.
- Metadata extraction is pure and lives in `src/lib/`, tested with in-memory `File` fixtures.

#### FR-7: Image preview, dimensions and EXIF
For an image, the detail pane shows a preview, its dimensions and its EXIF data. Realizes UJ-1.

**Consequences (testable):**
- Every object URL created for a preview is revoked.
- A stale async result never replaces the current selection.

#### FR-8: PDF rendering
The user can view a selected PDF in the detail pane. The PDF worker is bundled, not fetched. Realizes UJ-1.

### 4.4 Audio/video mini-player

**Description:** Source: `prompts/level-4/ears.md`. A compatible audio or video file plays in an integrated mini-player, so the user never leaves the browser view.

#### FR-9: Mini-player
WHEN a folder contains compatible audio or video files, the system shall display an integrated mini-player allowing playback without leaving the file browser. Realizes UJ-1.

#### FR-10: Playback controls
WHILE an audio or video file is playing, the system shall display play/pause, seek, volume and playback duration, IF the selected media supports these controls.

**Consequences (testable):**
- Each control is present and operable by keyboard.
- The media URL is revoked when the selection changes or the player unmounts. It is kept when playback ends so the user can replay.

#### FR-11: Stop and error handling
WHILE the user navigates between folders, IF the selected media is no longer available or cannot be played, THEN the system shall stop playback, reset the player state and display an explicit error message when playback fails.

**Consequences (testable):**
- Changing selection stops playback and resets the state.
- A playback failure shows an explicit error message.

## 5. Non-Goals (Explicit)

- Writing, renaming or deleting files.
- Any server, sync, network or CDN dependency.
- Persistence of any kind (storage, cookies, IndexedDB).
- A commercial product, user accounts, or multi-user features.

## 6. MVP Scope

### 6.1 In Scope
Folder picker, list tree, 3D tree, name filter, metadata, image preview with EXIF, PDF rendering, one tree per sub-folder, audio/video mini-player.

### 6.2 Out of Scope for MVP
- Non-Chromium support. Decided out: no `webkitdirectory` fallback.
- Previews for text and other file types, until the preview question is settled.
- A 3D scale cap or virtualization, until measured.

## 7. Cross-Cutting Requirements

- **Privacy:** no `fetch`, `XMLHttpRequest`, `WebSocket` or `sendBeacon`; no external URL; no `localStorage`, `sessionStorage`, `indexedDB` or cookies. Enforced by project rules and lint.
- **Architecture:** `src/lib/` is pure and never imports React (ESLint-enforced).
- **Styling:** every design value comes from `src/styles/tokens.css`; 3D colors come from `useSceneTheme`.
- **Quality:** each behavior change ships with a test; `npm run check` (typecheck, lint, tests) stays green.
- **3D resources:** manually created geometries, materials and textures are disposed; no allocation or `setState` per frame.

## 8. Success Metrics

- **SM-1:** `npm run check` is green on the final branch. Validates FR-1 to FR-11.
- **SM-2:** a real folder shows its trees in both views, and image, PDF, audio and video selections each show their preview or player. Validates FR-2 to FR-11.
- **SM-3:** no rule in `CLAUDE.md` is violated. Validates §7.
- **SM-4:** the grader can follow the process from the repo: briefs, EARS specs, the review skill and commit history. Validates §7 (Quality). There is no numeric coverage target.
- **SM-C1 (do not optimize):** feature count. More previews or views must not come at the cost of SM-1 or SM-3. Counterbalances SM-2.


## 9. Open Questions and Assumptions

**Open questions**
1. (Resolved: the "unsupported" message is enough; no `webkitdirectory` fallback.)
2. How does the 3D layout behave with tens of thousands of files? Does it need a cap or virtualization?
3. Which file types besides images, PDFs, audio and video deserve a preview?
4. What does the 3D view give over the list? `[ASSUMPTION]` Working answer: it is the course's challenge and shows structure at a glance. The author should confirm.

**Assumptions index**
- §4.2 FR-2: files directly in the chosen folder appear in a root group.
- §3 Glossary: the mini-player lives in the detail pane.
- §9.4: the rationale for the 3D view.
