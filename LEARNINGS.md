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

- [2026-07-03] Uniform draw (slice-05): inject an **offset picker**
  `pickOffset(n) => number` into the pure orchestrator (`planDraw`), not a raw
  offset — the adapter can't know the candidate count `N` until the core filters
  candidates, and `Math.floor(Math.random()*<wider range>) % N` biases toward low
  indices. `pickOffset(N)` draws in `[0, N)`; `selectWinner` reduces mod `N` so a
  full-loop hop total (`fullLoops*N+k`) and the single-candidate case both land.
  Prove uniformity as a **bijection** — assert `selectWinner(N, 0..N-1)` maps onto
  `{0..N-1}` with no collisions — never by sampling the RNG (flaky, wrong seam).
- [2026-07-03] Put refusal precedence in the **pure core**, not the adapter:
  `planDraw` returns `{ok:false, reason}` in fixed order (not-a-task-line →
  already-active → no-candidates), so precedence (e.g. a lone active task reports
  "already-active", never "no-candidates") is unit-tested, not gated behind slow
  E2E. The thin adapter only maps `reason` → `Notice` and applies the one edit.
  Mirrors `reconcile-content.ts`'s edit-description pattern.

## Mistakes to Avoid

- [2026-07-03] An E2E `browser.waitUntil` must gate on the **reconciler's
  distinctive effect**, not on the checkbox flip the user just made. The
  slice-04 reset test first waited on `.includes('- [ ] done task')`, but that
  string is a *prefix substring* of the pre-reset line
  (`- [ ] done task #in-progress 🚀 … ✅ …`), so it resolved immediately —
  before the deferred (`queueMicrotask`) reconcile write — and the follow-up
  `not.toContain('✅'/'🚀'/'#in-progress')` assertions raced the strip (flaky
  green). Gate on the effect instead: `waitUntil(async () => !(await
  editorValue()).includes('✅'))`. Mirror slice-03's `waitUntil(STAMP.test(...))`,
  which keys on `/✅ …/` — true only *after* the reconciler acts.

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

- [2026-07-03] The two reconcile adapters are **transition-generic**: both the
  CM6 editor extension and the Reading-mode snapshot path
  (`reconcile-content.ts`) simply apply whatever line `classifyTransition`
  returns (and skip when `rewritten === nextLine`). So slice-04's uncheck reset
  (`[x]`→`[ ]`) needed **zero new adapter/write-path code** — the whole slice
  was one branch in the pure core (ADR-0002 paying off). When adding a new
  transition, extend `classifyTransition` and its unit tests; the adapters carry
  it for free.

- [2026-07-03] Candidacy keys on the **active tag alone**, never the start glyph
  (slice-05 `candidatesIn`). A re-rolled task (`#in-progress` manually removed but
  🚀 kept) is a Candidate again and eligible to win — the glyph is recorded data,
  the tag is the sole Active marker (CONTEXT "Reactivation"). Symmetrically,
  `hasActiveTask` counts a line as Active only when **unchecked** *and* tagged: a
  checked line still bearing the tag is Completed, not Active, so it never blocks
  a draw. The draw's winner write (`rewriteLine {activeTag:'add', start:{at}}`)
  is inert to the reconciler — no `[ ]`→`[x]` transition — so it needs no write
  guard, unlike the completion-stamping path.
- [2026-07-03] E2E invokes a command by its fully-qualified id via
  `browser.executeObsidianCommand("<plugin-id>:<command-id>")` (confirmed in
  `wdio-obsidian-service`'s `index.d.ts`; returns `Promise<void>`). The command
  must be an `editorCallback` command with a **stable id** so E2E can drive it;
  place the cursor first with `editor.setCursor({line,ch:0})` via
  `executeObsidian`, then run the command, then assert on `editor.getValue()`
  (buffer, for editor-surface writes) or `obsidianPage.read` (disk).

## Open Questions

- [2026-07-03] Slice-03 E2E "strips the active tag but keeps the start glyph
  when an active task is completed" **fails on a clean tree** (confirmed via
  `git stash` + `npm run test:e2e`): completing `- [ ] focus #in-progress 🚀
  <at>` yields `- [x] focus ✅ <now>` — the start glyph 🚀 is dropped, though the
  pure `classifyTransition` unit test proves it should be preserved. So it's an
  adapter/E2E-only discrepancy, not a core bug. Not touched during slice-04
  (unrelated, and slice-03 is already `in-review`); flagged for slice-03 human
  review.

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
