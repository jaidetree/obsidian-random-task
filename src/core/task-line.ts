/**
 * Pure token model for a single `- [ ]` task line (ADR-0002).
 *
 * Parsing is order-independent; writing always uses the canonical left-to-right
 * order from the PRD:
 *
 *   `- [x] <description + existing tags> <active tag> <start glyph> <selected-at>
 *          <completed glyph> <completed-at> ^blockid`
 *
 * `rewriteLine` extracts the known tokens out of the body, applies the requested
 * add/strip operations, and reassembles in canonical order — always keeping a
 * trailing block reference (`^blockid`) as the last token. Tokens the caller
 * does not mention are preserved (e.g. completing an Active task keeps its start
 * glyph, so the duration story survives).
 *
 * Only `- [ ]` hyphen tasks are recognized (PRD "Scope of syntaxes").
 */
import type { RandomTaskSettings } from '../settings';

const TASK_RE = /^(\s*)- \[([ xX])\] (.*)$/;
const BLOCKREF_RE = /\s+(\^[A-Za-z0-9-]+)\s*$/;
// Accept both the new local datetime (`YYYY-MM-DDTHH:mm`) and legacy date-only
// (`YYYY-MM-DD`) stamps, so stripping a glyph carries its datetime with it.
const DATETIME = String.raw`\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?`;

export interface ParsedTask {
	/** Leading whitespace before the `-` marker. */
	indent: string;
	/** Whether the checkbox is checked (`[x]`/`[X]`). */
	checked: boolean;
	/** Content after the marker, excluding any trailing block reference. */
	body: string;
	/** Trailing block reference including `^`, or `''` when absent. */
	blockRef: string;
}

/** Parse a hyphen task line into its structural parts, or `null` if it isn't one. */
export function parseTaskLine(line: string): ParsedTask | null {
	const m = TASK_RE.exec(line);
	if (!m) return null;
	const indent = m[1] ?? '';
	const box = m[2] ?? ' ';
	let body = m[3] ?? '';
	let blockRef = '';
	const bm = BLOCKREF_RE.exec(body);
	if (bm) {
		blockRef = bm[1] ?? '';
		body = body.slice(0, bm.index);
	}
	return {
		indent,
		checked: box === 'x' || box === 'X',
		body: body.trimEnd(),
		blockRef,
	};
}

/** Whether a task line already carries the completed glyph (any datetime form). */
export function hasCompletedGlyph(
	line: string,
	settings: RandomTaskSettings,
): boolean {
	const parsed = parseTaskLine(line);
	return parsed ? extractGlyph(parsed.body, settings.completedGlyph).present : false;
}

/**
 * Whether a task line carries the Active tag — the sole definitive marker of the
 * Active state (the start glyph alone does not make a task Active). A non-task
 * line, or a task without the tag, is not Active.
 */
export function hasActiveTag(
	line: string,
	settings: RandomTaskSettings,
): boolean {
	const parsed = parseTaskLine(line);
	return parsed ? extractTag(parsed.body, settings.activeTag).present : false;
}

export interface RewriteOps {
	/** Add or strip the active tag. Omit to preserve current state. */
	activeTag?: 'add' | 'strip';
	/** Strip the start glyph, or write it with `at`. Omit to preserve. */
	start?: 'strip' | { at: string };
	/** Strip the completed glyph, or write it with `at`. Omit to preserve. */
	completed?: 'strip' | { at: string };
}

/**
 * Return `line` with the requested token operations applied in canonical order.
 * Non-task lines are returned unchanged. The checkbox state itself is never
 * altered here — callers set `[x]`/`[ ]`; this only manages the trailing tokens.
 */
export function rewriteLine(
	line: string,
	ops: RewriteOps,
	settings: RandomTaskSettings,
): string {
	const parsed = parseTaskLine(line);
	if (!parsed) return line;

	const tag = extractTag(parsed.body, settings.activeTag);
	const start = extractGlyph(tag.body, settings.startGlyph);
	const completed = extractGlyph(start.body, settings.completedGlyph);
	const base = completed.body.replace(/ {2,}/g, ' ').trim();

	const tagPresent =
		ops.activeTag === 'add'
			? true
			: ops.activeTag === 'strip'
				? false
				: tag.present;

	const startToken = resolveGlyph(settings.startGlyph, ops.start, start);
	const completedToken = resolveGlyph(
		settings.completedGlyph,
		ops.completed,
		completed,
	);

	const parts = [
		base,
		tagPresent ? settings.activeTag : '',
		startToken,
		completedToken,
	].filter((p) => p.length > 0);

	const box = parsed.checked ? 'x' : ' ';
	const suffix = parsed.blockRef ? ` ${parsed.blockRef}` : '';
	const content = parts.join(' ');
	return content
		? `${parsed.indent}- [${box}] ${content}${suffix}`
		: `${parsed.indent}- [${box}]${suffix}`;
}

interface Glyph {
	present: boolean;
	at?: string;
}

/** Resolve the rendered `glyph + datetime` token from an op and the current one. */
function resolveGlyph(
	glyph: string,
	op: RewriteOps['start'],
	current: Glyph,
): string {
	if (op === 'strip') return '';
	const at = op ? op.at : current.present ? current.at : undefined;
	if (op === undefined && !current.present) return '';
	return at ? `${glyph} ${at}` : glyph;
}

function extractTag(
	body: string,
	tag: string,
): { body: string; present: boolean } {
	const re = new RegExp(`(?:^|\\s)${escapeRe(tag)}(?=\\s|$)`);
	const m = re.exec(body);
	if (!m) return { body, present: false };
	return { body: cut(body, m.index, m[0].length), present: true };
}

function extractGlyph(body: string, glyph: string): { body: string } & Glyph {
	const re = new RegExp(`(?:^|\\s)${escapeRe(glyph)}(?:\\s+(${DATETIME}))?`);
	const m = re.exec(body);
	if (!m) return { body, present: false };
	return { body: cut(body, m.index, m[0].length), present: true, at: m[1] };
}

const cut = (s: string, at: number, len: number): string =>
	s.slice(0, at) + s.slice(at + len);

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
