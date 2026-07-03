/**
 * Pure whole-file reconciliation for the Reading-mode path (ADR-0001).
 *
 * A Reading-mode checkbox click persists to disk and fires `vault.on('modify')`
 * with no CM6 transaction to inspect, so we diff a stored snapshot of the file
 * against its new content line by line and classify each changed line. Kept pure
 * (string in / edits out) so the diff logic is unit-testable without a vault.
 *
 * Lines are compared by index up to the shorter length; a check-off never
 * changes the line count, and edits elsewhere that shift lines simply produce no
 * completion transition.
 */
import type { RandomTaskSettings } from '../settings';
import { classifyTransition } from '../core/transition';

export interface LineEdit {
	/** Zero-based line index into the file. */
	line: number;
	/** Replacement text for that line. */
	text: string;
}

export function reconcileContent(
	prev: string,
	next: string,
	settings: RandomTaskSettings,
	now: string,
): LineEdit[] {
	const prevLines = prev.split('\n');
	const nextLines = next.split('\n');
	const count = Math.min(prevLines.length, nextLines.length);
	const edits: LineEdit[] = [];
	for (let i = 0; i < count; i++) {
		const prevLine = prevLines[i] ?? '';
		const nextLine = nextLines[i] ?? '';
		const rewritten = classifyTransition(prevLine, nextLine, settings, now);
		if (rewritten !== null && rewritten !== nextLine) {
			edits.push({ line: i, text: rewritten });
		}
	}
	return edits;
}

/** Apply line edits to file content, returning the new content. */
export function applyEdits(content: string, edits: LineEdit[]): string {
	if (edits.length === 0) return content;
	const lines = content.split('\n');
	for (const { line, text } of edits) {
		if (line >= 0 && line < lines.length) lines[line] = text;
	}
	return lines.join('\n');
}
