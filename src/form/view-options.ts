import type { BasesAllOptions, BasesViewConfig } from 'obsidian';

const SHOW_FILE_NAME_KEY = 'showFileName';
const HIDE_NON_EMPTY_PROPERTIES_KEY = 'hideNonEmptyProperties';
const HIDE_NON_EXISTENT_PROPERTIES_KEY = 'hideNonExistentProperties';
const MANUAL_SUBMIT_KEY = 'manualSubmit';
const SUBMIT_BUTTON_NAME_KEY = 'submitButtonName';
const SUBMIT_BUTTON_POSITION_KEY = 'submitButtonPosition';
const CONFIRM_LIST_ITEM_DELETION_KEY = 'confirmListItemDeletion';
const SHOW_ONLY_EMPTY_INPUTS_KEY = 'showOnlyEmptyInputs';
const SHOW_ONLY_EXISTING_INPUTS_KEY = 'showOnlyExistingInputs';
const ENABLE_DELETE_PROPERTY_BUTTON_KEY = 'enableDeletePropertyButton';
const VISIBILITY_CONDITIONAL_PREFIX_KEY = 'visibilityConditionalPrefix';
const VISIBILITY_CONDITIONAL_MODE_KEY = 'visibilityConditionalMode';
const ITEM_SPACING_KEY = 'itemSpacing';
const FORM_WIDTH_KEY = 'formWidth';
const MIN_ITEM_SPACING = 0;
const MAX_ITEM_SPACING = 32;
const MIN_FORM_WIDTH = 24;
const MAX_FORM_WIDTH = 80;

export interface FormViewSettings {
	showFileName: boolean;
	hideNonEmptyProperties: boolean;
	hideNonExistentProperties: boolean;
	manualSubmit: boolean;
	submitButtonName: string;
	confirmListItemDeletion: boolean;
	submitButtonPosition:
		| 'top'
		| 'bottom'
		| 'top-bottom'
		| 'bottom-each-note'
		| 'top-each-note';
	enableDeletePropertyButton: boolean;
	visibilityConditionalPrefix: string;
	visibilityConditionalMode: 'show' | 'hide';
	itemSpacing: number;
	formWidth: number;
}

export const DEFAULT_FORM_VIEW_SETTINGS: FormViewSettings = {
	showFileName: true,
	hideNonEmptyProperties: false,
	hideNonExistentProperties: false,
	manualSubmit: false,
	submitButtonName: 'Submit',
	confirmListItemDeletion: false,
	submitButtonPosition: 'bottom',
	enableDeletePropertyButton: false,
	visibilityConditionalPrefix: '',
	visibilityConditionalMode: 'show',
	itemSpacing: 8,
	formWidth: 52,
};

export function getFormViewOptions(
	config: Pick<BasesViewConfig, 'get'>,
): BasesAllOptions[] {
	const hideSubmitOptions = () =>
		!getFormViewSettings(config).hideNonEmptyProperties;
	const hideSubmitButtonOptions = () =>
		hideSubmitOptions() || !getFormViewSettings(config).manualSubmit;

	return [
		{
			type: 'toggle',
			key: SHOW_FILE_NAME_KEY,
			displayName: 'Show file name',
			default: DEFAULT_FORM_VIEW_SETTINGS.showFileName,
		},
		{
			type: 'group',
			displayName: 'Data entry',
			items: [
				{
					type: 'toggle',
					key: CONFIRM_LIST_ITEM_DELETION_KEY,
					displayName: 'Confirm list item deletion',
					default: DEFAULT_FORM_VIEW_SETTINGS.confirmListItemDeletion,
				},
				{
					type: 'toggle',
					key: HIDE_NON_EMPTY_PROPERTIES_KEY,
					displayName: 'Hide non-empty properties',
					default: DEFAULT_FORM_VIEW_SETTINGS.hideNonEmptyProperties,
				},
				{
					type: 'toggle',
					key: MANUAL_SUBMIT_KEY,
					displayName: 'Manual submit',
					default: DEFAULT_FORM_VIEW_SETTINGS.manualSubmit,
				},
				{
					type: 'text',
					key: SUBMIT_BUTTON_NAME_KEY,
					displayName: 'Submit button name',
					default: DEFAULT_FORM_VIEW_SETTINGS.submitButtonName,
					shouldHide: hideSubmitButtonOptions,
				},
				{
					type: 'dropdown',
					key: SUBMIT_BUTTON_POSITION_KEY,
					displayName: 'Submit button position',
					default: DEFAULT_FORM_VIEW_SETTINGS.submitButtonPosition,
					options: {
						top: 'Top',
						bottom: 'Bottom',
						'top-bottom': 'Top & Bottom',
						'bottom-each-note': 'Bottom of Each Note',
						'top-each-note': 'Top of Each Note',
					},
					shouldHide: hideSubmitButtonOptions,
				},
			],
		},
		{
			type: 'group',
			displayName: 'Existing properties',
			items: [
				{
					type: 'toggle',
					key: HIDE_NON_EXISTENT_PROPERTIES_KEY,
					displayName: 'Hide non-existent properties',
					default: DEFAULT_FORM_VIEW_SETTINGS.hideNonExistentProperties,
				},
				{
					type: 'toggle',
					key: ENABLE_DELETE_PROPERTY_BUTTON_KEY,
					displayName: 'Enable delete property button',
					default: DEFAULT_FORM_VIEW_SETTINGS.enableDeletePropertyButton,
				},
			],
		},
		{
			type: 'group',
			displayName: 'Conditional visibility',
			items: [
				{
					type: 'text',
					key: VISIBILITY_CONDITIONAL_PREFIX_KEY,
					displayName: 'Visibility conditional prefix',
					default: DEFAULT_FORM_VIEW_SETTINGS.visibilityConditionalPrefix,
				},
				{
					type: 'dropdown',
					key: VISIBILITY_CONDITIONAL_MODE_KEY,
					displayName: 'Visibility conditional mode',
					default: DEFAULT_FORM_VIEW_SETTINGS.visibilityConditionalMode,
					options: {
						show: 'Show',
						hide: 'Hide',
					},
				},
			],
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
	const hideNonEmptyProperties =
		config.get(HIDE_NON_EMPTY_PROPERTIES_KEY) ??
		config.get(SHOW_ONLY_EMPTY_INPUTS_KEY);
	const hideNonExistentProperties =
		config.get(HIDE_NON_EXISTENT_PROPERTIES_KEY) ??
		config.get(SHOW_ONLY_EXISTING_INPUTS_KEY);
	const manualSubmit = config.get(MANUAL_SUBMIT_KEY);
	const submitButtonName = config.get(SUBMIT_BUTTON_NAME_KEY);
	const confirmListItemDeletion = config.get(CONFIRM_LIST_ITEM_DELETION_KEY);
	const submitButtonPosition = config.get(SUBMIT_BUTTON_POSITION_KEY);
	const enableDeletePropertyButton =
		config.get(ENABLE_DELETE_PROPERTY_BUTTON_KEY);
	const visibilityConditionalPrefix = config.get(
		VISIBILITY_CONDITIONAL_PREFIX_KEY,
	);
	const visibilityConditionalMode = config.get(
		VISIBILITY_CONDITIONAL_MODE_KEY,
	);
	const itemSpacing = config.get(ITEM_SPACING_KEY);
	const formWidth = config.get(FORM_WIDTH_KEY);

	return {
		showFileName:
			typeof showFileName === 'boolean'
				? showFileName
				: DEFAULT_FORM_VIEW_SETTINGS.showFileName,
		hideNonEmptyProperties:
			typeof hideNonEmptyProperties === 'boolean'
				? hideNonEmptyProperties
				: DEFAULT_FORM_VIEW_SETTINGS.hideNonEmptyProperties,
		hideNonExistentProperties:
			typeof hideNonExistentProperties === 'boolean'
				? hideNonExistentProperties
				: DEFAULT_FORM_VIEW_SETTINGS.hideNonExistentProperties,
		manualSubmit:
			typeof manualSubmit === 'boolean'
				? manualSubmit
				: DEFAULT_FORM_VIEW_SETTINGS.manualSubmit,
		submitButtonName:
			typeof submitButtonName === 'string' && submitButtonName.trim() !== ''
				? submitButtonName
				: DEFAULT_FORM_VIEW_SETTINGS.submitButtonName,
		confirmListItemDeletion:
			typeof confirmListItemDeletion === 'boolean'
				? confirmListItemDeletion
				: DEFAULT_FORM_VIEW_SETTINGS.confirmListItemDeletion,
		submitButtonPosition:
			submitButtonPosition === 'top' ||
			submitButtonPosition === 'bottom' ||
			submitButtonPosition === 'top-bottom' ||
			submitButtonPosition === 'bottom-each-note' ||
			submitButtonPosition === 'top-each-note'
				? submitButtonPosition
				: DEFAULT_FORM_VIEW_SETTINGS.submitButtonPosition,
		enableDeletePropertyButton:
			typeof enableDeletePropertyButton === 'boolean'
				? enableDeletePropertyButton
				: DEFAULT_FORM_VIEW_SETTINGS.enableDeletePropertyButton,
		visibilityConditionalPrefix:
			typeof visibilityConditionalPrefix === 'string'
				? visibilityConditionalPrefix
				: DEFAULT_FORM_VIEW_SETTINGS.visibilityConditionalPrefix,
		visibilityConditionalMode:
			visibilityConditionalMode === 'show' ||
			visibilityConditionalMode === 'hide'
				? visibilityConditionalMode
				: DEFAULT_FORM_VIEW_SETTINGS.visibilityConditionalMode,
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
