import { describe, expect, it, vi } from 'vitest';
import { NullValue } from 'obsidian';
import {
	getBaseFormGroupLabel,
	getBaseFormGroupLabelParts,
	inferGroupPropertyLabel,
	isBooleanGroupValue,
	renderGroupValue,
} from '../form/form-view';

describe('base form grouping', () => {
	it('renders a friendly label for empty groups', () => {
		expect(
			getBaseFormGroupLabel({
				key: NullValue.value,
				entries: [],
				hasKey: () => false,
			}),
		).toBe('No value');
	});

	it('uses the key text for grouped sections', () => {
		expect(
			getBaseFormGroupLabel({
				key: { toString: () => 'true' },
				entries: [],
				hasKey: () => true,
			}),
		).toBe('true');
	});

	it('keeps the property label separate from the value text', () => {
		expect(
			getBaseFormGroupLabelParts(
				{
					key: { toString: () => 'true' },
					entries: [],
					hasKey: () => true,
				},
				'Featured',
			),
		).toEqual({
				label: 'Featured',
				valueText: 'true',
			});
	});

	it('treats true and false string values as boolean group values', () => {
		expect(isBooleanGroupValue(true)).toBe(true);
		expect(isBooleanGroupValue(false)).toBe(true);
		expect(isBooleanGroupValue('true')).toBe(true);
		expect(isBooleanGroupValue('false')).toBe(true);
		expect(isBooleanGroupValue('yes')).toBe(false);
		expect(isBooleanGroupValue('1')).toBe(false);
	});

	it('renders linked group values as clickable links', () => {
		const app = {
			metadataCache: {
				getFirstLinkpathDest: vi.fn(() => ({ path: 'Demo notes/Grace Hopper.md' })),
			},
		} as never;
		const valueEl = document.createElement('span');

		renderGroupValue(valueEl, app, 'Demo notes/Alan Turing.md', '[[Grace Hopper]]');

		const link = valueEl.querySelector<HTMLAnchorElement>('a.base-form-link');
		expect(link).not.toBeNull();
		expect(link?.dataset.filePath).toBe('Demo notes/Grace Hopper.md');
	});

	it('renders boolean group values as checked or unchecked checkboxes', () => {
		const app = {} as never;
		const checkedEl = document.createElement('span');
		const uncheckedEl = document.createElement('span');

		renderGroupValue(checkedEl, app, 'Demo notes/Alan Turing.md', true);
		renderGroupValue(uncheckedEl, app, 'Demo notes/Alan Turing.md', 'false');

		const checkedInput = checkedEl.querySelector<HTMLInputElement>('input[type="checkbox"]');
		const uncheckedInput = uncheckedEl.querySelector<HTMLInputElement>('input[type="checkbox"]');

		expect(checkedInput?.checked).toBe(true);
		expect(uncheckedInput?.checked).toBe(false);
	});

	it('infers the label from the group-by property when the raw config is unavailable', () => {
		expect(
			inferGroupPropertyLabel(
				[
					{ key: 10, entries: [], hasKey: () => true },
					{ key: 20, entries: [], hasKey: () => true },
				],
				[
					{ getValue: () => 10 },
					{ getValue: () => 10 },
					{ getValue: () => 20 },
				],
				[
					'file.size',
					'note.featured',
				],
			),
		).toBe('file.size');
	});
});
