/**
 * Pure Checklist geometry and selection for the Draw (ADR-0002).
 *
 * A Checklist is a maximal run of consecutive `- [ ]`/`- [x]` task items at the
 * cursor line's indentation, bounded by any line that is not such an item — a
 * blank line, prose, a bullet without a checkbox, or a differently-indented
 * (nested) item. Candidates are the unchecked items with no Active tag; a
 * Candidate may still carry a start glyph (a re-roll whose tag was removed), so
 * candidacy keys on the tag alone, never on the glyph.
 *
 * All string-in / index-out, no Obsidian runtime. The winning offset is passed
 * in (drawn uniformly in `[0, N)` by the adapter) rather than read from an RNG
 * here, so selection is deterministic under test.
 */
import type { RandomTaskSettings } from '../settings';
import { hasActiveTag, parseTaskLine } from './task-line';

/** Inclusive line range `[start, end]` of a Checklist within a document. */
export interface ChecklistRange {
	start: number;
	end: number;
}

/**
 * The Checklist containing `cursorLine`, or `null` when that line is not a task
 * item. The run extends up and down over consecutive task items sharing the
 * cursor line's exact indentation; any other line bounds it.
 */
export function findChecklist(
	lines: string[],
	cursorLine: number,
): ChecklistRange | null {
	const cursor = parseTaskLine(lines[cursorLine] ?? '');
	if (!cursor) return null;
	const indent = cursor.indent;

	const sameLevelTask = (i: number): boolean => {
		const parsed = parseTaskLine(lines[i] ?? '');
		return parsed !== null && parsed.indent === indent;
	};

	let start = cursorLine;
	while (start - 1 >= 0 && sameLevelTask(start - 1)) start--;
	let end = cursorLine;
	while (end + 1 < lines.length && sameLevelTask(end + 1)) end++;
	return { start, end };
}

/**
 * Candidate indices (relative to `checklistLines`): unchecked items with no
 * Active tag. Order is preserved so a winning offset maps back to a line.
 */
export function candidatesIn(
	checklistLines: string[],
	settings: RandomTaskSettings,
): number[] {
	const candidates: number[] = [];
	checklistLines.forEach((line, i) => {
		const parsed = parseTaskLine(line);
		if (parsed && !parsed.checked && !hasActiveTag(line, settings)) {
			candidates.push(i);
		}
	});
	return candidates;
}

/**
 * Whether any line in the Checklist is Active (unchecked + Active tag). A Draw
 * refuses against a Checklist that already holds an Active item.
 */
export function hasActiveTask(
	checklistLines: string[],
	settings: RandomTaskSettings,
): boolean {
	return checklistLines.some((line) => {
		const parsed = parseTaskLine(line);
		return parsed !== null && !parsed.checked && hasActiveTag(line, settings);
	});
}

/**
 * Map a landing `offset` to a winning Candidate index in `[0, candidateCount)`.
 * `offset` is expected in range (drawn uniformly by the adapter); it is reduced
 * modulo the count so the animation's `fullLoops * N + offset` hop total lands
 * correctly and a single Candidate always wins.
 */
export function selectWinner(candidateCount: number, offset: number): number {
	if (candidateCount <= 0) throw new Error('selectWinner: no candidates');
	return ((offset % candidateCount) + candidateCount) % candidateCount;
}
