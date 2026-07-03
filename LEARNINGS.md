# Project Learnings

## Patterns That Work

- [2026-07-03] E2E specs must **force default settings in a `before` hook**
  (`Object.assign(plugin.settings, DEFAULT_SETTINGS); await saveSettings()`),
  not just restore in `after`. Because `data.json` survives between `wdio` runs,
  a prior spec's saved glyphs/tag leak in: slice-03 stamping tests first failed
  because the vault carried `settings.e2e`'s `🏁`/`🎯`/`#doing`, so the plugin
  correctly stamped `🏁` while assertions looked for the default `✅`.
- [2026-07-03] Driving a specific edit surface in E2E: switch a `MarkdownView`
  with `await view.setState({ ...view.getState(), mode, source }, {history:false})`
  — `mode:'preview'` = Reading; `mode:'source', source:false` = Live Preview;
  `mode:'source', source:true` = raw Source. Live Preview only renders the
  `input.task-list-item-checkbox` **widget on a line the cursor is not on**, so
  put the task off line 0 and `editor.setCursor({line:0,ch:0})` before clicking,
  or the click target never exists.
- [2026-07-02] Pure-core unit seam needs only a minimal `vitest.config.ts`
  (`environment: 'node'`, `include: ['src/**/*.test.ts']`) — no Obsidian mocks,
  unlike the sibling kanban plugin's storybook/preact-heavy config. E2E specs
  live in `test/specs/*.e2e.ts`, run via wdio (not vitest), and stay out of the
  build because the build tsconfig's `include` is `src/**/*.ts` only.
- [2026-07-02] eslint here uses `projectService` (typed linting), which errors
  on any TS file not covered by a tsconfig `include` ("file not found in
  project"). Config/E2E files outside `src/**` (`wdio.conf.mts`, `test/`,
  `vitest.config.ts`, `tsconfig.e2e.json`) must be added to eslint
  `globalIgnores`. A separate `tsconfig.e2e.json` (extends base, adds the wdio
  `types`) gives `tsc`/the editor correct types for those files.
- [2026-07-02] Emoji-only picker (settings glyphs): model on the sibling
  kanban-base `IconSuggestModal` but **drop the Lucide `getIconIds()` branch
  entirely** — build `getItems()` from `unicode-emoji-json/data-by-emoji.json`
  only. Don't include Lucide and filter at render; Lucide can't be serialized
  inline into note text, so it must be unselectable, not just hidden.
- [2026-07-02] Keep `main.ts → settings-tab` one-directional by typing the tab
  against a small `SettingsHost extends Plugin` interface (`settings` +
  `saveSettings()`) instead of importing the concrete plugin class — avoids the
  circular import and keeps the adapter thin (ADR-0002).

## Mistakes to Avoid

- [2026-07-03] In a CM6 `ViewPlugin.update`, `update.changes` maps **old→new**
  and its `length` is the *old* doc length. Mapping a *new*-doc position (e.g. a
  changed line's `from` in `update.state.doc`) with `update.changes.mapPos`
  throws `Position N is out of range for changeset of length N-1` as soon as an
  edit grows the doc — and CodeMirror **swallows the exception by disabling the
  plugin**, so the failure is silent (stamping just stops). Invert first:
  `update.changes.invertedDesc.mapPos(posNew, -1)`. Test the crash with an edit
  that *grows* the doc; an equal-length replace (`[ ]`→`[x]`) never triggers it.

- [2026-07-02] Don't leave `manifest.json` `minAppVersion` at the template
  `1.0.0`. With wdio-obsidian-service, `installerVersion: 'earliest'` resolves to
  `minAppVersion`, so `1.0.0` means an ancient/undownloadable installer — breaks
  the CI download path and produces a ChromeDriver far older than any real app.

## Domain Knowledge

- [2026-07-03] Completion stamping targets **Live Preview + Reading mode**;
  Source mode is best-effort. A hand-typed check-off in Source passes through the
  transient state `- []` (delete the space, then type `x`), which isn't a task
  line, so there's no direct `[ ]`→`[x]` transition to detect — nothing gets
  stamped. Accepted as-is (the Tasks plugin also doesn't stamp in Source mode);
  do NOT broaden `TASK_RE` to accept empty brackets, as that would change
  task/candidate recognition everywhere and risk over-firing (e.g. a
  freshly-typed `- [x]` self-stamping). Source still works for a single-
  transaction toggle (overtyping the space).

- [2026-07-02] wdio-obsidian-service: `installerVersion` (NOT `binaryPath`)
  selects the ChromeDriver; `binaryPath` only overrides which Electron binary is
  launched. They must correspond or the session dies at creation with
  "This version of ChromeDriver only supports Chrome version X / Current browser
  version is Y". `installerVersion: 'earliest'` == manifest `minAppVersion`.
- [2026-07-02] Pointing `binaryPath` at the locally-installed Obsidian is
  inherently fragile: Obsidian auto-updates the app JS ahead of the launcher's
  ChromeDriver DB, so a very recent installed app (e.g. Chrome 142) may have no
  matching driver. Local no-download E2E requires `installerVersion` set to a
  version whose driver matches the installed app; otherwise unset `binaryPath`
  and let the service download a matched installer + driver + app.
- [2026-07-02] Importing a JSON dependency (e.g.
  `unicode-emoji-json/data-by-emoji.json`) needs `resolveJsonModule: true` in
  `tsconfig.json`. esbuild bundles JSON natively, but `npm run build` runs
  `tsc -noEmit` **first** and fails the JSON import without that flag — the
  typecheck gates the bundle. (`allowSyntheticDefaultImports` was already set, so
  the default-import form type-checks once JSON resolution is on.) Bundling the
  full ~1900-entry emoji JSON into `main.js` was accepted despite AGENTS.md
  "avoid large dependencies" because the PRD explicitly specifies the sibling's
  approach.

- [2026-07-03] wdio-obsidian-service persistence testing: the no-arg
  `browser.reloadObsidian()` does **not** carry a live `saveData` write back
  across the reboot (settings revert to their on-disk state), so it can't prove
  "persists across restart". Assert persistence via a `saveData()` →
  `loadData()` round-trip instead — `loadData()` re-reads `data.json` from disk,
  which is the real persistence contract. Separately, `data.json` **survives
  between `wdio` runs** (the sandbox/config state is reused), so E2E specs must
  not assume a pristine disk and should restore defaults in an `after` hook to
  avoid polluting later specs/runs. `installPlugins` re-copies `main.js` /
  `manifest.json` on every boot but preserves an existing dest `data.json`
  (it only overwrites when the *source* plugin dir ships its own data.json).

- [2026-07-03] Observe-and-reconcile (ADR-0001) needs a **dual write path**, and
  the reason is the *write* side, not detection: `vault.modify` on a file open in
  an editor races the editor buffer. So editor surfaces (Source/Live Preview) are
  detected via a CM6 `ViewPlugin` and written back **through the editor** (a
  follow-up `view.dispatch`), while Reading mode is detected via
  `vault.on('modify')` + per-file snapshot diff and written via `vault.modify`.
- [2026-07-03] CM6 forbids dispatching a transaction from inside a
  `ViewPlugin.update()` ("calls to EditorView updates are not allowed while an
  update is in progress"). Defer the follow-up write with `queueMicrotask`, and
  wrap it in a shared `writing` guard so the plugin's own edit isn't reconciled.
- [2026-07-03] Snapshot back-stamp guard: on `vault.on('modify')`, a file with
  **no prior snapshot is recorded and left alone** (never diff against nothing),
  and snapshots are seeded on `file-open`/`active-leaf-change`. Without seeding,
  the first real check-off's `modify` would itself be the seeding event and get
  swallowed; without the guard, opening/externally touching an old note would
  back-stamp every historical `[x]`. Use `MarkdownView.getMode() === 'source'`
  across `iterateAllLeaves` to tell "open in an editor" (skip — editor path owns
  it) from Reading mode (handle via the snapshot path).

## Open Questions

- [2026-07-02] [RESOLVED 2026-07-03] Does a Reading-mode checkbox click fire
  `vault.on('modify')`? **Yes.** The slice-03 E2E clicks a rendered
  `input.task-list-item-checkbox` in Reading mode and the completed glyph lands
  in the note read back from disk — so ADR-0001's observe-only stance holds for
  that surface and no per-surface (markdown post-processor) hook is needed.
- [2026-07-02] Slice 01 E2E smoke spec passes green via the **download path**
  (`OBSIDIAN_BINARY_PATH` unset → service fetches a self-consistent installer +
  ChromeDriver + app). Still unproven: CI headless run, and the local
  `binaryPath` no-download path (blocked by Chrome-142 vs driver DB — see Domain
  Knowledge). Both tracked in slice 07 (`07-ci-e2e-confirmation.md`) as
  end-of-project maintenance.

## Consolidated Principles
