import { describe, expect, it } from 'vitest';

import { shouldRenderPropertyInput } from '../form/property-types';

describe('empty property detection', () => {
	it('treats blank text-like values as empty', () => {
		expect(
			shouldRenderPropertyInput(
				'text',
				'note',
				undefined,
				{
					toString: () => '',
				} as never,
				{
					hideNonEmptyProperties: true,
					hideNonExistentProperties: false,
				},
			),
		).toBe(true);
		expect(
			shouldRenderPropertyInput(
				'list',
				'note',
				undefined,
				{
					toString: () => 'Alpha\nBeta',
				} as never,
				{
					hideNonEmptyProperties: true,
					hideNonExistentProperties: false,
				},
			),
		).toBe(false);
	});

	it('treats unchecked checkboxes as empty and checked ones as filled', () => {
		expect(
			shouldRenderPropertyInput(
				'checkbox',
				'note',
				false,
				null,
				{
					hideNonEmptyProperties: true,
					hideNonExistentProperties: false,
				},
			),
		).toBe(true);
		expect(
			shouldRenderPropertyInput(
				'checkbox',
				'note',
				true,
				null,
				{
					hideNonEmptyProperties: true,
					hideNonExistentProperties: false,
				},
			),
		).toBe(false);
	});

	it('requires frontmatter presence when existing-only filtering is enabled', () => {
		expect(
			shouldRenderPropertyInput(
				'text',
				'note',
				undefined,
				{
					toString: () => '',
				} as never,
				{
					hideNonEmptyProperties: false,
					hideNonExistentProperties: true,
				},
			),
		).toBe(false);
		expect(
			shouldRenderPropertyInput(
				'text',
				'note',
				'',
				{
					toString: () => '',
				} as never,
				{
					hideNonEmptyProperties: false,
					hideNonExistentProperties: true,
				},
			),
		).toBe(true);
	});

	it('shows only empty properties that exist when both filters are enabled', () => {
		expect(
			shouldRenderPropertyInput(
				'text',
				'note',
				undefined,
				{
					toString: () => '',
				} as never,
				{
					hideNonEmptyProperties: true,
					hideNonExistentProperties: true,
				},
			),
		).toBe(false);
		expect(
			shouldRenderPropertyInput(
				'text',
				'note',
				'',
				{
					toString: () => '',
				} as never,
				{
					hideNonEmptyProperties: true,
					hideNonExistentProperties: true,
				},
			),
		).toBe(true);
	});

	it('leaves formula properties alone', () => {
		expect(
			shouldRenderPropertyInput(
				'text',
				'formula',
				undefined,
				{
					toString: () => '',
				} as never,
				{
					hideNonEmptyProperties: true,
					hideNonExistentProperties: true,
				},
			),
		).toBe(true);
	});
});