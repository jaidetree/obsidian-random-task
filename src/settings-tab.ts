import { PluginSettingTab, Setting } from 'obsidian';
import type { App, Plugin } from 'obsidian';
import type { RandomTaskSettings } from './settings';
import { EmojiSuggestModal } from './ui/emoji-suggest-modal';

/**
 * The plugin surface the settings tab needs: the live settings object plus a
 * way to persist edits. Typed as an interface (rather than importing the plugin
 * class) to keep the dependency one-directional.
 */
export interface SettingsHost extends Plugin {
	settings: RandomTaskSettings;
	saveSettings(): Promise<void>;
}

/**
 * Settings tab exposing the three configurable values in order: active tag,
 * start glyph, completed glyph. Glyphs are chosen through an emoji-only picker.
 */
export class RandomTaskSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly host: SettingsHost,
	) {
		super(app, host);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Active tag')
			.setDesc('Tag marking the one active task in a checklist.')
			.addText((text) =>
				text
					.setPlaceholder('#in-progress')
					.setValue(this.host.settings.activeTag)
					.onChange(async (value) => {
						this.host.settings.activeTag = value;
						await this.host.saveSettings();
					}),
			);

		this.addGlyphSetting(
			'Start glyph',
			'Emoji stamped with the datetime a task is selected.',
			'startGlyph',
		);

		this.addGlyphSetting(
			'Completed glyph',
			'Emoji stamped with the datetime a task is completed.',
			'completedGlyph',
		);
	}

	private addGlyphSetting(
		name: string,
		desc: string,
		key: 'startGlyph' | 'completedGlyph',
	): void {
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(desc)
			.addButton((button) =>
				button
					.setButtonText(this.host.settings[key])
					.setTooltip('Select emoji')
					.onClick(() => {
						new EmojiSuggestModal(this.app, (emoji) => {
							this.host.settings[key] = emoji;
							this.display();
							void this.host.saveSettings();
						}).open();
					}),
			);
	}
}
