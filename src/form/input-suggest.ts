import { AbstractInputSuggest } from 'obsidian';
import type { App, TFile } from 'obsidian';

interface LinkSuggestion {
	file: TFile;
	linkText: string;
}

interface LinkTrigger {
	from: number;
	query: string;
	to: number;
}

export class LinkInputSuggest extends AbstractInputSuggest<LinkSuggestion> {
	constructor(
		app: App,
		private readonly inputEl: HTMLInputElement,
		private readonly sourcePath: string,
		onSelect?: () => void,
	) {
		super(app, inputEl);
		if (onSelect !== undefined) {
			this.onSelect(onSelect);
		}
	}

	protected getSuggestions(value: string): LinkSuggestion[] {
		const trigger = getLinkTrigger(value, this.getCursor(value));
		if (trigger === null) {
			return [];
		}

		const normalizedQuery = trigger.query.toLocaleLowerCase();
		return this.app.vault
			.getMarkdownFiles()
			.map((file) => ({
				file,
				linkText: this.app.metadataCache.fileToLinktext(
					file,
					this.sourcePath,
					true,
				),
			}))
			.filter(({ file, linkText }) => {
				if (normalizedQuery === '') {
					return true;
				}
				return [file.basename, file.path, linkText].some((candidate) =>
					candidate.toLocaleLowerCase().includes(normalizedQuery),
				);
			})
			.sort((left, right) =>
				left.file.basename.localeCompare(right.file.basename) ||
				left.file.path.localeCompare(right.file.path),
			);
	}

	renderSuggestion(suggestion: LinkSuggestion, el: HTMLElement): void {
		const titleEl = el.ownerDocument.createElement('div');
		titleEl.className = 'suggestion-title';
		titleEl.textContent = suggestion.file.basename;
		el.appendChild(titleEl);

		if (suggestion.linkText !== suggestion.file.basename) {
			const noteEl = el.ownerDocument.createElement('div');
			noteEl.className = 'suggestion-note';
			noteEl.textContent = suggestion.file.path;
			el.appendChild(noteEl);
		}
	}

	selectSuggestion(
		suggestion: LinkSuggestion,
		event: MouseEvent | KeyboardEvent,
	): void {
		const value = this.inputEl.value;
		const trigger = getLinkTrigger(value, this.getCursor(value));
		if (trigger === null) {
			this.close();
			return;
		}

		const insertedLink = `[[${suggestion.linkText}]]`;
		this.inputEl.value =
			value.slice(0, trigger.from) +
			insertedLink +
			value.slice(trigger.to);
		const cursor = trigger.from + insertedLink.length;
		this.inputEl.setSelectionRange(cursor, cursor);
		this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
		super.selectSuggestion(suggestion, event);
	}

	private getCursor(value: string): number {
		return this.inputEl.value === value
			? (this.inputEl.selectionStart ?? value.length)
			: value.length;
	}
}

function getLinkTrigger(value: string, cursor: number): LinkTrigger | null {
	const beforeCursor = value.slice(0, cursor);
	const from = beforeCursor.lastIndexOf('[[');
	if (from < 0) {
		return null;
	}

	const query = beforeCursor.slice(from + 2);
	if (
		query.includes(']]') ||
		query.includes('\n') ||
		query.includes('\r') ||
		query.includes('|') ||
		query.includes('#')
	) {
		return null;
	}

	return {
		from,
		query,
		to: value.slice(cursor, cursor + 2) === ']]' ? cursor + 2 : cursor,
	};
}