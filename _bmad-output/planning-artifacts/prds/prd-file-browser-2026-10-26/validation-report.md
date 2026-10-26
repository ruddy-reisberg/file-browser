# Validation Report — PRD: file-browser

- **PRD:** `_bmad-output/planning-artifacts/prds/prd-file-browser-2026-10-26/prd.md`
- **Rubric:** `.claude/skills/bmad-prd/assets/prd-validation-checklist.md`
- **Run at:** 2026-10-26T15:30:44+02:00
- **Grade:** Fair

## Overall verdict
The PRD is coherent and honest for a hobby/course project. It is correctly shaped (one journey, glossary, non-goals, tagged assumptions), the vision states what the product is, and the privacy rules are concrete and enforceable.
Its weakest part is done-ness in the newest feature. FR-9 to FR-11 copy the EARS wording verbatim, so “compatible”, “no longer available” and “if the media supports these controls” are still undefined. An engineer or a grader cannot tell from the PRD alone when those FRs are done. The process-showcase thesis, which is what is actually graded, also lives only in SM-4 and §7 rather than shaping the features.

## Dimension verdicts
- Decision-readiness — adequate
- Substance over theater — strong
- Strategic coherence — adequate
- Done-ness clarity — thin
- Scope honesty — adequate
- Downstream usability — adequate
- Shape fit — strong

## Findings by severity

### Critical (0)
### High (1)
**[Done-ness clarity]** — FR-9 “compatible” undefined; trigger conflicts with UJ-1 (§4.4 FR-9)
FR-9 fires “WHEN a folder contains compatible audio or video files”, but UJ-1 shows the player appearing on selecting a file. No list of supported formats and no consequences are given, so “done” cannot be tested.
Fix: Define compatible as what the browser reports through canPlayType, name the target formats (e.g. mp3, wav, mp4, webm), and state consequences: selecting a playable file shows the player; an unplayable file shows metadata only.

### Medium (5)
**[Strategic coherence]** — Thesis not tied to features; SM-2/SM-4 not verifiable (§1, §8 SM-2, SM-4)
“The grader can follow the process” and “each selection shows its preview” have no pass condition, so they cannot be marked met or unmet.
Fix: Add a one-sentence thesis to §1 and a pass condition per SM (e.g. SM-4: README lists brief, EARS file, review skill; SM-2: manual checklist run against a fixture folder).

**[Done-ness clarity]** — FR-11 “no longer available” is undefined (§4.4 FR-11)
Nothing says how unavailability is detected (file handle read failure vs media error event) or what the message must contain.
Fix: Define both triggers and require a message that names the file and the cause class.

**[Done-ness clarity]** — FR-10 control set is conditional with no condition (§4.4 FR-10)
“IF the selected media supports these controls” is circular for audio/video that always can play, pause, seek and set volume.
Fix: State controls always shown, and when duration is unknown (e.g. Infinity) show it as unavailable.

**[Done-ness clarity]** — FR-3, FR-5, FR-8 lack bounds (§4.2, §4.3)
FR-3 has no key bindings, FR-5 no match semantics (case, substring), FR-8 no consequences (corrupt PDF, page navigation).
Fix: Add two or three consequences each, e.g. arrow keys move, Enter selects; filter is case-insensitive substring; a corrupt PDF shows an error.

**[Done-ness clarity]** — No performance bound for the 3D view (§7, §9 question 2)
Open question 2 leaves large trees unbounded, so a hang on a big folder is not a defect by the PRD's own terms.
Fix: Add a provisional bound tagged [ASSUMPTION] (e.g. interactive with 5,000 files) or state explicitly that none is promised.

### Low (3)
**[Decision-readiness]** — Open questions have no owner or trigger (§9)
Questions 1–3 state no condition for being resolved; §2.2 and §6.2 already lean toward “no fallback”.
Fix: Add one line per question: owner (author) and revisit condition (e.g. after testing a 10k-file folder).

**[Downstream usability]** — Glossary drift (§3, FR-5, FR-9)
“node” and “sign” are undefined; FR-9 uses “a folder”.
Fix: Add Node and Filter sign to the glossary and use Chosen folder in FR-9.

**[Downstream usability]** — Journey coverage is uneven (§2.3)
UJ-1 never exercises keyboard navigation (FR-3) or the error path (FR-11), yet all FRs cite it.
Fix: Cite UJ-1 only where it applies; add a short edge case for an unplayable file.

## Mechanical notes
- IDs: FR-1 to FR-11, SM-1 to SM-4 and SM-C1, UJ-1 are contiguous and unique.
- Assumptions index round-trips: four inline [ASSUMPTION] tags (§3, §4.1, FR-2, §9.4), four index entries.
- SM-3 and SM-4 validate §7 rather than FR IDs; acceptable but not traceable to a single FR.
- §6.2 text and other previews duplicates §9 question 3.

## Reviewer files
- `review-rubric.md`
