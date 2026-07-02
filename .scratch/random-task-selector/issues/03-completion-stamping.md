# 03 — Completion stamping

Status: ready-for-agent

## Parent

`.scratch/random-task-selector/PRD.md`

## What to build

The always-on, vault-wide completion-stamping behavior, plus the shared
observe-and-reconcile plumbing it establishes (per ADR-0001). Whenever any
`- [ ]` task is checked off — by typing `x` in Source, or clicking the checkbox
in Live Preview or Reading mode — the plugin appends the completed glyph and a
local `YYYY-MM-DDTHH:mm` datetime to that line. If the line carried the active
tag, that tag is stripped at the same time. Detection acts only on the actual
`[ ]`→`[x]` transition (CM6 transaction deltas for editor surfaces; a per-file
content snapshot to diff for Reading-mode clicks), never on a file scan, so
opening or editing old notes never back-stamps historical tasks. A task is
treated as already stamped when the completed glyph is present, so legacy
date-only stamps are left untouched. Writing uses canonical token order and
inserts before any trailing `^blockid`. A re-entrancy guard prevents the
reconciler from reacting to its own writes.

Tested at both seams (per the PRD): the pure core (`classifyTransition`,
`rewriteLine`) with vitest, and end-to-end with `wdio-obsidian-service` driving a
real Obsidian instance across the three edit surfaces.

Resolve the open verification first, now as an E2E test: confirm that a
Reading-mode checkbox click causes the completed glyph to be written (i.e. that
`vault.on('modify')` fires for it). If it does not, that surface needs its own
hook and ADR-0001's observe-only stance for it must be revisited.

## Acceptance criteria

- [ ] Checking off a `- [ ]` task in Source, Live Preview, and Reading mode all
      append `<completed glyph> <local YYYY-MM-DDTHH:mm>`.
- [ ] Checking off a task that carried the active tag also strips that tag.
- [ ] Opening or editing a note with pre-existing completed tasks does not
      stamp them with a new date.
- [ ] A task already bearing a completed glyph (including a legacy date-only
      stamp) is left unchanged.
- [ ] A trailing `^blockid` remains the last token after stamping.
- [ ] The reconciler does not loop on its own writes.
- [ ] Reading-mode `modify` behavior is verified; if it does not fire, the
      handling for that surface is documented and implemented.
- [ ] Pure-core unit tests (vitest) cover `classifyTransition` and `rewriteLine`
      for the cases above.
- [ ] E2E tests (`wdio-obsidian-service`) check off a `- [ ]` task in Source,
      Live Preview, and Reading mode and assert the completed glyph + datetime
      appears in the note read back.
- [ ] An E2E test opens a note with pre-existing completed tasks without editing
      and asserts none are re-stamped.
- [ ] An E2E test checks off an active task and asserts both the completed stamp
      and the removal of the active tag.

## Blocked by

- `.scratch/random-task-selector/issues/02-settings-tag-and-glyphs.md`
