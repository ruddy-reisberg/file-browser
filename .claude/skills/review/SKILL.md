---
name: review
description: Review the current diff (or a given branch/PR/path) of the file-browser — a browser-only file explorer built with React + TypeScript + Vite and a 3D view (three/R3F). Checks the project rules (src/lib free of React, no network/storage/writes, styling only through CSS tokens, `npm run check` green), then correctness, resource leaks and tests. Use for "review", "look over my code", "check before commit".
---

# file-browser review

Read-only review: do not modify any file unless explicitly asked. Target = the given argument (PR, branch, path); otherwise `git diff` + `git diff --staged` + untracked files (`git status`).

## 1. Run the check first

```
npm run check    # typecheck (tsc -b --noEmit) + eslint + vitest run
```

A red check is a blocking finding: quote the exact output. If you cannot run it, say so instead of assuming it passes.

## 2. Project rules (violations are blocking)

Source: `instructions/base-project-instructions.md` and `.claude/rules/`.

1. **Framework-free core**: `src/lib/**` never imports `react`, `react-dom` or `react/*` (also enforced by the ESLint `no-restricted-imports` rule). No components, JSX or hooks in `lib/` either. `types.ts` must stay free of UI, network and storage.
2. **No network, no persistence, no writes**: reject `fetch`, `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon`, `localStorage`, `sessionStorage`, `indexedDB`, cookies, `createWritable`, `getFileHandle(..., { create: true })`, `removeEntry`. The picker must remain `showDirectoryPicker({ mode: 'read' })`. Also check that no external URL/CDN is introduced (fonts, textures, drei `Environment` presets, remote workers): every asset must be bundled.
3. **Styling only through tokens**: `src/styles/tokens.css` is the single source of design values (color, spacing, radius, font, shadow). In any other `.css`/`.tsx`, flag hardcoded colors (`#hex`, `rgb()`, `hsl()`), magic px/rem values for spacing, and `style={{ color: ... }}` with literals. A new value means a new token in `tokens.css`. In the 3D scene, colors come from `useSceneTheme` (which reads the tokens); its `#ff00ff` fallback is intentional, do not let it spread.
4. **Green check**: any behavior change has a test; no added `skip`/`only`/`eslint-disable`/`@ts-ignore`/`any` just to make the check pass without justification.

## 3. Correctness points specific to this codebase

- **Object URL leaks**: every `URL.createObjectURL` has a matching `revokeObjectURL` (effect cleanup, including error paths). See `ImagePreview.tsx`, `lib/image.ts`.
- **Async effects**: file reading / PDF rendering / EXIF parsing inside a `useEffect` must handle cancellation (`cancelled` flag or AbortController) so a stale result cannot overwrite the current selection; loading and error states handled.
- **pdf.js**: worker imported via `?url` (bundled, no CDN); documents/pages destroyed after use (`destroy`/`cleanup`).
- **3D scene (three / R3F)**: manually created geometries, materials and textures are `dispose()`d; no `new Vector3/Color` inside `useFrame` (per-frame allocation); no `setState` per frame; `prefersReducedMotion()` honored for any animation/camera motion; `supportsWebGL()` checked before mounting; the 3D view stays under `SceneErrorBoundary` with fallback to the list view; lazy loading of the scene (separate chunk) preserved.
- **Pure logic**: non-UI logic (`scene-layout.ts`, `tree.ts`, `filter.ts`, `metadata.ts`) stays pure and deterministic. Check edge cases: empty folder, duplicate or case-differing names, very large trees (layout performance), special characters, files without extension, `lastModified` of 0, missing/corrupt EXIF, EXIF orientation.
- **Tree**: `TreeNode.path` is the stable identity for UI state (selection, expansion); no array index as `key`. Directories-first then alphabetical sorting preserved.
- **Browser support**: File System Access API missing (Firefox/Safari) → explicit message via `supportsDirectoryPicker()`, no crash.
- **React**: rules of hooks, correct effect dependencies, no duplicated derived state, components exported alone in their file (`react-refresh/only-export-components`).
- **Accessibility**: tree navigable by keyboard (`tree`/`treeitem` roles and aria), labeled controls, `alt` on the preview, focus visible through tokens; the 3D view must not be the only way to reach files.

## 4. Tests

- `src/lib/` tests: pure, no React DOM; `File` fixtures built in memory.
- Every new `lib/` module or added logic branch has a test in the neighboring `__tests__/`; the edge cases from section 3 are covered where relevant.
- Components: `@testing-library/react`; no opaque snapshots, no mocks that empty the test of meaning. R3F components are tested through their logic/surrounding DOM, not through real WebGL (jsdom).

## 5. Out of scope (do not report)

Pure formatting style, taste-based renames, `dist/`, `node_modules/`, `*.tsbuildinfo`, `package-lock.json` (unless a dependency is added: flag it), the `prompts/` folder (course material). Do not suggest a new dependency without a clear need.

## 6. Report format

Order from most to least severe; one finding = one clickable `file:line` line, then:

- **Severity**: blocking (project rule or red check, confirmed bug) / important (probable bug, leak, missing test) / minor.
- **Problem**: one sentence.
- **Scenario**: concrete input/state → wrong result.
- **Suggested fix**: short.

Only report what you verified in the code; mark as "to confirm" what remains plausible. End with: the `npm run check` result, and one "OK" line for each section 2 rule with no violation. If nothing is found, say so plainly.
