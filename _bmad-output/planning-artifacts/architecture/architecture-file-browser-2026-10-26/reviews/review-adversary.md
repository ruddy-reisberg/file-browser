# Adversarial review: ARCHITECTURE-SPINE.md (file-browser)

Method: for each pair of independently built units, assume both obey every AD literally, then find where they still collide. Evidence is from `src/App.tsx`, `src/components/**`, `src/lib/**` at branch feat/audio-video-preview.

Verdict: the spine is sound on resources and layering, but leaves 8 holes where two compliant stories diverge. The worst are two classifiers that AD-5 does not unify, a modal (Leaf) that is not part of the lifecycle rule, and DetailPane being declared "pure" when it is stateful.

## H1. AD-5 unifies the predicate but not the vocabulary (kind label, LeafCategory, theme colours)

Pair: MediaPlayer story (extends classifier to `audio | video`) and 3D Leaf/colour story (extends `LeafCategory` and `useSceneTheme`).

- Today there are three classifications: `isImageFile`/`isPdfFile` (`lib/image.ts`), `LeafCategory = 'image'|'pdf'|'other'` in `scene-layout.ts`, and `describeKind(name, type)` feeding `kindLabel` in `metadata.ts`. AD-5 names the first two, not `describeKind`.
- Story A adds `FileKind` with `audio` and `video` and rewrites `leafCategory` to return `audio` and `video`. Story B (scene) decides media is one leaf colour and keeps `LeafCategory` with a new `'media'`. Both comply ("derive from it"). `Branch.tsx` line 58 indexes a literal record keyed by `LeafCategory`, so the two shapes produce a type error or a missing colour at merge.
- Tokens: `--scene-leaf-pdf` exists; who adds `--scene-leaf-audio`/`--scene-leaf-video`, and in `useSceneTheme`, dark and light blocks? Unowned.
- `kindLabel` can say "PDF Document" while the classifier says `other`, or vice versa (extension tables duplicated).

Proposed AD-5 addition: "`FileKind` (`image|pdf|audio|video|other`) is the only kind vocabulary. `LeafCategory` is deleted or is an alias of `FileKind`; `metadata.describeKind` and every `Record<kind, …>` (scene colours, labels, icons) are keyed by `FileKind` and must be exhaustive (`satisfies Record<FileKind, …>`). Adding a kind means one change set touching classifier, label, a `--scene-leaf-<kind>` token in both themes and `useSceneTheme`."

## H2. Classifier precedence and false positives are undefined

Pair: classifier story and any consumer story (DetailPane, MediaPlayer).

AD-5 says "MIME with an extension fallback" but not precedence or conflicts. Today images check MIME-prefix first, PDF checks either (OR). Real cases: `.ts` files get MIME `video/mp2t` in Chromium on Windows (TypeScript source classified as video); `.m4a` as `video/mp4`; `.ogg`/`.webm`/`.mp4` can be audio-only or video; `application/octet-stream` with a media extension. One story picks MIME-wins, the other extension-wins in its tests; both are "MIME with extension fallback".

Proposed AD-5 addition: "Precedence: a MIME in the explicit allowlist wins; generic or ambiguous MIME (`''`, `application/octet-stream`, `video/mp2t`) defers to the extension. Ambiguous containers (`mp4`, `webm`, `ogg`) classify as `video` and render in `<video>`, which plays audio-only files. The mapping is one table in `file-kind.ts` with tests for each conflicting pair."

## H3. DetailPane is declared "pure" but owns async state; error ownership is split

Pair: MediaPlayer story and Image/EXIF story, both editing `DetailPane`.

- AD-4 says "DetailPane is a pure function of its node prop". The code holds `dimensions`, `exif`, `imageError` state and an effect keyed on `[file, isImage]`. The MediaPlayer story, obeying "pure", puts error state inside `MediaPlayer`; the image story keeps `imageError` in `DetailPane`. Two patterns for "the `detail-pane__error` pattern": who renders the message, and does it hide the preview (`isImage && !imageError`) or sit beside it?
- Existing debt contradicts AD-6: `ImagePreview` PDF path has `() => {}` as the rejection handler (silent blank) and `renderPdfFirstPage` dataURL path has no explicit failure UI. A story told "AD-6 applies" may copy this as the repo pattern.
- Reset: `DetailPane` does not remount per file. A player whose state is not keyed to the file persists `currentTime`, `error` across selections unless `key` is set.

Proposed AD: "DetailPane is a stateless router: it switches on `FileKind` and renders exactly one `<Preview key={node.path} file>`. Each preview owns its resource, its loading and error state, and renders its own `detail-pane__error` message through the shared `PreviewError` component. DetailPane holds no per-file state; metadata extraction (dimensions, EXIF) moves into the image preview. Fix `ImagePreview`'s empty rejection handler as part of the first story touching it."

## H4. Leaf is outside the lifecycle rule: delayed unmount, focus trap, key handling

Pair: MediaPlayer story and Leaf/scene story.

- AD-7: "Unmounting the player (… Leaf close …) stops playback". `Leaf.requestClose` sets `closing` and calls `onClose` after `CLOSE_MS = 260` ms, so playback continues through the fold animation; and `Leaf` replaced by another `openNode` is not a close at all. Both stories obey AD-7 literally; audio audibly lags the UI. With reduced motion the fallback timer is still used.
- Leaf's Tab trap uses `FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]…'`. Native `<audio controls>` and `<video controls>` are focusable but match none of these, so a media element can be neither first nor last in the trap: Tab leaves the modal into the scene behind it. The MediaPlayer story has no reason to touch `Leaf.tsx`; the Leaf story has no reason to know about media.
- Escape: Leaf stops propagation of Escape; fullscreen video uses Escape too (browser consumes it first, but a keydown in the controls bubbles up to Leaf and closes the modal). Space/arrow keys in controls bubble through `.scene` `onKeyDown` (currently only Escape handled, but any future shortcut collides).

Proposed AD-7 addition: "Playback stops synchronously when the close is requested (`requestClose`), not when the node unmounts: `Leaf` exposes `onCloseRequested`, or MediaPlayer is told `active=false`. Leaf's focus trap enumerates media elements (`audio[controls], video[controls]`) and `[contenteditable]`. Key events originating in a media element do not trigger scene or Leaf shortcuts except Escape when not fullscreen."

## H5. "Selection has one owner" is contradicted by the scene's openNode and by view switching

Pair: filter/list story and scene story (or MediaPlayer in Leaf vs in list pane).

- `SceneView` keeps `openNode` and renders `<DetailPane node={openNode}>`; `App.selected` is set in parallel via `onSelect`. In scene mode `App.selected` is never rendered; in list mode `openNode` is gone. AD-4 permits "transient presentation state (e.g. the scene's open Leaf)" which is exactly a second owner of "the selected file".
- `onSelect(spec.dir)` and `enterFolder` set `selected` to directories without opening anything; `goToLevel` and `changeQuery` do not touch `selected`. So `selected` may reference a folder or a file no longer visible under the current filter/level.
- View switch scene -> list: `selected` survives, the list shows it and a player mounts there (autoplay is not started, OK). List -> scene: SceneView remounts at root with `selected` still set to something deep in the tree; the two views disagree. `key={pickCount}` resets only on pick.
- A list-view story that lifts the filter to `App` (Deferred item) conflicts with the scene story that keeps `query` in `SceneView` and with `changeQuery` which also resets `activeTreeId`.

Proposed AD-4 replacement: "`App.selected` is the only record of the selected file. The Leaf is open iff `selected` is a file and the view is 3D: `openNode` is derived, not stored. `onSelect(null)` is the only way to close it. Switching view keeps `selected` and the scene starts positioned on it (or both clear it; pick one and test it). Folder navigation in the scene is `viewPath`, a separate named concept from `selected`. Whoever lifts the filter query to `App` also owns the reset rules (`setActive(null)`, selection invalidation when `selected` is filtered out)."

## H6. Filter derives new nodes; identity key is path but resources are keyed on File and on node reference

Pair: filter story (3D filter / future list filter) and preview/player story.

AD-3: `filterTree` derives a new tree; `path` is identity. AD-6: effects keyed "on the File". Both fine alone. But `SceneView.openNode` and `App.selected` hold TreeNode references from the pre-filter tree; after typing in the filter, nodes with the same path are new objects. A player keyed on `node` re-mounts (playback restarts); one keyed on `file` does not. The spec says "the File (or node)". Also two files with the same `path` cannot happen but two different Files can share name and size across picks; a re-pick of the same folder with the same paths creates new File objects: `selected` is reset, but the `Leaf` is reset only via remount key.

Proposed AD-6 addition: "Resource effects are keyed on `File` identity, React `key` on `node.path` plus `pickCount` (a `pickId` carried in a context or prop, not an App-private counter). Components never depend on `TreeNode` object identity."

## H7. Object URL ownership: three places create them with no shared helper

Pair: MediaPlayer story and image/readImageDimensions story.

`readImageDimensions` (lib) creates and revokes inside a promise; `ImagePreview` creates in an effect and calls `setUrl` synchronously (an extra render with null first); AD-6 says each pairs create/revoke but not that URL lifetime must be longer than the element's use. A MediaPlayer story that revokes in cleanup *and* in the `error` handler double-revokes harmlessly, but one that revokes on `loadedmetadata` (to "release early", as `readImageDimensions` does on `onload`) breaks seeking and replay, since a media element streams from the blob URL. Also React 18 StrictMode double-invokes effects: creating the URL in render or in `useMemo` leaks.

Proposed AD-6 addition: "A media object URL lives from effect start to effect cleanup and is never revoked on load events. Creation happens only in an effect (never render/`useMemo`), through one `useObjectUrl(file)` hook that returns `{url}` and owns revoke. Image dimension probing may revoke early; playback may not."

## H8. Process-level single player claim is false across the whole app

Pair: MediaPlayer story and scene Leaf story / view switching.

AD-7 says "Because DetailPane renders one node, at most one player exists." There are two DetailPane mount points (App list pane, Leaf). Today they are exclusive by `viewMode`, but `SceneErrorBoundary` fallback calls `setViewMode('list')` while `openNode` is open, and Suspense can keep the old tree mounted during a lazy re-render; a view toggle through `startTransition` or Suspense hides rather than unmounts (React hides Suspense-suspended trees with `display:none` and keeps effects), which would leave audio playing in a hidden tree. Nothing forbids a future side panel next to the Leaf either.

Proposed AD-7 addition: "Single-player invariant is enforced, not derived: a `PlaybackLock` (module singleton in the shell, or context) pauses any other registered media element when one starts. Hidden-but-mounted trees (Suspense, `hidden`, `display:none`) must pause on `visibilitychange`/hide."

## Smaller gaps

- Accessibility: AD-7 does not require `aria-label` (file name) or a fallback `<track>`/text for the media element; Leaf labels the dialog only.
- No size or memory rule for `file.arrayBuffer()` (PDF path, EXIF path reads whole file): a 2 GB video classified as `video` is fine through object URL, but a story that "extracts duration/metadata" via `arrayBuffer` breaks. Add to AD-6: bytes read only for bounded types; media always streamed through an object URL.
- AD-8 says "every item reachable in 3D is also reachable through the DOM nav list": the DOM list gives "Read <name>" for files; the media story must keep the name pattern (tests use it); not specified.
- Stack table lists `lib/file-kind` in the seed but code has `image.ts`; the migration owner (which story creates `file-kind.ts` and removes `isImageFile` exports) is unassigned, so two stories may each create it.
