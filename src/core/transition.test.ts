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
