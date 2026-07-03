# PRD: Random Task Selector

Status: ready-for-agent

## Problem Statement

I keep a note with lists of checkbox tasks and I want to stop agonizing over
which one to do next. I want the plugin to pick one for me — with a bit of fun —
and then help me track when I started it and when I finished, so that over time I
build up a record of how long tasks actually take.

## Solution

An Obsidian plugin with two behaviors that share the same inline-editing
plumbing:

1. **The Draw** — a command that randomly picks one unchecked task from the
   checklist my cursor is on, playing a short in-editor highlight animation that
   hops between the eligible tasks and settles on a winner. The winner is marked
   as the one active task and stamped with the datetime it was selected.
2. **Completion stamping** — an always-on behavior that, whenever I check off any
   `- [ ]` task anywhere in the vault, records the completion datetime inline
   (replacing my current use of the Tasks plugin for this).

Together these let me get a task chosen for me, know it's the one I'm working on,
and end up with `selected-at` / `completed-at` datetimes on each task for later
analysis.

See `CONTEXT.md` for the canonical glossary (Checklist, Task state, Candidate,
Active, Draw, Completion stamping, Timestamps) and `docs/adr/` for the two
architectural decisions this PRD builds on.

## User Stories

1. As a note-taker, I want a command that randomly selects a task from the
   checklist my cursor is on, so that I don't have to decide what to do next.
2. As a note-taker, I want the selection to only consider the checklist under my
   cursor, so that unrelated lists elsewhere in the note are untouched.
3. As a note-taker, I want a checklist to be understood as a contiguous run of
   `- [ ]` items at the same indentation, so that nested sub-tasks and lists
   separated by blank lines or prose are treated as distinct.
4. As a note-taker, I want only unchecked tasks to be eligible to win, so that
   already-completed tasks are never re-selected.
5. As a note-taker, I want a short highlight animation that hops between the
   eligible tasks and decelerates onto one, so that the selection feels fun and
   authentic rather than instantaneous.
6. As a note-taker, I want the animation to only highlight candidates (skipping
   completed tasks), so that the eligible set is visually obvious.
7. As a note-taker, I want every candidate to have an equal chance of winning, so
   that the draw is fair.
8. As a note-taker, when a checklist has exactly one candidate, I want a brief
   highlight flourish on it before it is marked, so that I still get feedback.
9. As a note-taker, I want the winning task marked as active with a configurable
   tag (default `#in-progress`), so that I can see which task is in play.
10. As a note-taker, I want the moment of selection recorded on the winning task
    with a start glyph and datetime, so that I know when I began.
11. As a note-taker, I want the draw to refuse if the checklist already has an
    active task, so that I focus on one task at a time.
12. As a note-taker, I want a clear notice when the draw refuses because the
    checklist already has an active task, so that I understand why nothing
    happened.
13. As a note-taker, I want the draw to refuse with a notice when my cursor is
    not on a task line, so that I know I need to place my cursor on a checklist.
14. As a note-taker, I want the draw to refuse with a notice when the checklist
    has no candidates left, so that I know the list is exhausted.
15. As a note-taker, I want to clear an active task simply by removing its tag,
    so that I can redo a draw without a special command.
16. As a note-taker, I want the plugin to record the completion datetime whenever
    I check off any `- [ ]` task, so that I stop relying on the Tasks plugin.
17. As a note-taker, I want completion stamping to work no matter how I check the
    box — typing `x` in source, or clicking it in Live Preview or Reading mode —
    so that it never silently misses a completion.
18. As a note-taker, I want checking off the active task to also strip its
    `#in-progress` tag, so that a completed task is no longer shown as in play.
19. As a note-taker, I want completion stamping to only fire on the actual moment
    I check a box, so that opening or editing an old note never back-stamps my
    historical tasks with today's date.
20. As a note-taker, I want tasks that already carry a completed glyph (including
    my legacy date-only stamps) to be left untouched, so that nothing is
    double-stamped.
21. As a note-taker, I want unchecking a completed task to fully reset it: both
    the start and completed glyphs are removed, so that the line returns to a
    clean, unstamped task.
22. As a note-taker, I want an unchecked task to become a plain candidate — no
    `#in-progress` tag and no glyphs — so that it can be drawn again fresh and
    never silently creates a second active task in the list.
23. As a note-taker, I want the start and completed glyphs written before any
    trailing block reference (`^blockid`), so that my block references keep
    working.
24. As a note-taker, I want the active tag and both glyphs appended after my
    existing description and tags in a consistent order, so that lines stay
    predictable and parseable.
25. As a note-taker, I want timestamps written as local `YYYY-MM-DDTHH:mm`, so
    that I capture time-of-day for later duration analysis.
26. As a plugin user, I want to configure the active tag, the start glyph, and
    the completed glyph in settings (in that order), so that I can match my own
    conventions.
27. As a plugin user, I want the glyph settings to use an emoji picker, so that I
    can only pick glyphs that render inline in my notes.
28. As a note-taker, I want the draw to abort if I edit the target checklist
    while the animation is spinning, so that a stamp is never written to the
    wrong line.
29. As a note-taker, I want the active tag and glyphs committed to the document
    only once, when the animation lands, so that my undo history stays clean.
30. As a note-taker who dislikes a result, I want to remove the tag and run the
    command again, so that I can re-roll without a dedicated cancel affordance.

## Implementation Decisions

**Two features, shared plumbing.** The Draw (command-triggered, cursor-scoped)
and Completion stamping (always-on, vault-wide) are distinct behaviors sharing
the Timestamps format and the change-reconciliation machinery. Completion
stamping is core — there is no setting to disable it.

**Pure core + thin adapter (ADR-0002).** All domain logic is pure string-in /
string-out functions; everything Obsidian-specific is a thin adapter. The core
exposes at least:

- `findChecklist(lines, cursorLine)` → the line range of the target Checklist
  (a maximal run of `- [ ]` items at the cursor line's indentation, bounded by
  any non-task / blank / differently-indented line).
- `candidatesIn(checklistLines)` → the eligible Candidate indices (unchecked,
  no active tag).
- `selectWinner(candidateCount, offset)` → winning index, where `offset` is
  drawn uniformly in `[0, N)`; the animation expresses hops as
  `fullLoops * N + offset`. (Do **not** compute hops from an arbitrary range and
  take `hops % N` — that biases toward low indices.)
- `rewriteLine(line, ops)` → a line with the active tag / start glyph / completed
  glyph added or stripped, in canonical order and inserted **before** any
  trailing `^blockid`.
- `classifyTransition(prevLine, nextLine, settings)` → the Edit (if any) implied
  by a line change: completion stamp + active-tag strip on `[ ]`→`[x]`; a full
  reset on `[x]`→`[ ]` — strip both the start and completed glyphs and any active
  tag, leaving a plain unstamped task.

**Active is the tag.** The configurable tag (default `#in-progress`) is the sole
definitive marker of the Active state. The start glyph is recorded data and may
exist on a line without the tag (e.g. a drawn task whose `#in-progress` tag was
manually removed to re-roll).

**Line layout.** Canonical write order, left to right:
`- [x] <description + existing tags> <active tag> <start glyph> <selected-at>
<completed glyph> <completed-at> ^blockid`. Parsing is order-independent; writing
always uses this order and preserves a trailing block reference as the last
token.

**Timestamps.** ISO 8601 local datetime at minute precision (`YYYY-MM-DDTHH:mm`,
no timezone offset), for both selected-at and completed-at. This intentionally
diverges from the Tasks plugin's date-only stamps.

**Change reconciliation (ADR-0001).** Check-offs and un-checks are detected by
observing changes and reconciling, not by intercepting checkbox clicks per
surface. Detection acts only on the actual `[ ]`↔`[x]` transition — CM6
transaction deltas for editor surfaces, and a per-file content snapshot to diff
for Reading-mode clicks (which persist to the file). "Already stamped" is a
glyph-presence test so legacy date-only stamps are recognized and left alone. A
re-entrancy guard prevents the reconciler from reacting to its own writes,
including the Draw's active-tag/start-glyph write (which is inert to it anyway).

**Open verification (highest-leverage unknown).** Confirm empirically that a
Reading-mode checkbox click fires `vault.on('modify')`. If it does not, that
surface needs its own hook and ADR-0001's "observe-only" stance for it must be
revisited. This is the one item that could reopen a decision.

**The Draw animation.** An in-editor CodeMirror line decoration (background +
indent "bounce") hops across Candidates only, decelerating over ~2 seconds
(fixed, not configurable in v1) and landing on the winner. Single-candidate
draws play a brief flourish. The active tag + start glyph are committed once, on
landing. The draw aborts if the target Checklist's lines change mid-spin; the
abort is scoped to those lines so it ignores the reconciler's own writes and
unrelated check-offs elsewhere in the note. There is no Esc-cancel.

**Refusals.** The draw makes no edit and shows a transient `Notice` when: the
cursor is not on a task line, the target Checklist already has an Active task, or
the Checklist has zero Candidates.

**Settings.** Three settings, in order: active tag (plain text, default
`#in-progress`), start glyph (emoji, default 🚀), completed glyph (emoji, default
✅). The two glyph settings use an emoji-only picker modeled on the sibling
kanban-base plugin's `IconSuggestModal`, restricted to emojis (Lucide icons are
excluded because they cannot be serialized inline into note text).

**Scope of syntaxes.** Both the Draw and Completion stamping recognize `- [ ]`
hyphen tasks only in v1 (not `* [ ]`, `+ [ ]`, or ordered `1. [ ]`).

**Accepted default behaviors.** A Candidate checked off without ever being drawn
receives a completed glyph but no start glyph (no computable duration).
Unchecking a completed task discards its prior start/completed stamps entirely
rather than preserving them for duration history.

**Housekeeping.** `manifest.json` is still the `sample-plugin` template; its
`id`, `name`, and `description` must be set as part of this work. Two test
harnesses must be added — vitest for the pure-core unit seam, and
`wdio-obsidian-service` for the end-to-end seam (with a `wdio.conf`, a
`test/vaults/` checklist fixture, and an npm E2E script) — the repo currently has
no test script.

## Testing Decisions

**What makes a good test here.** Tests exercise external behavior at the pure
core seam: given input line(s) and parameters, assert the returned range /
indices / rewritten string / classified Edit. They must not assert on internal
structure or on Obsidian runtime objects. Randomness is made testable by passing
the landing `offset` in as a parameter to `selectWinner` rather than calling the
RNG inside the assertion.

**Two seams.** Testing happens at two levels, and no Obsidian mocks are used:

1. **Pure-core unit seam (vitest).** The bulk of correctness is proven here,
   through the pure functions (`findChecklist`, `candidatesIn`, `selectWinner`,
   `rewriteLine`, `classifyTransition`). Fast, exhaustive, no Obsidian runtime.
2. **End-to-end seam (`wdio-obsidian-service`).** The Obsidian adapter — the
   change listener across all edit surfaces, the command wiring, the committed
   result of the animation, and Notices — is verified by driving a real Obsidian
   instance, replacing the earlier "verify the adapter manually" stance.

E2E tests use `wdio-obsidian-service`
(https://github.com/jesse-r-s-hines/wdio-obsidian-service): open a checklist
vault fixture with `browser.reloadObsidian({vault})`, act via
`browser.executeObsidianCommand("<plugin-id>:<command-id>")` and/or
`browser.executeObsidian(({app, obsidian}) => …)` to toggle a checkbox, then
assert on note contents read back with `obsidianPage.read(path)`. Assertions are
on the resulting markdown text (external behavior), never on internal plugin
structure. The service drives its own sandboxed Obsidian: locally it points at
the installed app via `'wdio:obsidianOptions'.binaryPath` (no download), and in
CI it downloads a pinned version (cached in `.obsidian-cache`) — same test code,
config differs by environment only. Because the E2E seam exercises real
check-offs, the reading-mode `modify` open question is resolved by an E2E test
rather than a manual check.

E2E tests cannot meaningfully assert on animation frames; for the Draw they
assert on the committed end state (winner tagged + stamped) and on abort
behavior, while the animation timing itself is validated via the pure hop-count
logic and manual observation.

**Representative cases to cover (unit seam).**

- Checklist boundary: cursor mid-list; blank-line, prose, and non-checkbox
  boundaries; nested sub-items excluded; single-item list.
- Candidate filtering: mixed unchecked / completed / active lines; all-completed
  (empty candidate set); active present.
- Winner selection: uniform offset mapping over N candidates; N = 1; confirming
  no low-index bias for offsets across `[0, N)`.
- Line rewrite: add/strip active tag; add/strip start and completed glyphs;
  canonical ordering; insertion before a trailing `^blockid`; preservation of
  existing description and tags.
- Transition classification: `[ ]`→`[x]` stamps completed + strips active tag;
  `[x]`→`[ ]` strips both glyphs and any active tag, leaving a plain task;
  already-stamped line (glyph present, incl. legacy date-only) left unchanged;
  non-`- [ ]` syntaxes ignored.

**Representative cases to cover (E2E seam).**

- Completion stamping fires when a `- [ ]` task is checked off in Source, Live
  Preview, and Reading mode, and does not fire on notes opened but not edited.
- Checking off an active task both stamps completion and strips the active tag.
- Running the Draw command tags + stamps exactly one candidate; refusals produce
  no edit (and, where observable, a Notice) for the no-checklist,
  already-active, and no-candidate cases.
- Unchecking a completed task strips both the completed and start glyphs and any
  active tag, leaving a plain unstamped task.

**Prior art.** The sibling `obsidian-kanban-base` plugin uses vitest for the unit
seam; mirror its runner setup and co-located `*.test.ts` conventions. For the
E2E seam, follow the `wdio-obsidian-service` sample layout: a `wdio.conf`, one or
more vault fixtures under a `test/vaults/` folder, and `*.spec.ts` E2E specs.

## Out of Scope

- Intercepting checkbox clicks per surface (rejected in ADR-0001).
- A modal/overlay carousel animation; the animation is in-editor over the real
  lines.
- Weighting, seeding, or reproducible randomness.
- Timezone offsets or sub-minute precision in timestamps.
- A setting to disable completion stamping.
- Bullet/ordered task syntaxes other than `- [ ]`.
- Migrating or rewriting legacy date-only stamps.
- Configurable animation duration/style; reduced-motion handling.
- Any Tasks-plugin feature beyond completion-date stamping (recurrence,
  scheduling, queries, other date types).
- A dedicated "clear active" or "cancel draw" command.

## Further Notes

- Replacing the Tasks plugin: once completion stamping ships, the user intends to
  disable Tasks. Legacy `✅ YYYY-MM-DD` stamps remain valid and are left
  untouched; new stamps carry time-of-day and will not be parseable by Tasks.
- The datetime data is intended to feed later analysis (e.g. estimating duration
  for semantically similar tasks); minute-precision local time was chosen with
  that in mind.
- The reading-mode `modify` verification (above) should be resolved first at
  implementation, as it gates the completeness of the observe-and-reconcile
  approach. With the E2E harness in place it is resolved by a
  `wdio-obsidian-service` test that checks a box in Reading mode and asserts the
  completed glyph appears, rather than by manual inspection.
