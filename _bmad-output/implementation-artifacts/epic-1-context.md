# Epic 1 Context: Play audio and video without leaving the app

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A user can select an audio or video file and play it in a mini-player in the detail pane, in the list view and in the 3D leaf, with play/pause, seek, volume and duration, by keyboard if they want. Navigating away or a failing file stops playback cleanly, with an explicit error. Both views share one record of the selection. The app is a browser-only, read-only explorer, so playback must work from the picked `File` alone.

## Stories

- Story 1.1: One classifier decides what kind of file it is
- Story 1.2: Each preview manages its own loading and errors
- Story 1.3: The 3D leaf and the list pane show the same selection
- Story 1.4: Play an audio or video file in the detail pane
- Story 1.5: Playback stops cleanly and failures are explicit
- Story 1.6: Play media from the 3D leaf
- Story 1.7: Confirm native controls work by keyboard

## Requirements & Constraints

- Playback happens inside the app, starts only on a user action, and offers play/pause, seek, volume and duration where the media supports them; every control is keyboard-operable.
- Changing selection, switching view or picking a new folder stops playback and resets player state; a media failure shows an explicit message and leaves the app usable.
- The media object URL is revoked only on selection change or unmount, not when playback ends, so the user can replay.
- No network, no persistence, no writes to the user's folder; all assets bundled.
- No hardcoded design values outside `src/styles/tokens.css`; 3D colors come from `useSceneTheme`; a new value means a new token.
- `npm run check` (typecheck, lint, tests) stays green; each behavior change ships with a test; no `skip`, `only`, `eslint-disable`, `@ts-ignore` or `any`.
- Browser target is Chromium only (Chrome/Edge).

## Technical Decisions

- A single pure `src/lib/file-kind.ts` exports `FileKind` (`image | pdf | audio | video | other`) and the classifier. `isImageFile`, `isPdfFile`, `leafCategory`, `describeKind` derive from it; every per-kind lookup is an exhaustive `Record<FileKind, …>`; no component inspects `file.type` or the extension. A specific allowlisted MIME wins; an empty, generic or ambiguous MIME (`''`, `application/octet-stream`, `video/mp2t`) defers to the extension. One tested mapping table. Whether a file can actually play is decided at runtime by the media element's `error` event, never in `src/lib/`.
- A new kind adds its scene color token to `tokens.css` and `useSceneTheme` in the same change.
- `App` owns `selected`; the 3D Leaf's open state is a presentation flag over it, not a second `TreeNode`.
- `DetailPane` is a stateless router picking a preview by `FileKind`; each preview owns its async state and error and is keyed by `node.path`.
- Every async resource is acquired in an effect keyed on the `File` and released in cleanup; async effects set state only if not cancelled; failures show an explicit message (the `detail-pane__error` pattern); no empty `catch`.
- One `MediaPlayer` for audio and video using native `<audio>`/`<video>` with `controls`, rendered by `DetailPane`; a hidden view unmounts its pane rather than hiding it.
- The Leaf unmounts 260 ms after a close request (`CLOSE_MS`), so it stops playback at the close request; its focus trap must include `audio[controls]` and `video[controls]`.
- Native control keyboard operability is unverified; check by hand in Chrome and Edge, and fall back to custom controls if it fails.
- jsdom has no media playback: tests stub `HTMLMediaElement.prototype.play`, `pause`, `load` and fire `error` events by hand; `src/lib/` tests stay DOM-free and use in-memory `File` fixtures.

## Cross-Story Dependencies

- 1.1 is the foundation: 1.2 and 1.4 route and render by `FileKind`.
- 1.2 precedes 1.4 (the player slots into the router) and Epic 2's PDF story.
- 1.3 precedes 1.6 so the Leaf player follows `App.selected`.
- 1.4 precedes 1.5, 1.6 and 1.7.
