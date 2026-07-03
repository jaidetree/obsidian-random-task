import { describe, it, expect } from 'vitest';
import { applyEdits, reconcileContent } from './reconcile-content';
import type { RandomTaskSettings } from '../settings';

const settings: RandomTaskSettings = {
	activeTag: '#in-progress',
	startGlyph: '🚀',
	completedGlyph: '✅',
};
const NOW = '2026-07-03T09:00';

describe('reconcileContent', () => {
	it('emits one edit for the single line that was checked off', () => {
		const prev = ['# notes', '- [ ] a', '- [ ] b'].join('\n');
		const next = ['# notes', '- [ ] a', '- [x] b'].join('\n');
		expect(reconcileContent(prev, next, settings, NOW)).toEqual([
			{ line: 2, text: '- [x] b ✅ 2026-07-03T09:00' },
		]);
	});

	it('does not back-stamp pre-existing completed tasks on an unrelated edit', () => {
		const prev = ['- [x] done ✅ 2024-01-01', '- [ ] todo'].join('\n');
		const next = ['- [x] done ✅ 2024-01-01', '- [ ] todo edited'].join('\n');
		expect(reconcileContent(prev, next, settings, NOW)).toEqual([]);
	});

	it('returns no edits when nothing transitioned', () => {
		const doc = ['- [ ] a', '- [x] b ✅ 2026-07-01T10:00'].join('\n');
		expect(reconcileContent(doc, doc, settings, NOW)).toEqual([]);
	});
});

describe('applyEdits', () => {
	it('replaces the targeted lines and leaves the rest intact', () => {
		const content = ['a', 'b', 'c'].join('\n');
		expect(applyEdits(content, [{ line: 1, text: 'B!' }])).toBe(
			['a', 'B!', 'c'].join('\n'),
		);
	});

	it('returns content unchanged when there are no edits', () => {
		expect(applyEdits('a\nb', [])).toBe('a\nb');
	});
});
