# 01 — Plugin foundation (prefactor)

Status: in-progress

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

- [ ] `manifest.json` no longer carries the `sample-plugin` id/name/description;
      it identifies the Random Task Selector plugin.
- [ ] vitest is installed and runnable via an npm `test` script, with a trivial
      passing unit test.
- [ ] `wdio-obsidian-service` is installed and configured; an npm E2E script
      launches Obsidian, loads this plugin into a vault fixture, and runs a smoke
      spec that asserts the plugin is enabled (e.g. via
      `browser.executeObsidian(({plugins}) => …)`).
- [ ] The E2E smoke spec runs headless in CI (downloading a pinned Obsidian
      version) and locally against the installed Obsidian via `binaryPath` (no
      download required).
- [ ] `.obsidian-cache` is git-ignored.
- [ ] `npm run build` / lint still succeed.

## Blocked by

- None - can start immediately.
