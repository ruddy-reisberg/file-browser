---
title: 'Story 1.3: The 3D leaf and the list pane show the same selection'
type: 'refactor'
created: '2026-10-29'
status: 'done'
baseline_commit: '5d6d456bcd19230eca6e03a75e55e75082831d5e'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-2-each-preview-manages-its-own-loading-and-errors.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `SceneView` keeps its own `openNode: TreeNode` next to `App.selected`, so the Leaf renders a second copy of the selection. The two can disagree, and the player of Story 1.6 would have two selections to follow.

**Approach:** `App` stays the only owner of the selected node and passes it to `SceneView` as `selected`. `SceneView` keeps only a boolean `leafOpen` and renders the Leaf from `selected`.

## Boundaries & Constraints

**Always:**
- `SceneView` gets a new prop `selected: TreeNode | null`. Its state `openNode` is replaced by `leafOpen: boolean`.
- The Leaf renders only when `leafOpen` is true and `selected?.kind === 'file'`; it shows `<DetailPane node={selected} />` and is named after `selected.name`.
- Opening a file calls `onSelect(node)` and sets `leafOpen`. Closing the Leaf clears `leafOpen` only; `selected` is kept, so the list view shows the same file afterwards.
- Folder and tree selections (`selectTree`, `enterFolder`) still call `onSelect` and never open a Leaf.
- `leafOpen` starts `false` on every `SceneView` mount, so switching from the list to 3D never opens a Leaf and leaves `selected` unchanged.
- Escape handling in `handleRootKeyDown` tests `leafOpen`.
- Tests: new `SceneView` component test, mocking `SceneCanvas` (no WebGL in jsdom) and driving selection through the existing `scene__list` buttons; an `App` test for both switch directions. `src/lib/` untouched. `npm run check` stays green; no `skip`, `only`, `eslint-disable`, `@ts-ignore`, `any`.

**Never:**
- No change to `Leaf`, `DetailPane`, `SceneCanvas` or the scene layout code.
- No media player or audio/video code (Stories 1.4 to 1.6).
- No new CSS values or tokens.
- No commit or push.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Open a file in 3D | Click "Read a.txt" | `onSelect(a.txt)`; Leaf shows `selected` | N/A |
| Close, go to list | Close Leaf, click List | Detail pane shows a.txt; its tree row is selected | N/A |
| List to 3D | File selected in list, click 3D | No Leaf; `selected` unchanged | N/A |
| Folder in 3D | Climb a tree or enter a folder | `selected` is the folder; no Leaf | N/A |
| Selected is a folder, `leafOpen` true | Parent changes `selected` to a dir | No Leaf rendered | N/A |

</frozen-after-approval>

## Code Map

- `src/components/scene/SceneView.tsx:48-52,116-133,196-199,298-302` -- `openNode` state, `pickBranch`, Escape guard, Leaf render. The only component to change.
- `src/App.tsx:86-95` -- mounts `SceneView`; add `selected={selected}`. `App` already resets `selected` and remounts `SceneView` (`key={pickCount}`) on a new pick.
- `src/components/scene/Leaf.tsx` -- unchanged; its existing `Leaf.test.tsx` must keep passing.
- `src/components/scene/SceneCanvas.tsx` -- mock in the `SceneView` test.
- `src/__tests__/App.test.tsx` -- mocks `supportsWebGL: () => false`, so the app starts in list view; the switch test needs a WebGL mock it can flip and the mocked `SceneCanvas`.

## Tasks & Acceptance

**Execution:**
- [x] `src/components/scene/SceneView.tsx` -- replace `openNode` with `leafOpen` and a `selected` prop; render the Leaf from `selected` -- AR4, FR2.
- [x] `src/App.tsx` -- pass `selected` to `SceneView` -- single owner.
- [x] `src/components/scene/__tests__/SceneView.test.tsx` -- create: open a file calls `onSelect` and shows the Leaf from `selected`; close keeps `selected`; a dir `selected` renders no Leaf; Escape with an open Leaf closes only the Leaf.
- [x] `src/__tests__/App.test.tsx` -- add 3D to list (open leaf, close, switch: pane shows the file, row selected) and list to 3D (no Leaf, selection kept).

**Acceptance Criteria:**
- Given a file opened in 3D, then `App.selected` is that file and `SceneView` holds no `TreeNode` state.
- Given a Leaf opened and closed, when the list view renders, then the detail pane and the tree row show that file.
- Given a file selected in the list, when 3D is shown, then no Leaf opens and `selected` is unchanged.
- Given `npm run check`, then it is green and the `Leaf` tests still pass.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---|---|---|---|
| Escape swallowed when `leafOpen` is true over a folder selection (blind, edge) | medium | patch | Matrix row "Selected is a folder, `leafOpen` true" renders no Leaf, but the guard tested `leafOpen` alone. Added `leafVisible` for render and guard; the new Escape assertion fails without it. |
| Stale `leafOpen` re-opens the Leaf on a later file selection (blind, edge) | low | rejected | The Leaf is modal and `selected` changes only through `SceneView`, so the state is unreachable; a reset effect adds complexity. |
| Leaf lacks `key={selected.path}` when `selected` changes under an open Leaf (blind, edge) | low | rejected | Same unreachable state; the Leaf is modal. |
| Close timer after unmount or reopen race (edge) | false | rejected | `Leaf` already clears its timer on unmount (`Leaf.tsx` cleanup); the Leaf is unchanged by this story. |
| 3D does not navigate to or highlight the selected file (blind) | low | rejected | The intent excludes it: the AC says 3D opens no leaf on its own and `selected` stays unchanged. |
| Fake timers set mid-test without `finally` (blind, edge) | low | rejected | Cosmetic test hygiene; vitest resets per file and no failure shows. |
| Missing tests: breadcrumb or `enterFolder` with a Leaf open, second file, reopen, focus return, out-of-root `selected` (blind, edge) | low | rejected | Leaf is modal so these paths are unreachable or already covered by `Leaf.test.tsx`; the matrix rows are covered. |
| `SceneCanvasDouble` cast, no cleanup, two mock sites (blind) | low | rejected | Test double only; a typed fake adds code with no demonstrated harm. |
| Weak queries, `File details` text also matches the row, `DetailPane` mocked (blind) | low | rejected | The row assertion uses `aria-selected`; the `DetailPane` mock is isolated to `SceneView`, and `App` tests use the real pane. |

## Verification

**Commands:**
- `npm run check` -- expected: typecheck, lint and tests all pass
- `grep -n "openNode" src/components/scene/SceneView.tsx` -- expected: no matches
