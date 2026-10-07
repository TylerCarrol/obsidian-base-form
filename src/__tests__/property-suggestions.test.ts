import { describe, expect, it, vi } from 'vitest';
import { collectListPropertyValues, ListPropertySuggestions } from '../form/property-suggestions';

describe('list property value collection', () => {
	it('does not scan the vault when there are no list properties', () => {
		const getMarkdownFiles = vi.fn(() => []);
		const app = { vault: { getMarkdownFiles }, metadataCache: {} } as never;

		expect(collectListPropertyValues(app, [])).toEqual(new Map());
		expect(getMarkdownFiles).not.toHaveBeenCalled();
	});

	describe('incremental list suggestions', () => {
		function setup() {
			const files = Array.from({ length: 1500 }, (_, index) => ({
				path: `${index}.md`, extension: 'md',
			}));
			const frontmatter = new Map(files.map((file) => [file.path, {
				tags: ['shared', file.path], score: 1,
			}]));
			const getMarkdownFiles = vi.fn(() => files);
			const getFileCache = vi.fn((file: { path: string }) => ({
				frontmatter: frontmatter.get(file.path),
			}));
			const cache = new ListPropertySuggestions({
				vault: { getMarkdownFiles }, metadataCache: { getFileCache },
			} as never);
			cache.setProperties(['tags']);
			return { cache, files, frontmatter, getMarkdownFiles, getFileCache };
		}

		it('scans lazily once, then reads only the changed file', () => {
			const { cache, files, frontmatter, getMarkdownFiles, getFileCache } = setup();
			expect(getMarkdownFiles).not.toHaveBeenCalled();
			const original = cache.get('TAGS');
			expect(original).toHaveLength(1501);
			expect(getFileCache).toHaveBeenCalledTimes(1500);
			cache.setProperties(['TAGS']);
			expect(cache.get('tags')).toBe(original);
			const file = files[0]!;
			frontmatter.set(file.path, { tags: ['shared', 'new'], score: 2 });
			cache.update(file as never);
			expect(cache.get('tags')).toContain('new');
			expect(cache.get('tags')).not.toContain('0.md');
			expect(cache.get('tags')).toContain('shared');
			expect(getMarkdownFiles).toHaveBeenCalledOnce();
			expect(getFileCache).toHaveBeenCalledTimes(1501);
		});

		it('retains the cached array when an unrelated property changes', () => {
			const { cache, files, frontmatter } = setup();
			const original = cache.get('tags');
			const file = files[0]!;
			frontmatter.get(file.path)!.score = 2;
			cache.update(file as never);
			expect(cache.get('tags')).toBe(original);
		});

		it('removes deleted values but retains values used by other files', () => {
			const { cache, files } = setup();
			cache.get('tags');
			cache.remove(files[0]!.path);
			expect(cache.get('tags')).not.toContain('0.md');
			expect(cache.get('tags')).toContain('shared');
			for (const file of files.slice(1)) {
				cache.remove(file.path);
			}
			expect(cache.get('tags')).toEqual([]);
		});

		it('includes new notes and reinitializes when requested properties change', () => {
			const { cache, frontmatter, getMarkdownFiles } = setup();
			cache.get('tags');
			frontmatter.set('new.md', { tags: ['new value'], score: 1 });
			cache.update({ path: 'new.md', extension: 'md' } as never);
			expect(cache.get('tags')).toContain('new value');
			cache.setProperties(['other']);
			expect(cache.get('other')).toEqual([]);
			expect(getMarkdownFiles).toHaveBeenCalledTimes(2);
			cache.clear();
			expect(cache.get('other')).toEqual([]);
		});
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