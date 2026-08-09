import { beforeAll, describe, expect, it, vi } from 'vitest';
import { StringValue } from 'obsidian';
import {
	renderEditableField,
	renderReadOnlyField,
	shouldEnableLinkSuggestions,
} from '../form/field-renderer';

beforeAll(() => {
	const prototype = HTMLElement.prototype as unknown as {
		createEl?: (
			tag: string,
			options?: {
				cls?: string;
				text?: string;
				attr?: Record<string, string>;
			},
		) => HTMLElement;
		createDiv?: (options?: {
			cls?: string;
			text?: string;
			attr?: Record<string, string>;
		}) => HTMLElement;
		createSpan?: (options?: {
			cls?: string;
			text?: string;
			attr?: Record<string, string>;
		}) => HTMLElement;
		addClass?: (...classes: string[]) => void;
		empty?: () => void;
		setText?: (text: string) => void;
	};

	if (prototype.createEl === undefined) {
		prototype.createEl = function createEl(
			this: HTMLElement,
			tag: string,
			options,
		): HTMLElement {
			const element = document.createElement(tag);
			if (options?.cls !== undefined) {
				element.className = options.cls;
			}
			if (options?.text !== undefined) {
				element.textContent = options.text;
			}
			if (options?.attr !== undefined) {
				for (const [name, value] of Object.entries(options.attr)) {
					element.setAttribute(name, value);
				}
			}
			this.appendChild(element);
			return element;
		};
	}

	if (prototype.createDiv === undefined) {
		prototype.createDiv = function createDiv(this: HTMLElement, options) {
			return this.createEl?.('div', options);
		};
	}

	if (prototype.createSpan === undefined) {
		prototype.createSpan = function createSpan(this: HTMLElement, options) {
			return this.createEl?.('span', options);
		};
	}

	if (prototype.addClass === undefined) {
		prototype.addClass = function addClass(this: HTMLElement, ...classes: string[]): void {
			this.classList.add(...classes);
		};
	}

	if (prototype.empty === undefined) {
		prototype.empty = function empty(this: HTMLElement): void {
			this.replaceChildren();
		};
	}

	if (prototype.setText === undefined) {
		prototype.setText = function setText(this: HTMLElement, text: string): void {
			this.textContent = text;
		};
	}
});

describe('link suggestion toggle', () => {
	it('enables link suggestions for editable text and list controls', () => {
		expect(shouldEnableLinkSuggestions('text')).toBe(true);
		expect(shouldEnableLinkSuggestions('list')).toBe(true);
		expect(shouldEnableLinkSuggestions('number')).toBe(false);
	});
});

describe('read-only link rendering', () => {
	it('renders markdown links to notes as internal links', () => {
		const app = {
			metadataCache: {
				getFirstLinkpathDest: vi.fn(() => ({ path: 'Demo notes/Ada Lovelace.md' })),
			},
		} as never;
		const fieldEl = document.createElement('div');

		renderReadOnlyField(
			app,
			fieldEl,
			'Reference',
			'Demo notes/Alan Turing.md',
			new StringValue('[Ada Lovelace](Ada Lovelace)'),
		);

		const link = fieldEl.querySelector<HTMLAnchorElement>('a.base-form-link');
		expect(link).not.toBeNull();
		expect(link?.dataset.filePath).toBe('Demo notes/Ada Lovelace.md');
	});

	it('renders markdown links with external URLs as clickable links', () => {
		const getFirstLinkpathDest = vi.fn();
		const app = {
			metadataCache: {
				getFirstLinkpathDest,
			},
		} as never;
		const fieldEl = document.createElement('div');

		renderReadOnlyField(
			app,
			fieldEl,
			'Documentation',
			'Demo notes/Ada Lovelace.md',
			new StringValue('[Guide](https://example.com/docs)'),
		);

		const link = fieldEl.querySelector<HTMLAnchorElement>('a.base-form-link');
		expect(link).not.toBeNull();
		expect(link?.href).toBe('https://example.com/docs');
		expect(link?.dataset.filePath).toBeUndefined();
		expect(getFirstLinkpathDest).not.toHaveBeenCalled();
	});
});

describe('editable text link rendering', () => {
	it('shows a link preview for text values containing links', () => {
		const app = {
			metadataCache: {
				getFirstLinkpathDest: vi.fn(() => ({ path: 'Demo notes/Grace Hopper.md' })),
			},
		} as never;
		const fieldEl = document.createElement('div');

		renderEditableField({
			app,
			controlId: 'reference-control',
			displayName: 'Reference',
			fieldEl,
			fieldType: 'text',
			filePath: 'Demo notes/Alan Turing.md',
			propertyName: 'reference',
			rawValue: '[[Grace Hopper]]',
			sourcePath: 'Demo notes/Alan Turing.md',
			value: new StringValue('[[Grace Hopper]]'),
		});

		const wrapper = fieldEl.querySelector<HTMLElement>(
			'.base-form-text-link-control',
		);
		expect(wrapper?.classList.contains('is-previewing')).toBe(true);

		const link = fieldEl.querySelector<HTMLAnchorElement>(
			'.base-form-text-link-preview a.base-form-link',
		);
		expect(link).not.toBeNull();
		expect(link?.dataset.filePath).toBe('Demo notes/Grace Hopper.md');
		expect(fieldEl.querySelectorAll('input').length).toBe(2);
	});
});

describe('editable list link suggestions', () => {
	it('commits a selected note as a linked list item', () => {
		const linkedFile = { path: 'Demo notes/Grace Hopper.md' };
		const app = {
			metadataCache: {
				getFirstLinkpathDest: vi.fn(() => linkedFile),
			},
		} as never;
		const fieldEl = document.createElement('div');
		const inputSuggest = renderEditableField({
			app,
			controlId: 'related-control',
			displayName: 'Related',
			fieldEl,
			fieldType: 'list',
			filePath: 'Demo notes/Alan Turing.md',
			propertyName: 'related',
			rawValue: [],
			sourcePath: 'Demo notes/Alan Turing.md',
			value: null,
		});
		const input = fieldEl.querySelector<HTMLInputElement>(
			'.base-form-list-input',
		);
		const hiddenValue = fieldEl.querySelector<HTMLInputElement>(
			'.base-form-list-value',
		);
		const inputValues: string[] = [];
		input?.addEventListener('input', () => {
			inputValues.push(input.value);
		});

		inputSuggest?.selectSuggestion(
			'[[Grace Hopper]]' as never,
			new KeyboardEvent('keydown', { key: 'Enter' }),
		);

		expect(hiddenValue?.value).toBe('[[Grace Hopper]]');
		expect(input?.value).toBe('');
		expect(inputValues).toEqual(['[[Grace Hopper]]', '']);
		expect(
			fieldEl.querySelector<HTMLAnchorElement>(
				'.base-form-list-chip a.base-form-link',
			)?.dataset.filePath,
		).toBe('Demo notes/Grace Hopper.md');
	});
});
