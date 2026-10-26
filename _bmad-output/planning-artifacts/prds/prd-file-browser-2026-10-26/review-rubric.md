# PRD Quality Review — PRD: file-browser

## Overall verdict
The PRD is coherent and honest for a hobby/course project. It is correctly shaped (one journey, glossary, non-goals, tagged assumptions), the vision states what the product is, and the privacy rules are concrete and enforceable. Its weakest part is done-ness in the newest feature. FR-9 to FR-11 copy the EARS wording verbatim, so “compatible”, “no longer available” and “if the media supports these controls” are still undefined. An engineer or a grader cannot tell from the PRD alone when those FRs are done. The process-showcase thesis, which is what is actually graded, also lives only in SM-4 and §7 rather than shaping the features.

## Decision-readiness — adequate
Decisions are stated as decisions (read-only picker, no fallback in v1, Chromium only), and the 3D rationale is flagged as an unconfirmed assumption rather than smoothed over. The four open questions are genuinely open. They carry no owner or revisit trigger in the PRD itself (those were logged only in the memlog), and §2.2 (non-users: Firefox/Safari) quietly pre-answers open question 1.

### Findings
- **[low]** Open questions have no owner or trigger (§9) — Questions 1–3 state no condition for being resolved; §2.2 and §6.2 already lean toward “no fallback”. *Fix:* Add one line per question: owner (author) and revisit condition (e.g. after testing a 10k-file folder).

## Substance over theater — strong
No persona theater (one journey), no innovation section, no invented differentiation. §7 names real mechanisms (no allocation or setState per frame, src/lib has no React). The vision is specific to this product.

## Strategic coherence — adequate
The real thesis is “a privacy-by-construction app that evidences a disciplined AI-assisted process”. It appears in the brief but in the PRD only through §7 and SM-4; the Vision states the goal but the feature list reads as a backlog. Counter-metric SM-C1 is a good touch. SM-2 and SM-4 have no verification method.

### Findings
- **[medium]** Thesis not tied to features; SM-2/SM-4 not verifiable (§1, §8 SM-2, SM-4) — “The grader can follow the process” and “each selection shows its preview” have no pass condition, so they cannot be marked met or unmet. *Fix:* Add a one-sentence thesis to §1 and a pass condition per SM (e.g. SM-4: README lists brief, EARS file, review skill; SM-2: manual checklist run against a fixture folder).

## Done-ness clarity — thin
FR-1, FR-2, FR-4 and FR-7 carry testable consequences. The audio/video FRs, which are the newest scope, do not. FR-9 keeps EARS wording where the key terms are undefined, FR-10 conditions its controls on the media supporting them without saying when it doesn't, and FR-11 does not define “no longer available”. FR-3, FR-5 and FR-8 are also light. There is no performance bound for the 3D view.

### Findings
- **[high]** FR-9 “compatible” undefined; trigger conflicts with UJ-1 (§4.4 FR-9) — FR-9 fires “WHEN a folder contains compatible audio or video files”, but UJ-1 shows the player appearing on selecting a file. No list of supported formats and no consequences are given, so “done” cannot be tested. *Fix:* Define compatible as what the browser reports through canPlayType, name the target formats (e.g. mp3, wav, mp4, webm), and state consequences: selecting a playable file shows the player; an unplayable file shows metadata only.
- **[medium]** FR-11 “no longer available” is undefined (§4.4 FR-11) — Nothing says how unavailability is detected (file handle read failure vs media error event) or what the message must contain. *Fix:* Define both triggers and require a message that names the file and the cause class.
- **[medium]** FR-10 control set is conditional with no condition (§4.4 FR-10) — “IF the selected media supports these controls” is circular for audio/video that always can play, pause, seek and set volume. *Fix:* State controls always shown, and when duration is unknown (e.g. Infinity) show it as unavailable.
- **[medium]** FR-3, FR-5, FR-8 lack bounds (§4.2, §4.3) — FR-3 has no key bindings, FR-5 no match semantics (case, substring), FR-8 no consequences (corrupt PDF, page navigation). *Fix:* Add two or three consequences each, e.g. arrow keys move, Enter selects; filter is case-insensitive substring; a corrupt PDF shows an error.
- **[medium]** No performance bound for the 3D view (§7, §9 question 2) — Open question 2 leaves large trees unbounded, so a hang on a big folder is not a defect by the PRD's own terms. *Fix:* Add a provisional bound tagged [ASSUMPTION] (e.g. interactive with 5,000 files) or state explicitly that none is promised.

## Scope honesty — adequate
Non-goals and §6.2 are explicit, assumptions are tagged inline and indexed. Open-items density (4 questions, 4 assumptions) is fine for a hobby PRD. One gap: §6.2 lists text and other previews as deferred while open question 3 is the same item under another name.

## Downstream usability — adequate
IDs are contiguous and the glossary exists. Terms drift slightly: FR-9 says “a folder” where the glossary says “chosen folder”, “node” and “sign” are used but not defined, and “tree” and “folder tree” are used interchangeably. Every FR says “Realizes UJ-1”, which carries little information, and UJ-1 has an unnamed protagonist (“the author”).

### Findings
- **[low]** Glossary drift (§3, FR-5, FR-9) — “node” and “sign” are undefined; FR-9 uses “a folder”. *Fix:* Add Node and Filter sign to the glossary and use Chosen folder in FR-9.
- **[low]** Journey coverage is uneven (§2.3) — UJ-1 never exercises keyboard navigation (FR-3) or the error path (FR-11), yet all FRs cite it. *Fix:* Cite UJ-1 only where it applies; add a short edge case for an unplayable file.

## Shape fit — strong
Single operator, hobby stakes, about two and a half pages: one journey, light metrics, no persona or compliance sections. The shape matches the product.

## Mechanical notes
- IDs: FR-1 to FR-11, SM-1 to SM-4 and SM-C1, UJ-1 are contiguous and unique.
- Assumptions index round-trips: four inline [ASSUMPTION] tags (§3, §4.1, FR-2, §9.4), four index entries.
- SM-3 and SM-4 validate §7 rather than FR IDs; acceptable but not traceable to a single FR.
- §6.2 text and other previews duplicates §9 question 3.
