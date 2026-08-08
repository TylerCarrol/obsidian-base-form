import type { BasesAllOptions, BasesViewConfig } from 'obsidian';

const SHOW_FILE_NAME_KEY = 'showFileName';
const SHOW_ONLY_EMPTY_INPUTS_KEY = 'showOnlyEmptyInputs';
const ITEM_SPACING_KEY = 'itemSpacing';
const FORM_WIDTH_KEY = 'formWidth';
const MIN_ITEM_SPACING = 0;
const MAX_ITEM_SPACING = 32;
const MIN_FORM_WIDTH = 24;
const MAX_FORM_WIDTH = 80;

export interface FormViewSettings {
	showFileName: boolean;
	showOnlyEmptyInputs: boolean;
	itemSpacing: number;
	formWidth: number;
}

export const DEFAULT_FORM_VIEW_SETTINGS: FormViewSettings = {
	showFileName: true,
	showOnlyEmptyInputs: false,
	itemSpacing: 8,
	formWidth: 52,
};

export function getFormViewOptions(): BasesAllOptions[] {
	return [
		{
			type: 'toggle',
			key: SHOW_FILE_NAME_KEY,
			displayName: 'Show file name',
			default: DEFAULT_FORM_VIEW_SETTINGS.showFileName,
		},
		{
			type: 'toggle',
			key: SHOW_ONLY_EMPTY_INPUTS_KEY,
			displayName: 'Show only empty property inputs',
			default: DEFAULT_FORM_VIEW_SETTINGS.showOnlyEmptyInputs,
		},
		{
			type: 'slider',
			key: ITEM_SPACING_KEY,
			displayName: 'Item spacing',
			default: DEFAULT_FORM_VIEW_SETTINGS.itemSpacing,
			min: MIN_ITEM_SPACING,
			max: MAX_ITEM_SPACING,
			step: 1,
			instant: true,
		},
		{
			type: 'slider',
			key: FORM_WIDTH_KEY,
			displayName: 'Form width',
			default: DEFAULT_FORM_VIEW_SETTINGS.formWidth,
			min: MIN_FORM_WIDTH,
			max: MAX_FORM_WIDTH,
			step: 1,
			instant: true,
		},
	];
}

export function getFormViewSettings(
	config: Pick<BasesViewConfig, 'get'>,
): FormViewSettings {
	const showFileName = config.get(SHOW_FILE_NAME_KEY);
	const showOnlyEmptyInputs = config.get(SHOW_ONLY_EMPTY_INPUTS_KEY);
	const itemSpacing = config.get(ITEM_SPACING_KEY);
	const formWidth = config.get(FORM_WIDTH_KEY);

	return {
		showFileName:
			typeof showFileName === 'boolean'
				? showFileName
				: DEFAULT_FORM_VIEW_SETTINGS.showFileName,
		showOnlyEmptyInputs:
			typeof showOnlyEmptyInputs === 'boolean'
				? showOnlyEmptyInputs
				: DEFAULT_FORM_VIEW_SETTINGS.showOnlyEmptyInputs,
		itemSpacing:
			typeof itemSpacing === 'number' && Number.isFinite(itemSpacing)
				? Math.min(
						MAX_ITEM_SPACING,
						Math.max(MIN_ITEM_SPACING, itemSpacing),
					)
				: DEFAULT_FORM_VIEW_SETTINGS.itemSpacing,
		formWidth:
			typeof formWidth === 'number' && Number.isFinite(formWidth)
				? Math.min(
						MAX_FORM_WIDTH,
						Math.max(MIN_FORM_WIDTH, formWidth),
					)
				: DEFAULT_FORM_VIEW_SETTINGS.formWidth,
	};
}
