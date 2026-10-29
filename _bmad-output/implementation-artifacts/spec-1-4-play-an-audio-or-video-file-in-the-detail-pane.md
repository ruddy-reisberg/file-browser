---
title: 'Story 1.4: Play an audio or video file in the detail pane'
type: 'feature'
created: '2026-10-29'
status: 'done'
baseline_commit: '72d1e05e74a54ed95e4919c98907c93e5a620583'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-2-each-preview-manages-its-own-loading-and-errors.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Selecting an audio or video file shows only its metadata. The user has to leave the app to listen to or watch it.

**Approach:** Add one `MediaPlayer` that wraps the native `<audio>` or `<video>` element with `controls`, fed by an object URL made from the picked `File`. `DetailPane` routes `audio` and `video` to it, like the other previews.

## Boundaries & Constraints

**Always:**
- `MediaPlayer` takes `{ file: File; kind: FileKind }` and renders `<video>` when `kind` is `'video'`, otherwise `<audio>`. Both have `controls`, `preload="metadata"`, `src` set to the object URL, and no `autoPlay`. Playback starts only from the user acting on the native controls.
- It owns its object URL: created in an effect keyed on `file`, revoked in that effect's cleanup, and nowhere else. Not revoked on `loadedmetadata`, `ended` or `error`, so the user can replay. Render the element only once the URL exists.
- `DetailPane` stays stateless: its record type becomes `ComponentType<{ file: File; kind: FileKind }> | null`, it passes `kind` to every preview, and `audio` and `video` point to `MediaPlayer`. Keep `key={node.path}`.
- One new token for the video's max height in `src/styles/tokens.css`; `MediaPlayer.css` uses tokens only. The element fills the pane width and is not taller than the token.
- Tests: new `MediaPlayer.test.tsx`; update the `DetailPane` test that expects metadata only for audio and video. jsdom has no playback, so stub `HTMLMediaElement.prototype.play`, `pause` and `load`, and stub `URL.createObjectURL` and `revokeObjectURL`. `npm run check` stays green; no `skip`, `only`, `eslint-disable`, `@ts-ignore`, `any`.

**Never:**
- No custom controls, no `autoPlay`, no `play()` call from code.
- No error message, stop-on-navigation or one-player logic (Story 1.5); no `Leaf` change or focus-trap change (Story 1.6); no keyboard verification work (Story 1.7).
- No change to `src/lib/` or to selection ownership.
- No commit or push.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Audio file | Node classified `audio` | `<audio controls>` with the object URL, not playing | N/A |
| Video file | Node classified `video` | `<video controls>` with the object URL, not playing | N/A |
| Replay | `loadedmetadata`, then `ended` fired | URL not revoked; element keeps its `src` | N/A |
| Reselect | Another node selected, or unmount | The created URL is revoked once | N/A |
| Autoplay | Player mounts | `play` is never called | N/A |
| Other kinds | Image, PDF, other | Previews unchanged; `other` shows metadata only | N/A |

</frozen-after-approval>

## Code Map

- `src/components/DetailPane.tsx:14-21,47,59` -- `PREVIEW_BY_KIND` has `audio: null`, `video: null`; the `Preview` render needs the `kind` prop.
- `src/components/ImagePreview.tsx:22-33` -- the object-URL effect to copy as a pattern (create in effect, revoke in cleanup).
- `src/components/ImagePreview.css` -- `.image-preview` frame (surface, border, radius, padding) to mirror in `MediaPlayer.css` without new values.
- `src/lib/file-kind.ts` -- `FileKind`; `.mp4` and `.webm` classify as `video`, which also plays their audio-only files.
- `src/styles/tokens.css` -- add the max-height token next to `--leaf-max-height`.
- `src/components/__tests__/DetailPane.test.tsx:63-66` -- the "metadata only for audio and video" test to replace; the file already mocks `ImagePreview` and `PdfPreview`, so mock `MediaPlayer` the same way.
- `src/components/__tests__/ImagePreview.test.tsx` -- pattern for stubbing `URL.createObjectURL` and `revokeObjectURL`.

## Tasks & Acceptance

**Execution:**
- [x] `src/styles/tokens.css` -- add the media max-height token -- no hardcoded values.
- [x] `src/components/MediaPlayer.tsx`, `MediaPlayer.css` -- create the player as specified -- AR5, AR6, AR9.
- [x] `src/components/DetailPane.tsx` -- widen the record type, pass `kind`, route `audio` and `video` to `MediaPlayer` -- stateless router.
- [x] `src/components/__tests__/MediaPlayer.test.tsx` -- cover every matrix row; assert `controls`, no `autoplay`, `play` not called, one revoke on unmount and on `file` change.
- [x] `src/components/__tests__/DetailPane.test.tsx` -- replace the metadata-only test with audio and video routing; keep the `other` case.

**Acceptance Criteria:**
- Given a selected audio or video file, when the detail pane renders, then it shows one native player with `controls` and nothing is playing.
- Given the player, when the user uses its controls, then play/pause, seek, volume and duration are the native ones.
- Given the player created an object URL, when the selection changes or it unmounts, then that URL is revoked, and it is not revoked when metadata loads or playback ends.
- Given `npm run check`, then it is green with playback stubbed in jsdom.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---|---|---|---|
| Video/audio elements have no accessible name (blind) | low | patch | Real but trivial: added `aria-label={file.name}` and asserted it in both player tests. |
| No error handling or message for undecodable media; no error test (blind, edge) | medium | defer | The intent excludes it: Story 1.5 owns the `error` event and its message. Already planned in epics. |
| `pause()` in cleanup, stop playback on navigation, reset state (blind, edge) | low | rejected | Story 1.5 scope; unmounting the element already stops playback. |
| Stale `src` / revoked blob when `file` changes on a reused instance (blind, edge) | low | rejected | `DetailPane` keys by `node.path` and a new pick clears the selection; `ImagePreview` has the same pattern. |
| Redundant `url` state, first render `null` (blind) | low | rejected | Same pattern as `ImagePreview`; a fix adds complexity with no demonstrated harm. |
| `kind` accepts any `FileKind`; non-media renders `<audio>` (blind, edge) | low | rejected | The spec chose this signature; `DetailPane` routes only audio and video, so the state is unreachable. |
| Missing `<track>` captions for video (blind) | false | rejected | Local files carry no caption source; nothing to attach. |
| `max-height` distorts video or is meaningless for audio (blind) | false | rejected | Video defaults to `object-fit: contain`, so it letterboxes rather than distorts; the audio bar's height is unaffected. |
| Test stubs of `URL` and `HTMLMediaElement.prototype` never restored (blind, edge) | low | rejected | Vitest isolates each test file; no leak shown. |
| `ended`/`loadedmetadata` test passes whatever the implementation does; `DetailPane` mocks the player (blind) | low | rejected | A revoke-on-event implementation fails that test; routing is covered by the mock by design. |
| Large or 0-byte files untested (blind) | low | rejected | The element and browser handle these; no code path differs. |

## Verification

**Commands:**
- `npm run check` -- expected: typecheck, lint and tests all pass
- `grep -rn "autoPlay\|autoplay" src/components/MediaPlayer.tsx` -- expected: no matches

**Manual checks (if no CLI):**
- In Chrome, select an mp3 and an mp4 in the list view: each shows a native player and stays silent until Play is pressed.
