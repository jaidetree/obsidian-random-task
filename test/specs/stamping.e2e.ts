import { browser, expect, $ } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';
import { DEFAULT_SETTINGS } from '../../src/settings';

const PLUGIN_ID = 'random-task-selector';

// End-to-end seam for slice 03 (completion stamping). Drives a real Obsidian
// across all three edit surfaces and asserts the completed glyph + local
// datetime lands in the note. The Reading-mode case doubles as the resolution
// of the PRD's open verification: if a Reading-mode checkbox click did not fire
// `vault.on('modify')`, no stamp would appear and this spec would fail.
//
// The stamp datetime is the real wall clock, so assertions match its shape
// (`✅ YYYY-MM-DDTHH:mm`) rather than a fixed value; the exact format is proven
// deterministically by the unit tests.
const NOTE = 'stamp.md';
const STAMP = /✅ \d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

// Counting occurrences catches a runaway reconciler that stamps twice — a plain
// `toMatch` would pass on a doubled glyph.
const countGlyph = (text: string, glyph: string): number =>
	text.split(glyph).length - 1;

const closeAll = () =>
	browser.executeObsidian(({ app }) =>
		app.workspace.detachLeavesOfType('markdown'),
	);

const setMode = (mode: 'source' | 'preview', source = false) =>
	browser.executeObsidian(
		async ({ app, obsidian }, m, src) => {
			const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
			if (!view) throw new Error('no active markdown view');
			await view.setState(
				{ ...view.getState(), mode: m, source: src },
				{ history: false },
			);
		},
		mode,
		source,
	);

const editorValue = () =>
	browser.executeObsidian(({ app, obsidian }) => {
		const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
		return view ? view.editor.getValue() : '';
	});

const toggleLineInEditor = (needle: string) =>
	browser.executeObsidian(({ app, obsidian }, search) => {
		const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
		if (!view) throw new Error('no active markdown view');
		const ed = view.editor;
		for (let i = 0; i < ed.lineCount(); i++) {
			const line = ed.getLine(i);
			if (line.includes(search)) {
				ed.setLine(i, line.replace('- [ ]', '- [x]'));
				return;
			}
		}
		throw new Error(`line not found: ${search}`);
	}, needle);

const moveCursorTo = (line: number) =>
	browser.executeObsidian(({ app, obsidian }, ln) => {
		const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
		view?.editor.setCursor({ line: ln, ch: 0 });
	}, line);

// Insert text at the very end of the doc, growing it past its old length. This
// exercises the CM6 new→old position mapping: a naive forward `mapPos` throws
// "position out of range" once the doc grows, which CodeMirror swallows by
// disabling the plugin — silently killing stamping.
const appendAtEnd = (text: string) =>
	browser.executeObsidian(({ app, obsidian }, insert) => {
		const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
		if (!view) throw new Error('no active markdown view');
		const ed = view.editor;
		const last = ed.lineCount() - 1;
		ed.replaceRange(insert, { line: last, ch: ed.getLine(last).length });
	}, text);

const clickCheckbox = async (container: string) => {
	const box = await $(`${container} input.task-list-item-checkbox`);
	await box.waitForExist({ timeout: 5000 });
	await box.waitForClickable({ timeout: 5000 });
	await box.click();
};

async function openWith(
	content: string,
	surface: 'source' | 'live' | 'reading',
): Promise<void> {
	await closeAll();
	await obsidianPage.write(NOTE, content);
	await obsidianPage.openFile(NOTE);
	if (surface === 'reading') await setMode('preview');
	else await setMode('source', surface === 'source');
}

describe('Random Task Selector — completion stamping', function () {
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
		// Remove the scratch note so it doesn't leak into other specs/runs.
		await closeAll();
		await obsidianPage.resetVault();
	});

	it('stamps completion when a task is checked off in Source mode', async function () {
		await openWith('- [ ] source task\n', 'source');
		await toggleLineInEditor('source task');
		await browser.waitUntil(async () => STAMP.test(await editorValue()), {
			timeout: 5000,
			timeoutMsg: 'no completion stamp appeared in Source mode',
		});
		const value = await editorValue();
		expect(value).toMatch(/- \[x\] source task ✅ \d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
		expect(countGlyph(value, '✅')).toBe(1);
	});

	it('keeps stamping after an edit that grows the document (position mapping)', async function () {
		await openWith('- [ ] grow task\n', 'source');
		// Grow the doc so a changed line starts beyond the old length; a broken
		// forward mapPos crashes here and CM6 disables the reconciler.
		await appendAtEnd('\n\nappended tail line');
		await toggleLineInEditor('grow task');
		await browser.waitUntil(async () => STAMP.test(await editorValue()), {
			timeout: 5000,
			timeoutMsg:
				'no stamp after a doc-growing edit — the CM6 plugin likely crashed on position mapping',
		});
		const value = await editorValue();
		expect(value).toMatch(/- \[x\] grow task ✅ \d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
		expect(countGlyph(value, '✅')).toBe(1);
	});

	it('stamps completion when a task is checked off in Live Preview', async function () {
		// Live Preview only renders the checkbox widget on a line the cursor is
		// not on, so keep the task off line 0 and park the cursor there.
		await openWith('# tasks\n\n- [ ] live task\n', 'live');
		await moveCursorTo(0);
		await clickCheckbox('.markdown-source-view.is-live-preview');
		await browser.waitUntil(async () => STAMP.test(await editorValue()), {
			timeout: 5000,
			timeoutMsg: 'no completion stamp appeared in Live Preview',
		});
		const value = await editorValue();
		expect(value).toMatch(/- \[x\] live task ✅ \d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
		expect(countGlyph(value, '✅')).toBe(1);
	});

	it('stamps completion when a checkbox is clicked in Reading mode', async function () {
		// Resolves the open verification: a Reading-mode click fires modify.
		await openWith('- [ ] reading task\n', 'reading');
		await clickCheckbox('.markdown-reading-view');
		await browser.waitUntil(async () => STAMP.test(await obsidianPage.read(NOTE)), {
			timeout: 8000,
			timeoutMsg:
				'no stamp after Reading-mode click — vault modify may not fire for this surface',
		});
		const content = await obsidianPage.read(NOTE);
		expect(content).toMatch(/- \[x\] reading task ✅ \d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
		expect(countGlyph(content, '✅')).toBe(1);
	});

	it('strips the active tag but keeps the start glyph when an active task is completed', async function () {
		await openWith(
			'- [ ] focus #in-progress 🚀 2026-07-03T08:00\n',
			'source',
		);
		await toggleLineInEditor('focus');
		await browser.waitUntil(async () => STAMP.test(await editorValue()), {
			timeout: 5000,
			timeoutMsg: 'no completion stamp on the active task',
		});
		const value = await editorValue();
		expect(value).not.toContain('#in-progress');
		expect(value).toContain('🚀 2026-07-03T08:00');
		expect(value).toMatch(STAMP);
		expect(countGlyph(value, '✅')).toBe(1);
	});

	it('fully resets a completed task when it is unchecked', async function () {
		// A completed, previously-active task carrying both glyphs. Unchecking it
		// must strip the active tag and both glyphs, leaving a plain Candidate.
		await openWith(
			'- [x] done task #in-progress 🚀 2026-07-03T08:00 ✅ 2026-07-03T09:00\n',
			'source',
		);
		await browser.executeObsidian(({ app, obsidian }, search) => {
			const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
			if (!view) throw new Error('no active markdown view');
			const ed = view.editor;
			for (let i = 0; i < ed.lineCount(); i++) {
				const line = ed.getLine(i);
				if (line.includes(search)) {
					ed.setLine(i, line.replace('- [x]', '- [ ]'));
					return;
				}
			}
			throw new Error(`line not found: ${search}`);
		}, 'done task');
		// Gate on the reconciler's distinctive effect (glyph removal), not on the
		// checkbox flip — `- [ ] done task` is a prefix of the pre-reset line, so
		// waiting on it would resolve before the strip and race the assertions.
		await browser.waitUntil(
			async () => !(await editorValue()).includes('✅'),
			{ timeout: 5000, timeoutMsg: 'unchecked task was not reset' },
		);
		const value = await editorValue();
		expect(value).toContain('- [ ] done task');
		expect(value).not.toContain('✅');
		expect(value).not.toContain('🚀');
		expect(value).not.toContain('#in-progress');
	});

	it('does not re-stamp pre-existing completed tasks when a note is only opened', async function () {
		const original = '- [x] old task ✅ 2024-01-01\n- [ ] pending task\n';
		await openWith(original, 'reading');
		// Give the observer a chance to (wrongly) fire on the freshly opened note.
		await browser.pause(750);
		expect(await obsidianPage.read(NOTE)).toBe(original);
	});

	it('leaves a background write to a closed note untouched (no spurious reset)', async function () {
		// Regression guard: the snapshot-diff observer must fire only for a
		// Reading-mode view, never for a background write to a file open in no
		// view. Seed a snapshot with a completed line, close the note, then write
		// an unchecked line to the same path out-of-band. Before the fix this was
		// mis-read as an `[x]`→`[ ]` uncheck and the line was reset (tag + glyphs
		// stripped) the moment it was written — corrupting the file.
		await openWith('- [x] seed ✅ 2024-01-01\n', 'reading');
		await closeAll();
		const fresh = '- [ ] fresh #in-progress 🚀 2026-07-03T08:00\n';
		await obsidianPage.write(NOTE, fresh);
		// Let the observer (wrongly) fire on the closed-file write before asserting.
		await browser.pause(750);
		expect(await obsidianPage.read(NOTE)).toBe(fresh);
	});
});
