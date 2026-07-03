/**
 * Thin Obsidian adapter for the Draw command (ADR-0002). Reads the active
 * editor's lines and cursor, draws a uniform landing offset, and delegates the
 * decision to the pure `planDraw`. On a winning draw it plays the in-editor spin
 * (`animation/play-draw.ts`) over the live CodeMirror view and commits the winner
 * once, on landing; on a refusal it shows the matching Notice. No domain logic
 * lives here.
 */
import { Notice, Plugin } from 'obsidian';
import type { Editor } from 'obsidian';
import type { EditorView } from '@codemirror/view';
import type { RandomTaskSettings } from '../settings';
import { formatLocalDateTime } from '../core/datetime';
import { planDraw } from '../core/draw';
import type { DrawRefusal } from '../core/draw';
import { drawHighlightExtension } from '../animation/highlight';
import { playDraw } from '../animation/play-draw';

/** Host the command needs: the live settings. */
export interface DrawHost extends Plugin {
	settings: RandomTaskSettings;
}

const COMMAND_ID = 'draw-random-task';

const REFUSAL_NOTICE: Record<DrawRefusal, string> = {
	'no-task-line': 'Place the cursor on a checklist task to draw.',
	'already-active': 'This checklist already has an active task.',
	'no-candidates': 'No candidate tasks left in this checklist.',
};

/** The CM6 view backing an Obsidian editor; `cm` is present but untyped. */
function editorView(editor: Editor): EditorView | null {
	return (editor as unknown as { cm?: EditorView }).cm ?? null;
}

export function registerDrawCommand(plugin: DrawHost): void {
	plugin.registerEditorExtension(drawHighlightExtension());
	plugin.addCommand({
		id: COMMAND_ID,
		name: 'Draw a random task from this checklist',
		editorCallback: (editor) => {
			const lines = editor.getValue().split('\n');
			const cursorLine = editor.getCursor().line;
			// Draw the landing offset uniformly over the true candidate count N,
			// which the pure core supplies once it has filtered candidates.
			const pickOffset = (n: number): number => Math.floor(Math.random() * n);
			const now = formatLocalDateTime(new Date());
			const result = planDraw(lines, cursorLine, plugin.settings, pickOffset, now);

			if (!result.ok) {
				new Notice(REFUSAL_NOTICE[result.reason]);
				return;
			}

			const view = editorView(editor);
			if (!view) {
				// No CM6 view (e.g. a legacy editor surface): commit without the spin.
				editor.setLine(result.lineIndex, result.text);
				return;
			}
			void playDraw(view, result);
		},
	});
}

// Re-export so tooling can reference the stable command id without hardcoding it.
export { COMMAND_ID as DRAW_COMMAND_ID };
