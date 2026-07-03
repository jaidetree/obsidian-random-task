import { describe, it, expect } from 'vitest';
import {
	candidatesIn,
	findChecklist,
	hasActiveTask,
	selectWinner,
} from './checklist';
import type { RandomTaskSettings } from '../settings';

const settings: RandomTaskSettings = {
	activeTag: '#in-progress',
	startGlyph: '🚀',
	completedGlyph: '✅',
};

describe('findChecklist — boundary detection', () => {
	it('returns null when the cursor line is not a task item', () => {
		expect(findChecklist(['# heading', '- [ ] a'], 0)).toBeNull();
		expect(findChecklist(['', '- [ ] a'], 0)).toBeNull();
		expect(findChecklist(['* [ ] star', '- [ ] a'], 0)).toBeNull();
	});

	it('spans the maximal run of same-indent task items around the cursor', () => {
		const lines = ['- [ ] a', '- [x] b', '- [ ] c'];
		expect(findChecklist(lines, 1)).toEqual({ start: 0, end: 2 });
	});

	it('is bounded by a blank line', () => {
		const lines = ['- [ ] a', '- [ ] b', '', '- [ ] c'];
		expect(findChecklist(lines, 1)).toEqual({ start: 0, end: 1 });
		expect(findChecklist(lines, 3)).toEqual({ start: 3, end: 3 });
	});

	it('is bounded by prose and by a bullet without a checkbox', () => {
		const lines = ['some prose', '- [ ] a', '- b', '- [ ] c'];
		expect(findChecklist(lines, 1)).toEqual({ start: 1, end: 1 });
	});

	it('excludes differently-indented (nested) items from the parent run', () => {
		const lines = ['- [ ] a', '  - [ ] nested', '- [ ] b'];
		// Cursor on a parent item: the nested item bounds the parent run.
		expect(findChecklist(lines, 0)).toEqual({ start: 0, end: 0 });
		// Cursor on the nested item: its own single-item checklist.
		expect(findChecklist(lines, 1)).toEqual({ start: 1, end: 1 });
	});

	it('handles a single-item list', () => {
		expect(findChecklist(['- [ ] only'], 0)).toEqual({ start: 0, end: 0 });
	});
});

describe('candidatesIn — candidate filtering', () => {
	it('keeps only unchecked, untagged items', () => {
		const lines = [
			'- [ ] plain candidate',
			'- [x] completed ✅ 2026-07-03T09:00',
			'- [ ] active #in-progress 🚀 2026-07-03T08:00',
			'- [ ] second candidate',
		];
		expect(candidatesIn(lines, settings)).toEqual([0, 3]);
	});

	it('counts a start-glyph-carrying but untagged item as a candidate (re-roll)', () => {
		// The tag was manually removed to re-roll; the start glyph alone does not
		// make the line Active, so it is eligible again.
		const lines = ['- [ ] rerolled 🚀 2026-07-03T08:00'];
		expect(candidatesIn(lines, settings)).toEqual([0]);
	});

	it('returns an empty set when every item is completed or active', () => {
		const lines = [
			'- [x] done ✅ 2026-07-03T09:00',
			'- [ ] active #in-progress',
		];
		expect(candidatesIn(lines, settings)).toEqual([]);
	});
});

describe('hasActiveTask', () => {
	it('is true when any line is unchecked and tagged active', () => {
		expect(
			hasActiveTask(['- [ ] a', '- [ ] b #in-progress'], settings),
		).toBe(true);
	});

	it('is false when no line carries the active tag', () => {
		expect(hasActiveTask(['- [ ] a', '- [x] b ✅ 2026-07-03'], settings)).toBe(
			false,
		);
	});

	it('does not treat a completed (checked) tagged line as an active task', () => {
		// A checked line is Completed, not Active, even if it still bears the tag.
		expect(hasActiveTask(['- [x] b #in-progress'], settings)).toBe(false);
	});
});

describe('selectWinner — uniform, no low-index bias', () => {
	it('maps each offset in [0, N) onto a distinct index (a bijection)', () => {
		const N = 5;
		const winners = Array.from({ length: N }, (_, offset) =>
			selectWinner(N, offset),
		);
		expect(winners).toEqual([0, 1, 2, 3, 4]);
		// No collisions → every candidate is reachable exactly once.
		expect(new Set(winners).size).toBe(N);
	});

	it('always selects the sole candidate when N = 1', () => {
		expect(selectWinner(1, 0)).toBe(0);
		expect(selectWinner(1, 7)).toBe(0);
	});

	it('reduces a full-loop offset (fullLoops * N + k) to k', () => {
		// The animation expresses hops as fullLoops * N + offset; the landing index
		// is that total mod N — never a biased truncation.
		expect(selectWinner(3, 3 * 3 + 2)).toBe(2);
	});

	it('throws when asked to select from no candidates', () => {
		expect(() => selectWinner(0, 0)).toThrow();
	});
});
