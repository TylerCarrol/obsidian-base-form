import { describe, expect, it } from 'vitest';
import {
	DEFAULT_FORM_VIEW_SETTINGS,
	getFormViewSettings,
} from '../form/view-options';

function readSettings(values: Record<string, unknown>) {
	return getFormViewSettings({
		get: (key: string) => values[key],
	});
}

describe('form view settings', () => {
	it('uses compact, backwards-compatible defaults', () => {
		expect(readSettings({})).toEqual(DEFAULT_FORM_VIEW_SETTINGS);
	});

	it('reads filename visibility, empty-input filtering, item spacing, and form width', () => {
		expect(
			readSettings({
				showFileName: false,
				showOnlyEmptyInputs: true,
				showOnlyExistingInputs: true,
				itemSpacing: 12,
				formWidth: 40,
			}),
		).toEqual({
			showFileName: false,
			showOnlyEmptyInputs: true,
			showOnlyExistingInputs: true,
			itemSpacing: 12,
			formWidth: 40,
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
				showOnlyEmptyInputs: 'true',
				showOnlyExistingInputs: 'true',
				itemSpacing: '12',
			}),
		).toEqual(DEFAULT_FORM_VIEW_SETTINGS);
	});
});
