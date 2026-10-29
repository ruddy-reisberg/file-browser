- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-one-classifier-decides-what-kind-of-file-it-is.md`
  summary: Nothing tests that audio and video leaves map to `--scene-leaf-audio` / `--scene-leaf-video`.
  evidence: Swapping the two tokens in `Branch.tsx` or `useSceneTheme.ts`, or deleting one from `tokens.css`, keeps `npm run check` green; no 3D component has unit tests. Settle by extracting the kind-to-token mapping into a pure helper and testing it.
