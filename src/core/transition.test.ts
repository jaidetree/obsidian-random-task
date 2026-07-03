import { describe, it, expect } from 'vitest';
import { classifyTransition } from './transition';
import type { RandomTaskSettings } from '../settings';

const settings: RandomTaskSettings = {
	activeTag: '#in-progress',
	startGlyph: '🚀',
	completedGlyph: '✅',
};
const NOW = '2026-07-03T09:00';

describe('classifyTransition — completion stamping', () => {
	it('stamps completed glyph + datetime on [ ]→[x]', () => {
		expect(classifyTransition('- [ ] task', '- [x] task', settings, NOW)).toBe(
			'- [x] task ✅ 2026-07-03T09:00',
		);
	});

	it('strips the active tag when completing an active task', () => {
		expect(
			classifyTransition(
				'- [ ] task #in-progress 🚀 2026-07-03T08:00',
				'- [x] task #in-progress 🚀 2026-07-03T08:00',
				settings,
				NOW,
			),
		).toBe('- [x] task 🚀 2026-07-03T08:00 ✅ 2026-07-03T09:00');
	});

	it('does nothing when the line was already checked (no transition)', () => {
		expect(
			classifyTransition('- [x] task', '- [x] task edited', settings, NOW),
		).toBeNull();
	});

	it('does not re-stamp a task that already bears the completed glyph', () => {
		expect(
			classifyTransition(
				'- [ ] task ✅ 2026-07-01T10:00',
				'- [x] task ✅ 2026-07-01T10:00',
				settings,
				NOW,
			),
		).toBeNull();
	});

	it('leaves legacy date-only stamps untouched', () => {
		expect(
			classifyTransition(
				'- [ ] task ✅ 2024-01-01',
				'- [x] task ✅ 2024-01-01',
				settings,
				NOW,
			),
		).toBeNull();
	});

	it('ignores lines that are not hyphen tasks', () => {
		expect(classifyTransition('* [ ] task', '* [x] task', settings, NOW)).toBeNull();
		expect(classifyTransition('prose a', 'prose b', settings, NOW)).toBeNull();
	});

	it('does not loop on its own written output (re-entrancy safety)', () => {
		// Feeding the stamped line back as both prev and next yields no further
		// edit — the transition check alone keeps slice 03 loop-safe.
		const stamped = '- [x] task ✅ 2026-07-03T09:00';
		expect(classifyTransition(stamped, stamped, settings, NOW)).toBeNull();
	});
});

describe('classifyTransition — uncheck reset', () => {
	it('strips both glyphs, their datetimes, and the active tag on [x]→[ ]', () => {
		expect(
			classifyTransition(
				'- [x] task #in-progress 🚀 2026-07-03T08:00 ✅ 2026-07-03T09:00',
				'- [ ] task #in-progress 🚀 2026-07-03T08:00 ✅ 2026-07-03T09:00',
				settings,
				NOW,
			),
		).toBe('- [ ] task');
	});

	it('strips a start glyph left behind after the tag was manually removed', () => {
		// A drawn task re-rolled by deleting #in-progress keeps its start glyph;
		// unchecking must still reset it to a plain Candidate.
		expect(
			classifyTransition(
				'- [x] task 🚀 2026-07-03T08:00 ✅ 2026-07-03T09:00',
				'- [ ] task 🚀 2026-07-03T08:00 ✅ 2026-07-03T09:00',
				settings,
				NOW,
			),
		).toBe('- [ ] task');
	});

	it('resets to a plain Candidate — never leaving a second active marker', () => {
		const reset = classifyTransition(
			'- [x] task #in-progress ✅ 2026-07-03T09:00',
			'- [ ] task #in-progress ✅ 2026-07-03T09:00',
			settings,
			NOW,
		);
		expect(reset).toBe('- [ ] task');
		expect(reset).not.toContain('#in-progress');
	});

	it('preserves a trailing block reference through the reset', () => {
		expect(
			classifyTransition(
				'- [x] task 🚀 2026-07-03T08:00 ✅ 2026-07-03T09:00 ^abc123',
				'- [ ] task 🚀 2026-07-03T08:00 ✅ 2026-07-03T09:00 ^abc123',
				settings,
				NOW,
			),
		).toBe('- [ ] task ^abc123');
	});

	it('rewrites a no-glyph [x]→[ ] to a plain task (reconciler then makes no edit)', () => {
		// rewriteLine returns the line unchanged apart from the checkbox the user
		// already flipped, so `rewritten === nextLine` and no write is issued.
		expect(classifyTransition('- [x] task', '- [ ] task', settings, NOW)).toBe(
			'- [ ] task',
		);
	});

	it('ignores non-hyphen syntaxes on uncheck', () => {
		expect(classifyTransition('* [x] task', '* [ ] task', settings, NOW)).toBeNull();
	});
});
