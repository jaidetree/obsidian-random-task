import { browser, expect } from '@wdio/globals';
import { DEFAULT_SETTINGS } from '../../src/settings';
import type { RandomTaskSettings } from '../../src/settings';

// End-to-end seam for slice 02 (settings). Proves the runtime behaviors the
// pure unit tests can't reach: that the configured values are exposed on the
// live plugin instance, and that edits round-trip through Obsidian's
// saveData/loadData to disk.
//
// Two harness facts shape this spec:
//   - Persistence is asserted via a saveData→loadData round-trip, not a reboot.
//     wdio-obsidian-service's no-arg `reloadObsidian()` does not carry a live
//     `saveData` write back across the reboot, so it can't prove persistence.
//     loadData() re-reads data.json from disk, which is the actual persistence
//     contract. (Survival across a real Obsidian restart was confirmed manually
//     — acceptance criterion 4.)
//   - data.json survives between runs, so tests must not assume a pristine disk
//     and must restore defaults afterward. The exact default *values* are proven
//     deterministically by the unit test (src/settings.test.ts); here we only
//     assert the three keys are exposed as strings.
//
// The emoji-only nature of the glyph picker is a UI-internal detail (no Lucide
// icons in the FuzzySuggestModal); it's covered by the unit-level module and
// manual verification rather than asserted through the modal here.
const PLUGIN_ID = 'random-task-selector';

const writeSettings = (values: Partial<RandomTaskSettings>) =>
	browser.executeObsidian(
		async ({ app }, id, next) => {
			// @ts-expect-error plugins registry is not in the public typings
			const plugin = app.plugins.plugins[id];
			Object.assign(plugin.settings, next);
			await plugin.saveSettings();
		},
		PLUGIN_ID,
		values,
	);

describe('Random Task Selector — settings', function () {
	before(async function () {
		await browser.reloadObsidian({ vault: 'test/vaults/checklist' });
	});

	after(async function () {
		// Restore defaults so a persisted change doesn't leak into other specs
		// or later runs sharing this vault fixture's on-disk data.json.
		await writeSettings(DEFAULT_SETTINGS);
	});

	it('exposes the three configured values on the plugin instance', async function () {
		const settings = (await browser.executeObsidian(
			({ app }, id) =>
				// @ts-expect-error plugins registry is not in the public typings
				app.plugins.plugins[id].settings as unknown,
			PLUGIN_ID,
		)) as Record<string, unknown>;

		expect(Object.keys(settings).sort()).toEqual([
			'activeTag',
			'completedGlyph',
			'startGlyph',
		]);
		for (const value of Object.values(settings)) {
			expect(typeof value).toBe('string');
		}
	});

	it('persists changed settings to disk via saveData/loadData', async function () {
		const changed = {
			activeTag: '#doing',
			startGlyph: '🎯',
			completedGlyph: '🏁',
		};

		await writeSettings(changed);

		// loadData() re-reads data.json from disk, so this proves saveData
		// persisted the values rather than only mutating the in-memory object.
		const persisted = await browser.executeObsidian(
			async ({ app }, id) =>
				// @ts-expect-error plugins registry is not in the public typings
				(await app.plugins.plugins[id].loadData()) as unknown,
			PLUGIN_ID,
		);

		expect(persisted).toEqual(changed);
	});
});
