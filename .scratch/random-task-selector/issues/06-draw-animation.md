# 06 — Draw selection animation

Status: in-review

## Parent

`.scratch/random-task-selector/PRD.md`

## What to build

Replace the instant selection from slice 05 with the in-editor highlight
animation. Using a CodeMirror line decoration (background highlight + an indent
"bounce"), the highlight hops across the Candidates only — skipping completed
tasks — and decelerates over roughly 2 seconds (fixed, not configurable), landing
on the winner chosen by the uniform `[0, N)` offset expressed as
`fullLoops * N + offset` hops. A checklist with a single candidate gets a brief
flourish instead of a full spin.

The active tag + start glyph are committed to the document exactly once, when the
animation lands (never mid-spin), keeping undo history clean. If the target
Checklist's lines change while the animation is spinning, the draw aborts with no
selection; the abort is scoped to those lines so it ignores the reconciler's own
writes and unrelated check-offs elsewhere in the note. There is no Esc-cancel — a
user who dislikes the result removes the tag and runs the command again.

## Acceptance criteria

- [x] The draw plays an in-editor highlight that hops over candidates only and
      decelerates onto the winner over ~2s.
- [x] A single-candidate checklist shows a brief flourish rather than a full spin.
- [x] The winner is the uniformly-selected candidate; the document is written once,
      on landing.
- [x] Editing the target checklist mid-spin aborts the draw with no selection.
- [x] The abort is not triggered by the reconciler's own writes or by check-offs
      elsewhere in the note.
- [x] Pure selection logic (offset → winner, hop count) remains unit-tested at the
      core seam.
- [x] An E2E test (`wdio-obsidian-service`) runs the command and, after the
      animation completes, asserts exactly one candidate is tagged + stamped in
      the note read back (asserting the committed end state, not animation
      frames).
- [x] An E2E test edits the target checklist during the spin and asserts no task
      is marked active (abort). Animation timing/feel is verified manually.

## Blocked by

- `.scratch/random-task-selector/issues/05-the-draw.md`
