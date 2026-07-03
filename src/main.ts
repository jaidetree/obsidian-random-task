import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, withDefaults } from './settings';
import type { RandomTaskSettings } from './settings';
import { RandomTaskSettingTab } from './settings-tab';
import { registerReconciler } from './reconcile';
import { registerDrawCommand } from './commands/draw';

/**
 * Random Task Selector — plugin entry point.
 *
 * Lifecycle only. Feature logic is delegated to focused modules: settings
 * persistence + tab here, the observe-and-reconcile completion-stamping
 * plumbing in `reconcile/`, and the Draw command in `commands/`.
 */
export default class RandomTaskSelectorPlugin extends Plugin {
	settings: RandomTaskSettings = { ...DEFAULT_SETTINGS };

	async onload() {
		this.settings = withDefaults(
			(await this.loadData()) as Partial<RandomTaskSettings> | null,
		);
		this.addSettingTab(new RandomTaskSettingTab(this.app, this));
		registerReconciler(this);
		registerDrawCommand(this);
	}

	onunload() {}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
