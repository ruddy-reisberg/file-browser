---
name: audit-rules
description: Audit the whole file-browser codebase (not just a diff) against the project rules in CLAUDE.md, src/lib/CLAUDE.md and .claude/rules/. Greps every Forbidden item (React in lib, network, persistence, folder writes, hardcoded design values, check-silencing escapes), then verifies conventions (object URL pairing, async cancellation, 3D disposal, keys, a11y, tests per module). Use for "audit the project", "are we compliant with the rules", "rules audit".
---

# file-browser rules audit

Read-only: report, never fix unless asked. Scope = whole `src/` (plus `mcp/`, `index.html`, `vite.config.ts`). Ignore `dist/`, `node_modules/`, `*.tsbuildinfo`, `prompts/`, `_bmad*`.

Sources of truth: `CLAUDE.md` (Forbidden + Conventions), `src/lib/CLAUDE.md`, `.claude/rules/*.md`. If a rule below disagrees with them, they win; say so.

## 1. Baseline

Run `npm run check`. Quote any failure verbatim; a red check is blocking. If it cannot be run, say so.

## 2. Forbidden: mechanical greps

Run each with Grep (exclude `__tests__` only where noted) and judge every hit; a hit is a finding only if it is real code, not a comment or a test asserting absence.

| Rule | Pattern | Where |
|---|---|---|
| React in lib | `from 'react` / `from "react` , any `.tsx`, JSX, `use[A-Z]\w*\(` | `src/lib/**` |
| Network | `\bfetch\(`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `EventSource` | `src/**`, `mcp/**` is out of scope (Node tool) |
| External URL/CDN | `https?://` (ignore XML namespaces like `w3.org`), `@import url`, `<link`/`<script src` with a remote host | `src/**`, `index.html`, `*.css` |
| Persistence | `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie` | `src/**` |
| Folder writes | `createWritable`, `create:\s*true`, `removeEntry`, `showDirectoryPicker\(` (must be `{ mode: 'read' }`), `showSaveFilePicker` | `src/**` |
| Hardcoded design values | `#[0-9a-fA-F]{3,8}\b`, `rgba?\(`, `hsla?\(`, raw `px`/`rem` spacing, `box-shadow`/`border-radius`/`font-family` literals, `style=\{\{` with literals | every `.css`/`.tsx` **except** `src/styles/tokens.css` |
| 3D colors | `new Color\(['"]`, `color=['"]`, `#hex` in `src/components/scene/**` | colors must come from `useSceneTheme`; its `#ff00ff` fallback is the only allowed literal |
| Silenced checks | `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `: any\b`, `as any`, `\.skip\(`, `\.only\(`, `xit\(`, `it\.todo` | `src/**` incl. tests |

For design values, `var(--token)` usage, `0`, `100%`, `1`, `auto`, unitless line-heights and `calc()` over tokens are fine. Also confirm every `var(--x)` used in CSS/TSX is defined in `tokens.css` (grep the names, diff against definitions) and every scene color token read by `useSceneTheme` has both a light and a dark value.

Also verify the lint guard still exists: `eslint.config.js` keeps `no-restricted-imports` for `src/lib/**` (react, react-dom, react/*, react-dom/*).

## 3. Conventions: verify by reading

1. **Object URLs**: list every `createObjectURL`; each needs a `revokeObjectURL` on success, error and effect cleanup.
2. **Async effects**: every `useEffect` that reads files, renders PDF, parses EXIF or loads media has a `cancelled` flag/AbortController checked before `setState`, and handles loading + error states.
3. **pdf.js**: worker via `?url` import; documents/pages `destroy()`/`cleanup()`.
4. **3D** (`src/components/scene/**`): manual geometries/materials/textures disposed; no `new Vector3|Color|Euler|Quaternion` or `setState` inside `useFrame`; `prefersReducedMotion()` read for motion; `supportsWebGL()` before mounting; scene reached only via `React.lazy` under `SceneErrorBoundary` with list-view fallback.
5. **Tree**: `key` is `node.path`, never an index (grep `key=\{`, `key=\{i`, `key=\{index`); sort is directories first then alphabetical; `treeitem`/`tree` roles and keyboard handlers intact; a non-3D route to every file exists.
6. **lib purity**: `src/lib/*.ts` has no `Date.now`/`Math.random`/module-level mutable state; functions do not mutate arguments; browser access only in `webgl.ts`, `image.ts`, `picker.ts` and guarded; `types.ts` has types only; `picker.ts` is the only File System Access consumer.
7. **Exports**: each component file exports exactly one component (`react-refresh/only-export-components`).
8. **Exhaustive kinds**: every `Record<FileKind, …>` covers all members of the `FileKind` union (typecheck proves it; also confirm no `default:`/`?? 'other'` hides a missing kind).

## 4. Test coverage map

For each `src/lib/*.ts` module, check `src/lib/__tests__/<module>.test.ts` exists and is pure (no `@testing-library`, no React, `File` fixtures in memory, no disk reads). For each component, check a test exists in the neighboring `__tests__/` (scene R3F pieces are tested through logic/DOM, not WebGL). List modules/branches without tests and the edge cases from `src/lib/CLAUDE.md` that are not covered (empty folder, duplicate/case-differing names, special characters, no extension, `lastModified` 0, huge trees, corrupt/truncated EXIF, EXIF orientation).

## 5. Report

Group by rule, most severe first. One finding = clickable `file:line`, then **Severity** (blocking = Forbidden item or red check / important = convention breach, leak, missing test / minor), **Problem**, **Scenario**, **Suggested fix**.

End with a compliance table: one row per Forbidden item and per convention, status `OK` / `N violations`, plus the `npm run check` result. Mark anything not fully verified as "to confirm". If everything passes, say so plainly. Do not propose new dependencies or open questions already listed in `CLAUDE.md` (3D perf on huge trees, extra preview types) as violations.
