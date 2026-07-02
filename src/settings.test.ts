import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, withDefaults } from './settings';

describe('withDefaults', () => {
	it('fills every field from defaults when nothing is persisted', () => {
		expect(withDefaults(null)).toEqual(DEFAULT_SETTINGS);
		expect(withDefaults(undefined)).toEqual(DEFAULT_SETTINGS);
		expect(withDefaults({})).toEqual(DEFAULT_SETTINGS);
	});

	it('overrides only the persisted fields, keeping defaults for the rest', () => {
		expect(withDefaults({ activeTag: '#todo', startGlyph: '🎯' })).toEqual({
			activeTag: '#todo',
			startGlyph: '🎯',
			completedGlyph: DEFAULT_SETTINGS.completedGlyph,
		});
	});
});
