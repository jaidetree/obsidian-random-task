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

/** Move the highlight to a document line (0-based), or clear it with `null`. */
export const setDrawHighlight = StateEffect.define<{
	line: number;
	bounce: boolean;
} | null>();

const HOP = Decoration.line({ class: 'rts-draw-hop' });
const HOP_BOUNCE = Decoration.line({ class: 'rts-draw-hop rts-draw-bounce' });

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
				next = Decoration.set(
					(effect.value.bounce ? HOP_BOUNCE : HOP).range(from),
				);
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
