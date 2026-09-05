import { describe, expect, it } from 'vitest';
import { BooleanValue, StringValue } from 'obsidian';

import {
	shouldRenderByVisibilityCondition,
	shouldRenderPropertyInput,
} from '../form/property-types';

function conditionalVisibility(
	options: {
		frontmatter?: Record<string, unknown>;
		formulaValue?: unknown;
		propertyName?: string;
		prefix?: string;
		mode?: 'show' | 'hide';
	} = {},
): boolean {
	const formulaId = `formula.${options.prefix ?? 'show-'}${options.propertyName ?? 'score'}`;
	return shouldRenderByVisibilityCondition(
		{
			metadataCache: {
				getFileCache: () => ({ frontmatter: options.frontmatter ?? {} }),
			},
		} as never,
		{
			file: {},
			getValue: (propertyId: string) =>
				propertyId === formulaId ? options.formulaValue ?? null : null,
		} as never,
		options.propertyName ?? 'score',
		options.prefix ?? 'show-',
		options.mode ?? 'show',
	);
}

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

describe('conditional visibility', () => {
	it('disables conditional visibility when the prefix is empty', () => {
		expect(
			conditionalVisibility({
				prefix: '',
				frontmatter: { score: false },
				formulaValue: new BooleanValue(false),
			}),
		).toBe(true);
	});

	it.each([
		{ mode: 'show' as const, controller: true, expected: true },
		{ mode: 'show' as const, controller: false, expected: false },
		{ mode: 'hide' as const, controller: true, expected: false },
		{ mode: 'hide' as const, controller: false, expected: true },
	])(
		'applies a $controller note controller in $mode mode',
		({ mode, controller, expected }) => {
			expect(
				conditionalVisibility({
					frontmatter: { 'show-score': controller },
					mode,
				}),
			).toBe(expected);
		},
	);

	it('uses a boolean formula controller when the note controller is absent', () => {
		expect(
			conditionalVisibility({ formulaValue: new BooleanValue(false) }),
		).toBe(false);
		expect(
			conditionalVisibility({
				formulaValue: new BooleanValue(true),
				mode: 'hide',
			}),
		).toBe(false);
	});

	it('gives an existing note controller precedence over the formula controller', () => {
		expect(
			conditionalVisibility({
				frontmatter: { 'show-score': false },
				formulaValue: new BooleanValue(true),
			}),
		).toBe(false);
	});

	it('defaults to visible for missing and non-boolean controllers', () => {
		expect(conditionalVisibility()).toBe(true);
		expect(
			conditionalVisibility({ formulaValue: new StringValue('true') }),
		).toBe(true);
		expect(
			conditionalVisibility({
				frontmatter: { 'show-score': 'true' },
				formulaValue: new BooleanValue(false),
			}),
		).toBe(true);
	});

	it('uses the target name regardless of whether the target is a property or formula', () => {
		expect(
			conditionalVisibility({
				propertyName: 'Test',
				frontmatter: { 'show-Test': false },
			}),
		).toBe(false);
	});
});