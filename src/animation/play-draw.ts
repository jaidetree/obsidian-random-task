/**
 * Drives the Draw spin over a live CodeMirror view (ADR-0002 adapter). Given the
 * pure `planDraw` result, it plays the hop highlights with decelerating delays
 * from `planHops`, then commits the winning line exactly once — on landing,
 * never mid-spin — so undo history stays clean.
 *
 * Abort is range-scoped: a snapshot of the target Checklist's text is captured
 * up front and re-checked between hops. Any change to those lines (a user editing
 * or checking off within the Checklist mid-spin) cancels the draw with no
 * selection. This scoping is what makes the abort ignore both the reconciler's
 * own writes and check-offs elsewhere in the note — neither touches the snapshot
 * lines, so neither trips it. There is no Esc-cancel.
 */
import type { EditorView } from '@codemirror/view';
import type { DrawResult } from '../core/draw';
import { planHops } from '../core/animation';
import { setDrawHighlight } from './highlight';

type WinningDraw = Extract<DrawResult, { ok: true }>;

/** Hold on the winner while the landing bounce plays; must cover the CSS
 * animation duration (`.rts-draw-bounce`) so it never ends abruptly. */
const LANDING_SETTLE_MS = 360;
/** Keep the winner highlighted just after the commit so the stamp is visible. */
const POST_COMMIT_HOLD_MS = 160;

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => window.setTimeout(resolve, ms));

/** Current text of document lines `[start, end]` (0-based, inclusive). */
function rangeText(view: EditorView, start: number, end: number): string {
	const doc = view.state.doc;
	const from = doc.line(start + 1).from;
	const to = doc.line(end + 1).to;
	return doc.sliceString(from, to);
}

/**
 * Play the spin for a winning `planDraw` result, then commit the winner unless
 * the Checklist changed mid-spin. Resolves `'committed'` or `'aborted'`.
 */
export async function playDraw(
	view: EditorView,
	draw: WinningDraw,
): Promise<'committed' | 'aborted'> {
	const start = draw.candidateLines[0]!;
	const end = draw.candidateLines[draw.candidateLines.length - 1]!;
	const baseline = rangeText(view, start, end);
	const { hops } = planHops(draw.candidateLines.length, draw.winnerOffset);

	const clear = (): void => {
		view.dispatch({ effects: setDrawHighlight.of(null) });
	};

	const aborted = (): boolean => rangeText(view, start, end) !== baseline;

	// Spin: hop the highlight across the candidates, each with its own quick
	// indent kick (`tick` alternates the class so same-line pulses re-fire). The
	// landing is handled below so its bounce is not cut short by the commit/clear.
	for (let i = 0; i < hops.length; i++) {
		const line = draw.candidateLines[hops[i]!.candidateIndex]!;
		view.dispatch({
			effects: setDrawHighlight.of({ line, kind: 'hop', tick: i }),
		});
		await sleep(hops[i]!.delayMs);
		if (aborted()) {
			clear();
			return 'aborted';
		}
	}

	// Land: bounce on the winner and hold long enough for the CSS animation to
	// play out fully (see `.rts-draw-bounce` in styles.css) before writing, so it
	// never ends abruptly. A last edit during the hold still aborts.
	view.dispatch({
		effects: setDrawHighlight.of({ line: draw.lineIndex, kind: 'land', tick: 0 }),
	});
	await sleep(LANDING_SETTLE_MS);
	if (aborted()) {
		clear();
		return 'aborted';
	}

	const winner = view.state.doc.line(draw.lineIndex + 1);
	view.dispatch({
		changes: { from: winner.from, to: winner.to, insert: draw.text },
	});
	// Keep the winner highlighted briefly so the committed stamp is visible under
	// the highlight, then clear.
	await sleep(POST_COMMIT_HOLD_MS);
	clear();
	return 'committed';
}
