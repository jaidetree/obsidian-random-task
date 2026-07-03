import { describe, it, expect } from 'vitest';
import {
	hasCompletedGlyph,
	parseTaskLine,
	rewriteLine,
} from './task-line';
import type { RandomTaskSettings } from '../settings';

const settings: RandomTaskSettings = {
	activeTag: '#in-progress',
	startGlyph: '🚀',
	completedGlyph: '✅',
};

describe('parseTaskLine', () => {
	it('returns null for non-hyphen-task lines', () => {
		expect(parseTaskLine('just prose')).toBeNull();
		expect(parseTaskLine('* [ ] star task')).toBeNull();
		expect(parseTaskLine('1. [ ] ordered task')).toBeNull();
	});

	it('reads indentation, checkbox state, body, and block ref', () => {
		expect(parseTaskLine('  - [x] do it ^abc-1')).toEqual({
			indent: '  ',
			checked: true,
			body: 'do it',
			blockRef: '^abc-1',
		});
		expect(parseTaskLine('- [ ] plain')).toEqual({
			indent: '',
			checked: false,
			body: 'plain',
			blockRef: '',
		});
	});
});

describe('hasCompletedGlyph', () => {
	it('is true when the completed glyph is present', () => {
		expect(hasCompletedGlyph('- [x] task ✅ 2026-07-03T09:00', settings)).toBe(
			true,
		);
	});

	it('recognizes legacy date-only stamps', () => {
		expect(hasCompletedGlyph('- [x] task ✅ 2024-01-01', settings)).toBe(true);
	});

	it('is false without the glyph and for non-tasks', () => {
		expect(hasCompletedGlyph('- [x] task', settings)).toBe(false);
		expect(hasCompletedGlyph('prose', settings)).toBe(false);
	});
});

describe('rewriteLine', () => {
	it('returns non-task lines unchanged', () => {
		expect(rewriteLine('prose', { completed: { at: 'x' } }, settings)).toBe(
			'prose',
		);
	});

	it('adds the completed glyph + datetime', () => {
		expect(
			rewriteLine('- [x] task', { completed: { at: '2026-07-03T09:00' } }, settings),
		).toBe('- [x] task ✅ 2026-07-03T09:00');
	});

	it('adds and strips the active tag', () => {
		expect(rewriteLine('- [ ] task', { activeTag: 'add' }, settings)).toBe(
			'- [ ] task #in-progress',
		);
		expect(
			rewriteLine('- [ ] task #in-progress', { activeTag: 'strip' }, settings),
		).toBe('- [ ] task');
	});

	it('adds and strips the start glyph', () => {
		expect(
			rewriteLine('- [ ] task', { start: { at: '2026-07-03T08:00' } }, settings),
		).toBe('- [ ] task 🚀 2026-07-03T08:00');
		expect(
			rewriteLine('- [ ] task 🚀 2026-07-03T08:00', { start: 'strip' }, settings),
		).toBe('- [ ] task');
	});

	it('writes tokens in canonical order regardless of existing arrangement', () => {
		// Input has completed before start and a tag in the middle — output is
		// canonical: description, active tag, start, completed.
		const input = '- [x] task ✅ 2026-07-03T09:00 #in-progress 🚀 2026-07-03T08:00';
		expect(rewriteLine(input, {}, settings)).toBe(
			'- [x] task #in-progress 🚀 2026-07-03T08:00 ✅ 2026-07-03T09:00',
		);
	});

	it('preserves a trailing block ref as the last token', () => {
		expect(
			rewriteLine('- [x] task ^blk', { completed: { at: '2026-07-03T09:00' } }, settings),
		).toBe('- [x] task ✅ 2026-07-03T09:00 ^blk');
	});

	it('preserves existing description and tags', () => {
		expect(
			rewriteLine(
				'- [x] buy milk #errand #home',
				{ completed: { at: '2026-07-03T09:00' } },
				settings,
			),
		).toBe('- [x] buy milk #errand #home ✅ 2026-07-03T09:00');
	});

	it('completing an active task strips the tag but keeps the start glyph', () => {
		expect(
			rewriteLine(
				'- [x] task #in-progress 🚀 2026-07-03T08:00',
				{ activeTag: 'strip', completed: { at: '2026-07-03T09:00' } },
				settings,
			),
		).toBe('- [x] task 🚀 2026-07-03T08:00 ✅ 2026-07-03T09:00');
	});

	it('honors custom glyph and tag settings', () => {
		const custom: RandomTaskSettings = {
			activeTag: '#doing',
			startGlyph: '🎯',
			completedGlyph: '🏁',
		};
		expect(
			rewriteLine(
				'- [x] task #doing 🎯 2026-07-03T08:00',
				{ activeTag: 'strip', completed: { at: '2026-07-03T09:00' } },
				custom,
			),
		).toBe('- [x] task 🎯 2026-07-03T08:00 🏁 2026-07-03T09:00');
	});
});
