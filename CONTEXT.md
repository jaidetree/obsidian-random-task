# Context / Glossary

A shared vocabulary for the Random Task Selector plugin. Glossary only — no
implementation details.

The plugin is **two features sharing plumbing**:

1. **[Draw](#draw)** — command-triggered random selection scoped to the
   [Checklist](#checklist) at the cursor.
2. **[Completion stamping](#completion-stamping)** — an always-on, vault-wide
   behavior that stamps any task on check-off (absorbing and replacing the
   Tasks plugin's done-date feature).

The shared plumbing is the [Timestamps](#timestamps) glyph/datetime format and
the change-reconciliation that turns check-offs and un-checks into inline edits.

## Terms

### Task item

A single Markdown task-list line, e.g. `- [ ] write tests`. Has a checkbox
whose state is one of the [Task states](#task-state).

### Checklist

The unit the plugin operates on: a maximal run of consecutive [Task
items](#task-item) at the **same indentation level**, bounded by any line that
is not such an item (a blank line, prose, a bullet without a checkbox, or a
differently-indented item). Nested sub-items (deeper indentation) belong to
their own checklist and are excluded from the parent's.

The **target checklist** is the one containing the line the user's cursor is on
when the selection command is invoked.

### Task state

A [Task item](#task-item) is in exactly one of three states, read directly from
the line text. The [Active](#active) tag is the sole definitive marker of the
Active state; the start glyph is merely recorded data and may appear without the
tag.

- **Candidate** — an unchecked item (`- [ ]`) with no Active tag. Eligible to
  win the [Draw](#draw). May carry a start glyph (e.g. a reactivated task).
- **Active** — an unchecked item carrying the Active tag (and a start glyph).
  See [Active](#active). Not eligible; blocks its Checklist.
- **Completed** — a checked item (`- [x]`) carrying a completed glyph (and
  usually a start glyph).

Only Candidates are eligible for selection.

**Reactivation.** Unchecking a Completed item (`- [x]` → `- [ ]`) that carries a
start glyph strips the completed glyph, refreshes the start glyph to the current
datetime, and adds **no** Active tag — returning the item to Candidate. It does
not automatically become Active again; re-activation only happens through a
Draw.

### Active

The state of the one [Task item](#task-item) currently chosen from a
[Checklist](#checklist). Represented in the line by a **tag** (`#in-progress`)
plus a **start glyph** and timestamp marking when it was selected. A Checklist
may hold **at most one** Active item at a time; the selection command refuses to
run against a Checklist that already has one. Active is cleared either by
completing the item or by manually removing the tag.

### Draw

The act of randomly choosing one [Candidate](#task-state) from the target
[Checklist](#checklist) to become [Active](#active). Triggered by the selection
command. A Draw is **refused** if the Checklist has no Candidates or already has
an Active item. To stay unbiased, draw the **landing offset uniformly in
`[0, N)`** over the `N` Candidates, then express the animation as
`fullLoops * N + offset` hops; the highlight decelerates over that many hops and
lands on the winner. (Computing `hops` from an arbitrary range and taking
`hops % N` biases toward low indices — avoid that.) No weighting or seeding.

### Completion stamping

The always-on behavior that appends a [Completed-at](#timestamps) glyph +
datetime to a `- [ ]` task the moment it is checked off, anywhere in the vault —
independent of whether the task was ever [Active](#active). Only acts on the
actual check-off transition (never re-stamps already-completed tasks), only
recognizes `- [ ]` hyphen tasks, and treats a task as already stamped when the
completed glyph is present (so legacy date-only stamps are left alone). If the
checked-off line carries the Active tag, that tag is stripped at the same time.

### Timestamps

Two moments are recorded inline on the item's line, each as an ISO 8601 local
datetime at minute precision (`YYYY-MM-DDTHH:mm`, no timezone offset):

- **Selected-at** — when the item became Active (the draw landed on it).
  Written with the **start glyph** (default 🚀).
- **Completed-at** — when the item was checked off. Written with the
  **completed glyph** (default ✅).

The tag and both glyphs are user-configurable in plugin settings; the defaults
above are what ship out of the box. The datetime format intentionally diverges
from the Tasks plugin's date-only stamps — this plugin absorbs and replaces that
completion-stamping behavior.
