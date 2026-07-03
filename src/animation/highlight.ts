/**
 * CodeMirror line decoration for the Draw's spin (ADR-0002 adapter). A tiny
 * StateField holds at most one highlighted line; the animation driver dispatches
 * `setDrawHighlight` effects to move it and clears it (`null`) on landing/abort.
 * Rendering only — no timing, no domain logic. The visuals live in `styles.css`
 * (`.rts-draw-hop` background + `.rts-draw-bounce` indent nudge).
 */
import { StateEffect, StateField } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';

/**
 * Move the highlight to a document line (0-based), or clear it with `null`.
 * `kind` picks the motion: `'hop'` is the quick per-candidate indent kick as the
 * spin passes through, `'land'` is the springy settle on the winner. `tick`
 * alternates the hop class each step so the CSS animation re-fires even when
 * consecutive hops land on the *same* line (the single-candidate flourish) —
 * CodeMirror reuses the line element for an equal decoration, which would
 * otherwise suppress the replay.
 */
export const setDrawHighlight = StateEffect.define<{
	line: number;
	kind: 'hop' | 'land';
	tick: number;
} | null>();

const LAND = Decoration.line({ class: 'rts-draw-hop rts-draw-bounce' });
const HOP = [
	Decoration.line({ class: 'rts-draw-hop rts-draw-hop-bounce-0' }),
	Decoration.line({ class: 'rts-draw-hop rts-draw-hop-bounce-1' }),
];

const drawHighlightField = StateField.define<DecorationSet>({
	create: () => Decoration.none,
	update(deco, tr) {
		let next = deco.map(tr.changes);
		for (const effect of tr.effects) {
			if (!effect.is(setDrawHighlight)) continue;
			if (effect.value === null) {
				next = Decoration.none;
			} else {
				const doc = tr.state.doc;
				// Ignore a line index the doc no longer holds (defensive; a valid
				// spin never edits the checklist, and aborts clear the highlight).
				if (effect.value.line < 0 || effect.value.line >= doc.lines) {
					next = Decoration.none;
					continue;
				}
				const from = doc.line(effect.value.line + 1).from;
				const deco =
					effect.value.kind === 'land'
						? LAND
						: HOP[effect.value.tick % 2]!;
				next = Decoration.set(deco.range(from));
			}
		}
		return next;
	},
	provide: (field) => EditorView.decorations.from(field),
});

/** The editor extension backing the Draw highlight; register once per plugin. */
export function drawHighlightExtension(): Extension {
	return drawHighlightField;
}
