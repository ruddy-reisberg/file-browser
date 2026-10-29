---
title: 'Story 1.1: One classifier decides what kind of file it is'
type: 'refactor'
created: '2026-10-29'
status: 'done'
baseline_commit: '9c0622209a1001acbb95f8c051a58cecd9e41a91'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/src/lib/CLAUDE.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** "Is this an image / PDF?" is answered separately in `image.ts` (`isImageFile`, `isPdfFile`), `scene-layout.ts` (`leafCategory`) and `metadata.ts` (`describeKind`). Audio and video exist nowhere, so the detail pane and the 3D leaf would disagree as soon as the player lands.

**Approach:** Add one pure `src/lib/file-kind.ts` that classifies a file as `image | pdf | audio | video | other`. The existing predicates and `leafCategory` derive from it. Audio and video leaves get their own scene color tokens. No visible behavior changes except audio and video leaves get their own colors.

## Boundaries & Constraints

**Always:**
- `src/lib/` stays React-free, pure, synchronous; tests build `File` fixtures in memory in `src/lib/__tests__/`.
- Precedence: an allowlisted MIME wins; an empty, generic (`application/octet-stream`) or non-allowlisted MIME (including `video/mp2t`, `text/plain`) defers to the extension; no match is `other`. `image/*` stays an allowlisted prefix (current behavior); audio and video MIMEs are exact-match allowlist entries.
- One mapping table (MIME table and extension table) in `file-kind.ts`. Every per-kind lookup is an exhaustive `Record<FileKind, …>`.
- Extensions: `.mp3 .wav .m4a .ogg .oga .flac .aac` are audio; `.mp4 .webm .mov .m4v .ogv` are video (`.webm` and `.ogg` are decided by extension and MIME as listed, never sniffed); `.ts` is `other`.
- New colors are tokens in `tokens.css` (light and dark blocks) and `useSceneTheme`, never literals in components.
- `npm run check` stays green; no `skip`, `only`, `eslint-disable`, `@ts-ignore`, `any`.

**Never:**
- Do not migrate `DetailPane`/`ImagePreview` onto `FileKind` (Story 1.2), build `MediaPlayer` (1.4), or change `Leaf`.
- Do not guess playability in `src/lib/`; runtime `error` events decide that later.
- No commit or push.

## I/O & Edge-Case Matrix

| Scenario | Input | Expected | Error Handling |
|----------|-------|----------|----------------|
| Allowlisted MIME | `a.bin`, `audio/mpeg` | `audio` | N/A |
| Empty MIME | `song.MP3`, `''` | `audio` (case-insensitive) | N/A |
| Generic MIME | `clip.mp4`, `application/octet-stream` | `video` | N/A |
| Ambiguous container | `main.ts`, `video/mp2t` | `other` | N/A |
| Audio-only webm/ogg | `a.webm` / `a.ogg`, `''` | `video` / `audio` | N/A |
| MIME beats extension | `x.txt`, `image/png` | `image` | N/A |
| No extension / dotfile | `README`, `''`; `.png`, `''` | `other` | N/A |
| Zero timestamp | `File([], 'a.pdf', { lastModified: 0 })` | `pdf` | N/A |
| Undefined file (scene) | `leafCategory(undefined)` | `other` | N/A |

</frozen-after-approval>

## Code Map

- `src/lib/image.ts:5-14` -- `isImageFile`/`isPdfFile` own ad-hoc MIME and extension checks; keep the exports, delegate to the classifier. `image.test.ts` must keep passing.
- `src/lib/metadata.ts:3-25,48-62` -- `KIND_BY_EXTENSION` labels, `extensionOf`, `describeKind(name, mime)`. Existing tests pin outputs (`data.bin` + octet-stream → `OCTET-STREAM (application)`). Add labels for new audio and video extensions; derive any generic label from `FileKind`; do not change existing outputs.
- `src/lib/scene-layout.ts:145-153` -- `LeafCategory` and `leafCategory`; make `LeafCategory` an alias of `FileKind`, delegate to the classifier, keep `undefined` → `other`.
- `src/components/scene/Branch.tsx:58` -- inline `{image, pdf, other}` color lookup; replace with an exhaustive `Record<FileKind, Color>`.
- `src/components/scene/useSceneTheme.ts:4-21` -- add `leafAudio`, `leafVideo` color tokens.
- `src/styles/tokens.css:81-84,133-136` -- `--scene-leaf-*` in light and dark blocks.
- `src/lib/__tests__/{image,metadata,scene-layout}.test.ts` -- existing tests to extend, not weaken.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/file-kind.ts` -- create: `FileKind`, `classifyFile({ name, type })`, MIME table, extension table, `extensionOf` (moved here so `metadata.ts` can import it without a cycle) -- single source of truth (AD-5).
- [x] `src/lib/__tests__/file-kind.test.ts` -- create: every matrix row, plus uppercase extensions and an exhaustive-kinds check -- locks the precedence rules.
- [x] `src/lib/image.ts`, `src/lib/metadata.ts` -- delegate to the classifier; `metadata.ts` re-exports `extensionOf` so `metadata.test.ts` keeps working -- no duplicate sniffing.
- [x] `src/lib/scene-layout.ts`, `src/components/scene/Branch.tsx` -- derive from `FileKind`; exhaustive color record -- a missing kind fails typecheck.
- [x] `src/styles/tokens.css`, `src/components/scene/useSceneTheme.ts` -- add audio and video leaf tokens (distinct from image, pdf, other and folder, in both themes) -- no hardcoded colors.
- [x] Extend `scene-layout.test.ts`, `metadata.test.ts` -- audio and video categories and labels.

**Acceptance Criteria:**
- Given any `File`, when classified, then exactly one of `image | pdf | audio | video | other` is returned per the precedence rules above.
- Given `isImageFile`, `isPdfFile`, `leafCategory`, `describeKind`, when called, then each derives from the classifier and no `src/` file outside `file-kind.ts` inspects the extension to pick a kind.
- Given audio and video leaves in the 3D scene, when rendered, then their colors come from the new tokens via `useSceneTheme`.
- Given `npm run check`, when run, then it is green with the previous tests unchanged.

## Implementation Notes

- Implemented directly (no implementation subagent). `npm run check` green: 10 files, 86 tests.
- Files: new `src/lib/file-kind.ts` and its test; `image.ts`, `metadata.ts`, `scene-layout.ts` delegate; `Branch.tsx` uses an exhaustive `Record<FileKind, Color>`; `useSceneTheme.ts` and `tokens.css` (light and dark) gain `leafAudio`/`leafVideo`.
- After review, `describeKind` derives a generic label from the classifier through an exhaustive `Record<FileKind, string | undefined>` (audio and video only); the extension label table stays for specific labels.
- `scene-layout.ts` no longer imports `image.ts`.
- Behavior change: a file named only `.png` is now `other` (dotfile has no extension). A non-allowlisted MIME on a `.pdf` still falls back to the extension, as before.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---|---|---|---|
| `isPdfFile` has no test | medium | patch | Flipping the wrapper to `=== 'other'` kept `check` green. Added an `isPdfFile` block in `image.test.ts`. |
| Leaf color mapping (Branch/useSceneTheme/tokens) untested | low | defer | No 3D component has unit tests in this repo; the exhaustive `Record` catches a missing key at compile time. |
| Label table vs classifier extension table can drift (3 reviewers) | medium | patch | `describeKind` now falls back to a classifier-derived generic label; every new extension label has a test. |
| `describeKind` does not derive from the classifier (AC) | medium | patch | Same patch as above. |
| Spec claims an exhaustive-kinds test that did not exist | low | patch | Added "produces every FileKind". |
| Last task checkbox unticked | low | patch | Ticked. |
| New metadata tests in the wrong `it`; labels untested | low | patch | Moved to a dedicated `it.each` covering all 9 new labels. |
| Re-export of `extensionOf` from `metadata.ts` | false | rejected | The spec chose it so `metadata.test.ts` imports keep working. |
| Missing formats (opus, mkv, avi, ...) | low | rejected | Out of the listed allowlist; the fix is a spec change. |
| MIME parameters or whitespace not normalized | low | rejected | `File.type` from the picker carries no parameters; the guard adds complexity. |
| `audio/webm` MIME vs `.webm` extension split | false | rejected | Chromium reports `.webm` as `video/webm`; `audio/webm` is not produced by the picker. |
| `image/*` prefix accepts unknown subtypes | false | rejected | Pre-existing behavior, kept on purpose. |
| EXIF path still tests `.jpe?g` | false | rejected | It checks the JPEG format, not the file kind. |
| `.png` dotfile flips image to other | low | rejected | Documented in Implementation Notes; the guard adds complexity for an implausible name. |
| `leafColors` rebuilt each render | low | rejected | Five-key object per render, not per frame; `useMemo` adds more than it saves. |
| Maps are not `Record`s | false | rejected | AD-5 requires `Record<FileKind, …>` for per-kind lookups; these map strings to kinds. |
| Redundant tests, color distinguishability, classification-only scope, `LeafCategory` alias | low/false | rejected | Not defects; the story is classification and tokens only. |

## Verification

**Commands:**
- `npm run check` -- expected: typecheck, lint and tests all pass
- `grep -rnE "\.type|endsWith\('\.|extensionOf|IMAGE_EXTENSIONS" src --include=*.ts --include=*.tsx` -- expected: kind decisions only in `file-kind.ts` (`getFileMetadata` may still read `file.type` for display)
