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

describe('number buttons', () => {
	function renderNumberField(
		numberButtonLayout: 'none' | 'left-right' | 'top-bottom',
	): HTMLElement {
		const fieldEl = document.createElement('div');
		renderEditableField({
			app: {} as never,
			controlId: 'score-control',
			displayName: 'Score',
			draftValue: '5',
			fieldEl,
			fieldType: 'number',
			filePath: 'Demo notes/Alan Turing.md',
			numberButtonLayout,
			propertyName: 'score',
			rawValue: 5,
			sourcePath: 'Demo notes/Alan Turing.md',
			value: null,
		});
		return fieldEl;
	}

	it('does not render buttons for the none layout', () => {
		const fieldEl = renderNumberField('none');

		expect(fieldEl.querySelector('.base-form-number-control.is-none')).not.toBeNull();
		expect(fieldEl.querySelectorAll('.base-form-number-button')).toHaveLength(0);
	});

	it('renders left and right buttons that update the input and emit save events', () => {
		const fieldEl = renderNumberField('left-right');
		const wrapper = fieldEl.querySelector<HTMLElement>('.base-form-number-control');
		const input = fieldEl.querySelector<HTMLInputElement>('input[type="number"]');
		const inputListener = vi.fn();
		const changeListener = vi.fn();
		fieldEl.addEventListener('input', inputListener);
		fieldEl.addEventListener('change', changeListener);

		wrapper?.querySelector<HTMLButtonElement>('[aria-label="Increase Score"]')?.click();

		expect(input?.value).toBe('6');
		expect(inputListener).toHaveBeenCalledOnce();
		expect(changeListener).toHaveBeenCalledOnce();
		expect(wrapper?.firstElementChild?.getAttribute('aria-label')).toBe(
			'Decrease Score',
		);
		expect(wrapper?.lastElementChild?.getAttribute('aria-label')).toBe(
			'Increase Score',
		);
	});

	it('stacks increment above decrement for the top and bottom layout', () => {
		const fieldEl = renderNumberField('top-bottom');
		const buttons = fieldEl.querySelectorAll<HTMLButtonElement>(
			'.base-form-number-buttons .base-form-number-button',
		);

		expect(Array.from(buttons, (button) => button.ariaLabel)).toEqual([
			'Increase Score',
			'Decrease Score',
		]);
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
	it('confirms before deleting a list item when enabled', () => {
		const fieldEl = document.createElement('div');
		renderEditableField({
			app: { metadataCache: { getFirstLinkpathDest: vi.fn() } } as never,
			confirmListItemDeletion: true,
			controlId: 'tags-control',
			displayName: 'Tags',
			fieldEl,
			fieldType: 'list',
			filePath: 'Demo notes/Alan Turing.md',
			propertyName: 'tags',
			rawValue: ['Alpha', 'Beta'],
			sourcePath: 'Demo notes/Alan Turing.md',
			value: null,
		});
		const hiddenValue = fieldEl.querySelector<HTMLInputElement>(
			'.base-form-list-value',
		);

		fieldEl.querySelector<HTMLButtonElement>('.base-form-list-chip-remove')?.click();

		expect(hiddenValue?.value).toBe('Alpha\nBeta');
		const modal = document.querySelector<HTMLElement>('.modal-container');
		expect(modal?.textContent).toContain('Delete list item?');
		expect(modal?.textContent).toContain('Delete "Alpha" from this list?');

		modal?.querySelector<HTMLButtonElement>('button.mod-warning')?.click();

		expect(hiddenValue?.value).toBe('Beta');
	});

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

	it('reorders list items by drag and drop', () => {
		const fieldEl = document.createElement('div');
		renderEditableField({
			app: { metadataCache: { getFirstLinkpathDest: vi.fn() } } as never,
			controlId: 'tags-control',
			displayName: 'Tags',
			fieldEl,
			fieldType: 'list',
			filePath: 'Demo notes/Alan Turing.md',
			propertyName: 'tags',
			rawValue: ['Alpha', 'Beta', 'Gamma'],
			sourcePath: 'Demo notes/Alan Turing.md',
			value: null,
		});
		const chips = fieldEl.querySelectorAll<HTMLElement>(
			'.base-form-list-chip',
		);
		const hiddenValue = fieldEl.querySelector<HTMLInputElement>(
			'.base-form-list-value',
		);
		const changeListener = vi.fn();
		fieldEl.addEventListener('change', changeListener);

		chips[0]?.dispatchEvent(new Event('dragstart', { bubbles: true }));
		chips[1]?.dispatchEvent(new Event('dragover', { bubbles: true }));
		chips[1]?.dispatchEvent(new Event('drop', { bubbles: true }));

		expect(hiddenValue?.value).toBe('Beta\nAlpha\nGamma');
		expect(changeListener).toHaveBeenCalledOnce();
	});
});
