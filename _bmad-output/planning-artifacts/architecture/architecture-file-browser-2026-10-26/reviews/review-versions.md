# Review: versions and reality checks (ARCHITECTURE-SPINE.md)

Date: 2026-10-26. Method: package.json, `npm ls --depth=0`, `npm view` (registry), MDN, caniuse, R3F docs, web search.

## Verdict

Stack table is accurate against the installed project (every row matches). Two factual claims are inaccurate or unverified (Chrome 86 baseline, native keyboard operation). The "current versions" framing is absent: all pins are 1-2 majors behind latest, which is a deliberate-looking but undocumented choice.

## 1. Stack table vs installed (CONFIRMED)

| Spine | Installed (`npm ls`) | Match |
| --- | --- | --- |
| React/DOM 18.3.1 | 18.3.1 | yes |
| TypeScript 5.9.3 | 5.9.3 | yes |
| Vite 5.4.21 | 5.4.21 | yes |
| Vitest 2.1.9 / RTL 16.3.3 / jsdom 25.0.1 | same | yes |
| three 0.170.0 | 0.170.0 | yes |
| R3F 8.18.0 | 8.18.0 | yes |
| drei 9.122.0 | 9.122.0 | yes |
| pdfjs-dist 4.10.38 | 4.10.38 | yes |
| ESLint 9.39.5 | 9.39.5 | yes |

Caveat: package.json uses caret ranges (e.g. `typescript ^5.5.3`, `vite ^5.4.3`); the spine's exact numbers come from the lockfile/installed state and will drift on a fresh install. The spine should say "as installed/locked" or cite the lockfile.

## 2. Currency (registry, today)

Latest on npm: react 19.3.1, vite 8.3.5, typescript 7.0.2, vitest 5.0.5, three 0.186.1, R3F 9.8.2, drei 10.7.9, pdfjs-dist 6.4.299, eslint 10.13.0, jsdom 30.1.3, RTL 16.3.3 (current).
- All named technologies still exist and are maintained. Only RTL is at latest.
- Spine never states that these are intentionally pinned behind latest, nor why. Add one line: "Pinned to React 18 line; majors behind latest, upgrade deferred" (it partly does under Deferred, for React/R3F/three only).
- Not covered by Deferred: Vite 5 -> 8, Vitest 2 -> 5, TypeScript 5 -> 7, ESLint 9 -> 10, pdfjs-dist 4 -> 6, jsdom 25 -> 30. Vite 5 / Vitest 2 are likely out of upstream support; flag as maintenance debt, not a blocker.
- pdfjs-dist 4.10.38 requires Node >=20 (registry `engines`); spine does not state a Node baseline.
- Not independently checked: whether the older majors have open security advisories (`npm audit` not run).

## 3. Claims

- **R3F v8 pairs with React 18, v9 with React 19: CONFIRMED.** R3F docs: "@react-three/fiber@8 pairs with react@18, @react-three/fiber@9 pairs with react@19." Registry peers agree (8.18.0: react `>=18 <19`; latest 9.x: `>=19 <19.4`). drei 9.122.0 peers fiber `^8`, react `^18`. Good. Note drei 10 pairs with fiber 9, so drei must upgrade with them (spine says "R3F / three", omits drei).
- **showDirectoryPicker Chrome/Edge 86+: PARTLY WRONG / imprecise.** caniuse (File System Access API) shows partial support 86-104 and full from 105 for Chrome and Edge; Firefox and Safari none. MDN marks it experimental, limited availability. I could not isolate showDirectoryPicker's own version_added (the mdn browser-compat-data fetch was truncated), so "86+" is the API-family start, not confirmed for this method. Recommend "Chrome/Edge 86+ (partial), 105+ for full support" or verify on MDN's compat table. Also: the project has a Chromium-only dependency on an experimental API; the spine records this (Deferred webkitdirectory) but not the "experimental" status.
- **Secure context: CONFIRMED** (MDN: secure contexts only; also requires transient user activation, else `SecurityError`). The spine omits the user-activation requirement; worth one clause. Localhost counts as secure (standard, not re-fetched).
- **`mode: 'read'`: CONFIRMED** valid and the default per MDN. Note: `'read'` is the default, so the explicit option is documentation, not a restriction beyond default. The project's `.d.ts` types it as `'read' | 'readwrite'`.
- **Native `<audio>/<video> controls` give play/pause, seek, volume, duration: CONFIRMED** by MDN ("volume, seeking, and pause/resume"). Duration display is a de-facto feature of the browser UIs; MDN does not list it explicitly.
- **"...and keyboard operation without custom code": NOT CONFIRMED, likely overstated.** MDN's video page documents no keyboard behavior. MDN Learn (Accessible multimedia) historically says native controls are not keyboard-accessible in most browsers, with Chrome/Opera partial; Firefox reported mostly accessible (Enter/Space toggles play, Up/Down volume). Sources found are 2012-2018; no current authoritative source found. AD-7 and the Accessibility convention ("media controls are keyboard-operable") assert this as fact. Required action: test manually in current Chrome and Edge (the only supported browsers) and add an acceptance test/note; keep the "custom controls" escape hatch noted in Deferred as the fallback if it fails. FR-10's keyboard criterion depends on this.
- **Error handling via media `error` event: CONFIRMED with nuance.** MDN: with multiple `<source>` children the error fires on the element only after all fail; with a `src` attribute it fires on the element directly. Spine's design (single object URL `src`) is consistent. Unplayable codecs (e.g. HEVC, some MKV/AVI) are browser-dependent, matching AD-5's runtime decision.

## 4. Unverified or asserted items to flag

1. Keyboard operability of native controls (above): asserted, contradicted by older MDN guidance.
2. "Chrome/Edge 86+": family-level only; full support is 105.
3. three 0.170.0 / @types/three 0.170.0 pairing and the claim R3F 8.18 works with it: confirmed only by peer ranges (`three >=0.133`), not by a runtime check; the project's `npm run check` was not run here.
4. No Node version baseline stated.
5. "Dependencies point shell -> core only" and ESLint `no-restricted-imports` enforcement: not part of this review's scope (versions); not verified here.
6. The spine does not cite sources for any version fact; add a "Verified on 2026-10-26 via npm ls" note.
7. Spine claims `src/lib/file-kind` and `MediaPlayer` as new (not checked as existing; they are design intent for the branch).

## Sources

- https://r3f.docs.pmnd.rs/getting-started/installation
- https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker
- https://caniuse.com/native-filesystem-api
- https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video
- https://developer.mozilla.org/en-US/docs/Learn/Accessibility/Multimedia
- npm registry via `npm view`; `npm ls --depth=0` in the project
