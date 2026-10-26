# Review: ARCHITECTURE-SPINE.md (file-browser), rubric pass

Reviewed against: src/, CLAUDE.md, src/lib/CLAUDE.md, eslint.config.js, package.json / node_modules, PRD FR-1..FR-11.
Read-only review; only this file was written.

## Verdict

**Needs revision before it binds the level below.** The skeleton is sound (functional core / imperative shell, 8 ADs, good capability map, Stack table verified exact). But it states several things about the code that are false, overclaims enforcement, and leaves open three divergence points that the mini-player units will hit immediately. Nothing is architecturally wrong in direction; the fixes are mostly wording plus 3-4 added decisions.

## Findings

### High

**H1. The webkitdirectory fallback already exists; spine, PRD and CLAUDE.md all say it does not (ratification failure).**
`src/components/FolderPicker.tsx` renders an `<input webkitdirectory>` and falls back to it when `supportsDirectoryPicker()` is false; `src/lib/tree.ts` has `fileListToEntries` ("Convert a FileList from an <input webkitdirectory>"). The spine says "v1 shows an 'unsupported' message" (Deferred) and lists Chromium-only as target; AD-2 says `picker.ts` is the only module touching the file-picking path and only via `showDirectoryPicker`. Consequences: FR-1's testable consequence ("an unsupported message is shown and no picker is offered") is contradicted by the code, and the open question "should a webkitdirectory fallback be added" is already answered in code. The spine must either ratify the fallback (new AD or amend AD-2: read-only input, still no network, entries shape identical) or order its removal. As written, a downstream unit following the spine would delete or contradict working code. The `@ts-expect-error` on the input is also unmentioned (not forbidden by CLAUDE.md, which bans `@ts-ignore`, but worth a rule).
Also: AD-2's "`picker.ts` is the only module that calls the File System Access API" is false at the letter: `tree.ts` `directoryHandleToEntries` calls `handle.entries()` and `child.getFile()`. Fix the wording ("only module that opens the picker; handle walking lives in tree.ts") or move the walker.

**H2. AD-4 contradicts the real selection model in the 3D view.**
AD-4 says `App` owns `selected` and views never keep their own copy beyond transient state. In reality, in scene mode `App` never reads `selected` (it only renders `DetailPane` in list mode, `App.tsx` lines ~86-98); the 3D view shows details from `SceneView`'s local `openNode` state (`SceneView.tsx` ~296-299), and `onSelect` is also called for directories and branches. So the 3D Leaf is a second selection owner, and the "pane is a pure function of its node" claim is also off: `DetailPane` holds effect state (dimensions, exif, imageError). This is the exact divergence AD-4 claims to prevent (list and 3D disagreeing on what is selected). The mini-player rule "unmounting on selection change, Leaf close, view switch stops playback" depends on this model, so it must be stated correctly. Either ratify "Leaf is the 3D view's selection; App.selected is list-only" or make the 3D view derive from `App.selected`. Also "Selection and expansion are reset on each new pick" is only true for selection: expansion is local `useState` inside `TreeItem` (`Tree.tsx` line 42), and `Tree` is not keyed by pick, so same-path nodes of a re-picked folder keep their expanded state. Not "keyed by path" in any store either.

**H3. Keyboard operability of the mini-player inside the Leaf is not guaranteed and the spine does not decide it.**
`Leaf.tsx` implements a Tab focus trap using the selector `button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])`. A native `<audio controls>`/`<video controls>` matches none of these, so Tab from the last matched element wraps to the first and never reaches the media controls. FR-10 ("each control operable by keyboard") and AD-7 ("native controls give keyboard operation without custom code") will therefore fail in the 3D view, which is the primary view. The spine should name `Leaf`'s focus trap as a divergence point and require adding the media elements (e.g. `audio[controls], video[controls]`) to it, with a test.

### Medium

**M1. AD-5 classifier is under-specified and has a sibling classifier it ignores.**
- Today `isImageFile`/`isPdfFile` live in `src/lib/image.ts`, `leafCategory` in `scene-layout.ts` returns `image | pdf | other`, and `metadata.ts` has a third classification (`KIND_BY_EXTENSION` / `describeKind` -> `kindLabel`). AD-5 says "one classifier" but does not name `describeKind`; FR-6 kind labels can still disagree with the preview kind. Say whether `kindLabel` derives from the classifier or is an intentionally separate display concern.
- The module `lib/file-kind` is introduced in the structural seed, but whether `isImageFile`/`isPdfFile` move or become re-exports is left to the implementer (image.ts must stay about image I/O; `scene-layout.ts` importing from `image.ts` is already a wart).
- "MIME with an extension fallback" without an extension list is a real divergence point: `.ogg` (audio or video), `.webm` (either), `.mp4`/`.m4a`, and `.ts` (browsers/Windows may report `video/mp2t` for TypeScript files, which would make source files "videos" in a code folder). Decide: explicit allow-list of extensions per kind, precedence when MIME and extension disagree, and that unknown MIME `''` falls to the extension.
- Adding audio/video leaf categories requires new scene theme colors: `useSceneTheme` and `tokens.css` currently define only `--scene-leaf-image|pdf|other|folder`, and `Branch.tsx` indexes a 3-entry map by `leafCategory`. The spine does not say 3D leaves for audio/video need new tokens (`--scene-leaf-audio`, `--scene-leaf-video`) and a `LeafCategory` extension. This is a certain collision point between the lib unit and the scene unit.

**M2. AD-6 is described as a rule but the current code violates it and the spine does not flag it as a migration item; its enforcement is not mechanical.**
- `ImagePreview.tsx` swallows PDF errors with `() => {}` (exactly what AD-6 forbids) and renders nothing on failure; the `detail-pane__error` pattern exists only for image read failures in `DetailPane`. AD-6 is not tagged ADOPTED (correct), but it should say "existing PDF failure path must be fixed to comply", otherwise FR-8 behavior silently stays non-compliant while the spine appears to govern it.
- No lint rule enforces "no empty catch / `() => {}`" (eslint `no-empty` ignores arrow bodies; `@typescript-eslint/no-empty-function` is not in the v8 recommended set the config spreads) or "createObjectURL paired with revoke". State that enforcement is by test + review, or add a rule.
- FR-10 says the media URL is revoked "when playback ends or the selection changes"; AD-7/AD-6 revoke on unmount only. Revoking at `ended` would break replay. Record this as a conscious deviation from the PRD text (or fix the PRD).
- Cancellation for the media element: AD-6 says "async effects set state only if not cancelled" but a media element's `error`/`loadedmetadata` events fire after selection change if the element is not detached; state the handler must be removed on cleanup (React props handle this if the element is keyed by file, so require `key={node.path}`/keyed on `File`).

**M3. Enforcement claims overreach (AD-1, AD-2).**
- AD-1: "`src/lib/**` imports ... nothing from `src/components/` ... Enforced by the ESLint `no-restricted-imports` rule." `eslint.config.js` restricts only `react`, `react-dom`, `react/*`, `react-dom/*`. Importing `../components/...` from lib, and `.tsx` files in lib, are not enforced. Either add patterns (`../components/*`, `**/components/**`) to the rule or state that this part is convention only. Note `no-restricted-imports` restricted `paths: ['react','react-dom']` and patterns `react/*`, `react-dom/*`: that matches CLAUDE.md, so the "react" part is correctly tagged ADOPTED.
- AD-2 is tagged ADOPTED with a list of forbidden APIs, yet ESLint has no `no-restricted-globals` / `no-restricted-properties` / `no-restricted-syntax` for `fetch`, `XMLHttpRequest`, `WebSocket`, `localStorage`, `createWritable`, etc. PRD §7 says "Enforced by project rules and lint", which is not true for those. The "prevents a feature quietly adding a network call" claim is therefore carried by review and CLAUDE.md only. Add lint rules (cheap) or downgrade the Prevents text. Also the `.d.ts` still types `mode?: 'read' | 'readwrite'`.

**M4. Test strategy for the new player is not decided.**
jsdom has no `HTMLMediaElement.play/pause/load` implementation and no `URL.createObjectURL`; `src/test-setup.ts` patches only `Blob.arrayBuffer`. FR-10/FR-11 "testable consequences" (stops on selection change, error message on failure, URL revoked) need an agreed approach (stubs in test-setup vs per-test spies, dispatching the `error` event manually). Without it, units will diverge on mocks or skip the tests the quality gate requires.

### Low

**L1. Structural dimensions (deployment/operations).** Deployment is covered (static bundle, secure context, single environment) but: no host/`base` decision or explicit deferral (the HTTPS sentence is a constraint, not a decision), and the HTTPS claim is inconsistent with H1 (the webkitdirectory path works in any context). Operations is silent: no CI (there is no `.github/`), so `npm run check` is enforced only by convention; no statement on observability/error reporting (implied "none" by AD-2, say so), no browser support matrix beyond Chromium, no build/bundle-size budget despite the lazy three/pdf.js chunks. Each should be one line: decided, deferred or open question.

**L2. Deferred list: mostly safe, one item can cause divergence.** "Shared filter across views" is flagged well, but it differs from PRD §4.2 and FR-5's capability map points `FilterSign` at `components/scene/`; the PRD is "final" while the spine contradicts it. Raise this as an Open question for the PRD owner rather than an AD-4 `[ASSUMPTION]`. The deferred "Previews for text and other types: each would extend AD-5" is fine. "Custom media controls" is safe given AD-7.

**L3. Minor factual / naming issues.**
- Capability map FR-8 points to `ImagePreview` for PDF rendering: accurate (that is where pdfjs lives) but the component name misleads; spine could note it. The `AD-7` "`DetailPane` renders one node so at most one player" is true; but `MediaPlayer` placement "after ImagePreview" ordering in `DetailPane` conditions (`isImage`, `isPdf` booleans computed inline) is another place for kind-checks to diverge: AD-5 should say `DetailPane` switches on the classifier result, not on separate booleans.
- Mermaid graph shows `Scene --> Comp`; accurate (SceneView imports `DetailPane`) but this is a cycle-prone direction (components -> scene is lazy, scene -> components direct); state the rule "scene may import list components, not the reverse except through the lazy boundary" in AD-8.
- AD-3 says "Directories sort before files": true (`tree.ts` `sortTree`, `localeCompare` with base sensitivity). "returns same node when nothing is dropped": documented in `src/lib/CLAUDE.md`; not verified in filter.ts here beyond that doc.

## Checklist results

| Item | Result |
| --- | --- |
| Fixes real divergence points, misses none | Partial. Misses: Leaf focus trap (H3), scene tokens/LeafCategory for audio/video (M1), extension list and precedence (M1), jsdom media test approach (M4), fallback picker path (H1), 3D selection owner (H2). |
| Every AD Rule enforceable and prevents its Prevents | Partial. AD-1 and AD-2 overclaim lint enforcement (M3); AD-6 has no mechanical check and is violated by `ImagePreview` (M2); AD-4 describes a model the code does not have (H2); AD-5, AD-7, AD-8 are enforceable by tests/review. |
| Nothing in Deferred lets units diverge | Mostly. Shared filter is the only risky item and is already flagged; resolve as PRD open question (L2). |
| Ratifies, does not contradict, brownfield | No on H1 (fallback), H2 (selection), AD-2 wording on picker.ts. Yes on AD-1 react ban, AD-8 lazy/SceneErrorBoundary/ref state/`useSceneTheme`/reduced motion/DOM nav list (`scene__list` nav exists), AD-3 path identity. |
| Covers PRD capabilities FR-1..FR-11 | Mapped, but FR-1 consequence is contradicted by code (H1) and FR-10 "revoked when playback ends" deviates silently (M2). |
| Structural dimensions decided/deferred/open | Deployment decided; operations (CI, observability, hosting target, support matrix) unaddressed (L1). |

## Verified claims (true)

- Stack versions match installed `node_modules` exactly: React 18.3.1, TypeScript 5.9.3, Vite 5.4.21, Vitest 2.1.9, RTL 16.3.3, jsdom 25.0.1, three 0.170.0, fiber 8.18.0, drei 9.122.0, pdfjs-dist 4.10.38, ESLint 9.39.5.
- `ADOPTED` tags: AD-1 (react ban only), AD-3 (path identity, sort, derived filter), AD-8 (lazy under `SceneErrorBoundary`, `supportsWebGL`, `prefersReducedMotion`, `SceneState` ref, `useSceneTheme`, `scene-layout.ts` free of React) hold. AD-2 is only partly adopted (H1, M3).
- Files that exist: `lib/picker, tree, filter, metadata, image, scene-layout, webgl, types`, `components/FolderPicker, Tree, DetailPane, ImagePreview, SceneErrorBoundary`, `components/scene/*` (including `FilterSign`, `Leaf`, `scene-state.ts`, `useSceneTheme.ts`), `styles/tokens.css`, `global.css`, `src/lib/CLAUDE.md`.
- Files named by the spine that do not exist yet (acceptable as planned work, but should be labeled so): `src/lib/file-kind`, `src/components/MediaPlayer` (and no audio/video code anywhere in `src/`).
- Pre-existing: PDF worker imported via `?url` (ImagePreview), `pdf.destroy()` in `finally`, image object URLs revoked, `detail-pane__error` class exists.
