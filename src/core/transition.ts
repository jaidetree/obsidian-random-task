/**
 * Classify what a single line's change implies for completion stamping
 * (ADR-0001). Pure and order-independent: given the previous and next text of
 * one line, decide whether the reconciler should write anything, and if so
 * return the replacement line.
 *
 * This slice (03) handles only the completion transition `[ ]`→`[x]`:
 *   - append the completed glyph + `now`, and
 *   - strip the active tag if present.
 * The reactivation transition `[x]`→`[ ]` is added in slice 04; the signature
 * already accommodates it.
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

	return null;
}
