# 04 — Uncheck reactivation

Status: ready-for-agent

## Parent

`.scratch/random-task-selector/PRD.md`

## What to build

Extend the reconciler so that unchecking a completed task means "I'm working on
this again." When a `- [x]` task that carries a start glyph is changed back to
`- [ ]`, strip the completed glyph and refresh the start glyph to the current
local `YYYY-MM-DDTHH:mm`, adding **no** active tag. The task returns to Candidate
state — eligible to be drawn again and never creating a second active task in its
checklist. A `[x]` line with no start glyph simply becomes `[ ]` with nothing
stamped.

Logic lives in the same pure core (`classifyTransition`, `rewriteLine`) and is
tested at that seam.

## Acceptance criteria

- [ ] Unchecking a completed task with a start glyph removes the completed glyph
      and updates the start glyph datetime to now.
- [ ] The reactivated line carries no active tag (it is a Candidate).
- [ ] Unchecking never produces a second active task in the checklist.
- [ ] A `[x]` line without a start glyph becomes `[ ]` with no stamping.
- [ ] Pure-core unit tests cover the reactivation transition and the
      no-start-glyph case.
- [ ] An E2E test (`wdio-obsidian-service`) unchecks a completed task and asserts
      the note read back has no completed glyph, a refreshed start glyph, and no
      active tag.

## Blocked by

- `.scratch/random-task-selector/issues/03-completion-stamping.md`
