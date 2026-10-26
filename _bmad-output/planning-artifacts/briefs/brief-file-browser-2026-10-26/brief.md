---
title: "Product Brief: file-browser"
status: final
created: 2026-10-26
updated: 2026-10-26
---

# Product Brief: file-browser

## Executive Summary

file-browser is a browser-only explorer for a local folder. You pick a folder, and the app shows its structure as a 3D tree, with metadata for every file: name, size, type, last modified. For images it adds dimensions, EXIF and a preview. Nothing leaves the machine. There is no server, no network, no persistence, and the folder is opened read-only.

It is a single-user tool, built by and for its author, and it is also a graded course project. The grade is on **Claude Code usage and AI engineering**, not on product-market fit. The product has to work and be pleasant to use, but what's being demonstrated is a disciplined, AI-assisted way of building it: written rules, a green check command, specs in EARS format, a review skill, and small briefs that scope each change.

## The Problem

The author wants to see what is in a folder and how it is organized, without installing or uploading anything. Finder and Explorer already do this in 2D, so the practical need is modest. The real driver is the course: a constrained, privacy-preserving app (no network, no writes) is a good testbed for engineering rules that an AI assistant can be held to.

## The Solution

- **Pick** a folder with the File System Access API (`showDirectoryPicker`, read mode).
- **Browse** it as a tree, in two interchangeable views: a keyboard-accessible list (`tree`/`treeitem`) and a 3D scene. The 3D view is lazy-loaded and falls back to the list if WebGL is missing or the scene fails.
- **Inspect** files in a detail pane: metadata for all files, plus dimensions, EXIF and preview for images, and PDF rendering.
- **Filter** files by name, using a 3D sign fixed on the right of the screen.
- **In progress:** one tree per sub-folder of the chosen folder (`prompts/level-4/brief.md`), and an audio/video mini-player (`prompts/level-4/ears.md`, branch `feat/audio-video-preview`).

## What Makes This Different

There is no market moat, and the brief does not claim one. Two things set it apart:

- **Privacy by construction.** Zero network calls, zero storage, zero writes. These are enforced by lint rules and project rules, not just promised.
- **A process showcase.** The repo is the evidence for the grade: `CLAUDE.md` rules, `src/lib/` kept free of React (enforced by ESLint), a `review` skill, EARS specs, and `npm run check` (typecheck, lint, tests) staying green.

## Who This Serves

- **Primary:** the author, on their own machine, in Chromium.
- **Secondary:** the course grader, who reads the repo and the way it was built.

The app is not for other end users. Firefox and Safari lack the File System Access API, so they get an explicit "unsupported" message.

## Success Criteria

- `npm run check` is green on the final branch.
- Each behavior change has a test. There is no numeric coverage target.
- Picking a real folder shows its tree in both the list and the 3D view. Image preview, PDF rendering and the filter work. Audio and video play in the mini-player once that feature lands.
- No rule in `CLAUDE.md` is violated: no network, no persistence, no writes, no hardcoded design values outside `tokens.css`.
- The grader can follow the process from the repo: briefs, EARS specs, the review skill, and commit history.

## Scope

**In (v1):** folder picker, list tree, 3D tree, name filter, metadata, image preview with EXIF, PDF rendering, multi-folder trees, audio/video mini-player.

**Out:** writing, renaming or deleting files; any server, sync or network feature; persistence of any kind; non-Chromium support (for now); previews for other file types such as text, until the open question on previews is settled.

## Open Questions

- **Browser support:** is the "unsupported" message enough for Firefox and Safari, or should a read-only `<input webkitdirectory>` fallback be added?
- **Scale:** how does the 3D layout behave with tens of thousands of files? Does it need a cap or virtualization?
- **Previews:** which file types besides images, PDFs, audio and video deserve one?
- **3D value `[ASSUMPTION]`:** what does the 3D view give over a flat tree? The working answer is "it is the course's challenge, and it makes the structure easier to see at a glance." The author should confirm or replace this.

## Vision

There is no commercial vision. If the project goes further, it becomes a small, trustworthy reference for building local-first browser tools with an AI assistant under explicit rules.
