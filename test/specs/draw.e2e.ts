import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';
import { DEFAULT_SETTINGS } from '../../src/settings';

const PLUGIN_ID = 'random-task-selector';
// Stable command id from commands/draw.ts; the E2E seam invokes the command by
// this fully-qualified id (`<plugin-id>:<command-id>`).
const DRAW_COMMAND = `${PLUGIN_ID}:draw-random-task`;

// End-to-end seam for slice 05 (The Draw). Drives a real Obsidian: places the
// cursor in a checklist, runs the command, and asserts on the note read back —
// exactly one candidate becomes tagged + stamped, and refusals make no edit.
//
// The start-glyph datetime is the real wall clock, so assertions match its shape
// (`🚀 YYYY-MM-DDTHH:mm`) rather than a fixed value; the exact format is proven
// deterministically by the unit tests.
const NOTE = 'draw.md';
const STAMP = /🚀 \d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const TAG = '#in-progress';

const countOccurrences = (text: string, needle: string): number =>
	text.split(needle).length - 1;

const closeAll = () =>
	browser.executeObsidian(({ app }) =>
		app.workspace.detachLeavesOfType('markdown'),
	);

const editorValue = () =>
	browser.executeObsidian(({ app, obsidian }) => {
		const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
		return view ? view.editor.getValue() : '';
	});

const moveCursorTo = (needle: string) =>
	browser.executeObsidian(({ app, obsidian }, search) => {
		const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
		if (!view) throw new Error('no active markdown view');
		const ed = view.editor;
		for (let i = 0; i < ed.lineCount(); i++) {
			if (ed.getLine(i).includes(search)) {
				ed.setCursor({ line: i, ch: 0 });
				return;
			}
		}
		throw new Error(`line not found: ${search}`);
	}, needle);

async function openInSource(content: string): Promise<void> {
	await closeAll();
	await obsidianPage.write(NOTE, content);
	await obsidianPage.openFile(NOTE);
	await browser.executeObsidian(async ({ app, obsidian }) => {
		const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
		if (!view) throw new Error('no active markdown view');
		await view.setState(
			{ ...view.getState(), mode: 'source', source: true },
			{ history: false },
		);
	});
}

describe('Random Task Selector — the draw', function () {
	before(async function () {
		await browser.reloadObsidian({ vault: 'test/vaults/checklist' });
		// data.json survives between runs, so force the default tag/glyphs the
		// assertions below expect rather than inheriting a prior spec's edits.
		await browser.executeObsidian(
			async ({ app }, id, defaults) => {
				// @ts-expect-error plugins registry is not in the public typings
				const plugin = app.plugins.plugins[id];
				Object.assign(plugin.settings, defaults);
				await plugin.saveSettings();
			},
			PLUGIN_ID,
			DEFAULT_SETTINGS,
		);
	});

	after(async function () {
		await closeAll();
		await obsidianPage.resetVault();
	});

	it('marks exactly one candidate active when run on a checklist', async function () {
		await openInSource('- [ ] alpha\n- [ ] beta\n- [ ] gamma\n');
		await moveCursorTo('alpha');
		await browser.executeObsidianCommand(DRAW_COMMAND);
		await browser.waitUntil(async () => STAMP.test(await editorValue()), {
			timeout: 5000,
			timeoutMsg: 'the draw wrote no start glyph',
		});
		const value = await editorValue();
		// Exactly one task gained the tag and the start glyph.
		expect(countOccurrences(value, TAG)).toBe(1);
		expect(countOccurrences(value, '🚀')).toBe(1);
		// The winner is one of the three candidates, tagged + stamped in order.
		expect(value).toMatch(
			/- \[ \] (alpha|beta|gamma) #in-progress 🚀 \d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
		);
	});

	it('considers only the checklist at the cursor, leaving other lists untouched', async function () {
		await openInSource('- [ ] other one\n- [ ] other two\n\n- [ ] target one\n');
		await moveCursorTo('target one');
		await browser.executeObsidianCommand(DRAW_COMMAND);
		await browser.waitUntil(async () => STAMP.test(await editorValue()), {
			timeout: 5000,
			timeoutMsg: 'the draw wrote no start glyph',
		});
		const value = await editorValue();
		// The winner is the sole candidate in the cursor's checklist.
		expect(value).toMatch(
			/- \[ \] target one #in-progress 🚀 \d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
		);
		// The other checklist is completely untouched.
		expect(value).toContain('- [ ] other one\n- [ ] other two');
		expect(countOccurrences(value, TAG)).toBe(1);
	});

	it('makes no edit when the checklist already has an active task', async function () {
		const original = '- [ ] a #in-progress 🚀 2026-07-03T08:00\n- [ ] b\n';
		await openInSource(original);
		await moveCursorTo('- [ ] b');
		await browser.executeObsidianCommand(DRAW_COMMAND);
		// The refusal is immediate and writes nothing; give it a beat to (wrongly)
		// fire, then assert the buffer is unchanged — still exactly the one
		// pre-existing active task, and no second tag/glyph on `b`.
		await browser.pause(500);
		const value = await editorValue();
		expect(countOccurrences(value, TAG)).toBe(1);
		expect(countOccurrences(value, '🚀')).toBe(1);
		expect(value).toContain('- [ ] b');
	});

	it('makes no edit when the checklist has no candidates', async function () {
		const original = '- [x] done ✅ 2026-07-03T09:00\n';
		await openInSource(original);
		await moveCursorTo('done');
		await browser.executeObsidianCommand(DRAW_COMMAND);
		await browser.pause(500);
		const value = await editorValue();
		expect(value).not.toContain(TAG);
		expect(value).not.toContain('🚀');
		expect(value).toContain('- [x] done ✅ 2026-07-03T09:00');
	});
});
