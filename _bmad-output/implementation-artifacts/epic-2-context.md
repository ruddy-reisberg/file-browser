# Epic 2 Context: Previews fail loudly and a new folder starts clean

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

When a PDF cannot render, the user sees an explicit message instead of a blank pane. After picking a new folder, the list starts clean: expansion is reset along with the selection and filter, so nothing carries over from the previous folder. Built after Epic 1, since the PDF fix lives inside the preview structure Epic 1 created.

## Stories

- Story 2.1: A PDF that cannot render says so
- Story 2.2: A new folder starts both views clean

## Requirements & Constraints

- A PDF that is corrupt, encrypted or unreadable shows an explicit error in the detail pane; the pane is never left blank and the app stays usable.
- No empty `catch` or `() => {}` anywhere in the PDF path.
- A stale async result (user selected another file mid-render) never replaces the current selection, and no error from the old file appears.
- The PDF document is destroyed in every outcome (success, failure, cancellation).
- A valid PDF still renders its first page as before; the pdf.js worker stays bundled (`?url`) and is never fetched.
- A new pick clears selection, filter query and list expansion; the 3D view starts over on the new folder.
- No network, no persistence, no writes to the user's folder; all assets bundled.
- No hardcoded design values outside `src/styles/tokens.css`; a new value means a new token.
- `npm run check` (typecheck, lint, tests) stays green; each behavior change ships with a test; no `skip`, `only`, `eslint-disable`, `@ts-ignore` or `any`.

## Technical Decisions

- Every async resource (object URL, decoded PDF, media element) is acquired in an effect keyed on the `File` and released in cleanup; the preview component is keyed by `node.path` so a new selection remounts it. Async effects set state only if not cancelled.
- Failures use the existing `detail-pane__error` pattern (explicit message in the pane).
- `DetailPane` is a stateless router by `FileKind`; each preview owns its async state and error. The PDF path now lives in its own preview component rather than inside `ImagePreview`.
- `TreeNode.path` is the only identity for selection and expansion; the list tree is remounted on each pick rather than matched by path across picks.
- `App` owns `selected` and the filter query; both reset on each new pick.
- pdf.js is pinned at `pdfjs-dist` 4.10.38; tests mock `pdfjs-dist` to cover both the success and failure paths (jsdom cannot render PDFs).

## Cross-Story Dependencies

- Story 2.1 builds on Story 1.2 (the PDF path is its own preview component) and on Epic 1's shared selection.
- Story 2.2 builds on Story 1.3 (single owner of `selected`) and extends the existing filter-reset test in `App.test.tsx`.
- 2.1 and 2.2 are independent of each other.
