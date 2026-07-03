/**
 * Classify what a single line's change implies for completion stamping
 * (ADR-0001). Pure and order-independent: given the previous and next text of
 * one line, decide whether the reconciler should write anything, and if so
 * return the replacement line.
 *
 * Two transitions are recognized:
 *   - Completion `[ ]`→`[x]`: append the completed glyph + `now`, and strip the
 *     active tag if present.
 *   - Reset `[x]`→`[ ]`: strip both the start and completed glyphs (with their
 *     datetimes) and any active tag, leaving a plain unstamped Candidate. A
 *     `[x]` line carrying no glyphs or tag becomes a plain `[ ]`, unchanged
 *     apart from the checkbox (the reconciler then makes no write).
 *
 * `now` is injected (formatted via `formatLocalDateTime`) rather than read from
 * the clock here, keeping classification deterministic under test.
 */
import type { RandomTaskSettings } from '../settings';
import { hasCompletedGlyph, parseTaskLine, rewriteLine } from './task-line';

export function classifyTransition(
	prevLine: string,
	nextLine: string,
	settings: RandomTaskSettings,
	now: string,
): string | null {
	const prev = parseTaskLine(prevLine);
	const next = parseTaskLine(nextLine);
	if (!prev || !next) return null;

	// Completion: the actual `[ ]`→`[x]` transition only — never a file scan, so
	// old completed tasks are never back-stamped.
	if (!prev.checked && next.checked) {
		// Already stamped (incl. legacy date-only stamps) → leave untouched.
		if (hasCompletedGlyph(nextLine, settings)) return null;
		return rewriteLine(
			nextLine,
			{ activeTag: 'strip', completed: { at: now } },
			settings,
		);
	}

	// Reset: the actual `[x]`→`[ ]` transition only. Strip both glyphs and any
	// active tag so the task returns to a plain Candidate — eligible to be drawn
	// again and never a second active task. A line with nothing to strip
	// rewrites to itself, so the reconciler makes no further edit.
	if (prev.checked && !next.checked) {
		return rewriteLine(
			nextLine,
			{ activeTag: 'strip', start: 'strip', completed: 'strip' },
			settings,
		);
	}

	return null;
}
