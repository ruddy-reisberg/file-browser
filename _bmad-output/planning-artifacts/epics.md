---
status: draft
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories']
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-file-browser-2026-10-26/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-file-browser-2026-10-26/ARCHITECTURE-SPINE.md
  - _bmad-output/specs/spec-file-browser/SPEC.md
  - _bmad-output/specs/spec-file-browser/testable-consequences.md
  - _bmad-output/specs/spec-file-browser/glossary.md
---

# file-browser - Epic Breakdown

## Overview

This document provides the epic and story breakdown for the work that remains on file-browser, decomposing the requirements from the PRD and the Architecture spine (cross-checked against the spec). FR1 to FR8 are already built and are not re-planned; they are listed for traceability. No UX design document exists, so there are no UX design requirements.

Epic split rationale: Epic 1 (new player) and Epic 2 (hardening of existing behavior) both touch the preview code (`ImagePreview`, `DetailPane`). They stay separate because Epic 2 is an independent risk boundary with no player in it and can be built in either order; the overlap is limited to the PDF path of `ImagePreview` (Story 2.1 vs Story 1.2). Consolidation was considered and rejected.

## Requirements Inventory

### Functional Requirements

Status: **delivered** (built and tested), **remaining** (to build). FR numbers match PRD FR-N and spec CAP-N.

- FR1 (delivered): The user can pick a local folder; the app reads it without any write access. `showDirectoryPicker({ mode: 'read' })`; where the API is missing, an "unsupported" message shows and no picker is offered.
- FR2 (delivered): The app shows one folder tree per direct sub-folder, in both views, directories first then alphabetical, keyed by `TreeNode.path`; loose root files form a root group.
- FR3 (delivered): The user can navigate and expand the list view using only the keyboard (`tree`/`treeitem` roles); selecting a node updates the detail pane.
- FR4 (delivered): The user can switch to a lazy-loaded 3D view; without WebGL or on a scene error the list view shows; reduced motion honored; every file reachable in the list.
- FR5 (delivered): The user can filter files by name from the 3D sign and the list input; one query owned by `App`, cleared on a new pick; filter logic pure in `src/lib/`.
- FR6 (delivered): The user can see name, size, type and last modified for any selected file.
- FR7 (delivered): For an image, the detail pane shows a preview, dimensions and EXIF; object URLs are revoked; a stale async result never replaces the current selection.
- FR8 (delivered, gap): The user can view a selected PDF in the detail pane; the worker is bundled. Gap: a PDF render failure is swallowed silently instead of showing an explicit message.
- FR9 (remaining): WHEN a folder contains compatible audio or video files, the system displays an integrated mini-player allowing playback without leaving the file browser.
- FR10 (remaining): WHILE an audio or video file is playing, the system displays play/pause, seek, volume and playback duration, IF the selected media supports these controls. Each control is operable by keyboard. The media URL is revoked when the selection changes or the player unmounts, and kept when playback ends so the user can replay.
- FR11 (remaining): WHILE the user navigates between folders, IF the selected media is no longer available or cannot be played, THEN the system stops playback, resets the player state and displays an explicit error message when playback fails. Changing selection stops playback and resets the state.

### NonFunctional Requirements

- NFR1 (Privacy): No `fetch`, `XMLHttpRequest`, `WebSocket` or `sendBeacon`; no external URL or CDN; no `localStorage`, `sessionStorage`, `indexedDB` or cookies; every asset bundled.
- NFR2 (Read-only): No write API (`createWritable`, `getFileHandle` with `create: true`, `removeEntry`); the picker stays `mode: 'read'`.
- NFR3 (Architecture): `src/lib/` is pure, deterministic, and never imports React; each behavior change in it ships with a test in the neighboring `__tests__/`, built from in-memory `File` fixtures.
- NFR4 (Styling): Every design value (color, spacing, radius, font, shadow) comes from `src/styles/tokens.css`; 3D colors come from `useSceneTheme`; a new value means a new token.
- NFR5 (Quality): `npm run check` (typecheck, lint, tests) stays green; each behavior change ships with a test; no `skip`, `only`, `eslint-disable`, `@ts-ignore` or `any` to turn it green.
- NFR6 (3D resources): Manually created geometries, materials and textures are disposed; no allocation or `setState` per frame; `prefersReducedMotion()` honored; `supportsWebGL()` checked.
- NFR7 (Accessibility): The list view stays keyboard-accessible; the 3D view is never the only route to a file; media controls are keyboard-operable.
- NFR8 (Browser): Chromium only (Chrome/Edge); other browsers get the "unsupported" message; no `webkitdirectory` fallback.
- NFR9 (Process): No commit, push or other outward-facing action without the user's explicit approval.

### Additional Requirements

From `ARCHITECTURE-SPINE.md`. No starter template applies (brownfield, Vite + React 18 already in place); deployment is a static bundle with no backend, so no infrastructure setup.

- AR1 (AD-5): Add a single pure `src/lib/file-kind.ts` exporting `FileKind` (`image | pdf | audio | video | other`) and the classifier. `isImageFile`, `isPdfFile`, `leafCategory` and `describeKind` derive from it; every per-kind lookup (scene colors, labels, preview choice) is an exhaustive `Record<FileKind, …>`; no component inspects `file.type` or the extension. Precedence: specific allowlisted MIME wins; empty, generic or ambiguous MIME (`''`, `application/octet-stream`, container types like `video/mp2t`) defers to the extension; one tested mapping table.
- AR2 (AD-5): A new kind adds its scene color token to `tokens.css` and `useSceneTheme` in the same change (audio and video leaves need tokens and `LeafCategory` entries).
- AR3 (AD-4): `DetailPane` becomes a stateless router that picks a preview by `FileKind`; each preview owns its async state and error and is keyed by `node.path`. Today `DetailPane` holds `dimensions`, `exif` and `imageError`.
- AR4 (AD-4): `App` is the single owner of `selected`; the scene's open Leaf is a presentation flag over it, not a second `TreeNode` (today `SceneView.openNode` duplicates it). Selection, and view-local expansion in the list, reset on each new pick (list expansion is local `useState` today).
- AR5 (AD-6): Every preview/player acquires its resource in an effect keyed on the `File` and releases it in cleanup (revoke URL, destroy PDF, stop media); a media URL is revoked only in cleanup, never on `load`/`loadedmetadata` or on `ended`; async effects set state only if not cancelled; failures show an explicit message (the `detail-pane__error` pattern); no empty `catch` or `() => {}` (today `ImagePreview`'s PDF path does this).
- AR6 (AD-7): One `MediaPlayer` component for audio and video, native `<audio>`/`<video>` with `controls`, rendered by `DetailPane` for the selected node; playback starts only on a user action; a hidden or suspended view unmounts its pane rather than hiding it; a media `error` event shows an explicit message.
- AR7 (AD-7): The 3D Leaf must stop playback when close is requested (it unmounts 260 ms later, `CLOSE_MS = 260`), and its focus trap selector must include `audio[controls]` and `video[controls]`.
- AR8 (AD-7): Keyboard operability of native controls is unverified; check by hand in current Chrome and Edge; if it fails, custom controls replace them under the same decision.
- AR9 (Conventions): jsdom does not implement media playback; tests stub `HTMLMediaElement.prototype.play`, `pause` and `load` and fire `error` events by hand; lib tests stay DOM-free.
- AR10 (Stack): Node >= 20; versions pinned by the lockfile (React 18.3.1, Vite 5.4.21, TypeScript 5.9.3, Vitest 2.1.9, three 0.170.0, R3F 8.18.0, drei 9.122.0, pdfjs-dist 4.10.38); upgrades are out of scope.
- AR11 (Deferred, not in this plan): mechanical lint for AD-1/AD-2 (components-import ban, `no-restricted-globals` for network/storage/write APIs); CI and hosting; 3D cap or virtualization; previews beyond image, PDF, audio, video; custom media controls, playlists, autoplay-next.

### UX Design Requirements

None: no UX design contract exists for this project (design values live in `src/styles/tokens.css`).

### FR Coverage Map

FR1: Delivered, no new work (pick a folder, read-only)
FR2: Delivered; Epic 2 - state reset on a new pick (selection and list expansion)
FR3: Delivered, no new work (keyboard list view)
FR4: Delivered, no new work (3D view with fallback)
FR5: Delivered, no new work (shared filter)
FR6: Delivered, no new work (metadata)
FR7: Delivered, no new work (image preview, dimensions, EXIF)
FR8: Delivered; Epic 2 - explicit message when a PDF fails to render
FR9: Epic 1 - mini-player for audio and video
FR10: Epic 1 - playback controls, keyboard operable, URL lifecycle
FR11: Epic 1 - stop on navigation, explicit playback error

## Epic List

### Epic 1: Play audio and video without leaving the app
A user can select an audio or video file and play it in a mini-player in the detail pane, in the list view and in the 3D leaf. They can seek, change volume and see the duration, by keyboard if they want. Navigating away or a failing file stops playback cleanly, with an explicit error when it fails.
**FRs covered:** FR9, FR10, FR11
**Carries:** NFR7, AR1, AR2, AR3, AR5, AR6, AR7, AR8, AR9

### Epic 2: Previews fail loudly and both views agree on selection
When a PDF cannot render, the user sees an explicit message instead of a blank pane. After picking a new folder, both views start clean: selection and list expansion are reset, and the 3D leaf and the list pane cannot disagree about what is selected.
**FRs covered:** FR8 (the silent-error gap), FR2 (state reset on a new pick)
**Carries:** AR4, AR5 (PDF path)

## Epic 1: Play audio and video without leaving the app

A user can select an audio or video file and play it in a mini-player in the detail pane, in the list view and in the 3D leaf. They can seek, change volume and see the duration, by keyboard if they want. Navigating away or a failing file stops playback cleanly, with an explicit error when it fails.

### Story 1.1: One classifier decides what kind of file it is

As the author,
I want audio, video, image, PDF and other files recognized the same way everywhere,
So that the detail pane and the 3D leaf never disagree about what a file is.

**Acceptance Criteria:**

**Given** a `File` with an allowlisted MIME type (for example `audio/mpeg`, `video/mp4`, `image/png`, `application/pdf`)
**When** it is classified in `src/lib/file-kind.ts`
**Then** it returns the matching `FileKind` (`image | pdf | audio | video | other`)
**And** the mapping is one table with tests built from in-memory `File` fixtures (AR1, AR2; AD-5; enables FR9)

**Given** a file whose MIME is empty, `application/octet-stream`, or an ambiguous container such as `video/mp2t` on a `.ts` source file
**When** it is classified
**Then** the extension decides: `.ts` is `other`; `.mp3`, `.wav`, `.m4a` and `.ogg` are `audio`; `.mp4` and `.webm` are `video`, since a video element also plays audio-only files of those types
**And** edge cases are tested: no extension, uppercase extension, `.ogg` and `.webm`, `lastModified` of 0

**Given** `isImageFile`, `isPdfFile`, `leafCategory` and `describeKind`
**When** they are called
**Then** all derive from the classifier, and no component inspects `file.type` or the extension directly
**And** every per-kind lookup in the code is an exhaustive `Record<FileKind, …>` that fails typecheck when a kind is missing

**Given** audio and video leaves in the 3D scene
**When** the scene renders them
**Then** their colors come from new tokens in `tokens.css` and `useSceneTheme`, with no hardcoded values
**And** `npm run check` is green

### Story 1.2: Each preview manages its own loading and errors

As the author,
I want the detail pane to hand each file to the right preview, and each preview to own its own state,
So that adding the player cannot break image and PDF previews.

**Acceptance Criteria:**

**Given** a selected file of any `FileKind`
**When** `DetailPane` renders
**Then** it holds no async state and renders the preview matching the kind, keyed by `node.path`
**And** images show the same preview, dimensions, EXIF and error message as before (AR3, AR5; AD-4, AD-6; protects FR7)

**Given** an image whose dimensions or EXIF cannot be read
**When** the preview renders
**Then** the explicit error message shows inside the image preview, not in `DetailPane`
**And** a stale async result never replaces the current selection

**Given** the selection changes quickly between two images
**When** the first read finishes after the second selection
**Then** the first result is ignored
**And** every object URL created is revoked on cleanup

**Given** the existing behavior
**When** `npm run check` runs
**Then** it is green and the existing preview tests still pass

### Story 1.3: Play an audio or video file in the detail pane

As the author,
I want to select an audio or video file and play it in a mini-player,
So that I can listen to or watch it without leaving the file browser.

**Acceptance Criteria:**

**Given** a selected file classified as `audio` or `video`
**When** the detail pane renders
**Then** it shows one `MediaPlayer` using the native `<audio>` or `<video>` element with `controls`
**And** playback does not start until the user acts (FR9, FR10; AR5, AR6, AR9)

**Given** the player is shown
**When** the user uses it
**Then** play/pause, seek, volume and duration are available where the media supports them
**And** they are reachable by keyboard

**Given** the player created an object URL
**When** the selection changes or the player unmounts
**Then** the URL is revoked in the effect cleanup
**And** it is not revoked on `loadedmetadata` or when playback ends, so the user can replay

**Given** jsdom does not implement media playback
**When** tests run
**Then** they stub `HTMLMediaElement.prototype.play`, `pause` and `load`
**And** `npm run check` is green

### Story 1.4: Playback stops cleanly and failures are explicit

As the author,
I want playback to stop when I move away and to tell me when a file cannot play,
So that I never hear stale audio or stare at a broken player.

**Acceptance Criteria:**

**Given** a file is playing
**When** I select another node, switch between list and 3D, or pick a new folder
**Then** playback stops and the player state resets
**And** at most one player exists at a time (FR11; AR5, AR6)

**Given** a media file that the browser cannot decode
**When** the media element fires an `error` event
**Then** an explicit error message shows in the pane
**And** the rest of the app stays usable

**Given** a file that can no longer be read after the folder was picked
**When** I select it
**Then** an explicit error message shows, with no crash and no blank pane
**And** this is tested by firing the `error` event by hand

### Story 1.5: Play media from the 3D leaf

As the author,
I want the player to work inside the 3D view's leaf,
So that I get the same experience in both views.

**Acceptance Criteria:**

**Given** a media file opened in the 3D Leaf
**When** I close the Leaf (button, Escape or backdrop)
**Then** playback stops at the close request, not 260 ms later when it unmounts
**And** the fold animation continues without sound (FR9, FR10, FR11; AR7)

**Given** the Leaf is open on a media file
**When** I press Tab
**Then** the focus trap includes `audio[controls]` and `video[controls]`
**And** focus never escapes the Leaf

**Given** the Leaf test suite
**When** `npm run check` runs
**Then** new tests cover stop-on-close and the focus trap
**And** the existing Leaf tests still pass

### Story 1.6: Confirm native controls work by keyboard

As the author,
I want a recorded check that the native media controls are keyboard-operable in current Chrome and Edge,
So that FR10 is verified rather than assumed.

**Acceptance Criteria:**

**Given** the player in the list view and in the 3D Leaf, in current Chrome and in Edge
**When** I operate play/pause, seek and volume using only the keyboard
**Then** each control works
**And** the result per browser is recorded in the story (FR10; AR8, NFR7)

**Given** any control fails by keyboard
**When** the result is recorded
**Then** the story ends with a follow-up story for custom controls under the same architecture decision (AD-7)
**And** the spec's open question on this is updated either way

## Epic 2: Previews fail loudly and both views agree on selection

When a PDF cannot render, the user sees an explicit message instead of a blank pane. After picking a new folder, both views start clean: selection and list expansion are reset, and the 3D leaf and the list pane cannot disagree about what is selected.

### Story 2.1: A PDF that cannot render says so

As the author,
I want an explicit message when a PDF cannot be displayed,
So that I am not left looking at a blank pane wondering what happened.

**Acceptance Criteria:**

**Given** a selected PDF that is corrupt, encrypted, or unreadable
**When** rendering its first page fails
**Then** the detail pane shows an explicit error message (the existing `detail-pane__error` pattern)
**And** there is no empty `catch` or `() => {}` left in the PDF path (FR8; AR5)

**Given** a PDF render is still running
**When** I select another file
**Then** the stale result never replaces the current selection and no error from the old file appears
**And** the PDF document is destroyed in all outcomes

**Given** a valid PDF
**When** it renders
**Then** the first page shows as before, and the worker is still bundled and never fetched
**And** a test mocks `pdfjs-dist` to cover both the failure and the success path

**Given** the change
**When** `npm run check` runs
**Then** it is green

### Story 2.2: A new folder starts both views clean

As the author,
I want picking a new folder to reset everything tied to the previous one,
So that nothing carries over from the old folder just because two paths happen to match.

**Acceptance Criteria:**

**Given** a list view where I expanded a nested folder such as `docs/deep`
**When** I pick a new folder that also contains `docs/deep`
**Then** the list shows it collapsed, as it would on a first pick
**And** the tree is remounted on each pick, not matched by path across picks (FR2; AR4)

**Given** a selection and an active filter
**When** I pick a new folder
**Then** the selection is cleared and the filter query is empty in both views
**And** the 3D view starts over on the new folder

**Given** the new behavior
**When** tests run
**Then** `App.test.tsx` covers the expansion reset in addition to the existing filter reset
**And** `npm run check` is green

### Story 2.3: The 3D leaf and the list pane show the same selection

As the author,
I want one record of what is selected, whichever view I am in,
So that the two views can never disagree about the selected file.

**Acceptance Criteria:**

**Given** the 3D view
**When** I open a file's leaf
**Then** `App.selected` becomes that file, and the Leaf renders `selected`, not a separate copy held by `SceneView`
**And** `SceneView` keeps only a presentation flag for "leaf is open", not a `TreeNode` (FR2; AR4)

**Given** I open a file's leaf, close it, and switch to the list view
**When** the list view renders
**Then** the detail pane shows that same file
**And** the row is marked selected in the tree

**Given** a file selected in the list view
**When** I switch to the 3D view
**Then** the 3D view does not open a leaf on its own
**And** `App.selected` is unchanged

**Given** the change
**When** tests run
**Then** a test covers both directions of the switch, and the existing `Leaf` tests still pass
**And** `npm run check` is green
