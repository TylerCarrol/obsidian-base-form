import { describe, expect, it } from 'vitest';
import { paginateFormGroups } from '../form/form-pagination';

describe('form pagination', () => {
	const groups = [
		{ key: 'A', hasKey: () => true, entries: [1, 2, 3] },
		{ key: 'B', hasKey: () => true, entries: [4, 5, 6] },
	];

	it('preserves group ordering across page boundaries', () => {
		const first = paginateFormGroups(groups, 0, 4);
		expect(first.groups.map((group) => [group.key, group.entries]))
			.toEqual([['A', [1, 2, 3]], ['B', [4]]]);
		expect(first.groups[0]?.hasKey?.()).toBe(true);
		const second = paginateFormGroups(groups, 1, 4);
		expect(second.groups.map((group) => [group.key, group.entries]))
			.toEqual([['B', [5, 6]]]);
		expect(second).toMatchObject({ start: 4, total: 6, pageCount: 2 });
	});

	it('clamps the page when filters remove notes', () => {
		expect(paginateFormGroups(groups, 10, 4).page).toBe(1);
		expect(paginateFormGroups([], 10, 50)).toMatchObject({
			page: 0, pageCount: 1, total: 0, groups: [],
		});
	});

	it('supports all notes without pagination', () => {
		expect(paginateFormGroups(groups, 5, 0)).toMatchObject({
			page: 0, pageCount: 1, start: 0, total: 6,
		});
		expect(paginateFormGroups(groups, 5, 0).groups.flatMap((group) => group.entries))
			.toEqual([1, 2, 3, 4, 5, 6]);
	});
});
