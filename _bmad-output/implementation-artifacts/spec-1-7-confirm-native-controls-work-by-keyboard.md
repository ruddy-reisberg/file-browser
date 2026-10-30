---
title: 'Story 1.7: Confirm native controls work by keyboard'
type: 'chore'
created: '2026-10-29'
status: 'done'
baseline_commit: '3c20c2808fb3cc66d059342ebce4aff075dc03a9'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-6-play-media-from-the-3d-leaf.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** FR10 requires every media control to be keyboard-operable, but AD-7 only assumes the native `<audio>`/`<video>` controls allow it. Nothing has been checked in a real browser, and `Leaf`'s Tab trap may cut Tab short inside the controls.

**Approach:** Run a fixed keyboard protocol by hand in current Chrome and Edge, in the list view and in the 3D Leaf, and record the result per browser and view in this spec. Update the AD-7 assumption either way. If any control fails, end the story with a follow-up story for custom controls under AD-7.

## Boundaries & Constraints

**Always:**
- The check is manual: the folder picker is a native dialog and Edge is not reachable by the agent's tools, so only the author can run it. Use a folder holding one `.mp3` and one `.mp4` that play in the browser.
- Keyboard only, no mouse after the folder is picked. Record browser name and version, view, file type, and pass or fail per control: play/pause, seek, volume.
- The record goes in `## Implementation Notes` of this spec.
- Update `ARCHITECTURE-SPINE.md` AD-7: replace "`[ASSUMPTION]` until checked" with the recorded result (confirmed, or failed and replaced). Update the matching line in the PRD assumptions index if it lists the assumption.

**Never:**
- No code change unless a control fails; no custom controls built in this story, only the follow-up story is written.
- No new test: jsdom cannot show native control behavior.
- No commit or push.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| List view, audio and video | Tab to the player; Space or Enter on a control | Play/pause toggles; seek and volume change by arrow keys | Any miss recorded as fail |
| 3D Leaf, audio and video | Open the file from the Leaf list; Tab inside the Leaf | Close, then every player control reachable, focus never leaves the Leaf | Any miss recorded as fail |
| Leaf close | Escape while playing | Sound stops at once; Leaf folds; focus returns to the opener | Fail if sound continues |
| Tab trap | Tab past the last control, Shift+Tab before the first | Focus wraps inside the Leaf; inner controls not skipped | Fail if inner controls are unreachable |
| Any failure | A control cannot be operated by keyboard | Result recorded; follow-up story for custom controls written | N/A |

## Decisions

- Keyboard results (author, Chrome and Edge, list view and Leaf, mp3 and mp4): **all pass** (play/pause, seek, volume, Escape-stops-sound, Tab-wrap). AD-7 is confirmed; no code change and no follow-up story. The author reported the outcome as a single "all pass" without per-row versions; record it that way.

</frozen-after-approval>

## Code Map

- `src/components/MediaPlayer.tsx` -- the native `<audio>`/`<video>` element with `controls`; no keyboard code of its own.
- `src/components/scene/Leaf.tsx:14,42-62` -- `FOCUSABLE` selector and Tab wrap; the likely failure point when the media element is the last focusable element.
- `_bmad-output/planning-artifacts/architecture/architecture-file-browser-2026-10-26/ARCHITECTURE-SPINE.md:88` -- the AD-7 sentence carrying the `[ASSUMPTION]` to update.
- `_bmad-output/planning-artifacts/prds/prd-file-browser-2026-10-26/prd.md:182` -- assumptions index; update the line if it lists this assumption.
- `_bmad-output/planning-artifacts/epics.md` -- target for a follow-up custom-controls story if a control fails.

## Tasks & Acceptance

**Execution:**
- [x] Author runs the protocol in Chrome and Edge, list view then Leaf, for an mp3 and an mp4 -- FR10, AR8, NFR7.
- [x] `## Implementation Notes` -- record the results table -- evidence for FR10.
- [x] `ARCHITECTURE-SPINE.md` AD-7 (and PRD assumptions index if listed) -- replace the assumption with the result -- keep the spec truthful.
- [x] `epics.md` -- not needed: no control failed.

**Acceptance Criteria:**
- Given the player in the list view and in the 3D Leaf in current Chrome and Edge, when play/pause, seek and volume are operated by keyboard only, then the result per browser is recorded.
- Given any control fails, when the result is recorded, then a follow-up custom-controls story exists and AD-7 is updated.

## Implementation Notes

Manual keyboard protocol run by the author, 2026-10-30. The author reported a single outcome for the whole matrix, without per-row browser versions.

| Browser | View | File | Play/pause | Seek | Volume | Escape stops sound | Tab wrap |
|---------|------|------|-----------|------|--------|--------------------|----------|
| Chrome | List | mp3, mp4 | pass | pass | pass | n/a | n/a |
| Chrome | Leaf | mp3, mp4 | pass | pass | pass | pass | pass |
| Edge | List | mp3, mp4 | pass | pass | pass | n/a | n/a |
| Edge | Leaf | mp3, mp4 | pass | pass | pass | pass | pass |

Result: all pass. AD-7 in `ARCHITECTURE-SPINE.md` now records the check instead of the `[ASSUMPTION]`. The PRD assumptions index (§9) does not list this assumption, so it is unchanged. No code change, no follow-up story.

## Spec Change Log

## Review Triage Log

No reviewer subagents were run: the diff is documentation only (one AD-7 sentence, spec notes, sprint status) and no code changed. Self-review found nothing to triage; `npm run check` is green (148 tests).

## Design Notes

Native controls in Chrome and Edge normally support Space or K for play/pause, Left and Right for seek, Up and Down for volume, M for mute, once the media element or one of its inner buttons has focus. Tab moves through the inner buttons while `document.activeElement` stays on the media element, which is why the `Leaf` wrap may skip them. Treat a skipped control as a fail.

## Verification

**Manual checks (protocol):**
1. `npm run dev`, open in the browser, pick the folder, then use the keyboard only.
2. List view: Tab to the tree, select the mp3 with Enter; Tab to the player. Space plays, Space pauses; Left and Right seek; Up and Down change volume. Repeat with the mp4.
3. 3D view: Tab to a tree's "Climb" button, Enter, Tab to "Read <file>", Enter. The Leaf opens on Close. Tab through the player and repeat step 2; Shift+Tab back; Tab past the last control and check the wrap.
4. While playing in the Leaf, press Escape: the sound must stop at once and focus must return to the opener.
