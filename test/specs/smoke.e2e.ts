import { browser } from '@wdio/globals';

// Foundation smoke test for the end-to-end seam: prove that
// wdio-obsidian-service launches a real Obsidian, loads this plugin into the
// checklist vault fixture, and enables it. Behavioral specs (the Draw,
// completion stamping across surfaces, reactivation) arrive in later slices.
describe('Random Task Selector — plugin foundation', function () {
	before(async function () {
		await browser.reloadObsidian({ vault: 'test/vaults/checklist' });
	});

	it('is loaded and enabled', async function () {
		const enabled = await browser.executeObsidian(({ app }) =>
			// @ts-expect-error plugins registry is not in the public typings
			app.plugins.enabledPlugins.has('random-task-selector'),
		);
		expect(enabled).toBe(true);
	});
});
