# 05 — The Draw (no animation yet)

Status: ready-for-agent

## Parent

`.scratch/random-task-selector/PRD.md`

## What to build

A command that randomly selects one task from the checklist the cursor is on and
marks it active — **instantly**, without the animation (that ships in slice 06).

The command finds the target Checklist (a maximal run of `- [ ]` items at the
cursor line's indentation, bounded by any non-task / blank / differently-indented
line), filters to Candidates (unchecked, no active tag), and picks a winner by
drawing a landing offset uniformly in `[0, N)`. Do not compute a winner via
`hops % N` from an arbitrary range — that biases toward low indices. The winner
is marked active: the configured active tag and the start glyph + local
`YYYY-MM-DDTHH:mm` are appended in canonical order, before any trailing
`^blockid`.

The command makes no edit and shows a transient `Notice` when: the cursor is not
on a task line, the Checklist already has an active task, or the Checklist has no
Candidates.

Tested at both seams (per the PRD): the pure core (`findChecklist`,
`candidatesIn`, `selectWinner`, `rewriteLine`) with vitest, and end-to-end with
`wdio-obsidian-service` running the command against a real vault fixture.
`rewriteLine` is shared with the completion slices. The command must have a
stable command id so E2E can invoke it via
`browser.executeObsidianCommand("<plugin-id>:<command-id>")`.

## Acceptance criteria

- [ ] Running the command on a checklist with candidates marks exactly one random
      unchecked task active (active tag + start glyph + datetime), before any
      trailing `^blockid`.
- [ ] Selection considers only the checklist at the cursor and only its unchecked,
      untagged candidates.
- [ ] Winner distribution is uniform over candidates (offset in `[0, N)`, no
      low-index bias); the single-candidate case selects that candidate.
- [ ] The command refuses with a Notice when the cursor is not on a task line.
- [ ] The command refuses with a Notice when the checklist already has an active
      task.
- [ ] The command refuses with a Notice when there are no candidates.
- [ ] Pure-core unit tests cover boundary detection, candidate filtering, uniform
      selection, and the line rewrite (including block-ref preservation).
- [ ] An E2E test (`wdio-obsidian-service`) places the cursor in a checklist,
      runs the command, and asserts exactly one candidate in the note read back
      is now tagged + stamped.
- [ ] An E2E test asserts the command makes no edit when the checklist already
      has an active task and when it has no candidates.

## Blocked by

- `.scratch/random-task-selector/issues/02-settings-tag-and-glyphs.md`
