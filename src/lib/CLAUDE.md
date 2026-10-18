**Instruction** : When this file is in your context, begin your next message with [src/lib/CLAUDE.md loaded].


# src/lib: framework-free core

Domain logic of the file browser. It must run and be testable without React or a rendered UI.

## Hard rules

- Never import `react`, `react-dom`, `react/*` or `react-dom/*` (ESLint `no-restricted-imports` fails the check). No JSX, no hooks, no components, so no `.tsx` files here.
- No network, no persistence, no writes: no `fetch`, `XMLHttpRequest`, `WebSocket`, `localStorage`, `sessionStorage`, `indexedDB`, `createWritable`, `getFileHandle(..., { create: true })`, `removeEntry`.
- `picker.ts` is the only module that talks to the File System Access API, and it stays `showDirectoryPicker({ mode: 'read' })`. Typings for that API live in `file-system-access.d.ts`.
- `types.ts` holds types only: no UI, network or storage code, no runtime logic.
- No CSS or design values here. Colors and sizes belong to `src/styles/tokens.css`; this folder only returns numbers (positions, heights, angles) and labels.

## Design

- Prefer pure, deterministic, synchronous functions: same input, same output, no mutation of arguments (`filterTree` returns the same node when nothing is dropped so memoised views stay stable; keep that contract).
- Browser access is allowed only when it is the module's purpose and is guarded: `webgl.ts` (`supportsWebGL`, `prefersReducedMotion`), `image.ts` (`createObjectURL`, `Image`), `picker.ts`. Guard feature detection (`typeof window`, `typeof matchMedia`) so modules do not crash in jsdom or when unsupported.
- `scene-layout.ts` knows nothing about three.js or React. Keep its angle convention (0 at +Z, growing towards +X) and its constants (`MAX_BRANCH_LEVELS`, etc.) documented where they are defined.
- `TreeNode.path` (slash-joined, relative to the picked root) is the stable identity used by UI state; never change how it is built without checking every consumer.
- Every `URL.createObjectURL` is paired with `revokeObjectURL` on success and error paths.
- Binary parsing (`parseExif`) must never throw on corrupt or truncated input: bounds-check offsets and return `{}` or skip the tag.
- Throw typed standard errors with a clear message for invalid input (e.g. `RangeError` for negative bytes); do not swallow errors silently.
- Short doc comment on exported functions, explaining the why when it is not obvious. Match the existing comment density.

## Tests

- Each module has a test in `__tests__/<module>.test.ts`; any new module or logic branch gets one in the same change.
- Pure, no React DOM, no `@testing-library/react`. Build `File` fixtures in memory (`new File([...], name)`); never read the real disk.
- Cover edge cases: empty folder, duplicate or case-differing names, special characters, files without extension, `lastModified` of 0, very large trees, missing/corrupt/truncated EXIF, EXIF orientation.

## Check

After any change here, run `npm run check` from the project root (`typecheck` + `lint` + `test`). It must stay green.
