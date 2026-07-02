import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, withDefaults } from './settings';
import type { RandomTaskSettings } from './settings';
import { RandomTaskSettingTab } from './settings-tab';

/**
 * Random Task Selector — plugin entry point.
 *
 * Lifecycle only. Feature logic (the Draw, completion stamping) is delegated to
 * focused modules in later slices; this slice loads/persists settings and
 * registers the settings tab, exposing the configured values on `settings` for
 * the core/adapter to read.
 */
export default class RandomTaskSelectorPlugin extends Plugin {
	settings: RandomTaskSettings = { ...DEFAULT_SETTINGS };

	async onload() {
		this.settings = withDefaults(
			(await this.loadData()) as Partial<RandomTaskSettings> | null,
		);
		this.addSettingTab(new RandomTaskSettingTab(this.app, this));
	}

	onunload() {}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
