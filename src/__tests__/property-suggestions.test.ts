import { describe, expect, it, vi } from 'vitest';
import { collectListPropertyValues } from '../form/property-suggestions';

describe('list property value collection', () => {
	it('does not scan the vault when there are no list properties', () => {
		const getMarkdownFiles = vi.fn(() => []);
		const app = {
			vault: { getMarkdownFiles },
		} as never;

		expect(collectListPropertyValues(app, [])).toEqual(new Map());
		expect(getMarkdownFiles).not.toHaveBeenCalled();
	});

	it('collects unique string items from matching properties across the vault', () => {
		const ada = { path: 'Ada.md' };
		const alan = { path: 'Alan.md' };
		const grace = { path: 'Grace.md' };
		const getMarkdownFiles = vi.fn(() => [ada, alan, grace]);
		const frontmatterByPath: Record<string, Record<string, unknown>> = {
			'Ada.md': {
				'Related-Notes': ['[[Grace Hopper]]'],
				interests: ['Mathematics', 'Computing'],
			},
			'Alan.md': {
				'related-notes': ['[[Ada Lovelace]]'],
				interests: ['Computing', 42],
			},
			'Grace.md': {
				'related-notes': ['[[Alan Turing]]', ''],
				interests: null,
			},
		};
		const app = {
			vault: { getMarkdownFiles },
			metadataCache: {
				getFileCache: (file: { path: string }) => ({
					frontmatter: frontmatterByPath[file.path],
				}),
			},
		} as never;

		const values = collectListPropertyValues(app, [
			'related-notes',
			'interests',
		]);

		expect(getMarkdownFiles).toHaveBeenCalledOnce();
		expect(values.get('related-notes')).toEqual([
			'[[Grace Hopper]]',
			'[[Ada Lovelace]]',
			'[[Alan Turing]]',
		]);
		expect(values.get('interests')).toEqual([
			'Mathematics',
			'Computing',
		]);
	});
});