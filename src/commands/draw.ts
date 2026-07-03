/**
 * Thin Obsidian adapter for the Draw command (ADR-0002). Reads the active
 * editor's lines and cursor, draws a uniform landing offset, delegates the
 * decision to the pure `planDraw`, and either applies the single line edit
 * through the editor or shows the matching refusal Notice. No domain logic
 * lives here.
 */
import { Notice, Plugin } from 'obsidian';
import type { RandomTaskSettings } from '../settings';
import { formatLocalDateTime } from '../core/datetime';
import { planDraw } from '../core/draw';
import type { DrawRefusal } from '../core/draw';

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

export function registerDrawCommand(plugin: DrawHost): void {
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
			editor.setLine(result.lineIndex, result.text);
		},
	});
}

// Re-export so tooling can reference the stable command id without hardcoding it.
export { COMMAND_ID as DRAW_COMMAND_ID };
