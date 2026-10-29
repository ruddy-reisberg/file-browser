---
title: 'Story 1.6: Play media from the 3D leaf'
type: 'feature'
created: '2026-10-29'
status: 'done'
baseline_commit: '66bea50c6e6b2fc50e3fae929ee4982d9bd0f66c'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-5-playback-stops-cleanly-and-failures-are-explicit.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** In the 3D view the Leaf already shows the media player (it renders `DetailPane` for `selected`), but closing the Leaf keeps the sound going for the 260 ms fold animation, and the focus trap does not know about `audio[controls]` and `video[controls]`.

**Approach:** `Leaf` pauses every audio and video element inside it at the close request, whether from the button, Escape or the backdrop, and its focus-trap selector includes `audio[controls]` and `video[controls]`. `Leaf` stays generic: it never imports `MediaPlayer`.

## Boundaries & Constraints

**Always:**
- In `requestClose`, after the existing `closing` guard, call `pause()` on every `audio` and `video` inside the dialog element. The fold animation and the `CLOSE_MS` timer are unchanged, so the leaf still unmounts 260 ms later.
- The focus selector `FOCUSABLE` gains `audio[controls]` and `video[controls]`. Tab and Shift+Tab still wrap between the first and last focusable element.
- The player keeps working as in the list view: `MediaPlayer` and `DetailPane` are unchanged.
- Tests: extend `Leaf.test.tsx` (stop-on-close by button, Escape and backdrop, before the timer fires; focus trap with a media element; a Leaf with no media still closes) and add one `App` test that opens an audio file's Leaf in 3D and closes it. Stub `HTMLMediaElement.prototype.pause`, `play`, `load` and the URL functions. The existing `Leaf` tests keep passing. `npm run check` stays green; no `skip`, `only`, `eslint-disable`, `@ts-ignore`, `any`.

**Never:**
- No import of `MediaPlayer`, `DetailPane` or any media code into `Leaf`.
- No change to `CLOSE_MS`, the animations, `SceneView`, `DetailPane`, `MediaPlayer` or `src/lib/`.
- No custom controls, no `play()` call from code, no keyboard verification work beyond the selector (Story 1.7).
- No new CSS values. No commit or push.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Close by button | Leaf with a playing `audio`, click Close | `pause` called at once; `onClose` only after 260 ms | N/A |
| Close by Escape | Same, Escape pressed | `pause` called at once | N/A |
| Close by backdrop | Same, backdrop clicked | `pause` called at once | N/A |
| Video | Leaf with a `video` | `pause` called on close request | N/A |
| Repeated close | Close asked twice | `pause` not called a second time | N/A |
| No media | Leaf with plain content | Closes as before, nothing paused | N/A |
| Focus trap | Media element is the last focusable | Tab on it wraps to Close; Shift+Tab on Close goes to it | N/A |
| 3D flow | Open an audio file's Leaf in 3D, then close | Audio element present while open; `pause` called at the close request | N/A |

</frozen-after-approval>

## Code Map

- `src/components/scene/Leaf.tsx:14,36-40,42-62` -- `FOCUSABLE` selector, `requestClose` (the `closing` guard, then the timer), `handleKeyDown` Escape and Tab trap. The only source file to change. The dialog element is `dialogRef`.
- `src/components/scene/__tests__/Leaf.test.tsx` -- fake timers, `renderLeaf` helper, existing close, Escape, backdrop and Tab tests to extend. Backdrop is `getByRole('dialog').parentElement`.
- `src/__tests__/App.test.tsx` -- the `App selection across views` block has the flippable WebGL mock and `SceneCanvas` double; the 3D flow is Climb, then `Read <name>` buttons in the `scene__list`.
- `src/components/MediaPlayer.tsx` -- unchanged; it already pauses on unmount, which now happens after the close-request pause.
- `src/components/scene/SceneView.tsx:300-306` -- renders the Leaf from `selected`; unchanged.

## Tasks & Acceptance

**Execution:**
- [x] `src/components/scene/Leaf.tsx` -- pause media in `requestClose`; add the two selectors to `FOCUSABLE` -- AR7.
- [x] `src/components/scene/__tests__/Leaf.test.tsx` -- cover the Leaf matrix rows (button, Escape, backdrop, video, repeated close, no media, focus trap with media).
- [x] `src/__tests__/App.test.tsx` -- add the 3D flow test with real `DetailPane` and `MediaPlayer`.

**Acceptance Criteria:**
- Given a media file open in the Leaf, when close is requested by button, Escape or backdrop, then playback stops at the request and the fold animation continues without sound.
- Given the Leaf open on a media file, when Tab or Shift+Tab is pressed, then the focus trap includes `audio[controls]` and `video[controls]` and focus stays in the Leaf.
- Given `npm run check`, then it is green and the existing `Leaf` tests still pass.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---|---|---|---|
| Controls stay clickable during the 260 ms fold, so Play can be pressed again (blind, edge x2) | low | rejected | Needs a deliberate Play press inside 260 ms; `MediaPlayer` pauses on unmount when the fold ends, so sound lasts well under a second. An `inert` fix adds complexity (React 18 has no `inert` prop). |
| Audio keeps playing when the Leaf unmounts by another path (blind, edge) | false | rejected | `MediaPlayer` pauses its element in effect cleanup (Story 1.5), and the Leaf's children unmount with it. |
| Unhandled `AbortError` from a pending `play()` (edge) | false | rejected | No code calls `play()`; playback starts only from the native controls. |
| `FOCUSABLE` includes `tabindex=-1` media, ignores `hidden` or non-controls media (blind, edge) | low | rejected | The test uses `tabIndex={-1}` only because jsdom cannot focus bare media; `MediaPlayer` always sets `controls` and no `tabindex`. |
| Native inner controls may be skipped by the Tab wrap (edge claim) | low | rejected | Declared in the spec's Design Notes; Story 1.7 checks it by hand. |
| Fake timers set mid-test without `finally`; prototype stubs not restored; `vi.mocked(pause)` assumption (blind, edge) | low | rejected | Vitest isolates files; the `pause` stub is installed in the same describe's `beforeEach`; no failure shown. |
| Escape and backdrop tests do not advance timers; hardcoded 300; multi-media, already-paused and throwing `pause` untested (blind, edge) | low | rejected | The close timer is covered by the button test; the extra cases have no distinct code path. |

## Design Notes

Native media controls in Chrome keep `document.activeElement` on the media element while Tab moves through their inner buttons. If the media element is the last focusable element, the existing wrap-on-Tab may jump to Close before the inner controls are reached. jsdom cannot show this. Story 1.7 checks the controls by hand in Chrome and Edge and decides whether the trap needs to change; do not work around it here.

## Verification

**Commands:**
- `npm run check` -- expected: typecheck, lint and tests all pass

**Manual checks (if no CLI):**
- In Chrome, open an mp3's Leaf in 3D, press Play, then close with the button, Escape and the backdrop in turn: the sound stops the instant close is requested, not after the fold.
