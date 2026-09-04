import { describe, expect, it } from 'vitest';
import {
	DEFAULT_FORM_VIEW_SETTINGS,
	getFormViewOptions,
	getFormViewSettings,
} from '../form/view-options';

function readSettings(values: Record<string, unknown>) {
	return getFormViewSettings({
		get: (key: string) => values[key],
	});
}

function findOption(
	options: ReturnType<typeof getFormViewOptions>,
	key: string,
) {
	for (const option of options) {
		if (option.type === 'group') {
			const item = option.items.find((groupItem) => groupItem.key === key);
			if (item !== undefined) {
				return item;
			}
		} else if (option.key === key) {
			return option;
		}
	}
	return undefined;
}

describe('form view settings', () => {
	it('uses compact, backwards-compatible defaults', () => {
		expect(readSettings({})).toEqual(DEFAULT_FORM_VIEW_SETTINGS);
	});

	it('reads filename visibility, empty-input filtering, item spacing, form width, and delete-button visibility', () => {
		expect(
			readSettings({
				showFileName: false,
				hideNonEmptyProperties: true,
				hideNonExistentProperties: true,
				manualSubmit: true,
				submitButtonName: 'Save form',
				submitButtonPosition: 'top',
				itemSpacing: 12,
				formWidth: 40,
				enableDeletePropertyButton: true,
			}),
		).toEqual({
			showFileName: false,
			hideNonEmptyProperties: true,
			hideNonExistentProperties: true,
			manualSubmit: true,
			submitButtonName: 'Save form',
			submitButtonPosition: 'top',
			itemSpacing: 12,
			formWidth: 40,
			enableDeletePropertyButton: true,
		});
	});

	it('shows submit options only for empty-property forms', () => {
		const options = getFormViewOptions({
			get: (key: string) =>
				({ hideNonEmptyProperties: true, manualSubmit: true })[key],
		});
		const manualSubmit = findOption(options, 'manualSubmit');
		const submitButtonName = findOption(options, 'submitButtonName');

		expect(manualSubmit?.shouldHide?.()).toBe(false);
		expect(submitButtonName?.shouldHide?.()).toBe(false);

		const disabledOptions = getFormViewOptions({
			get: (key: string) =>
				({ hideNonEmptyProperties: false, manualSubmit: true })[key],
		});
		expect(
			findOption(disabledOptions, 'manualSubmit')?.shouldHide?.(),
		).toBe(true);
		expect(
			findOption(disabledOptions, 'submitButtonName')?.shouldHide?.(),
		).toBe(true);

		const manualSubmitOffOptions = getFormViewOptions({
			get: (key: string) =>
				({ hideNonEmptyProperties: true, manualSubmit: false })[key],
		});
		expect(
			findOption(manualSubmitOffOptions, 'submitButtonName')?.shouldHide?.(),
		).toBe(true);
	});

	it('refreshes submit option visibility when settings change', () => {
		const values: Record<string, unknown> = {
			hideNonEmptyProperties: false,
			manualSubmit: false,
		};
		const options = getFormViewOptions({
			get: (key: string) => values[key],
		});
		const manualSubmit = findOption(options, 'manualSubmit');
		const submitButtonName = findOption(options, 'submitButtonName');

		expect(manualSubmit?.shouldHide?.()).toBe(true);
		expect(submitButtonName?.shouldHide?.()).toBe(true);

		values.hideNonEmptyProperties = true;
		values.manualSubmit = true;
		expect(manualSubmit?.shouldHide?.()).toBe(false);
		expect(submitButtonName?.shouldHide?.()).toBe(false);
	});

	it('groups existing-property options', () => {
		const options = getFormViewOptions({ get: () => undefined });
		const group = options.find(
			(option) =>
				option.type === 'group' &&
				option.displayName === 'Existing properties',
		);

		expect(group?.type).toBe('group');
		if (group?.type === 'group') {
			expect(group.items.map((item) => item.key)).toEqual([
				'hideNonExistentProperties',
				'enableDeletePropertyButton',
			]);
		}
	});

	it('keeps backwards compatibility with the old setting names', () => {
		expect(
			readSettings({
				showOnlyEmptyInputs: true,
				showOnlyExistingInputs: true,
			}),
		).toEqual({
			...DEFAULT_FORM_VIEW_SETTINGS,
			hideNonEmptyProperties: true,
			hideNonExistentProperties: true,
		});
	});

	it('clamps item spacing to the supported range', () => {
		expect(readSettings({ itemSpacing: -1 }).itemSpacing).toBe(0);
		expect(readSettings({ itemSpacing: 100 }).itemSpacing).toBe(32);
	});

	it('clamps form width to the supported range', () => {
		expect(readSettings({ formWidth: 0 }).formWidth).toBe(24);
		expect(readSettings({ formWidth: 200 }).formWidth).toBe(80);
	});

	it('ignores malformed settings', () => {
		expect(
			readSettings({
				showFileName: 'false',
				hideNonEmptyProperties: 'true',
				hideNonExistentProperties: 'true',
				itemSpacing: '12',
				enableDeletePropertyButton: 'true',
				manualSubmit: 'true',
				submitButtonName: 42,
				submitButtonPosition: 'middle',
			}),
		).toEqual(DEFAULT_FORM_VIEW_SETTINGS);
	});
});
