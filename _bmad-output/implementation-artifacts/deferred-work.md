- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-one-classifier-decides-what-kind-of-file-it-is.md`
  summary: Nothing tests that audio and video leaves map to `--scene-leaf-audio` / `--scene-leaf-video`.
  evidence: Swapping the two tokens in `Branch.tsx` or `useSceneTheme.ts`, or deleting one from `tokens.css`, keeps `npm run check` green; no 3D component has unit tests. Settle by extracting the kind-to-token mapping into a pure helper and testing it.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-each-preview-manages-its-own-loading-and-errors.md`
  summary: A PDF that fails to render is swallowed silently, and a superseded render keeps running until it finishes.
  evidence: `PdfPreview.tsx` ends its promise chain with `() => {}` and has no abort; both were moved verbatim from `ImagePreview`. Story 2.1 fixes the message and the destroy-in-all-outcomes behavior.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-play-an-audio-or-video-file-in-the-detail-pane.md`
  summary: `MediaPlayer` shows no message when the browser cannot decode a file, and has no error test.
  evidence: The element fires `error` and nothing handles it, so the user sees a dead native player. Story 1.5 owns the explicit message and the hand-fired `error` test.
