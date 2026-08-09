import { describe, expect, it } from 'vitest';

import { shouldRenderPropertyInput } from '../form/property-types';

describe('empty property detection', () => {
	it('treats blank text-like values as empty', () => {
		expect(
			shouldRenderPropertyInput(
				'text',
				undefined,
				{
					toString: () => '',
				} as never,
				{
					showOnlyEmptyInputs: true,
					showOnlyExistingInputs: false,
				},
			),
		).toBe(true);
		expect(
			shouldRenderPropertyInput(
				'list',
				undefined,
				{
					toString: () => 'Alpha\nBeta',
				} as never,
				{
					showOnlyEmptyInputs: true,
					showOnlyExistingInputs: false,
				},
			),
		).toBe(false);
	});

	it('treats unchecked checkboxes as empty and checked ones as filled', () => {
		expect(
			shouldRenderPropertyInput(
				'checkbox',
				false,
				null,
				{
					showOnlyEmptyInputs: true,
					showOnlyExistingInputs: false,
				},
			),
		).toBe(true);
		expect(
			shouldRenderPropertyInput(
				'checkbox',
				true,
				null,
				{
					showOnlyEmptyInputs: true,
					showOnlyExistingInputs: false,
				},
			),
		).toBe(false);
	});

	it('requires frontmatter presence when existing-only filtering is enabled', () => {
		expect(
			shouldRenderPropertyInput(
				'text',
				undefined,
				{
					toString: () => '',
				} as never,
				{
					showOnlyEmptyInputs: false,
					showOnlyExistingInputs: true,
				},
			),
		).toBe(false);
		expect(
			shouldRenderPropertyInput(
				'text',
				'',
				{
					toString: () => '',
				} as never,
				{
					showOnlyEmptyInputs: false,
					showOnlyExistingInputs: true,
				},
			),
		).toBe(true);
	});

	it('shows only empty properties that exist when both filters are enabled', () => {
		expect(
			shouldRenderPropertyInput(
				'text',
				undefined,
				{
					toString: () => '',
				} as never,
				{
					showOnlyEmptyInputs: true,
					showOnlyExistingInputs: true,
				},
			),
		).toBe(false);
		expect(
			shouldRenderPropertyInput(
				'text',
				'',
				{
					toString: () => '',
				} as never,
				{
					showOnlyEmptyInputs: true,
					showOnlyExistingInputs: true,
				},
			),
		).toBe(true);
	});
});