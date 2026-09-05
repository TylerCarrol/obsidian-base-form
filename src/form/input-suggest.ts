import { AbstractInputSuggest } from 'obsidian';
import type { App, TFile } from 'obsidian';

export interface LinkSuggestion {
	file: TFile;
	linkText: string;
}

interface LinkTrigger {
	from: number;
	query: string;
	to: number;
}

type ListValueProvider = () => readonly string[];

export type FormInputSuggest = LinkInputSuggest | ListInputSuggest;

export class LinkInputSuggest extends AbstractInputSuggest<LinkSuggestion> {
	constructor(
		app: App,
		private readonly inputEl: HTMLInputElement,
		private readonly sourcePath: string,
		onSelect?: () => void,
		private readonly candidates: readonly LinkSuggestion[] = [],
	) {
		super(app, inputEl);
		if (onSelect !== undefined) {
			this.onSelect(onSelect);
		}
		const openSuggestions = (): void => {
			if (this.getTrigger(inputEl.value) !== null) {
				this.open();
			}
		};
		inputEl.addEventListener('focus', openSuggestions);
		inputEl.addEventListener('pointerdown', () => {
			if (inputEl.ownerDocument.activeElement === inputEl) {
				openSuggestions();
			}
		});
	}

	protected getSuggestions(value: string): LinkSuggestion[] {
		const trigger = this.getTrigger(value);
		if (trigger === null) {
			return [];
		}

		const normalizedQuery = trigger.query.toLocaleLowerCase();
		return this.candidates
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
		el.createDiv({
			cls: 'suggestion-title',
			text: suggestion.file.basename,
		});

		if (suggestion.linkText !== suggestion.file.basename) {
			el.createDiv({
				cls: 'suggestion-note',
				text: suggestion.file.path,
			});
		}
	}

	selectSuggestion(
		suggestion: LinkSuggestion,
		event: MouseEvent | KeyboardEvent,
	): void {
		const value = this.inputEl.value;
		const trigger = this.getTrigger(value);
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

	private getTrigger(value: string): LinkTrigger | null {
		return (
			getLinkTrigger(value, this.getCursor(value)) ??
			getPlainInputTrigger(value)
		);
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

function getPlainInputTrigger(value: string): LinkTrigger | null {
	if (value.includes('[[') || value.includes(']]')) {
		return null;
	}

	return {
		from: 0,
		query: value,
		to: value.length,
	};
}

export class ListInputSuggest extends AbstractInputSuggest<string> {
	constructor(
		app: App,
		private readonly inputEl: HTMLInputElement,
		private readonly getCandidates: ListValueProvider,
		private readonly getCurrentValues: ListValueProvider,
		onSelect: () => void,
	) {
		super(app, inputEl);
		this.onSelect(onSelect);
	}

	protected getSuggestions(query: string): string[] {
		const normalizedQuery = query.trim().toLocaleLowerCase();
		const currentValues = new Set(
			this.getCurrentValues().map(normalizeListValue),
		);
		const seen = new Set<string>();

		return this.getCandidates()
			.filter((candidate) => {
				const normalizedCandidate = normalizeListValue(candidate);
				if (
					candidate === '' ||
					currentValues.has(normalizedCandidate) ||
					seen.has(normalizedCandidate)
				) {
					return false;
				}
				seen.add(normalizedCandidate);
				if (normalizedQuery === '') {
					return true;
				}
				return [candidate, getListValueLabel(candidate)].some((value) =>
					value.toLocaleLowerCase().includes(normalizedQuery),
				);
			})
			.sort((left, right) =>
				getListValueLabel(left).localeCompare(getListValueLabel(right)),
			);
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.textContent = getListValueLabel(value);
	}

	selectSuggestion(
		value: string,
		event: MouseEvent | KeyboardEvent,
	): void {
		this.inputEl.value = value;
		this.inputEl.setSelectionRange(value.length, value.length);
		this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
		super.selectSuggestion(value, event);
	}
}

function normalizeListValue(value: string): string {
	return value.toLocaleLowerCase();
}

function getListValueLabel(value: string): string {
	const wikilink = /^\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]$/.exec(
		value,
	);
	if (wikilink !== null) {
		const targetCapture: unknown = wikilink[1];
		const target = typeof targetCapture === 'string' ? targetCapture : value;
		const pathParts = target.replace(/\.md$/i, '').split('/');
		const labelCapture: unknown = wikilink[2];
		return typeof labelCapture === 'string'
			? labelCapture
			: pathParts[pathParts.length - 1] ?? target;
	}

	const markdownLink = /^\[([^\]]+)\]\([^)]+\)$/.exec(value);
	const markdownLabel: unknown = markdownLink?.[1];
	return typeof markdownLabel === 'string' ? markdownLabel : value;
}