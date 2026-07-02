# 02 — Settings: active tag and glyphs

Status: ready-for-agent

## Parent

`.scratch/random-task-selector/PRD.md`

## What to build

A plugin settings tab exposing the three user-configurable values the features
consume, in this order: the active tag, the start glyph, and the completed glyph.
The active tag is a plain-text field (default `#in-progress`). The start glyph
(default 🚀) and completed glyph (default ✅) are chosen through an emoji-only
picker modeled on the sibling kanban-base plugin's `IconSuggestModal` — restricted
to emojis, because Lucide icons cannot be serialized inline into note text.
Values persist across reloads and are readable by the rest of the plugin.

Settings behavior is covered indirectly by the feature E2E specs (which assert
the configured tag/glyphs appear in note text); no dedicated settings unit tests
are required beyond any pure persistence/serialization helper.

## Acceptance criteria

- [ ] Settings tab shows the three options in order: active tag, start glyph,
      completed glyph.
- [ ] Defaults are `#in-progress`, 🚀, ✅.
- [ ] Glyph options open an emoji-only picker (no Lucide icons selectable).
- [ ] Changed values persist across an Obsidian reload.
- [ ] The configured values are exposed to the plugin's core/adapter for use by
      later slices.

## Blocked by

- `.scratch/random-task-selector/issues/01-plugin-foundation.md`
