---
id: SPEC-file-browser
companions:
  - ../planning-artifacts/architecture/architecture-file-browser-2026-10-26/ARCHITECTURE-SPINE.md
  - glossary.md
  - testable-consequences.md
sources:
  - ../planning-artifacts/prds/prd-file-browser-2026-10-26/prd.md
  - ../planning-artifacts/briefs/brief-file-browser-2026-10-26/brief.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# file-browser

## Why

A vision and a mandate. The author wants to see what is in a local folder and how it is organized, and to inspect its files, without installing or uploading anything. The app is also a graded course project judged on disciplined, AI-assisted engineering (written rules, a green check command, specs, a review skill), so privacy and process matter as much as features. The audio/video mini-player (CAP-9 to CAP-11, branch `feat/audio-video-preview`) is the work in progress; everything else is built.

## Capabilities

- **CAP-1**
  - **intent:** The user can pick a local folder and the app reads it without any write access.
  - **success:** The picker is called with `mode: 'read'`; no write API is used anywhere; where the API is missing, an "unsupported" message shows and no picker is offered.
- **CAP-2**
  - **intent:** The user sees one folder tree per direct sub-folder of the chosen folder, in both the list and the 3D view.
  - **success:** Each sub-folder renders as its own tree, directories first then alphabetical, with selection and expansion keyed by `TreeNode.path`.
- **CAP-3**
  - **intent:** The user can navigate and expand the list view using only the keyboard.
  - **success:** Elements use `tree`/`treeitem` roles, and selecting a node updates the detail pane.
- **CAP-4**
  - **intent:** The user can switch to a 3D view of the trees and always has the list as a fallback.
  - **success:** The scene is lazy-loaded; without WebGL or on a scene error the list view shows instead; reduced motion is honored; every file is reachable in the list.
- **CAP-5**
  - **intent:** The user can filter files by name from either view, with one shared filter.
  - **success:** Only matching files remain visible in both the 3D view (through the sign) and the list (through its input); clearing restores them; a new pick clears the filter.
- **CAP-6**
  - **intent:** The user can see name, size, type and last modified date for any selected file.
  - **success:** All four fields show for every file kind, and extraction is tested with in-memory `File` fixtures.
- **CAP-7**
  - **intent:** For an image, the user sees a preview, its dimensions and its EXIF data.
  - **success:** Every object URL created is revoked, and a stale async result never replaces the current selection.
- **CAP-8**
  - **intent:** The user can view a selected PDF in the detail pane.
  - **success:** The PDF renders from a bundled worker with no fetch, and a render failure shows an explicit message.
- **CAP-9**
  - **intent:** The user can play a compatible audio or video file in an integrated mini-player without leaving the app.
  - **success:** Selecting an audio or video file shows a player in the detail pane and playback starts on a user action.
- **CAP-10**
  - **intent:** The user can control playback while a file plays.
  - **success:** Play/pause, seek, volume and duration are present and operable by keyboard where the media supports them; the media URL is revoked when the selection changes or the player unmounts.
- **CAP-11**
  - **intent:** The user is never left with stale or broken playback when navigating or when media fails.
  - **success:** Changing selection stops playback and resets player state; a playback failure shows an explicit error message.

## Constraints

- Read-only, offline and stateless: no write API (`createWritable`, `getFileHandle` with `create: true`, `removeEntry`); no `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon` or external URL/CDN; no `localStorage`, `sessionStorage`, `indexedDB` or cookies; every asset bundled.
- Chromium only, through `showDirectoryPicker`; other browsers get the "unsupported" message and there is no `webkitdirectory` fallback.
- `src/lib/` is pure, deterministic and never imports React; non-UI logic lives there with neighboring tests built from in-memory `File` fixtures.
- Every design value comes from `src/styles/tokens.css` (3D colors from `useSceneTheme`); a new value means a new token.
- Every object URL has its revoke; async results never overwrite the current selection; failures are shown, never swallowed.
- The 3D scene is lazy under `SceneErrorBoundary`, disposes manual geometries/materials/textures, allocates and calls `setState` nothing per frame, and is never the only route to a file.
- Architecture invariants AD-1 to AD-8 in `ARCHITECTURE-SPINE.md` bind, including one `MediaPlayer` with native controls for audio and video and one `FileKind` classifier.
- `npm run check` (typecheck, lint, tests) stays green; each behavior change ships with a test; no `skip`, `only`, `eslint-disable`, `@ts-ignore` or `any` to turn it green; no commit or push without the user's approval.

## Non-goals

- Writing, renaming or deleting files.
- Any server, sync, network or CDN dependency.
- Persistence of any kind.
- A commercial product, accounts, or multi-user features.
- Non-Chromium support, including a `webkitdirectory` fallback.
- Previews for text and other file types until the preview question is settled.
- A 3D scale cap or virtualization until measured.
- Adding previews or views at the cost of a green `npm run check` or a violated `CLAUDE.md` rule; feature count is not optimized.

## Success signal

In Chromium, picking a real folder shows its trees in both the list and the 3D view, and selecting an image, a PDF, an audio file and a video file each shows its preview or player. `npm run check` is green, no rule in `CLAUDE.md` is violated, and the grader can follow the process from the repo (briefs, specs, review skill, commit history).

## Assumptions

- The mini-player lives in the detail pane, does not autoplay, and uses native controls.
- Files directly in the chosen folder appear in a root group.
- The 3D view's value is that it is the course's challenge and shows structure at a glance; the author should confirm.
- The media URL is kept when playback ends so the user can replay.

## Open Questions

- Does the 3D layout need a cap or virtualization for tens of thousands of files? (Measure first.)
- Which file types beyond images, PDFs, audio and video deserve a preview?
- Do the native audio/video controls pass keyboard operation in current Chrome and Edge? If not, custom controls replace them (AD-7).
