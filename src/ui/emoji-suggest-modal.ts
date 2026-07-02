import { FuzzySuggestModal } from 'obsidian';
import type { App, FuzzyMatch } from 'obsidian';
import allEmojis from 'unicode-emoji-json/data-by-emoji.json';

/**
 * A single selectable emoji: the character itself plus its searchable name.
 */
interface EmojiItem {
	emoji: string;
	name: string;
}

const EMOJI_ITEMS: EmojiItem[] = Object.entries(
	allEmojis as Record<string, { name: string }>,
).map(([emoji, meta]) => ({ emoji, name: meta.name }));

/**
 * Emoji-only picker modeled on the sibling kanban-base `IconSuggestModal`, with
 * the Lucide-icon branch removed: only glyphs that render inline in note text
 * are selectable (Lucide icons cannot be serialized inline).
 */
export class EmojiSuggestModal extends FuzzySuggestModal<EmojiItem> {
	constructor(
		app: App,
		private readonly onChoose: (emoji: string) => void,
	) {
		super(app);
		this.setPlaceholder('Search emoji…');
	}

	getItems(): EmojiItem[] {
		return EMOJI_ITEMS;
	}

	getItemText(item: EmojiItem): string {
		return item.name;
	}

	renderSuggestion(match: FuzzyMatch<EmojiItem>, el: HTMLElement): void {
		el.addClass('random-task-emoji-suggestion');
		el.createSpan({
			text: match.item.emoji,
			cls: 'random-task-emoji-suggestion-glyph',
		});
		el.createSpan({
			text: match.item.name,
			cls: 'random-task-emoji-suggestion-name',
		});
	}

	onChooseItem(item: EmojiItem): void {
		this.onChoose(item.emoji);
	}
}
