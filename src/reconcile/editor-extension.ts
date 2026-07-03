/**
 * Editor-surface detection for completion stamping (ADR-0001).
 *
 * Source and Live Preview edits flow through CodeMirror 6. We inspect each
 * transaction's changed lines, classify any `[ ]`→`[x]` transition against the
 * pre-change text, and dispatch a follow-up change that appends the stamp — kept
 * on the editor so we never write to a file underneath its own open buffer.
 *
 * Two CM6 footguns are handled here:
 *   - You cannot dispatch from inside `update()`; the follow-up is deferred with
 *     `queueMicrotask`.
 *   - The follow-up must not re-trigger stamping. A shared `writing` guard marks
 *     our own dispatch so the listener (and the Reading-mode observer) ignore it.
 */
import { ViewPlugin } from '@codemirror/view';
import type { PluginValue, ViewUpdate } from '@codemirror/view';
import { MapMode } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import type { RandomTaskSettings } from '../settings';
import { classifyTransition } from '../core/transition';
import { formatLocalDateTime } from '../core/datetime';

/** Shared re-entrancy guard so plugin writes don't reconcile themselves. */
export interface WriteGuard {
	writing: boolean;
}

interface Spec {
	from: number;
	to: number;
	insert: string;
}

export function stampingExtension(
	getSettings: () => RandomTaskSettings,
	guard: WriteGuard,
): Extension {
	return ViewPlugin.fromClass(
		class implements PluginValue {
			private readonly view: import('@codemirror/view').EditorView;

			constructor(view: import('@codemirror/view').EditorView) {
				this.view = view;
			}

			update(update: ViewUpdate): void {
				if (!update.docChanged || guard.writing) return;

				const settings = getSettings();
				const now = formatLocalDateTime(new Date());
				const specs: Spec[] = [];

				update.changes.iterChanges((_fromA, _toA, fromB, toB) => {
					const doc = update.state.doc;
					const startLine = doc.lineAt(fromB).number;
					const endLine = doc.lineAt(toB).number;
					for (let n = startLine; n <= endLine; n++) {
						const nextLine = doc.line(n);
						const prevText = prevLineText(update, nextLine.from);
						if (prevText === null) continue;
						const rewritten = classifyTransition(
							prevText,
							nextLine.text,
							settings,
							now,
						);
						if (rewritten !== null && rewritten !== nextLine.text) {
							specs.push({
								from: nextLine.from,
								to: nextLine.to,
								insert: rewritten,
							});
						}
					}
				});

				if (specs.length === 0) return;
				// Defer: dispatching inside update() throws "calls to EditorView
				// updates are not allowed while an update is in progress".
				queueMicrotask(() => {
					guard.writing = true;
					try {
						this.view.dispatch({ changes: specs });
					} finally {
						guard.writing = false;
					}
				});
			}
		},
	);
}

/**
 * The pre-change text of the line that now begins at `posB`, mapped back into
 * the old document. Returns null if the position doesn't map cleanly (e.g. the
 * line is newly inserted), so such lines are skipped rather than misclassified.
 */
function prevLineText(update: ViewUpdate, posB: number): string | null {
	const posA = update.changes.mapPos(posB, -1, MapMode.TrackDel);
	if (posA === null) return null;
	const oldDoc = update.startState.doc;
	if (posA > oldDoc.length) return null;
	return oldDoc.lineAt(posA).text;
}
