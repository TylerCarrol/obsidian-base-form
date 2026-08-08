import { describe, expect, it } from 'vitest';

import { isEmptyPropertyValue } from '../form/property-types';

describe('empty property detection', () => {
	it('treats blank text-like values as empty', () => {
		expect(
			isEmptyPropertyValue('text', undefined, {
				toString: () => '',
			} as never),
		).toBe(true);
		expect(
			isEmptyPropertyValue('list', undefined, {
				toString: () => 'Alpha\nBeta',
			} as never),
		).toBe(false);
	});

	it('treats unchecked checkboxes as empty and checked ones as filled', () => {
		expect(isEmptyPropertyValue('checkbox', false, null)).toBe(true);
		expect(isEmptyPropertyValue('checkbox', true, null)).toBe(false);
	});
});