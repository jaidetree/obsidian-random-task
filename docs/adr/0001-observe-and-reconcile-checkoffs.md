# Detect task check-off by observing file changes, not intercepting clicks

## Status

accepted

## Context

When any task is checked off, the plugin appends a completed-at glyph + datetime
(absorbing the Tasks plugin's done-date behavior) and, if the line was Active,
strips the `#in-progress` tag. A check-off can originate from three different
Obsidian surfaces: typing `x` in Source mode, clicking the checkbox in Live
Preview, and clicking the checkbox in Reading mode.

## Decision

Detect check-offs by **observing and reconciling** file changes: listen to
`vault.on('modify')` / editor changes, diff the affected line(s), and when a
line has just become `- [x]` without a completed glyph, append one (and strip
the Active tag if present). A re-entrancy guard prevents the plugin from
reacting to its own writes.

We do **not** intercept checkbox clicks per surface.

## Considered options

- **Intercept the toggle per surface** — a Reading-mode markdown post-processor
  with DOM→source-line mapping, plus a CM6 extension for Live Preview. Rejected:
  it is strictly more code, touches semi-internal APIs, and **cannot** catch a
  hand-typed `x` in Source mode — so it would need the observe path underneath
  it anyway.

## Consequences

- One code path handles every edit surface uniformly.
- Stamping is a *second* write reacting to the user's write; a re-entrancy guard
  (and light debounce) is required so the plugin doesn't loop on its own edits.
  The Draw's own write (add `#in-progress` + start glyph to an unchecked line)
  is inert to the reconciler — it matches neither the checked-without-glyph nor
  the unchecked-with-glyph transition — but the guard must still cover it.
- The brief double-write is imperceptible for a single-line append.
- **Must detect the actual `[ ]`→`[x]` transition, not a file scan.** A naive
  "line is `[x]` and has no completed glyph → stamp it" rule would stamp every
  *historical* completed task with today's datetime the first time an old note
  is touched or loaded, corrupting the completion-time data. Detection therefore
  needs prior state: CM6 transaction deltas (`update.changes`) for editor
  surfaces, and a per-file content snapshot to diff for reading-mode clicks
  (which persist to the file and fire `modify`). "Already stamped?" is a
  glyph-presence check so legacy date-only stamps are recognized.
- **Coverage caveat to verify:** confirm that a reading-mode checkbox click
  actually fires `vault.on('modify')`. If it does not, observe-only has a hole
  exactly where interception was dropped, and that surface needs its own hook.
- The Draw's abort-on-mid-spin-edit must be scoped to the *target checklist's*
  lines, so it does not trip on the reconciler's own writes or on an unrelated
  check-off elsewhere in the same note.
