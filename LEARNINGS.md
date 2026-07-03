# Project Learnings

## Patterns That Work

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

- [2026-07-02] Don't leave `manifest.json` `minAppVersion` at the template
  `1.0.0`. With wdio-obsidian-service, `installerVersion: 'earliest'` resolves to
  `minAppVersion`, so `1.0.0` means an ancient/undownloadable installer — breaks
  the CI download path and produces a ChromeDriver far older than any real app.

## Domain Knowledge

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

## Open Questions

- [2026-07-02] Does a Reading-mode checkbox click fire `vault.on('modify')`?
  (PRD "Open verification" — gates ADR-0001's observe-only stance.) To be
  resolved by an E2E test in a later slice.
- [2026-07-02] Slice 01 E2E smoke spec passes green via the **download path**
  (`OBSIDIAN_BINARY_PATH` unset → service fetches a self-consistent installer +
  ChromeDriver + app). Still unproven: CI headless run, and the local
  `binaryPath` no-download path (blocked by Chrome-142 vs driver DB — see Domain
  Knowledge). Both tracked in slice 07 (`07-ci-e2e-confirmation.md`) as
  end-of-project maintenance.

## Consolidated Principles
