# 03 — Completion stamping

Status: done

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
`rewriteLine`) with vitest, and end-to-end with `wdio-obsidian-service` driving
a real Obsidian instance across the three edit surfaces.

Resolve the open verification first, now as an E2E test: confirm that a
Reading-mode checkbox click causes the completed glyph to be written (i.e. that
`vault.on('modify')` fires for it). If it does not, that surface needs its own
hook and ADR-0001's observe-only stance for it must be revisited.

## Scope amendment (2026-07-03)

**Live Preview and Reading mode are the required surfaces.** Source mode is
best-effort: it stamps only when the toggle is a single `[ ]`→`[x]` transaction
(e.g. selecting/overtyping the space). A hand-typed check-off that passes
through the transient empty-bracket state (`- [ ]` → delete space → `- []` →
type `x`) is not detected, because `- []` is not a task line and there is no
direct `[ ]`→`[x]` transition. This matches the Tasks plugin, which does not
stamp in Source mode at all, and is accepted rather than broadening task
recognition to the malformed intermediate.

## Follow-up fix (2026-07-03, post-done)

A latent bug in this slice's reconciler surfaced during slice-05 E2E work: the
`vault.on('modify')` observer fired on **any** write to a file not open in a
Source editor — including background writes to a *closed* note. Diffing such a
write against a stale snapshot from a prior editing session could mis-read an
unrelated content change as an `[x]`→`[ ]` uncheck and reset the line (tag +
glyphs stripped) the moment it was written. Fixed by scoping the observer to
files open in a Reading-mode view (the only surface where a checkbox click is
possible), matching US19. Regression test added to `stamping.e2e.ts`.

## Acceptance criteria

- [x] Checking off a `- [ ]` task in Source, Live Preview, and Reading mode all
      append `<completed glyph> <local YYYY-MM-DDTHH:mm>`.
- [x] Checking off a task that carried the active tag also strips that tag.
- [x] Opening or editing a note with pre-existing completed tasks does not stamp
      them with a new date.
- [x] A task already bearing a completed glyph (including a legacy date-only
      stamp) is left unchanged.
- [x] A trailing `^blockid` remains the last token after stamping.
- [x] The reconciler does not loop on its own writes.
- [x] Reading-mode `modify` behavior is verified; if it does not fire, the
      handling for that surface is documented and implemented.
- [x] Pure-core unit tests (vitest) cover `classifyTransition` and `rewriteLine`
      for the cases above.
- [x] E2E tests (`wdio-obsidian-service`) check off a `- [ ]` task in Source,
      Live Preview, and Reading mode and assert the completed glyph + datetime
      appears in the note read back.
- [x] An E2E test opens a note with pre-existing completed tasks without editing
      and asserts none are re-stamped.
- [x] An E2E test checks off an active task and asserts both the completed stamp
      and the removal of the active tag.

## Blocked by

- `.scratch/random-task-selector/issues/02-settings-tag-and-glyphs.md`
