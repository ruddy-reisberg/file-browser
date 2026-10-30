---
title: 'Story 2.1: A PDF that cannot render says so'
type: 'bugfix'
created: '2026-10-30'
status: 'done'
baseline_commit: 'fe3ce372237660739be0e8033db33463474f5bf6'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** When a selected PDF is corrupt, encrypted or unreadable, `PdfPreview` swallows the failure (`() => {}`) and renders nothing, so the user sees a blank pane with no explanation (FR8 gap; AR5).

**Approach:** `PdfPreview` owns an error state and shows the explicit `detail-pane__error` message when reading, opening or rendering the first page fails. A stale result from a previous file never sets the image or the error, and the PDF document is destroyed in every outcome. The success path and the bundled worker are unchanged.

</frozen-after-approval>

## Implementation Notes

- `src/components/PdfPreview.tsx`: add `error` state (reset with `url` at the start of the effect); the rejection handler sets `err instanceof Error ? err.message : 'Could not render PDF.'` only if not cancelled; render `<p className="detail-pane__error">{error}</p>`; no empty `catch` or `() => {}` left. No new CSS (reuse `detail-pane__error`).
- Keep `renderPdfFirstPage` as is (its `finally` already destroys the document); a document that fails to open has nothing to destroy.
- `src/components/__tests__/PdfPreview.test.tsx`: turn the two "shows nothing" tests into "shows the error message" (render failure, open failure; destroy still called once on render failure), and add: a late failure of the previous file shows no error for the current file; the error clears when the file changes to a valid PDF. Keep the existing success and stale tests.
- Verify with `npm run check`.
- Done as planned. `npm run check` green: 15 files, 151 tests; `PdfPreview.test.tsx` now has 8 tests (failure on render and on open, non-Error fallback, stale failure ignored, error cleared on file change).
- Only `PdfPreview.tsx` and its test changed in `src/`. The error style comes from `DetailPane.css` (already loaded by `DetailPane`), so no CSS or token was added.
- The blind-hunter review layer was skipped: it needs a subagent and none was authorized. The diff is about 10 lines in one component.
- No commit made: the project rules require explicit approval first.
