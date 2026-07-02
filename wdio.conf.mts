import * as path from 'path';

// End-to-end seam: WebdriverIO drives a real, sandboxed Obsidian via
// wdio-obsidian-service. See PRD "Testing Decisions" and issue 01.
//
// Binary source differs by environment, but the test code is identical:
//   - Local dev: point `binaryPath` at the already-installed Obsidian so no
//     per-machine download happens. Set OBSIDIAN_BINARY_PATH to the executable,
//     e.g. on macOS:
//       export OBSIDIAN_BINARY_PATH="/Applications/Obsidian.app/Contents/MacOS/Obsidian"
//   - CI: leave OBSIDIAN_BINARY_PATH unset so the launcher downloads a pinned
//     Obsidian version, cached in .obsidian-cache between runs.
const binaryPath = process.env.OBSIDIAN_BINARY_PATH;

// appVersion selects the Obsidian app JS; installerVersion selects the
// installer/Electron version, which is what the service matches its ChromeDriver
// to. When driving a local `binaryPath`, installerVersion MUST correspond to
// that binary's Electron version or ChromeDriver won't attach — override it via
// OBSIDIAN_INSTALLER_VERSION (e.g. "latest") to match your installed Obsidian.
// In CI both default to a downloadable pinned pair ("latest" app on the
// "earliest"/minAppVersion installer).
const appVersion = process.env.OBSIDIAN_APP_VERSION ?? 'latest';
const installerVersion = process.env.OBSIDIAN_INSTALLER_VERSION ?? 'earliest';

const obsidianOptions = {
	installerVersion,
	plugins: ['.'],
	vault: 'test/vaults/checklist',
	...(binaryPath ? { binaryPath } : {}),
};

export const config: WebdriverIO.Config = {
	runner: 'local',
	framework: 'mocha',
	specs: ['./test/specs/**/*.e2e.ts'],
	maxInstances: 1,

	capabilities: [
		{
			browserName: 'obsidian',
			browserVersion: appVersion,
			'wdio:obsidianOptions': obsidianOptions,
		},
	],

	services: ['obsidian'],
	// obsidian reporter wraps spec reporter to show the Obsidian version.
	reporters: ['obsidian'],

	// wdio-obsidian-service downloads Obsidian versions into this directory
	// (git-ignored, cached in CI).
	cacheDir: path.resolve('.obsidian-cache'),

	mochaOpts: {
		ui: 'bdd',
		timeout: 60000,
	},

	logLevel: 'warn',
};
