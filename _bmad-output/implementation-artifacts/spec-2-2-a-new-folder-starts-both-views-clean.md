---
title: 'Story 2.2: A new folder starts both views clean'
type: 'bugfix'
created: '2026-10-30'
status: 'done'
baseline_commit: '9a8528b6ade7f65d27a06ff2f2970e96442d751f'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** List-view expansion is local `useState` in `Tree`'s items, keyed by `TreeNode.path`. Picking a new folder that contains the same path (for example `docs/deep`) keeps the old expansion, so state leaks across picks (FR2; AR4).

**Approach:** Remount the list `Tree` on every pick, keyed by the existing `pickCount`, the same way the 3D `SceneView` already restarts. Selection and filter resets in `handlePicked` stay as they are.

</frozen-after-approval>

## Implementation Notes

- `src/App.tsx`: add `key={pickCount}` to `<Tree>`. `handlePicked` already clears `selected` and `query` and bumps `pickCount`; `SceneView` is already keyed by it.
- `src/__tests__/App.test.tsx`: in `App filter`'s neighbourhood add a test that expands a nested folder (`docs/deep`), picks a folder containing the same path, and asserts it is collapsed again; add a test that a selection clears on a new pick (detail pane back to its empty message) in the list view.
- Verify with `npm run check`.
- Done as planned. `npm run check` green: 15 files, 153 tests. The expansion test fails without the `key` (checked), so it guards the fix. The selection and filter resets were already in `handlePicked`; the selection test now covers the list view.
- The blind-hunter review layer was skipped: it needs a subagent and none was authorized. The source change is one prop.
