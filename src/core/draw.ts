/**
 * Pure orchestration of the Draw (ADR-0002): compose Checklist geometry,
 * Candidate filtering, winner selection, and the line rewrite into a single
 * decision — either the one edit to apply, or the reason to refuse. The thin
 * Obsidian adapter (`commands/draw.ts`) supplies `lines`, `cursorLine`, an
 * offset picker, and `now`, then applies the edit or shows the matching Notice.
 *
 * `pickOffset` is injected the true Candidate count `N` and returns a landing
 * offset in `[0, N)`. Injecting it here (rather than drawing in the adapter)
 * keeps the draw uniform — the adapter cannot know `N` before the core filters
 * Candidates, and drawing over any wider range then reducing mod `N` would bias
 * toward low indices (PRD). It also keeps selection deterministic under test.
 *
 * Refusal precedence is fixed here (not on a task line → already Active → no
 * Candidates) so it is proven at the pure seam rather than only through E2E.
 */
import type { RandomTaskSettings } from '../settings';
import { candidatesIn, findChecklist, hasActiveTask, selectWinner } from './checklist';
import { rewriteLine } from './task-line';

export type DrawRefusal = 'no-task-line' | 'already-active' | 'no-candidates';

export type DrawResult =
	| { ok: true; lineIndex: number; text: string }
	| { ok: false; reason: DrawRefusal };

/**
 * Decide the outcome of a Draw over `lines` with the cursor on `cursorLine`.
 * The winner (drawn via `pickOffset`) is marked Active: the active tag and the
 * start glyph + `now` are appended in canonical order, before any trailing
 * `^blockid`. Makes no decision to edit on any refusal.
 */
export function planDraw(
	lines: string[],
	cursorLine: number,
	settings: RandomTaskSettings,
	pickOffset: (candidateCount: number) => number,
	now: string,
): DrawResult {
	const range = findChecklist(lines, cursorLine);
	if (!range) return { ok: false, reason: 'no-task-line' };

	const checklistLines = lines.slice(range.start, range.end + 1);
	if (hasActiveTask(checklistLines, settings)) {
		return { ok: false, reason: 'already-active' };
	}

	const candidates = candidatesIn(checklistLines, settings);
	if (candidates.length === 0) return { ok: false, reason: 'no-candidates' };

	const winnerRelative =
		candidates[selectWinner(candidates.length, pickOffset(candidates.length))]!;
	const lineIndex = range.start + winnerRelative;
	const text = rewriteLine(
		lines[lineIndex]!,
		{ activeTag: 'add', start: { at: now } },
		settings,
	);
	return { ok: true, lineIndex, text };
}
