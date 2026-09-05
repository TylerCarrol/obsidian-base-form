import {
	BasesView,
	BooleanValue,
	ConfirmationModal,
	Notice,
	parsePropertyId,
} from 'obsidian';
import type {
	App,
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
import type { FormInputSuggest, LinkSuggestion } from './input-suggest';
import {
	getRawValue,
	isEditablePropertyValue,
	shouldRenderByVisibilityCondition,
	shouldRenderPropertyInput,
	resolveFieldTypes,
} from './property-types';
import { getFormViewSettings } from './view-options';
import type { FormViewSettings } from './view-options';
import { collectListPropertyValues } from './property-suggestions';

export const BASE_FORM_VIEW_TYPE = 'base-form';

// `unknown` group keys/values may be plain objects, so avoid the default Object.prototype stringification.
function stringifyUnknown(value: unknown): string {
	if (value === null || value === undefined) {
		return '';
	}
	if (typeof value === 'string') {
		return value;
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	return (value as { toString(): string }).toString();
}

export function getBaseFormGroupLabel(group: {
	key?: unknown;
	hasKey?: () => boolean;
	entries?: unknown[];
}): string {
	if (group.hasKey !== undefined && !group.hasKey()) {
		return 'No value';
	}
	if (group.key === undefined || group.key === null) {
		return 'No value';
	}
	const valueText = stringifyUnknown(group.key);
	return valueText.trim().length > 0 ? valueText : 'No value';
}

export function getBaseFormGroupLabelParts(
	group: {
		key?: unknown;
		hasKey?: () => boolean;
		entries?: unknown[];
	},
	propertyLabel: string,
): { label: string; valueText: string } {
	if (group.hasKey !== undefined && !group.hasKey()) {
		return { label: propertyLabel, valueText: 'No value' };
	}
	if (group.key === undefined || group.key === null) {
		return { label: propertyLabel, valueText: 'No value' };
	}
	const valueText = stringifyUnknown(group.key);
	return {
		label: propertyLabel,
		valueText: valueText.trim().length > 0 ? valueText : 'No value',
	};
}

export function isBooleanGroupValue(
	value: unknown,
): value is boolean | BooleanValue | 'true' | 'false' {
	if (typeof value === 'boolean') {
		return true;
	}
	if (value instanceof BooleanValue) {
		return true;
	}
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		return normalized === 'true' || normalized === 'false';
	}
	return false;
}

function getBooleanGroupValue(value: unknown): boolean {
	if (typeof value === 'boolean') {
		return value;
	}
	if (value instanceof BooleanValue) {
		return value.isTruthy();
	}
	if (typeof value === 'string') {
		return value.trim().toLowerCase() === 'true';
	}
	return false;
}

function appendGroupText(container: HTMLElement, text: string): void {
	container.createSpan({ text });
}

function appendGroupLink(
	container: HTMLElement,
	label: string,
	options: {
		href?: string;
		filePath?: string;
		linkSubpath?: string;
		target?: string;
		rel?: string;
	},
): void {
	const link = container.createEl('a', {
		cls: 'base-form-link',
		text: label,
	});
	if (options.href !== undefined) {
		link.href = options.href;
	}
	if (options.filePath !== undefined) {
		link.dataset.filePath = options.filePath;
	}
	if (options.linkSubpath !== undefined) {
		link.dataset.linkSubpath = options.linkSubpath;
	}
	if (options.target !== undefined) {
		link.target = options.target;
	}
	if (options.rel !== undefined) {
		link.rel = options.rel;
	}
	container.appendChild(link);
}

function appendGroupCheckbox(container: HTMLElement, checked: boolean): void {
	const checkbox = container.createEl('input', {
		cls: 'base-form-group-checkbox',
		attr: { type: 'checkbox' },
	});
	checkbox.type = 'checkbox';
	checkbox.checked = checked;
	checkbox.disabled = true;
}

export function renderGroupValue(
	container: HTMLElement,
	app: App,
	sourcePath: string,
	value: unknown,
): void {
	if (isBooleanGroupValue(value)) {
		appendGroupCheckbox(container, getBooleanGroupValue(value));
		return;
	}

	const stringValue = stringifyUnknown(value);
	if (stringValue.trim() !== '' && hasGroupLinkSyntax(stringValue)) {
		renderLinkGroupValue(container, app, sourcePath, stringValue);
		return;
	}

	container.textContent = stringValue.trim().length > 0 ? stringValue : 'No value';
}

function hasGroupLinkSyntax(value: string): boolean {
	return /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]|\[[^\]]+\]\(([^)]+)\)/.test(value);
}

function renderLinkGroupValue(
	container: HTMLElement,
	app: App,
	sourcePath: string,
	value: string,
): void {
	const pattern = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]|\[([^\]]+)\]\(([^)]+)\)/g;
	let cursor = 0;
	for (;;) {
		const match = pattern.exec(value);
		if (match === null) {
			break;
		}

		if (match.index > cursor) {
			appendGroupText(container, value.slice(cursor, match.index));
		}

		if (match[1] !== undefined) {
			const file = app.metadataCache.getFirstLinkpathDest(match[1], sourcePath);
			if (file === null) {
				appendGroupText(container, match[3] ?? match[1]);
			} else {
				appendGroupLink(container, match[3] ?? match[1], {
					href: '#',
					filePath: file.path,
					linkSubpath: match[2] ?? undefined,
				});
			}
		} else {
			const label = match[4] ?? '';
			const target = match[5] ?? '';
			if (/^https?:\/\//i.test(target)) {
				appendGroupLink(container, label, {
					href: target,
					target: '_blank',
					rel: 'noopener noreferrer',
				});
				cursor = match.index + match[0].length;
				continue;
			}
			const file = app.metadataCache.getFirstLinkpathDest(target, sourcePath);
			if (file === null) {
				appendGroupText(container, label);
			} else {
				appendGroupLink(container, label, {
					href: '#',
					filePath: file.path,
				});
			}
		}

		cursor = match.index + match[0].length;
	}

	if (cursor < value.length) {
		appendGroupText(container, value.slice(cursor));
	}

	if (value.length === 0) {
		appendGroupText(container, '');
	}
}

export function inferGroupPropertyLabel(
	groups: Array<{ key?: unknown; hasKey?: () => boolean; entries?: unknown[] }>,
	entries: Array<{ getValue(propertyId: string): unknown }>,
	candidateProperties: string[],
): string {
	const scores = new Map<string, number>();
	for (const group of groups) {
		if (group.hasKey !== undefined && !group.hasKey()) {
			continue;
		}
		const key = group.key;
		if (key === undefined || key === null) {
			continue;
		}
		for (const entry of entries) {
			for (const property of candidateProperties) {
				const value = entry.getValue(property);
				if (value !== undefined && value !== null && stringifyUnknown(value) === stringifyUnknown(key)) {
					scores.set(property, (scores.get(property) ?? 0) + 1);
				}
			}
		}
	}
	let bestProperty = candidateProperties[0] ?? 'Group';
	let bestScore = -1;
	for (const property of candidateProperties) {
		const score = scores.get(property) ?? 0;
		if (score > bestScore) {
			bestProperty = property;
			bestScore = score;
		}
	}
	return bestScore > 0 ? bestProperty : bestProperty;
}

export class BaseFormView extends BasesView {
	readonly type = BASE_FORM_VIEW_TYPE;
	private static nextInstanceId = 0;
	private readonly containerEl: HTMLElement;
	private readonly drafts = new Map<string, FormControlValue>();
	private readonly inputSuggestions: FormInputSuggest[] = [];
	private listPropertyValues = new Map<string, readonly string[]>();
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
		this.listPropertyValues.clear();
		this.closeInputSuggestions();
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
		this.closeInputSuggestions();
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
		this.listPropertyValues = collectListPropertyValues(
			this.app,
			entries,
			properties.flatMap((propertyId) => {
				const property = parsePropertyId(propertyId);
				return property.type === 'note' && fieldTypes.get(propertyId) === 'list'
					? [property.name]
					: [];
			}),
		);
		const linkSuggestions: readonly LinkSuggestion[] = entries.map((entry) => ({
			file: entry.file,
			linkText: this.app.metadataCache.fileToLinktext(
				entry.file,
				entry.file.path,
				true,
			),
		}));
		this.containerEl.createDiv({
			cls: 'base-form-summary',
			text: `${entries.length} ${entries.length === 1 ? 'note' : 'notes'}`,
		});
		if (
			settings.manualSubmit &&
			(settings.submitButtonPosition === 'top' ||
				settings.submitButtonPosition === 'top-bottom')
		) {
			this.renderSubmitButton(this.containerEl, settings.submitButtonName);
		}

		const formsEl = this.containerEl.createDiv({ cls: 'base-form-entries' });
		const groups = this.data.groupedData.length > 0 ? this.data.groupedData : [{ entries, hasKey: () => false }];
		const groupPropertyLabel = this.getGroupPropertyLabel(groups, entries);
		groups.forEach((group) => {
			const groupEl = formsEl.createDiv({ cls: 'base-form-group' });
			if (groups.length > 1 || group.hasKey?.()) {
				const headerEl = groupEl.createDiv({ cls: 'base-form-group-header' });
				const labelParts = getBaseFormGroupLabelParts(group, groupPropertyLabel);
				headerEl.createSpan({ cls: 'base-form-group-label', text: labelParts.label });
				const valueEl = headerEl.createSpan({ cls: 'base-form-group-value' });
				const rawKey = group.key;
				if (isBooleanGroupValue(rawKey)) {
					const checkbox = valueEl.createEl('input', {
						cls: 'base-form-group-checkbox',
						attr: { type: 'checkbox' },
					});
					checkbox.checked = getBooleanGroupValue(rawKey);
					checkbox.disabled = true;
					checkbox.setAttribute('aria-label', labelParts.valueText);
				} else {
					renderGroupValue(valueEl, this.app, this.app.workspace.getActiveFile()?.path ?? '', rawKey);
				}
			}

			group.entries.forEach((entry, entryIndex) => {
				this.renderEntry(
					groupEl,
					entry,
					entryIndex,
					properties,
					fieldTypes,
					settings.showFileName,
					settings.hideNonEmptyProperties,
					settings.hideNonExistentProperties,
					settings.enableDeletePropertyButton,
					settings.confirmListItemDeletion,
					settings.numberButtonLayout,
					settings.visibilityConditionalPrefix,
					settings.visibilityConditionalMode,
					settings.manualSubmit,
					settings.submitButtonName,
					settings.submitButtonPosition,
					linkSuggestions,
				);
			});
		});
		if (
			settings.manualSubmit &&
			(settings.submitButtonPosition === 'bottom' ||
				settings.submitButtonPosition === 'top-bottom')
		) {
			this.renderSubmitButton(this.containerEl, settings.submitButtonName);
		}

		this.restorePendingFocus();
	}

	private renderSubmitButton(
		parentEl: HTMLElement,
		name: string,
		filePath?: string,
	): void {
		const button = parentEl.createEl('button', {
			cls: 'base-form-submit',
			text: name,
		});
		button.type = 'button';
		button.addEventListener('click', () => {
			void this.submitDrafts(filePath);
		});
	}

	private getGroupPropertyLabel(
		groups: Array<{ key?: unknown; hasKey?: () => boolean; entries?: unknown[] }>,
		entries: BasesEntry[],
	): string {
		const candidateProperties = [
			...this.data.properties,
			...this.allProperties,
		].filter((propertyId, index, array) => array.indexOf(propertyId) === index);
		const inferred = inferGroupPropertyLabel(groups, entries, candidateProperties);
		if (inferred !== 'Group') {
			return this.config.getDisplayName(inferred as BasesPropertyId);
		}
		for (const propertyId of candidateProperties) {
			if (this.data.properties.includes(propertyId) || this.allProperties.includes(propertyId)) {
				return this.config.getDisplayName(propertyId);
			}
		}
		return 'Group';
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
		hideNonEmptyProperties: boolean,
		hideNonExistentProperties: boolean,
		enableDeletePropertyButton: boolean,
		confirmListItemDeletion: boolean,
		numberButtonLayout: FormViewSettings['numberButtonLayout'],
		visibilityConditionalPrefix: string,
		visibilityConditionalMode: FormViewSettings['visibilityConditionalMode'],
		manualSubmit: boolean,
		submitButtonName: string,
		submitButtonPosition: FormViewSettings['submitButtonPosition'],
		linkSuggestions: readonly LinkSuggestion[],
	): void {
		const cardEl = parentEl.createEl('article', { cls: 'base-form-entry' });
		if (manualSubmit && submitButtonPosition === 'top-each-note') {
			this.renderSubmitButton(cardEl, submitButtonName, entry.file.path);
		}
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
			const property = parsePropertyId(propertyId);
			this.renderProperty(
				fieldsEl,
				entry,
				entryIndex,
				propertyIndex,
				propertyId,
				property.type,
				fieldTypes.get(propertyId) ?? 'text',
				hideNonEmptyProperties,
				hideNonExistentProperties,
				enableDeletePropertyButton,
				confirmListItemDeletion,
				numberButtonLayout,
				visibilityConditionalPrefix,
				visibilityConditionalMode,
				linkSuggestions,
			);
		});
		if (manualSubmit && submitButtonPosition === 'bottom-each-note') {
			this.renderSubmitButton(cardEl, submitButtonName, entry.file.path);
		}
	}

	private renderProperty(
		parentEl: HTMLElement,
		entry: BasesEntry,
		entryIndex: number,
		propertyIndex: number,
		propertyId: BasesPropertyId,
		propertyType: 'note' | 'file' | 'formula',
		fieldType: FormFieldType,
		hideNonEmptyProperties: boolean,
		hideNonExistentProperties: boolean,
		enableDeletePropertyButton: boolean,
		confirmListItemDeletion: boolean,
		numberButtonLayout: FormViewSettings['numberButtonLayout'],
		visibilityConditionalPrefix: string,
		visibilityConditionalMode: FormViewSettings['visibilityConditionalMode'],
		linkSuggestions: readonly LinkSuggestion[],
	): void {
		const property = parsePropertyId(propertyId);
		const displayName = this.config.getDisplayName(propertyId);
		const value = entry.getValue(propertyId);
		const rawValue =
			property.type === 'note'
				? getRawValue(this.app, entry.file, property.name)
				: undefined;

		if (
			!shouldRenderByVisibilityCondition(
				this.app,
				entry,
				property.name,
				visibilityConditionalPrefix,
				visibilityConditionalMode,
			) ||
			!shouldRenderPropertyInput(fieldType, propertyType, rawValue, value, {
				hideNonEmptyProperties,
				hideNonExistentProperties,
			})
		) {
			return;
		}

		const fieldEl = parentEl.createDiv({ cls: 'base-form-field' });

		const deleteAction =
			enableDeletePropertyButton &&
			property.type === 'note' &&
			entry.file.extension === 'md'
				? {
						onClick: () => {
							void this.deletePropertyFromFrontmatter(
								entry.file,
								property.name,
							);
						},
					}
				: undefined;

		if (
			property.type !== 'note' ||
			entry.file.extension !== 'md' ||
			!isEditablePropertyValue(fieldType, rawValue, value)
		) {
			renderReadOnlyField(
				this.app,
				fieldEl,
				displayName,
				entry.file.path,
				value,
				deleteAction,
			);
			return;
		}

		const controlId = this.getElementId(
			'control',
			entryIndex,
			propertyIndex,
		);
		const inputSuggest = renderEditableField({
			app: this.app,
			confirmListItemDeletion,
			controlId,
			displayName,
			draftValue: this.drafts.get(
				this.getDraftKey(
					entry.file.path,
					property.name,
					fieldType,
				),
			),
			deleteAction,
			fieldEl,
			fieldType,
			filePath: entry.file.path,
			propertyName: property.name,
			rawValue,
			listSuggestions:
				this.listPropertyValues.get(property.name.toLocaleLowerCase()) ?? [],
			linkSuggestions,
			numberButtonLayout,
			sourcePath: entry.file.path,
			value,
		});
		if (inputSuggest !== null) {
			this.inputSuggestions.push(inputSuggest);
		}
	}

	private closeInputSuggestions(): void {
		for (const inputSuggest of this.inputSuggestions) {
			inputSuggest.close();
		}
		this.inputSuggestions.length = 0;
	}

	private readonly handleClick = (event: MouseEvent): void => {
		const target = event.target as Element | null;
		if (target?.closest('.base-form-submit') !== null) {
			event.preventDefault();
			return;
		}
		const link = target?.closest<HTMLAnchorElement>(
			'a[data-file-path]',
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
			if (!getFormViewSettings(this.config).manualSubmit) {
				void this.saveControl(control);
			}
		}
	};

	private async submitDrafts(submitFilePath?: string): Promise<void> {
		const controls = Array.from(
			this.containerEl.querySelectorAll<FormControl>(
				'[data-field-type][data-file-path][data-property-name]',
			),
		);
		for (const control of controls) {
			const {
				fieldType,
				filePath: controlFilePath,
				propertyName,
			} = control.dataset;
			if (
				submitFilePath !== undefined &&
				controlFilePath !== submitFilePath
			) {
				continue;
			}
			if (
				fieldType === undefined ||
				controlFilePath === undefined ||
				propertyName === undefined ||
				!isFormFieldType(fieldType) ||
				!this.drafts.has(
					this.getDraftKey(controlFilePath, propertyName, fieldType),
				)
			) {
				continue;
			}
			await this.saveControl(control);
		}
	}

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

	private async deletePropertyFromFrontmatter(
		file: TFile,
		propertyName: string,
	): Promise<void> {
		const modal = new ConfirmationModal(this.app);
		modal.titleEl.setText('Delete property?');
		modal.contentEl.setText(
			`Delete the "${propertyName}" property from this note?`,
		);
		modal.addButton((button) => {
			button.setButtonText('Delete');
			button.setCta();
			button.setDestructive();
			button.onClick(async () => {
				modal.close();
				try {
					await this.writeQueue.then(() =>
						this.app.fileManager.processFrontMatter(
							file,
							(frontmatter: Record<string, unknown>) => {
								const key = findFrontmatterKey(frontmatter, propertyName);
								if (key in frontmatter) {
									delete frontmatter[key];
								}
							},
						),
					);
					this.render();
				} catch {
					new Notice('Could not delete the property.');
				}
			});
		});
		modal.addCancelButton('Cancel');
		modal.open();
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
