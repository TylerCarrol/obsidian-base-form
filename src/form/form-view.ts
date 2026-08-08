import {
	BasesView,
	Notice,
	parsePropertyId,
} from 'obsidian';
import type {
	BasesEntry,
	BasesPropertyId,
	QueryController,
	TFile,
} from 'obsidian';
import {
	findFrontmatterKey,
	isFormFieldType,
	parseFormValue,
} from './property-values';
import type {
	FormControlValue,
	FormFieldType,
	PersistedFormValue,
} from './property-values';
import {
	renderEditableField,
	renderReadOnlyField,
} from './field-renderer';
import type { FormControl } from './field-renderer';
import {
	getRawValue,
	isEditablePropertyValue,
	isEmptyPropertyValue,
	resolveFieldTypes,
} from './property-types';
import { getFormViewSettings } from './view-options';

export const BASE_FORM_VIEW_TYPE = 'base-form';

export class BaseFormView extends BasesView {
	readonly type = BASE_FORM_VIEW_TYPE;
	private static nextInstanceId = 0;
	private readonly containerEl: HTMLElement;
	private readonly drafts = new Map<string, FormControlValue>();
	private pendingFocus:
		| {
				filePath: string;
				propertyName: string;
				fieldType: FormFieldType;
		  }
		| null = null;
	private readonly instanceId: number;
	private renderId = 0;
	private renderPending = false;
	private writeQueue: Promise<void> = Promise.resolve();

	constructor(controller: QueryController, scrollEl: HTMLElement) {
		super(controller);
		this.instanceId = BaseFormView.nextInstanceId++;
		this.containerEl = scrollEl.createDiv({ cls: 'base-form-view' });
	}

	onload(): void {
		this.registerDomEvent(this.containerEl, 'input', this.handleInput);
		this.registerDomEvent(this.containerEl, 'change', this.handleChange);
		this.registerDomEvent(this.containerEl, 'click', this.handleClick);
	}

	onunload(): void {
		this.drafts.clear();
		this.containerEl.remove();
	}

	onDataUpdated(): void {
		if (this.drafts.size > 0) {
			this.renderPending = true;
			return;
		}
		this.renderPending = false;
		this.render();
	}

	private render(): void {
		this.renderId++;
		this.containerEl.empty();
		const settings = getFormViewSettings(this.config);
		this.containerEl.style.setProperty(
			'--base-form-item-spacing',
			`${settings.itemSpacing}px`,
		);
		this.containerEl.style.setProperty(
			'--base-form-max-width',
			`${settings.formWidth}rem`,
		);

		const entries = this.data.data;
		if (entries.length === 0) {
			this.containerEl.createDiv({
				cls: 'base-form-empty',
				text: 'No notes match this view.',
			});
			return;
		}

		const properties = this.getVisibleProperties();
		const fieldTypes = resolveFieldTypes(this.app, entries, properties);
		this.containerEl.createDiv({
			cls: 'base-form-summary',
			text: `${entries.length} ${entries.length === 1 ? 'note' : 'notes'}`,
		});

		const formsEl = this.containerEl.createDiv({ cls: 'base-form-entries' });
		entries.forEach((entry, entryIndex) => {
			this.renderEntry(
				formsEl,
				entry,
				entryIndex,
				properties,
				fieldTypes,
				settings.showFileName,
				settings.showOnlyEmptyInputs,
			);
		});

		this.restorePendingFocus();
	}

	private getVisibleProperties(): BasesPropertyId[] {
		const order = this.config.getOrder();
		return order.length > 0 ? order : this.data.properties;
	}

	private renderEntry(
		parentEl: HTMLElement,
		entry: BasesEntry,
		entryIndex: number,
		properties: BasesPropertyId[],
		fieldTypes: Map<BasesPropertyId, FormFieldType>,
		showFileName: boolean,
		showOnlyEmptyInputs: boolean,
	): void {
		const cardEl = parentEl.createEl('article', { cls: 'base-form-entry' });
		if (showFileName) {
			const headingId = this.getElementId('heading', entryIndex);
			cardEl.setAttribute('aria-labelledby', headingId);

			const headingEl = cardEl.createEl('h2', {
				cls: 'base-form-entry-title',
			});
			headingEl.id = headingId;
			const openLink = headingEl.createEl('a', {
				cls: 'base-form-open-note',
				text: entry.file.basename,
			});
			openLink.href = '#';
			openLink.dataset.filePath = entry.file.path;
		} else {
			cardEl.setAttribute('aria-label', `Form for ${entry.file.basename}`);
		}

		if (properties.length === 0) {
			cardEl.createDiv({
				cls: 'base-form-empty',
				text: 'Choose properties from the Bases toolbar to build this form.',
			});
			return;
		}

		const fieldsEl = cardEl.createDiv({ cls: 'base-form-fields' });
		properties.forEach((propertyId, propertyIndex) => {
			this.renderProperty(
				fieldsEl,
				entry,
				entryIndex,
				propertyIndex,
				propertyId,
				fieldTypes.get(propertyId) ?? 'text',
				showOnlyEmptyInputs,
			);
		});
	}

	private renderProperty(
		parentEl: HTMLElement,
		entry: BasesEntry,
		entryIndex: number,
		propertyIndex: number,
		propertyId: BasesPropertyId,
		fieldType: FormFieldType,
		showOnlyEmptyInputs: boolean,
	): void {
		const property = parsePropertyId(propertyId);
		const displayName = this.config.getDisplayName(propertyId);
		const value = entry.getValue(propertyId);
		const rawValue =
			property.type === 'note'
				? getRawValue(this.app, entry.file, property.name)
				: undefined;

		if (
			showOnlyEmptyInputs &&
			!isEmptyPropertyValue(fieldType, rawValue, value)
		) {
			return;
		}

		const fieldEl = parentEl.createDiv({ cls: 'base-form-field' });

		if (
			property.type !== 'note' ||
			entry.file.extension !== 'md' ||
			!isEditablePropertyValue(fieldType, rawValue, value)
		) {
			renderReadOnlyField(fieldEl, displayName, value);
			return;
		}

		const controlId = this.getElementId(
			'control',
			entryIndex,
			propertyIndex,
		);
		renderEditableField({
			controlId,
			displayName,
			draftValue: this.drafts.get(
				this.getDraftKey(
					entry.file.path,
					property.name,
					fieldType,
				),
			),
			fieldEl,
			fieldType,
			filePath: entry.file.path,
			propertyName: property.name,
			rawValue,
			value,
		});
	}

	private readonly handleClick = (event: MouseEvent): void => {
		const target = event.target as Element | null;
		const link = target?.closest<HTMLAnchorElement>(
			'a.base-form-open-note[data-file-path]',
		);
		if (link === undefined || link === null) {
			return;
		}
		event.preventDefault();

		const file = this.app.vault.getFileByPath(link.dataset.filePath ?? '');
		if (file === null) {
			new Notice('The note is no longer available.');
			return;
		}
		void this.openFile(file);
	};

	private readonly handleChange = (event: Event): void => {
		const control = this.getFormControl(event.target);
		if (control !== null && control.dataset.fieldType !== undefined) {
			this.rememberDraft(control);
			void this.saveControl(control);
		}
	};

	private readonly handleInput = (event: Event): void => {
		const control = this.getFormControl(event.target);
		if (control !== null) {
			this.rememberDraft(control);
		}
	};

	private getFormControl(target: EventTarget | null): FormControl | null {
		if (target === null || !('tagName' in target)) {
			return null;
		}
		const element = target as HTMLElement;
		if (element.tagName !== 'INPUT' && element.tagName !== 'TEXTAREA') {
			return null;
		}
		return element as FormControl;
	}

	private async openFile(file: TFile): Promise<void> {
		try {
			await this.app.workspace.getLeaf(false).openFile(file);
		} catch {
			new Notice('Could not open the note.');
		}
	}

	private async saveControl(control: FormControl): Promise<void> {
		const { fieldType, filePath, propertyName } = control.dataset;
		if (
			fieldType === undefined ||
			filePath === undefined ||
			propertyName === undefined ||
			!isFormFieldType(fieldType)
		) {
			return;
		}

		const controlValue =
			fieldType === 'checkbox'
				? (control as HTMLInputElement).checked
				: control.value;
		const draftKey = this.getDraftKey(
			filePath,
			propertyName,
			fieldType,
		);
		const focusControl = this.getFocusControl(control) ?? control;
		const shouldRestoreFocus = document.activeElement === focusControl;
		if (
			control.tagName === 'INPUT' &&
			!(control as HTMLInputElement).validity.valid
		) {
			this.setControlStatus(control, 'Enter a valid value.', true);
			return;
		}
		const parsedValue = parseFormValue(fieldType, controlValue);
		if (!parsedValue.ok) {
			this.setControlStatus(control, parsedValue.message, true);
			return;
		}

		const file = this.app.vault.getFileByPath(filePath);
		if (file === null) {
			this.setControlStatus(control, 'The note is no longer available.', true);
			return;
		}

		this.setControlStatus(control, '', false);
		if (shouldRestoreFocus) {
			this.pendingFocus = {
				filePath,
				propertyName,
				fieldType,
			};
		}
		control.setAttribute('aria-busy', 'true');
		this.getFocusControl(control)?.setAttribute('aria-busy', 'true');
		let saveSucceeded = false;
		try {
			await this.enqueueUpdate(file, propertyName, parsedValue.value);
			saveSucceeded = true;
			if (this.drafts.get(draftKey) === controlValue) {
				this.drafts.delete(draftKey);
			}
			this.renderIfPending();
		} catch {
			this.pendingFocus = null;
			if (control.isConnected) {
				this.setControlStatus(control, 'Could not save.', true);
			}
			new Notice('Could not update the property.');
		} finally {
			if (!saveSucceeded) {
				this.pendingFocus = null;
			}
			if (control.isConnected) {
				control.removeAttribute('aria-busy');
				this.getFocusControl(control)?.removeAttribute('aria-busy');
			}
		}
	}

	private enqueueUpdate(
		file: TFile,
		propertyName: string,
		value: PersistedFormValue,
	): Promise<void> {
		const operation = this.writeQueue.then(() =>
			this.app.fileManager.processFrontMatter(
				file,
				(frontmatter: Record<string, unknown>) => {
					const key = findFrontmatterKey(frontmatter, propertyName);
					frontmatter[key] = value;
				},
			),
		);
		this.writeQueue = operation.catch(() => undefined);
		return operation;
	}

	private setControlStatus(
		control: FormControl,
		message: string,
		isError: boolean,
	): void {
		control.setAttribute('aria-invalid', String(isError));
		this.getFocusControl(control)?.setAttribute(
			'aria-invalid',
			String(isError),
		);
		const statusEl = control.parentElement?.querySelector<HTMLElement>(
			'.base-form-field-status',
		);
		statusEl?.setText(message);
	}

	private getFocusControl(control: FormControl): FormControl | null {
		const focusControlId = control.dataset.focusControlId;
		if (focusControlId === undefined) {
			return null;
		}
		const element = control.parentElement?.querySelector<HTMLElement>(
			`#${CSS.escape(focusControlId)}`,
		);
		if (
			element instanceof HTMLInputElement ||
			element instanceof HTMLTextAreaElement
		) {
			return element;
		}
		return null;
	}

	private rememberDraft(control: FormControl): void {
		const { fieldType, filePath, propertyName } = control.dataset;
		if (
			fieldType === undefined ||
			filePath === undefined ||
			propertyName === undefined ||
			!isFormFieldType(fieldType)
		) {
			return;
		}
		const value =
			fieldType === 'checkbox'
				? (control as HTMLInputElement).checked
				: control.value;
		this.drafts.set(
			this.getDraftKey(filePath, propertyName, fieldType),
			value,
		);
	}

	private renderIfPending(): void {
		if (this.renderPending && this.drafts.size === 0) {
			this.renderPending = false;
			this.render();
		}
	}

	private restorePendingFocus(): void {
		if (this.pendingFocus === null) {
			return;
		}

		const { filePath, propertyName, fieldType } = this.pendingFocus;
		this.pendingFocus = null;
		const controlSelector =
			`input.base-form-control[data-file-path="${CSS.escape(filePath)}"]` +
			`[data-property-name="${CSS.escape(propertyName)}"]` +
			`[data-field-type="${CSS.escape(fieldType)}"]`;
		const control = this.containerEl.querySelector<FormControl>(
			controlSelector,
		);
		if (control === null) {
			return;
		}

		const focusControlId = control.dataset.focusControlId;
		if (focusControlId !== undefined) {
			const focusElement = this.containerEl.querySelector<HTMLElement>(
				`#${CSS.escape(focusControlId)}`,
			);
			if (
				focusElement instanceof HTMLInputElement ||
				focusElement instanceof HTMLTextAreaElement
			) {
				focusElement.focus();
				return;
			}
		}

		control.focus();
	}

	private getDraftKey(
		filePath: string,
		propertyName: string,
		fieldType: FormFieldType,
	): string {
		return JSON.stringify([filePath, propertyName, fieldType]);
	}

	private getElementId(
		kind: string,
		entryIndex: number,
		propertyIndex?: number,
	): string {
		const propertyPart =
			propertyIndex === undefined ? '' : `-${propertyIndex}`;
		return `base-form-${this.instanceId}-${this.renderId}-${kind}-${entryIndex}${propertyPart}`;
	}
}
