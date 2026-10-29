---
title: 'Story 1.5: Playback stops cleanly and failures are explicit'
type: 'feature'
created: '2026-10-29'
status: 'done'
baseline_commit: '63b238dbf21881107765fe814e15c02dfdba776a'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-4-play-an-audio-or-video-file-in-the-detail-pane.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `MediaPlayer` relies on the element being removed to stop playback, nothing proves it, and a file the browser cannot decode or read leaves a dead player with no message.

**Approach:** The player pauses its element in effect cleanup, so any unmount or file change stops playback explicitly. It listens for the element's `error` event and shows an explicit message in place of the player. Tests show that changing selection, switching view and picking a new folder leave at most one player.

## Boundaries & Constraints

**Always:**
- Cleanup pauses the element before the URL is revoked. Capture the element when the effect runs (a ref is already detached when passive cleanup runs on unmount). The URL is still revoked only on file change or unmount, never on `ended` or `loadedmetadata`.
- An `error` event on the audio or video element sets an error state; the message replaces the player and uses the `detail-pane__error` class. Message by `MediaError.code`: `4` (source not supported) gives "This file cannot be played in this browser."; any other or missing code gives "Could not play this file." An unreadable file takes the same path, since the browser reports it through the same event.
- The error state resets when `file` changes. The rest of the pane (title, metadata rows) stays rendered, and selecting another file works as before.
- At most one player exists at a time: only the current selection's `MediaPlayer` is mounted, in the list pane or in the Leaf, never both.
- Tests fire `error` by hand (jsdom plays nothing) and stub `play`, `pause`, `load`, `createObjectURL` and `revokeObjectURL`. `npm run check` stays green; no `skip`, `only`, `eslint-disable`, `@ts-ignore`, `any`.

**Never:**
- No change to `Leaf` or its close timing or focus trap (Story 1.6); no keyboard checks (Story 1.7).
- No retry button, no custom controls, no `play()` call from code.
- No new CSS values: reuse `detail-pane__error`. No change to `src/lib/`.
- No commit or push.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Unsupported format | `error` event, `MediaError.code` 4 | Message "This file cannot be played in this browser."; no player | Message shown |
| Other failure | `error` event, other code or none | Message "Could not play this file."; no player | Message shown |
| Unreadable file | File deleted after the pick; `error` fired by hand | Message shown, title and metadata still rendered, no crash | Message shown |
| Recover | Error shown, then another file selected | New player renders with no stale message | N/A |
| Unmount or file change | Player mounted, then unmounted or `file` swapped | `pause` called, then the URL revoked once | N/A |
| Select another node | Audio selected, then another file | Exactly one media element at most | N/A |
| Switch view | Audio selected in list, then 3D | No media element until a Leaf opens | N/A |
| New folder | Audio selected, new folder picked | No media element | N/A |

</frozen-after-approval>

## Code Map

- `src/components/MediaPlayer.tsx` -- add the element ref, `pause` in cleanup, `onError` state and the message. Currently no ref, no error handling.
- `src/components/DetailPane.css` -- `detail-pane__error` is the class to reuse (`MediaPlayer` is always inside `.detail-pane`).
- `src/components/ImagePreview.tsx:47-50,67` -- the existing pattern: error state, message in place of the picture.
- `src/components/__tests__/MediaPlayer.test.tsx` -- extend; it already stubs `play`, `pause`, `load` and the URL functions. jsdom's `MediaError` is absent, so define `error` on the element with `Object.defineProperty` before firing.
- `src/__tests__/App.test.tsx` -- the `App selection across views` block already has a flippable WebGL mock and the `SceneCanvas` double; add the one-player tests there.
- `src/App.tsx:30-36` -- `handlePicked` clears `selected` and bumps `pickCount`; no change expected.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- the Story 1.4 entry on the missing error message is closed by this story.

## Tasks & Acceptance

**Execution:**
- [x] `src/components/MediaPlayer.tsx` -- ref, pause-before-revoke cleanup, error state reset on `file`, message in place of the player -- AR5, AR6.
- [x] `src/components/__tests__/MediaPlayer.test.tsx` -- cover the player-level matrix rows: both error messages, error then new file, pause then revoke order, elements gone after unmount.
- [x] `src/__tests__/App.test.tsx` -- select another node, switch view, new folder: assert at most one `audio` element and none after the view switch or new pick.

**Acceptance Criteria:**
- Given a playing file, when the selection changes, the view switches or a new folder is picked, then the element is paused and removed and at most one player exists.
- Given a file the browser cannot decode or read, when the element fires `error`, then an explicit message shows in the pane and the app stays usable.
- Given `npm run check`, then it is green and the existing media tests still pass.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---|---|---|---|
| Error message not announced to screen readers (blind, edge) | low | patch | Real and trivial: added `role="alert"` and asserted it in the code-4 test. |
| Pause effect keeps a stale element when `kind` changes with the same file (blind, edge) | low | rejected | `kind` comes from `classifyFile(file)` and `DetailPane` keys by `node.path`, so `kind` never changes on a mounted player. |
| Old error flashes with a new `file`; late `error` from the previous source (blind, edge) | low | rejected | Same unreachable reuse: the pane remounts per selection, and the effect resets the error. |
| Error pause targets a detached element after the message replaces the player (edge) | low | rejected | A removed element is already paused by the browser; the pause is harmless. |
| Codes 2 and 3 share the generic message; null code treated as failure (blind, edge) | low | rejected | The spec fixes the two messages; a real `error` event always carries a `MediaError`. |
| Message does not name the file or offer a retry (blind, edge) | low | rejected | The title above names the file; the spec's Never excludes a retry button. |
| `detail-pane__error` borrowed from another block (blind) | false | rejected | The spec requires that class, and `MediaPlayer` is always inside `.detail-pane`; `ImagePreview` does the same. |
| Callback ref recreated each render (blind) | low | rejected | React re-attaches it harmlessly; the pause effect reads the element after commit. |
| Test stubs not restored; App tests count elements but not `pause`; ordering and late-mount checks (blind, edge) | low | rejected | Vitest isolates files; `pause` ordering is asserted at component level where it can fail; no failure shown. |
| Leaf in 3D mounts its own `MediaPlayer`, untested (verification-gap, other) | low | rejected | It is the same component with the same tested behavior; Story 1.6 adds the Leaf player tests. |

## Verification

**Commands:**
- `npm run check` -- expected: typecheck, lint and tests all pass

**Manual checks (if no CLI):**
- In Chrome, play an mp3, then click another file, switch to 3D, and pick a new folder: sound stops each time. Select a renamed `.mp3` that is not audio: the message shows.
