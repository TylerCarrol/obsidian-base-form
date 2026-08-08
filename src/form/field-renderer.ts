import { ListValue, NullValue, RenderContext } from 'obsidian';
import type { Value } from 'obsidian';
import { formatFormValue } from './property-values';
import type {
	FormControlValue,
	FormFieldType,
} from './property-values';

export type FormControl = HTMLInputElement | HTMLTextAreaElement;

interface EditableFieldOptions {
	controlId: string;
	displayName: string;
	draftValue?: FormControlValue;
	fieldEl: HTMLElement;
	fieldType: FormFieldType;
	filePath: string;
	propertyName: string;
	rawValue: unknown;
	value: Value | null;
}

export function renderEditableField({
	controlId,
	displayName,
	draftValue,
	fieldEl,
	fieldType,
	filePath,
	propertyName,
	rawValue,
	value,
}: EditableFieldOptions): void {
	const labelEl = fieldEl.createEl('label', {
		cls: 'base-form-field-label',
		text: displayName,
	});

	const fallback = getValueFallback(fieldType, value);
	const { control, focusControl } = createControl(
		fieldEl,
		fieldType,
		draftValue ??
			formatFormValue(fieldType, rawValue, fallback),
	);
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
}

export function renderReadOnlyField(
	fieldEl: HTMLElement,
	displayName: string,
	value: Value | null,
): void {
	fieldEl.addClass('is-read-only');
	const labelEl = fieldEl.createDiv({ cls: 'base-form-field-label' });
	labelEl.createSpan({ text: displayName });
	labelEl.createSpan({
		cls: 'base-form-read-only-badge',
		text: 'Read only',
	});

	const valueEl = fieldEl.createDiv({ cls: 'base-form-read-only-value' });
	if (value === null || value === NullValue.value) {
		valueEl.setText('Not set');
		return;
	}
	value.renderTo(valueEl, new RenderContext());
}

interface CreatedControl {
	control: FormControl;
	focusControl: FormControl;
}

function createControl(
	fieldEl: HTMLElement,
	fieldType: FormFieldType,
	value: FormControlValue,
): CreatedControl {
	if (fieldType === 'list') {
		return createListControl(fieldEl, String(value));
	}

	if (fieldType === 'text' && String(value).includes('\n')) {
		const textarea = fieldEl.createEl('textarea', {
			cls: 'base-form-control',
			attr: { rows: '3' },
		});
		textarea.value = String(value);
		return { control: textarea, focusControl: textarea };
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
			break;
	}
	return { control: input, focusControl: input };
}

function createListControl(
	fieldEl: HTMLElement,
	value: string,
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
			const item = items[index];
			const chipEl = chipsEl.createDiv({ cls: 'base-form-list-chip' });
			chipEl.createSpan({
				cls: 'base-form-list-chip-label',
				text: item,
			});

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
	input.addEventListener('blur', () => commitInput(true));

	renderChips();
	hiddenValue.value = items.join('\n');

	return { control: hiddenValue, focusControl: input };
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
