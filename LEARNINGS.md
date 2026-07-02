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

## Open Questions

- [2026-07-02] Does a Reading-mode checkbox click fire `vault.on('modify')`?
  (PRD "Open verification" — gates ADR-0001's observe-only stance.) To be
  resolved by an E2E test in a later slice.
- [2026-07-02] Slice 01 E2E smoke spec passes green via the **download path**
  (`OBSIDIAN_BINARY_PATH` unset → service fetches a self-consistent installer +
  ChromeDriver + app). Still unproven: CI headless run, and the local
  `binaryPath` no-download path (blocked by Chrome-142 vs driver DB — see Domain
  Knowledge). Deferred to human review — see issue 01 review notes.

## Consolidated Principles
