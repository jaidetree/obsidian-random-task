import { describe, it, expect } from 'vitest';
import { planDraw } from './draw';
import type { RandomTaskSettings } from '../settings';

const settings: RandomTaskSettings = {
	activeTag: '#in-progress',
	startGlyph: '🚀',
	completedGlyph: '✅',
};
const NOW = '2026-07-03T08:00';
const pickFirst = () => 0;

describe('planDraw — refusals', () => {
	it('refuses when the cursor is not on a task line', () => {
		expect(planDraw(['# heading', '- [ ] a'], 0, settings, pickFirst, NOW)).toEqual(
			{ ok: false, reason: 'no-task-line' },
		);
	});

	it('refuses when the checklist already has an active task', () => {
		const lines = ['- [ ] a', '- [ ] b #in-progress', '- [ ] c'];
		expect(planDraw(lines, 0, settings, pickFirst, NOW)).toEqual({
			ok: false,
			reason: 'already-active',
		});
	});

	it('refuses when the checklist has no candidates', () => {
		const lines = ['- [x] a ✅ 2026-07-03T07:00', '- [x] b ✅ 2026-07-03T07:30'];
		expect(planDraw(lines, 0, settings, pickFirst, NOW)).toEqual({
			ok: false,
			reason: 'no-candidates',
		});
	});

	it('applies the active-task refusal before the no-candidates check', () => {
		// A checklist with an active task and no other candidates must report the
		// active task, not "no candidates" — the precedence is fixed.
		const lines = ['- [ ] a #in-progress'];
		expect(planDraw(lines, 0, settings, pickFirst, NOW)).toEqual({
			ok: false,
			reason: 'already-active',
		});
	});
});

describe('planDraw — winning edit', () => {
	it('marks the drawn candidate active with tag + start glyph + datetime', () => {
		const lines = ['- [ ] a', '- [ ] b'];
		expect(planDraw(lines, 0, settings, pickFirst, NOW)).toEqual({
			ok: true,
			lineIndex: 0,
			text: '- [ ] a #in-progress 🚀 2026-07-03T08:00',
		});
	});

	it('maps the offset through the candidate list to the correct document line', () => {
		// A completed line sits between two candidates, so candidate index 1 is
		// document line 2 — offset 1 must land there, proving the candidate-relative
		// → document-line mapping skips the non-candidate.
		const lines = [
			'- [ ] first',
			'- [x] done ✅ 2026-07-03T07:00',
			'- [ ] last',
		];
		const pickSecond = (n: number) => 1 % n;
		expect(planDraw(lines, 0, settings, pickSecond, NOW)).toEqual({
			ok: true,
			lineIndex: 2,
			text: '- [ ] last #in-progress 🚀 2026-07-03T08:00',
		});
	});

	it('scopes the draw to the checklist at the cursor, not other lists', () => {
		const lines = [
			'- [ ] other-a',
			'',
			'- [ ] target-a',
			'- [ ] target-b',
		];
		// Cursor in the second checklist: winner must come from lines 2–3.
		const result = planDraw(lines, 3, settings, () => 1, NOW);
		expect(result).toEqual({
			ok: true,
			lineIndex: 3,
			text: '- [ ] target-b #in-progress 🚀 2026-07-03T08:00',
		});
	});

	it('selects the sole candidate and preserves a trailing block ref', () => {
		const lines = ['- [ ] only ^blk'];
		expect(planDraw(lines, 0, settings, pickFirst, NOW)).toEqual({
			ok: true,
			lineIndex: 0,
			text: '- [ ] only #in-progress 🚀 2026-07-03T08:00 ^blk',
		});
	});
});
