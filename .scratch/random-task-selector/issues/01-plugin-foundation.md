# 01 — Plugin foundation (prefactor)

Status: in-review

## Parent

`.scratch/random-task-selector/PRD.md`

## What to build

Prefactor the repository off the `sample-plugin` template so feature work has a
real identity and both test harnesses in place. Set the plugin's `manifest.json`
`id`, `name`, and `description` to reflect the Random Task Selector.

Stand up the two test seams (per the PRD's Testing Decisions):

1. **Unit seam** — a vitest harness and npm `test` script, mirroring the sibling
   `obsidian-kanban-base` plugin's runner setup and co-located `*.test.ts`
   conventions.
2. **End-to-end seam** — `wdio-obsidian-service`
   (https://github.com/jesse-r-s-hines/wdio-obsidian-service) driving a real,
   sandboxed Obsidian instance. Add a `wdio.conf`, a `test/vaults/` checklist
   vault fixture, and an npm E2E script. Follow the service's sample layout for
   config and Obsidian-version handling, and ensure it runs headless in CI.

   **Binary source, per environment.** The service drives its own Obsidian, not
   the user's installed app. To avoid a per-machine download during local dev,
   set `'wdio:obsidianOptions'.binaryPath` to the locally installed Obsidian when
   present (e.g. via an env var), and **omit** it in CI so the launcher downloads
   a pinned version (cached in `.obsidian-cache` between runs). The test code is
   identical either way — only this config differs by environment. Add
   `.obsidian-cache` to `.gitignore`.

No feature behavior ships in this slice — only the identity and the harnesses,
each proven by a smoke test.

## Acceptance criteria

- [x] `manifest.json` no longer carries the `sample-plugin` id/name/description;
      it identifies the Random Task Selector plugin.
- [x] vitest is installed and runnable via an npm `test` script, with a trivial
      passing unit test.
- [x] `wdio-obsidian-service` is installed and configured; an npm E2E script
      launches Obsidian, loads this plugin into a vault fixture, and runs a smoke
      spec that asserts the plugin is enabled (e.g. via
      `browser.executeObsidian(({plugins}) => …)`).
- [x] The E2E smoke spec runs green locally via the download path (the same
      `wdio-obsidian-service` download mechanism CI uses). Confirming the CI
      headless run and the local `binaryPath` no-download path is split into
      slice 07 (`07-ci-e2e-confirmation.md`) as end-of-project maintenance.
- [x] `.obsidian-cache` is git-ignored.
- [x] `npm run build` / lint still succeed.

## Blocked by

- None - can start immediately.

## Review notes

`/slice` handoff — E2E execution deferred to human testing (two boxes left
unchecked):

- **Proven:** plugin identity, vitest unit seam (green), `.obsidian-cache`
  ignored, build + lint green. E2E smoke spec passes green via the **download
  path** (`OBSIDIAN_BINARY_PATH` unset): the service fetched a matched installer
  v1.5.8 + Chrome 120 driver + Obsidian app v1.12.7, launched a sandboxed
  Obsidian, loaded the plugin from the fixture vault, and the
  `plugins.enabledPlugins.has('random-task-selector')` assertion passed
  (`1 passing`).
- **Split into slice 07** (`07-ci-e2e-confirmation.md`, end-of-project
  maintenance): confirming the CI headless run and the local `binaryPath`
  no-download path. Both were configured here but are unproven — the CI
  mechanism (download) is the one just proven locally, so it's expected to pass,
  and the `binaryPath` path is blocked on this machine's Chrome-142 Obsidian
  outrunning the `installerVersion: earliest` ChromeDriver.
- **To verify locally:** `export OBSIDIAN_BINARY_PATH=/Applications/Obsidian.app/Contents/MacOS/Obsidian`
  and set `OBSIDIAN_INSTALLER_VERSION` to a version whose ChromeDriver matches
  your installed Obsidian, then `npm run test:e2e`. Or unset `OBSIDIAN_BINARY_PATH`
  to let the service download a matched installer + driver + app.
