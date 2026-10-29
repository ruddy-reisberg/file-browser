---
title: 'Story 1.2: Each preview manages its own loading and errors'
type: 'refactor'
created: '2026-10-29'
status: 'done'
baseline_commit: 'fc975a0661d23f3813465d54409143d1ebb06299'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-1-one-classifier-decides-what-kind-of-file-it-is.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `DetailPane` holds `dimensions`, `exif` and `imageError` state and an async effect, and `ImagePreview` mixes image and PDF paths. Adding a media player would pile more state into the same component and risk the image and PDF previews.

**Approach:** Make `DetailPane` a stateless router: metadata rows plus a preview chosen by `FileKind` from an exhaustive record, rendered with `key={node.path}`. Each preview owns its async state and error. Image behavior is unchanged; the PDF path moves as is into its own component.

## Boundaries & Constraints

**Always:**
- `DetailPane` has no `useState`/`useEffect`; it picks the preview with `classifyFile` and a `Record<FileKind, ComponentType<{ file: File }> | null>` (`audio` and `video` are `null` until Story 1.4).
- `ImagePreview` owns the preview URL, dimensions, EXIF and the error. Dimensions render in their own list above the picture, then the picture, then EXIF; the error shows in place of the picture using `detail-pane__error`.
- A new `PdfPreview` owns the PDF render; it is the old PDF path moved verbatim (same render, same swallowed failure). Story 2.1 fixes that failure; do not fix it here.
- Async effects set state only if not cancelled. Every object URL created is revoked on cleanup.
- A shared row component lives in its own file (components are exported alone); no new CSS values, existing `detail-pane__*` classes only.
- Tests: new `DetailPane` and `ImagePreview` component tests; `src/lib/` untouched. `npm run check` stays green; no `skip`, `only`, `eslint-disable`, `@ts-ignore`, `any`.

**Never:**
- No `MediaPlayer` or audio/video preview (Story 1.4), no change to selection ownership (1.3), no fix of the PDF error handling (2.1).
- No change to `Leaf` or `SceneView`; both keep rendering `DetailPane node={…}`.
- No commit or push.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Image | PNG node, dimensions and EXIF resolve | Metadata rows, dimensions, picture, EXIF section | N/A |
| Unreadable image | Dimensions or EXIF promise rejects | Error message shown, no picture | Message from the error, else "Could not read image." |
| Quick reselect | Image A pending, image B selected, A resolves late | A's result ignored; B's data shown | Cancelled flag |
| URL lifecycle | Select image, then another node or unmount | Every created object URL is revoked | N/A |
| PDF | PDF node | `PdfPreview` rendered for that file | Failure stays silent (Story 2.1) |
| Audio, video, other | Such a node | Metadata rows only, no preview | N/A |
| Folder, nothing selected | Dir node, `null` | Unchanged folder summary and empty message | N/A |

</frozen-after-approval>

## Code Map

- `src/components/DetailPane.tsx` -- holds the state and effect to remove; keep the `null`, folder and metadata rendering as is.
- `src/components/ImagePreview.tsx` -- image URL effect (keep) plus the PDF branch (move out).
- `src/lib/image.ts` -- `readImageDimensions`, `parseExif` (reuse unchanged; it revokes its own URL).
- `src/lib/file-kind.ts` -- `classifyFile`, `FileKind` (from Story 1.1).
- `src/components/DetailPane.css`, `ImagePreview.css` -- existing classes to reuse, including `detail-pane__error`.
- `src/components/scene/SceneView.tsx:300`, `src/App.tsx:117` -- the two `DetailPane` mount points; their props must not change.
- Existing tests that render `DetailPane` through `App`/`Leaf` must keep passing; no `DetailPane` test exists yet.

## Tasks & Acceptance

**Execution:**
- [x] `src/components/DetailRow.tsx` -- create: the `Row` markup extracted from `DetailPane` -- shared by the pane and the image preview.
- [x] `src/components/PdfPreview.tsx` -- create: the PDF path moved from `ImagePreview` -- one preview per kind.
- [x] `src/components/ImagePreview.tsx` -- image only; owns dimensions, EXIF, error and the URL -- AD-4, AD-6.
- [x] `src/components/DetailPane.tsx` -- stateless router with the exhaustive record and `key={node.path}` -- AD-4.
- [x] `src/components/__tests__/DetailPane.test.tsx`, `ImagePreview.test.tsx` -- cover every matrix row; stub `URL.createObjectURL`/`revokeObjectURL`, mock `readImageDimensions`/`parseExif`, mock `PdfPreview` for routing -- jsdom decodes no images.

**Acceptance Criteria:**
- Given a selected file of any kind, when `DetailPane` renders, then it holds no state and renders the preview matching its `FileKind`, keyed by `node.path`.
- Given an image, when it renders, then preview, dimensions, EXIF and the error message behave as before.
- Given quick reselection between two images, when the first read finishes late, then it is ignored and every created object URL is revoked.
- Given `npm run check`, then it is green and the existing tests still pass.

## Implementation Notes

- Review added `PdfPreview.test.tsx`; `npm run check` now 13 files, 119 tests.
- Implemented directly. `npm run check` green: 12 files, 114 tests. `DetailPane.tsx` has no `useState`/`useEffect`.
- New: `DetailRow.tsx`, `PdfPreview.tsx` (old PDF path moved verbatim, empty error handler kept for Story 2.1), two component test files. `ImagePreview.tsx` is now image only.
- `ImagePreview` returns a fragment (dimensions list, picture or error, EXIF), so the dimensions list now sits above the picture instead of inside the metadata list.
- `isImageFile`/`isPdfFile` in `src/lib/image.ts` are no longer used by components; left in place for now.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---|---|---|---|
| `PdfPreview` has no test (3 reviewers) | medium | patch | Removing the `cancelled` guard kept `check` green. Added `PdfPreview.test.tsx` (5 cases); with the guard removed its stale test fails. |
| PDF failure swallowed (`() => {}`) | medium | defer | Pre-existing, moved verbatim by the spec; Story 2.1 owns the fix. |
| PDF render keeps running after cancel; no abort; `page.cleanup()` missing | low | defer | Pre-existing; Story 2.1 covers destroy in all outcomes. |
| `getContext('2d')!` and huge page scale | low | rejected | Pre-existing, unreachable in practice for a first-page render; guards add complexity. |
| `Promise.all` hides a decodable picture when only EXIF fails | low | rejected | Same behavior as before this story. |
| `<img>` decode failure shows no message | low | rejected | Pre-existing; dimensions read fails first for undecodable images. |
| `url` not reset when `file` changes without remount | false | rejected | `DetailPane` always remounts on `node.path`; the effect swaps the URL on a changed file. |
| `node.file!` when a file node has no file | low | rejected | Same assertion as the old code; `TreeNode` guarantees `file` for files. |
| Same `node.path` with a new `File` does not remount | false | rejected | A new pick clears the selection, and each preview's effect depends on `file`. |
| `readImageDimensions` internal URL revocation untested | low | rejected | Lib code unchanged by this story. |
| PDF to PDF now remounts ("verbatim" claim) | false | rejected | Remount per `node.path` is the stated AD-4 design. |
| Dimensions moved to its own list ("unchanged" claim) | low | rejected | Declared in the spec's Implementation Notes. |
| `PdfPreview` imports `ImagePreview.css`; `DetailRow` has no doc comment or CSS import | low | rejected | Cosmetic; `DetailPane` always mounts the parent styles. |
| `isImageFile`/`isPdfFile` now unused by components | low | rejected | Kept as classifier-derived exports from Story 1.1; noted in Implementation Notes. |
| "file-kind missing from the diff" | false | rejected | Added and committed in Story 1.1. |
| Test hygiene (global `URL` stubs, label assertions, StrictMode) | low | rejected | jsdom isolates each test file; no defect. |

## Verification

**Commands:**
- `npm run check` -- expected: typecheck, lint and tests all pass
- `grep -nE "useState|useEffect" src/components/DetailPane.tsx` -- expected: no matches
