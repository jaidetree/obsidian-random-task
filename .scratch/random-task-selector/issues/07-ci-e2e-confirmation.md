# 07 — Confirm E2E across environments (CI + local binaryPath)

Status: done

## Parent

`.scratch/random-task-selector/PRD.md`

## What to build

No plugin behavior. This is a maintenance/infrastructure slice deferred to the
end of the project: confirm the end-to-end harness actually runs in the two
non-default environments that slice 01 wired but could not prove on the
development machine. Doing this last means CI confirms the _full_ E2E suite
(slices 05–06 included), not just the foundation smoke spec.

Two environments, both configured in slice 01 but unverified:

1. **CI, headless, download path.** `.github/workflows/test.yml` runs the E2E
   job on Linux under `xvfb` + `herbstluftwm`, with `OBSIDIAN_BINARY_PATH` unset
   so `wdio-obsidian-service` downloads a pinned Obsidian (cached in
   `.obsidian-cache`). Confirm the job goes green on a real GitHub Actions run;
   fix the workflow (display/window-manager startup, cache key, `apt` deps,
   `WDIO_MAX_INSTANCES`, node/Obsidian versions) until it does.

2. **Local, no-download, `binaryPath` path.** With `OBSIDIAN_BINARY_PATH` set to
   the installed Obsidian, the run must not download an installer. This is
   blocked on a bleeding-edge install because `installerVersion` selects the
   ChromeDriver and must match the installed app's Chrome (see `LEARNINGS.md`).
   Either document the exact env-var recipe that makes it pass against a current
   installed Obsidian (`OBSIDIAN_INSTALLER_VERSION` matching the app), or demote
   it in the README to an optional dev convenience with the download path as the
   supported default.

The download path already runs green locally (proven in slice 01), so the CI
mechanism is expected to work — this slice is about _observing_ it and closing
the two boxes honestly, plus any workflow fixups a real run surfaces.

## Acceptance criteria

- [x] A real GitHub Actions run of `test.yml` shows the E2E job passing headless
      (download path), with `.obsidian-cache` restored/saved between runs. — Run
      28684384731 (push to `main`) went green: E2E job 1m22s, full suite slices
      01–06 under `xvfb`+`herbstluftwm`. Cache **save** proven (log: "Cache not
      found … Cache saved with key obsidian-cache-Linux-<hash>"). The cache
      **restore** (hit) is proven by the follow-up run 28685363133 (this
      commit's push, unchanged key): log shows "Cache hit for:
      obsidian-cache-Linux-bfbcbc4…ccd" (~256 MB restored), E2E green again.
      Both halves (save + restore between runs) now confirmed.
- [x] The workflow is adjusted as needed so the run is reliable (no flakiness in
      display/WM startup or Obsidian download). — Run was clean; no change
      needed. Only annotation is the harmless Node-20 deprecation on
      `actions/cache@v4` (auto-forced to Node 24).
- [x] The local `binaryPath` no-download path is either shown to pass with a
      documented `OBSIDIAN_INSTALLER_VERSION` recipe, or explicitly demoted to
      an optional path in the README with the download path as the default. —
      **Demoted** in README ("Testing" section): download path is the default
      and supported path; `binaryPath` is an optional dev convenience with the
      `OBSIDIAN_INSTALLER_VERSION=latest` recipe documented as best-effort and
      its Chrome/driver fragility called out.
- [x] `LEARNINGS.md` open questions for slice-01 E2E environments are marked
      `[RESOLVED]` with the outcome.

## Blocked by

- `.scratch/random-task-selector/issues/06-draw-animation.md` — run last so CI
  confirms the full E2E suite, not only the foundation smoke spec.

## Comments

Split out of issue 01 (plugin-foundation) on 2026-07-02: the CI-headless and
local-`binaryPath` confirmations are maintenance infrastructure, more useful for
future upkeep than current feature development, so they were deferred to the end
of the project rather than blocking the foundation slice. Issue 01's E2E is
proven via the download path run locally.
