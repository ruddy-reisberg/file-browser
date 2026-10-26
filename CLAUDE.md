# Forbidden

- `src/lib/**` never imports `react`, `react-dom` or `react/*` (no components, JSX or hooks there either). Enforced by an ESLint `no-restricted-imports` rule.
- No network calls: no `fetch`, `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon`, and no external URL/CDN (fonts, textures, workers). Every asset is bundled.
- No persistence: no `localStorage`, `sessionStorage`, `indexedDB`, cookies.
- No writes to the user's folder: no `createWritable`, `getFileHandle(..., { create: true })`, `removeEntry`. The picker stays `showDirectoryPicker({ mode: 'read' })`.
- No hardcoded design values (colors, spacing, radius, font, shadow) outside `src/styles/tokens.css`. In the 3D scene, colors come from `useSceneTheme`.
- No `skip`/`only`/`eslint-disable`/`@ts-ignore`/`any` added just to turn the check green.
- No commit, push or other outward-facing action without the user's explicit approval.

# Conventions

- Role: act as a senior web developer.
- Styling only through CSS variables defined in `src/styles/tokens.css`; a new value means a new token.
- Non-UI logic lives in `src/lib/` and stays pure and deterministic (`tree.ts`, `filter.ts`, `metadata.ts`, `scene-layout.ts`).
- `TreeNode.path` is the stable identity for UI state (selection, expansion); never use an array index as a React `key`. Sort directories first, then alphabetically.
- Every `URL.createObjectURL` has its `revokeObjectURL`; async effects handle cancellation so a stale result never overwrites the current selection.
- 3D: dispose manually created geometries/materials/textures, no allocation or `setState` per frame, honor `prefersReducedMotion()`, check `supportsWebGL()`, keep the scene lazy-loaded under `SceneErrorBoundary` with fallback to the list view.
- Keep the tree keyboard-accessible (`tree`/`treeitem` roles); the 3D view must not be the only way to reach files.
- Each behavior change comes with a test; `src/lib/` tests sit in the neighboring `__tests__/`, are pure and build `File` fixtures in memory.
- Components are exported alone in their file (`react-refresh/only-export-components`).

# Stack Architecture

Browser-only file explorer: pick a local folder, browse it as a tree, see file metadata (name, size, type, last modified) and, for images, dimensions, EXIF and a preview. No server, no network, no persistence, read-only access.

- React 18 + TypeScript + Vite; tests with Vitest + Testing Library (jsdom).
- 3D view with three + `@react-three/fiber` + `@react-three/drei`; PDF rendering with `pdfjs-dist` (worker imported via `?url`, bundled).
- `src/lib/`: framework-free core (`tree`, `filter`, `metadata`, `image`, `picker`, `scene-layout`, `webgl`, `types`).
- `src/components/`: list UI (`FolderPicker`, `Tree`, `DetailPane`, `ImagePreview`, `SceneErrorBoundary`) and `scene/` (3D view, lazy-loaded).
- `src/styles/`: `tokens.css` (single source of design values) and `global.css`.
- Rules in `.claude/rules/`, the `review` skill in `.claude/skills/review/`, project spec in `instructions/base-project-instructions.md`. `prompts/` is course material.

# Commands

- `npm run dev`: start the Vite dev server.
- `npm run build`: `tsc -b` then `vite build`.
- `npm run preview`: preview the production build.
- `npm run typecheck`: `tsc -b --noEmit`.
- `npm run lint`: `eslint .`.
- `npm test`: `vitest run`.
- `npm run check`: typecheck + lint + tests; must stay green.

# Open questions

- Expected performance on very large trees (tens of thousands of files) in the 3D layout: is a cap or virtualization needed?
- Which file types besides images and PDFs deserve a preview (text, audio, video)?
