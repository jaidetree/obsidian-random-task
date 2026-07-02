/**
 * Plugin settings: the three user-configurable values the features consume —
 * the active tag, the start glyph, and the completed glyph.
 *
 * The interface and its default-fill are pure (no Obsidian runtime), so they
 * can be unit-tested and read by the pure core in later slices. The settings
 * tab UI lives in `settings-tab.ts`.
 */
export interface RandomTaskSettings {
	/** The tag marking the one Active task in a checklist. Stored with `#`. */
	activeTag: string;
	/** Glyph written with the selected-at datetime when a draw lands. */
	startGlyph: string;
	/** Glyph written with the completed-at datetime on check-off. */
	completedGlyph: string;
}

export const DEFAULT_SETTINGS: RandomTaskSettings = {
	activeTag: '#in-progress',
	startGlyph: '🚀',
	completedGlyph: '✅',
};

/**
 * Fill any missing fields of persisted data with defaults, so older or partial
 * saved data always resolves to a complete, usable settings object.
 */
export function withDefaults(
	loaded: Partial<RandomTaskSettings> | null | undefined,
): RandomTaskSettings {
	return { ...DEFAULT_SETTINGS, ...(loaded ?? {}) };
}
