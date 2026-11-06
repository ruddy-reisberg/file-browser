---
name: add-file-kind
description: Add a new file kind (e.g. text, archive, 3d-model) end to end in the file-browser: classifier in src/lib/file-kind.ts, metadata label, preview component, DetailPane wiring, 3D leaf color token, tests, and a green `npm run check`. Use for "add support for <kind> files", "new file kind", "preview <type> files". Argument = the kind name and the extensions/MIME types it covers.
---

# Add a file kind end to end

Argument: kind name (lowercase, e.g. `text`) + extensions + MIME types. If extensions/MIME or whether it needs a preview are missing, ask once, then proceed.

Rules that bind every step: `src/lib/**` stays React-free and pure; no network/persistence/writes; no hardcoded design values (new value = new token in `src/styles/tokens.css`); `npm run check` stays green; no `skip`/`only`/`eslint-disable`/`@ts-ignore`/`any`; no commit or push without explicit approval.

`FileKind` is a closed union consumed through `Record<FileKind, …>` maps, so `tsc` points at every spot you forgot. Add the member first and let the typecheck drive the rest.

## Steps

1. **Classifier** `src/lib/file-kind.ts`
   - Add the member to the `FileKind` union.
   - Add allowlisted MIME types to `KIND_BY_MIME` and extensions (lowercase, no dot) to `KIND_BY_EXTENSION`. Specific MIME wins, otherwise extension; never allowlist generic MIME (`application/octet-stream`, `text/plain` for non-text, `video/mp2t` for `.ts`).
   - Keep existing precedence: `image/*` first, then MIME map, then extension, default `'other'`. Check you do not steal an extension from another kind (e.g. `.ts`, `.svg`, `.ogg`).

2. **Metadata label** `src/lib/metadata.ts`: add the kind to `GENERIC_LABEL_BY_KIND` (a label like `'Archive File'`, or `undefined`), and specific labels for common extensions in `KIND_BY_EXTENSION` if useful.

3. **Layout** `src/lib/scene-layout.ts`: `LeafCategory` is `FileKind`, so no change expected; confirm `leafCategory` needs nothing else.

4. **Tokens** `src/styles/tokens.css`: add `--scene-leaf-<kind>` in the light block **and** the dark `prefers-color-scheme` block, as a hex color (read from JS). Pick a hue distinct from the existing leaf colors (image amber, pdf red, audio blue, video violet, other green, folder dark green).

5. **3D color** `src/components/scene/useSceneTheme.ts`: add `leaf<Kind>: '--scene-leaf-<kind>'` to `COLOR_TOKENS`; then `src/components/scene/Branch.tsx`: add the entry to the `leafColors` record. No literal color in components.

6. **Preview** (only if the kind has one)
   - New `src/components/<Kind>Preview.tsx` (+ `.css` using only tokens), exported alone in its file, props `{ file: File; kind: FileKind }`.
   - Async reads: cancellation flag so a stale result never overwrites the current selection; loading and explicit error states; every `createObjectURL` revoked on success, error and cleanup; no `fetch`.
   - Heavy libraries: bundled, lazy where sensible; no CDN, no remote worker (worker via `?url` like pdf.js).
   - Wire it in `src/components/DetailPane.tsx` `PREVIEW_BY_KIND` (use `null` for no preview).
   - Reusing an existing component (as `audio`/`video` share `MediaPlayer`) is preferred when it fits.

7. **Helper predicate** (optional): if other code needs `isX(file)`, add it next to `isImage`/`isPdf` in `src/lib/image.ts` or a better-named lib module, built on `classifyFile`.

8. **Tests** (same change)
   - `src/lib/__tests__/file-kind.test.ts`: MIME match, extension match (incl. uppercase), MIME-wins-over-extension, generic MIME defers to extension, no-extension/dotfile/trailing-dot stay `'other'`, and add the kind to the `produces every FileKind` sample (it is a `Record<FileKind, File>`).
   - `src/lib/__tests__/metadata.test.ts`: the label.
   - `src/lib/__tests__/scene-layout.test.ts`: category for a file of the new kind, if categories are asserted there.
   - Preview: `src/components/__tests__/<Kind>Preview.test.tsx` (loading, success, error, object URL revoked, stale result ignored after selection change) and a `DetailPane.test.tsx` case that the right preview mounts.
   - Scene: extend `Leaf`/`SceneView` tests only through logic/DOM, never real WebGL.
   - Pure lib tests: no React DOM, `File` fixtures in memory.

9. **Verify**
   - `npm run typecheck` first (it enumerates missed `Record<FileKind, …>` spots), then `npm run check` until green.
   - Confirm the 3D view is not the only access: the file must still show up in the keyboard-accessible tree with the right `treeitem` and DetailPane content.
   - Optionally run the app (`/run`) with a folder holding one sample file of the new kind and check list, preview and leaf color in both light and dark.

## Done report

List files changed per step, the `npm run check` result, and anything left out on purpose (e.g. no preview, label only). Do not commit; offer it and wait for approval.
