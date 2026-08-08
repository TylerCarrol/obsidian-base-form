import { describe, expect, it } from 'vitest';
import {
	findFrontmatterKey,
	formatFormValue,
	inferRawFieldType,
	isEditableRawValue,
	isFormFieldType,
	normalizePropertyType,
	parseFormValue,
} from '../form/property-values';

describe('property type helpers', () => {
	it('recognizes every supported field type', () => {
		for (const type of [
			'text',
			'list',
			'number',
			'checkbox',
			'date',
			'datetime',
		]) {
			expect(isFormFieldType(type)).toBe(true);
		}
		expect(isFormFieldType('unsupported')).toBe(false);
	});

	it('maps Obsidian list-like types to list fields', () => {
		expect(normalizePropertyType('multitext')).toBe('list');
		expect(normalizePropertyType('aliases')).toBe('list');
		expect(normalizePropertyType('tags')).toBe('list');
		expect(normalizePropertyType('unknown')).toBeNull();
	});

	it('infers field types from raw frontmatter values', () => {
		expect(inferRawFieldType(['one', 'two'])).toBe('list');
		expect(inferRawFieldType(42)).toBe('number');
		expect(inferRawFieldType(false)).toBe('checkbox');
		expect(inferRawFieldType('2026-08-05')).toBe('date');
		expect(inferRawFieldType('2026-08-05T14:30')).toBe('datetime');
		expect(inferRawFieldType('2026-08-05T14:30Z')).toBe('datetime');
		expect(inferRawFieldType('2026-08-05 as text')).toBe('text');
		expect(inferRawFieldType(null)).toBeNull();
	});

	it('only edits values that can round-trip without coercion', () => {
		expect(isEditableRawValue('text', 'Hello')).toBe(true);
		expect(isEditableRawValue('text', { nested: true })).toBe(false);
		expect(isEditableRawValue('list', ['one', 'two'])).toBe(true);
		expect(isEditableRawValue('list', [1, 2])).toBe(false);
		expect(isEditableRawValue('list', ['line one\nline two'])).toBe(
			false,
		);
		expect(isEditableRawValue('list', [''])).toBe(false);
		expect(isEditableRawValue('datetime', '2026-08-05T14:30')).toBe(
			true,
		);
		expect(isEditableRawValue('datetime', '2026-08-05T14:30Z')).toBe(
			false,
		);
	});
});

describe('form value formatting', () => {
	it('formats list values one item per line', () => {
		expect(formatFormValue('list', ['Alpha', 'Beta'])).toBe(
			'Alpha\nBeta',
		);
	});

	it('normalizes date and datetime values for native inputs', () => {
		expect(formatFormValue('date', '2026-08-05T14:30:00')).toBe(
			'2026-08-05',
		);
		expect(
			formatFormValue('datetime', '2026-08-05T14:30:45Z'),
		).toBe('');
		expect(formatFormValue('date', 'not a date')).toBe('');
	});
});

describe('form value parsing', () => {
	it('converts text areas into string lists', () => {
		expect(parseFormValue('list', ' Alpha \n\nBeta')).toEqual({
			ok: true,
			value: [' Alpha ', '', 'Beta'],
		});
		expect(parseFormValue('list', '')).toEqual({
			ok: true,
			value: [],
		});
	});

	it('handles numbers and cleared optional values', () => {
		expect(parseFormValue('number', '12.5')).toEqual({
			ok: true,
			value: 12.5,
		});
		expect(parseFormValue('number', '')).toEqual({
			ok: true,
			value: null,
		});
		expect(parseFormValue('number', 'NaN')).toEqual({
			ok: false,
			message: 'Enter a valid number.',
		});
	});

	it('validates calendar dates and local datetimes', () => {
		expect(parseFormValue('date', '2024-02-29')).toEqual({
			ok: true,
			value: '2024-02-29',
		});
		expect(parseFormValue('date', '2026-02-29')).toEqual({
			ok: false,
			message: 'Enter a valid date.',
		});
		expect(parseFormValue('date', '0004-02-29')).toEqual({
			ok: true,
			value: '0004-02-29',
		});
		expect(parseFormValue('datetime', '2026-08-05T14:30')).toEqual({
			ok: true,
			value: '2026-08-05T14:30',
		});
	});

	it('keeps checkbox values boolean', () => {
		expect(parseFormValue('checkbox', true)).toEqual({
			ok: true,
			value: true,
		});
	});
});

describe('frontmatter key matching', () => {
	it('reuses an existing key regardless of case', () => {
		const frontmatter = { 'Review-Date': '2026-08-05' };
		expect(findFrontmatterKey(frontmatter, 'review-date')).toBe(
			'Review-Date',
		);
	});

	it('returns the requested name for a new property', () => {
		expect(findFrontmatterKey({}, 'new-property')).toBe('new-property');
	});
});
