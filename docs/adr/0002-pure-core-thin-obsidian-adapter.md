# Keep domain logic pure; isolate Obsidian behind a thin adapter

## Status

accepted

## Context

The plugin must be well-tested, but the Obsidian runtime (editor, vault events,
decorations, Notices) is awkward to exercise in unit tests. Most of the actual
logic is string-in / string-out.

## Decision

Express the domain logic as **pure functions over strings**, unit-testable with
no Obsidian app:

- checklist boundary detection (which lines form the target checklist),
- candidate filtering and the hop-count → winner selection,
- line-token rewriting: adding/stripping `#in-progress`, start glyph, and
  completed glyph in canonical order, inserting before a trailing `^blockid`,
- the completion and uncheck-reset transition rules.

Everything Obsidian-specific — the change listener, CM6 decorations for the
highlight animation, and `Notice` feedback — is a **thin adapter** that reads
lines, calls the pure core, and writes the result back.

## Consequences

- The risky logic (transition detection, token rewriting, boundary rules) is
  covered by fast string-based unit tests.
- The adapter stays small enough to verify manually in Obsidian.
