/**
 * Observe-and-reconcile plumbing for completion stamping (ADR-0001).
 *
 * Registers the two detection paths and the shared re-entrancy guard:
 *   - Editor surfaces (Source, Live Preview): a CM6 extension that stamps in the
 *     editor buffer (`editor-extension.ts`).
 *   - Reading mode: a `vault.on('modify')` observer that diffs a per-file
 *     snapshot and writes back through the vault.
 *
 * The observer never diffs against nothing: a file with no prior snapshot is
 * recorded and left alone, so opening or externally touching a note with old
 * completed tasks never back-stamps them. Snapshots are seeded when a file is
 * opened or the active leaf changes, so the first Reading-mode click already has
 * a baseline to diff against.
 */
import { MarkdownView, TFile } from 'obsidian';
import type { Plugin } from 'obsidian';
import type { RandomTaskSettings } from '../settings';
import { formatLocalDateTime } from '../core/datetime';
import { applyEdits, reconcileContent } from './reconcile-content';
import { stampingExtension } from './editor-extension';
import type { WriteGuard } from './editor-extension';

/** Host the reconciler needs: the live settings and the app. */
export interface ReconcilerHost extends Plugin {
	settings: RandomTaskSettings;
}

export function registerReconciler(plugin: ReconcilerHost): void {
	const guard: WriteGuard = { writing: false };
	const snapshots = new Map<string, string>();
	const { vault, workspace } = plugin.app;

	plugin.registerEditorExtension(
		stampingExtension(() => plugin.settings, guard),
	);

	const seed = async (file: TFile | null): Promise<void> => {
		if (!isMarkdown(file)) return;
		snapshots.set(file.path, await vault.read(file));
	};

	plugin.registerEvent(
		workspace.on('file-open', (file) => void seed(file)),
	);
	plugin.registerEvent(
		workspace.on('active-leaf-change', () =>
			void seed(workspace.getActiveFile()),
		),
	);

	plugin.registerEvent(
		vault.on('modify', (file) => {
			if (guard.writing || !(file instanceof TFile) || !isMarkdown(file))
				return;
			const open = openModes(plugin, file);
			// Editor surfaces own their own files; stamping there goes through the
			// buffer, and writing to disk underneath an open editor would race it.
			if (open.source) return;
			// Only a file currently shown in a Reading-mode view can receive a
			// checkbox click. A modify on a file open in no view is a background
			// write (sync, another plugin, a test fixture swap) — reconciling it
			// would diff a stale snapshot and mis-read an unrelated content change
			// as a check-off/uncheck. Ignore it; the snapshot is refreshed on the
			// next file-open/leaf-change seed.
			if (!open.reading) return;
			void reconcileReadingModify(plugin, guard, snapshots, file);
		}),
	);

	// Seed the file already open when the plugin loads.
	void seed(workspace.getActiveFile());
}

async function reconcileReadingModify(
	plugin: ReconcilerHost,
	guard: WriteGuard,
	snapshots: Map<string, string>,
	file: TFile,
): Promise<void> {
	const { vault } = plugin.app;
	const content = await vault.read(file);
	const prev = snapshots.get(file.path);
	// Back-stamp guard: never diff against nothing.
	if (prev === undefined || prev === content) {
		snapshots.set(file.path, content);
		return;
	}

	const now = formatLocalDateTime(new Date());
	const edits = reconcileContent(prev, content, plugin.settings, now);
	if (edits.length === 0) {
		snapshots.set(file.path, content);
		return;
	}

	const updated = applyEdits(content, edits);
	guard.writing = true;
	try {
		await vault.modify(file, updated);
	} finally {
		guard.writing = false;
	}
	snapshots.set(file.path, updated);
}

function isMarkdown(file: TFile | null): file is TFile {
	return file instanceof TFile && file.extension === 'md';
}

/**
 * Which surfaces the file is currently open in: `source` (Source/Live Preview,
 * whose CM6 editor owns stamping) and `reading` (a Reading-mode view, the only
 * surface where a checkbox click drives the snapshot-diff path). A file open in
 * no markdown view yields `{ source: false, reading: false }`.
 */
function openModes(
	plugin: Plugin,
	file: TFile,
): { source: boolean; reading: boolean } {
	let source = false;
	let reading = false;
	plugin.app.workspace.iterateAllLeaves((leaf) => {
		const view = leaf.view;
		if (!(view instanceof MarkdownView) || view.file?.path !== file.path) return;
		if (view.getMode() === 'source') source = true;
		else reading = true;
	});
	return { source, reading };
}
