import { Plugin } from 'obsidian';

/**
 * Random Task Selector — plugin entry point.
 *
 * Lifecycle only. Feature logic (the Draw, completion stamping, settings) is
 * delegated to focused modules in later slices; this foundation slice ships the
 * plugin identity and the test harnesses, with no behavior yet.
 */
export default class RandomTaskSelectorPlugin extends Plugin {
	async onload() {}

	onunload() {}
}
