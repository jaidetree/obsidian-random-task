# 04 — Uncheck reset

Status: ready-for-agent

## Parent

`.scratch/random-task-selector/PRD.md`

## What to build

Extend the reconciler so that unchecking a completed task fully resets it. When a
`- [x]` task is changed back to `- [ ]`, strip **both** the start and completed
glyphs (with their datetimes) and any active tag, leaving a plain, unstamped
`- [ ]` line. The task returns to Candidate state — eligible to be drawn again
and never creating a second active task in its checklist. A `[x]` line with no
glyphs simply becomes `[ ]` unchanged apart from the checkbox.

Logic lives in the same pure core (`classifyTransition`, `rewriteLine`) and is
tested at that seam.

## Acceptance criteria

- [ ] Unchecking a completed task removes both the start glyph and the completed
      glyph (and their datetimes).
- [ ] The reset line carries no active tag and no glyphs (it is a plain
      Candidate).
- [ ] Unchecking never produces a second active task in the checklist.
- [ ] A `[x]` line with no glyphs or tag becomes `[ ]` with nothing else changed.
- [ ] Pure-core unit tests cover the full-reset transition (glyphs + tag) and the
      no-glyph case.
- [ ] An E2E test (`wdio-obsidian-service`) unchecks a completed task and asserts
      the note read back has no completed glyph, no start glyph, and no active
      tag.

## Blocked by

- `.scratch/random-task-selector/issues/03-completion-stamping.md`
