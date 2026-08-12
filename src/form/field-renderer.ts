import {
	App,
	ListValue,
	NullValue,
	StringValue,
	RenderContext,
} from 'obsidian';
import type { Value } from 'obsidian';
import { formatFormValue } from './property-values';
import type {
	FormControlValue,
	FormFieldType,
} from './property-values';
import {
	LinkInputSuggest,
	ListInputSuggest,
} from './input-suggest';
import type { FormInputSuggest } from './input-suggest';

export type FormControl = HTMLInputElement | HTMLTextAreaElement;

interface DeletePropertyAction {
	onClick: () => void;
}

interface EditableFieldOptions {
	app: App;
	controlId: string;
	displayName: string;
	draftValue?: FormControlValue;
	deleteAction?: DeletePropertyAction;
	fieldEl: HTMLElement;
	fieldType: FormFieldType;
	filePath: string;
	listSuggestions?: readonly string[];
	propertyName: string;
	rawValue: unknown;
	sourcePath: string;
	value: Value | null;
}

function renderDeleteButton(
	containerEl: HTMLElement,
	displayName: string,
	deleteAction?: DeletePropertyAction,
): void {
	if (deleteAction === undefined) {
		return;
	}
	const deleteButton = containerEl.createEl('button', {
		cls: 'base-form-delete-property',
		text: 'Delete',
	});
	deleteButton.type = 'button';
	deleteButton.ariaLabel = `Delete ${displayName} property`;
	deleteButton.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		deleteAction.onClick();
	});
}

export function renderEditableField({
	app,
	controlId,
	displayName,
	draftValue,
	deleteAction,
	fieldEl,
	fieldType,
	filePath,
	listSuggestions = [],
	propertyName,
	rawValue,
	sourcePath,
	value,
}: EditableFieldOptions): FormInputSuggest | null {
	const labelEl = fieldEl.createEl('label', {
		cls: 'base-form-field-label',
	});
	labelEl.createSpan({ text: displayName });

	const fieldBodyEl = fieldEl.createDiv({ cls: 'base-form-field-body' });
	const fallback = getValueFallback(fieldType, value);
	const { control, focusControl, inputSuggest } = createControl(
		app,
		fieldBodyEl,
		fieldType,
		draftValue ??
			formatFormValue(fieldType, rawValue, fallback),
		sourcePath,
		listSuggestions,
	);
	renderDeleteButton(fieldBodyEl, displayName, deleteAction);
	control.id = controlId;
	const focusId =
		focusControl === control ? controlId : `${controlId}-editor`;
	focusControl.id = focusId;
	labelEl.htmlFor = focusId;
	control.dataset.filePath = filePath;
	control.dataset.propertyName = propertyName;
	control.dataset.fieldType = fieldType;
	if (focusControl !== control) {
		control.dataset.focusControlId = focusId;
	}

	const statusEl = fieldEl.createEl('small', {
		cls: 'base-form-field-status',
	});
	statusEl.id = `${controlId}-status`;
	statusEl.setAttribute('aria-live', 'polite');
	control.setAttribute('aria-describedby', statusEl.id);
	if (focusControl !== control) {
		focusControl.setAttribute('aria-describedby', statusEl.id);
	}

	return inputSuggest;
}

export function renderReadOnlyField(
	app: App,
	fieldEl: HTMLElement,
	displayName: string,
	sourcePath: string,
	value: Value | null,
	deleteAction?: DeletePropertyAction,
): void {
	fieldEl.addClass('is-read-only');
	const labelEl = fieldEl.createDiv({ cls: 'base-form-field-label' });
	labelEl.createSpan({ text: displayName });
	labelEl.createSpan({
		cls: 'base-form-read-only-badge',
		text: 'Read only',
	});

	const fieldBodyEl = fieldEl.createDiv({ cls: 'base-form-field-body' });
	const valueEl = fieldBodyEl.createDiv({ cls: 'base-form-read-only-value' });
	renderDeleteButton(fieldBodyEl, displayName, deleteAction);
	if (value === null || value === NullValue.value) {
		valueEl.setText('Not set');
		return;
	}
	if (value instanceof ListValue) {
		renderLinkAwareList(valueEl, app, sourcePath, value);
		return;
	}
	if (value instanceof StringValue) {
		renderLinkAwareText(valueEl, app, sourcePath, value.toString());
		return;
	}
	const renderedValue = value.toString();
	if (hasLinkSyntax(renderedValue)) {
		renderLinkAwareText(valueEl, app, sourcePath, renderedValue);
		return;
	}
	value.renderTo(valueEl, new RenderContext());
}

interface CreatedControl {
	control: FormControl;
	focusControl: FormControl;
	inputSuggest: FormInputSuggest | null;
}

function createControl(
	app: App,
	fieldEl: HTMLElement,
	fieldType: FormFieldType,
	value: FormControlValue,
	sourcePath: string,
	listSuggestions: readonly string[],
): CreatedControl {
	if (fieldType === 'list') {
		return createListControl(
			app,
			fieldEl,
			String(value),
			sourcePath,
			listSuggestions,
		);
	}

	if (fieldType === 'text' && String(value).includes('\n')) {
		const textarea = fieldEl.createEl('textarea', {
			cls: 'base-form-control',
			attr: { rows: '3' },
		});
		textarea.value = String(value);
		return {
			control: textarea,
			focusControl: textarea,
			inputSuggest: null,
		};
	}

	if (fieldType === 'text' && hasLinkSyntax(String(value))) {
		return createLinkedTextControl(
			app,
			fieldEl,
			String(value),
			sourcePath,
		);
	}

	const input = fieldEl.createEl('input', {
		cls: 'base-form-control',
		attr: { autocomplete: 'off' },
	});
	switch (fieldType) {
		case 'checkbox':
			input.type = 'checkbox';
			input.checked = value === true;
			break;
		case 'date':
			input.type = 'date';
			input.value = String(value);
			break;
		case 'datetime':
			input.type = 'datetime-local';
			input.step = '1';
			input.value = String(value);
			break;
		case 'number':
			input.type = 'number';
			input.step = 'any';
			input.value = String(value);
			break;
		case 'text':
			input.type = 'text';
			input.value = String(value);
			shouldEnableLinkSuggestions(fieldType);
			break;

	}
	return {
		control: input,
		focusControl: input,
		inputSuggest: shouldEnableLinkSuggestions(fieldType)
			? new LinkInputSuggest(app, input, sourcePath)
			: null,
	};
}

function createListControl(
	app: App,
	fieldEl: HTMLElement,
	value: string,
	sourcePath: string,
	listSuggestions: readonly string[],
): CreatedControl {
	const hiddenValue = fieldEl.createEl('input', {
		cls: 'base-form-control base-form-list-value',
		attr: { type: 'hidden' },
	});
	const wrapper = fieldEl.createDiv({ cls: 'base-form-list-control' });
	const chipsEl = wrapper.createDiv({ cls: 'base-form-list-items' });
	const input = wrapper.createEl('input', {
		cls: 'base-form-list-input',
		attr: {
			type: 'text',
			autocomplete: 'off',
			placeholder: 'Add item',
		},
	});

	const items = value === '' ? [] : value.split(/\r?\n/);

	const syncValue = (persistChange: boolean): void => {
		hiddenValue.value = items.join('\n');
		hiddenValue.dispatchEvent(new Event('input', { bubbles: true }));
		if (persistChange) {
			hiddenValue.dispatchEvent(
				new Event('change', { bubbles: true }),
			);
		}
	};

	const renderChips = (): void => {
		chipsEl.empty();
		for (let index = 0; index < items.length; index++) {
			const item = items[index] ?? '';
			const chipEl = chipsEl.createDiv({ cls: 'base-form-list-chip' });
			const labelEl = chipEl.createSpan({
				cls: 'base-form-list-chip-label',
			});
			renderLinkAwareText(labelEl, app, sourcePath, item);

			const removeButton = chipEl.createEl('button', {
				cls: 'base-form-list-chip-remove',
			});
			removeButton.type = 'button';
			removeButton.ariaLabel = `Remove ${item}`;
			removeButton.addEventListener('click', () => {
				items.splice(index, 1);
				renderChips();
				syncValue(true);
				input.focus();
			});
		}
	};

	const commitInput = (persistChange: boolean): void => {
		const nextItem = input.value;
		if (nextItem.trim() === '') {
			input.value = '';
			if (persistChange) {
				syncValue(true);
			} else {
				input.focus();
			}
			return;
		}

		items.push(nextItem);
		input.value = '';
		renderChips();
		syncValue(persistChange);
		if (!persistChange) {
			input.focus();
			input.dispatchEvent(new Event('input', { bubbles: true }));
		}
	};

	input.addEventListener('keydown', (event) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			commitInput(false);
		}
		if (
			event.key === 'Backspace' &&
			input.value.length === 0 &&
			items.length > 0
		) {
			event.preventDefault();
			items.pop();
			renderChips();
			syncValue(false);
		}
	});
	input.addEventListener('blur', () => {
		commitInput(true);
	});
	const inputSuggest = shouldEnableLinkSuggestions('list')
		? new ListInputSuggest(app, input, () => listSuggestions, () => items, () => {
			commitInput(false);
		})
		: null;

	renderChips();
	hiddenValue.value = items.join('\n');

	return { control: hiddenValue, focusControl: input, inputSuggest };
}

function createLinkedTextControl(
	app: App,
	fieldEl: HTMLElement,
	value: string,
	sourcePath: string,
): CreatedControl {
	const hiddenValue = fieldEl.createEl('input', {
		cls: 'base-form-control base-form-text-value',
		attr: { type: 'hidden' },
	});
	const wrapper = fieldEl.createDiv({
		cls: 'base-form-text-link-control is-previewing',
	});
	const previewEl = wrapper.createDiv({
		cls: 'base-form-text-link-preview',
		attr: { tabindex: '0' },
	});
	const input = wrapper.createEl('input', {
		cls: 'base-form-control base-form-text-input',
		attr: { type: 'text', autocomplete: 'off' },
	});
	input.value = value;

	const syncValue = (persistChange: boolean): void => {
		hiddenValue.value = input.value;
		hiddenValue.dispatchEvent(new Event('input', { bubbles: true }));
		if (persistChange) {
			hiddenValue.dispatchEvent(new Event('change', { bubbles: true }));
		}
	};

	const renderPreview = (): void => {
		previewEl.textContent = '';
		renderLinkAwareText(previewEl, app, sourcePath, input.value);
	};

	const enterPreviewMode = (): void => {
		renderPreview();
		wrapper.addClass('is-previewing');
	};

	previewEl.addEventListener('click', (event) => {
		const target = event.target as Element | null;
		if (target?.closest('a.base-form-link') !== null) {
			return;
		}
		input.focus();
	});
	previewEl.addEventListener('keydown', (event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			input.focus();
		}
	});

	input.addEventListener('focus', () => {
		wrapper.removeClass('is-previewing');
	});
	input.addEventListener('input', () => {
		syncValue(false);
	});
	input.addEventListener('blur', () => {
		syncValue(true);
		enterPreviewMode();
	});

	hiddenValue.value = value;
	enterPreviewMode();

	return {
		control: hiddenValue,
		focusControl: input,
		inputSuggest: new LinkInputSuggest(app, input, sourcePath),
	};
}

export function shouldEnableLinkSuggestions(fieldType: FormFieldType): boolean {
	return fieldType === 'text' || fieldType === 'list';
}

function renderLinkAwareList(
	container: HTMLElement,
	app: App,
	sourcePath: string,
	value: ListValue,
): void {
	for (let index = 0; index < value.length(); index++) {
		if (index > 0) {
			container.createEl('br');
		}
		const item = value.get(index);
		renderLinkAwareText(container, app, sourcePath, item.toString());
	}
}

function renderLinkAwareText(
	container: HTMLElement,
	app: App,
	sourcePath: string,
	text: string,
): void {
	const lines = text.split(/\r?\n/);
	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		if (lineIndex > 0) {
			container.createEl('br');
		}
		renderLinkAwareLine(container, app, sourcePath, lines[lineIndex] ?? '');
	}
}

function renderLinkAwareLine(
	container: HTMLElement,
	app: App,
	sourcePath: string,
	line: string,
): void {
	const pattern = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]|\[([^\]]+)\]\(([^)]+)\)/g;
	let cursor = 0;
	for (;;) {
		const match = pattern.exec(line);
		if (match === null) {
			break;
		}

		if (match.index > cursor) {
			container.createSpan({ text: line.slice(cursor, match.index) });
		}

		if (match[1] !== undefined) {
			renderInternalLink(container, app, sourcePath, match[1], match[3] ?? match[1], match[2]);
		}
		else {
			renderExternalLink(container, app, sourcePath, match[4] ?? '', match[5] ?? '');
		}

		cursor = match.index + match[0].length;
	}

	if (cursor < line.length) {
		container.createSpan({ text: line.slice(cursor) });
	}

	if (line.length === 0) {
		container.createSpan({ text: '' });
	}
}

function renderInternalLink(
	container: HTMLElement,
	app: App,
	sourcePath: string,
	target: string,
	label: string,
	subpath?: string,
): void {
	const file = app.metadataCache.getFirstLinkpathDest(target, sourcePath);
	if (file === null) {
		container.createSpan({ text: label });
		return;
	}

	const link = container.createEl('a', {
		cls: 'base-form-link',
		text: label,
	});
	link.href = '#';
	link.dataset.filePath = file.path;
	if (subpath !== undefined && subpath !== '') {
		link.dataset.linkSubpath = subpath;
	}
}

function renderExternalLink(
	container: HTMLElement,
	app: App,
	sourcePath: string,
	label: string,
	target: string,
): void {
	if (isExternalLinkTarget(target)) {
		const link = container.createEl('a', {
			cls: 'base-form-link',
			text: label,
		});
		link.href = target;
		link.target = '_blank';
		link.rel = 'noopener noreferrer';
		return;
	}

	const parsed = splitLinkTarget(target);
	const file = app.metadataCache.getFirstLinkpathDest(parsed.path, sourcePath);
	if (file === null) {
		container.createSpan({ text: label });
		return;
	}

	const link = container.createEl('a', {
		cls: 'base-form-link',
		text: label,
	});
	link.href = '#';
	link.dataset.filePath = file.path;
	if (parsed.subpath !== '') {
		link.dataset.linkSubpath = parsed.subpath;
	}
}

function splitLinkTarget(target: string): { path: string; subpath: string } {
	const hashIndex = target.indexOf('#');
	if (hashIndex === -1) {
		return { path: target, subpath: '' };
	}

	return {
		path: target.slice(0, hashIndex),
		subpath: target.slice(hashIndex),
	};
}

function hasLinkSyntax(text: string): boolean {
	return /\[\[[^\]]+\]\]|\[[^\]]+\]\([^)]+\)/.test(text);
}

function isExternalLinkTarget(target: string): boolean {
	return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target.trim());
}

function getValueFallback(
	fieldType: FormFieldType,
	value: Value | null,
): FormControlValue {
	if (value === null || value === NullValue.value) {
		return fieldType === 'checkbox' ? false : '';
	}
	if (fieldType === 'checkbox') {
		return value.isTruthy();
	}
	if (fieldType === 'list' && value instanceof ListValue) {
		const items: string[] = [];
		for (let index = 0; index < value.length(); index++) {
			items.push(value.get(index).toString());
		}
		return items.join('\n');
	}
	return value.toString();
}
