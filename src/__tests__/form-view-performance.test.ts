import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { NumberValue } from 'obsidian';
import { BaseFormView } from '../form/form-view';

beforeAll(() => {
	function createEl(
		this: HTMLElement,
		tag: string,
		options?: { cls?: string; text?: string; attr?: Record<string, string> },
	): HTMLElement {
		const element = document.createElement(tag);
		if (options?.cls !== undefined) element.className = options.cls;
		if (options?.text !== undefined) element.textContent = options.text;
		for (const [key, value] of Object.entries(options?.attr ?? {})) {
			element.setAttribute(key, value);
		}
		this.appendChild(element);
		return element;
	}
	Object.defineProperties(HTMLElement.prototype, {
		createEl: { configurable: true, value: createEl },
		createDiv: { configurable: true, value: function (this: HTMLElement, options: Parameters<typeof createEl>[1]) {
			return createEl.call(this, 'div', options);
		} },
		createSpan: { configurable: true, value: function (this: HTMLElement, options: Parameters<typeof createEl>[1]) {
			return createEl.call(this, 'span', options);
		} },
		empty: { configurable: true, value: function (this: HTMLElement) { this.replaceChildren(); } },
		addClass: { configurable: true, value: function (this: HTMLElement, ...classes: string[]) { this.classList.add(...classes); } },
		setText: { configurable: true, value: function (this: HTMLElement, text: string) { this.textContent = text; } },
		scrollTo: { configurable: true, value: vi.fn() },
	});
});

afterEach(() => {
	document.body.replaceChildren();
});

function setup(options: { manualSubmit?: boolean; grouped?: boolean; pageSize?: string } = {}) {
	const files = Array.from({ length: 1500 }, (_, index) => ({
		path: `${index}.md`, basename: `Note ${index}`, extension: 'md',
	}));
	const frontmatter = new Map(files.map((file, index) => [file.path, { score: index }]));
	const entries = files.map((file) => ({
		file,
		getValue: () => new NumberValue(frontmatter.get(file.path)!.score),
	}));
	const scrollEl = document.createElement('div');
	document.body.appendChild(scrollEl);
	const getMarkdownFiles = vi.fn(() => files);
	const getFileCache = vi.fn((file: { path: string }) => ({
		frontmatter: frontmatter.get(file.path),
	}));
	const fileToLinktext = vi.fn((file: { basename: string }) => file.basename);
	const metadataHandlers = new Map<string, (file: unknown) => void>();
	const vaultHandlers = new Map<string, (file: unknown, oldPath?: string) => void>();
	const app = {
		vault: {
			getMarkdownFiles,
			getFileByPath: (path: string) => files.find((file) => file.path === path) ?? null,
			on: (event: string, callback: (file: unknown, oldPath?: string) => void) => vaultHandlers.set(event, callback),
		},
		metadataTypeManager: { getAssignedType: () => 'number' },
		metadataCache: {
			getFileCache, fileToLinktext,
			on: (event: string, callback: (file: unknown) => void) => metadataHandlers.set(event, callback),
		},
		workspace: { getActiveFile: () => null },
		fileManager: {
			processFrontMatter: vi.fn(async (file: { path: string }, update: (data: { score: number }) => void) => {
				update(frontmatter.get(file.path)!);
				metadataHandlers.get('changed')?.(file);
				view.onDataUpdated();
				await Promise.resolve();
			}),
		},
	};
	const view = new BaseFormView({ app } as never, scrollEl);
	view.config = {
		get: (key: string) => ({ manualSubmit: options.manualSubmit, pageSize: options.pageSize })[key],
		getOrder: () => ['score'],
		getDisplayName: (property: string) => property,
	} as never;
	view.allProperties = ['score'] as never;
	view.data = {
		data: entries,
		properties: ['score'],
		groupedData: options.grouped
			? entries.map((entry, index) => ({ key: index, entries: [entry], hasKey: () => true }))
			: [{ entries, hasKey: () => false }],
	} as never;
	view.onload();
	view.onDataUpdated();
	function next(): void {
		scrollEl.querySelectorAll<HTMLButtonElement>('[data-page-delta="1"]')[0]?.click();
	}
	return { view, scrollEl, next, app, getFileCache, getMarkdownFiles, fileToLinktext, frontmatter, entries };
}

describe('large form views', () => {
	it('renders only 50 of 1,500 forms and does not build unused suggestions', () => {
		const { view, scrollEl, getFileCache, getMarkdownFiles, fileToLinktext } = setup();
		expect(scrollEl.querySelectorAll('.base-form-entry')).toHaveLength(50);
		expect(scrollEl.querySelector('.base-form-summary')?.textContent).toBe('1500 notes');
		expect(scrollEl.querySelector('.base-form-pagination')?.textContent).toContain('Page 1 of 30');
		expect(getFileCache).toHaveBeenCalledTimes(50);
		expect(getMarkdownFiles).not.toHaveBeenCalled();
		expect(fileToLinktext).not.toHaveBeenCalled();
		view.onunload();
		expect(scrollEl.children).toHaveLength(0);
	});

	it('makes every note reachable with a bounded number of controls', () => {
		const { scrollEl, next } = setup();
		for (let page = 0; page < 30; page++) {
			const controls = scrollEl.querySelectorAll<HTMLInputElement>('[data-field-type]');
			expect(controls).toHaveLength(50);
			expect(controls[0]?.dataset.filePath).toBe(`${page * 50}.md`);
			expect(controls[49]?.dataset.filePath).toBe(`${page * 50 + 49}.md`);
			if (page < 29) next();
		}
		expect(scrollEl.querySelector<HTMLButtonElement>('[data-page-delta="1"]')?.disabled).toBe(true);
		scrollEl.querySelector<HTMLButtonElement>('[data-page-delta="-1"]')?.click();
		expect(scrollEl.querySelector('[data-field-type]')?.getAttribute('data-file-path')).toBe('1400.md');
	});

	it('keeps grouped forms and control IDs unique', () => {
		const { scrollEl, next } = setup({ grouped: true });
		expect(scrollEl.querySelectorAll('.base-form-group-header')).toHaveLength(50);
		const ids = Array.from(scrollEl.querySelectorAll<HTMLElement>('[id]'), (element) => element.id);
		expect(new Set(ids).size).toBe(ids.length);
		next();
		expect(scrollEl.querySelector('.base-form-group-value')?.textContent).toBe('50');
	});

	it('protects manual drafts until submission, then permits navigation', async () => {
		const { scrollEl, next, frontmatter } = setup({ manualSubmit: true });
		const input = scrollEl.querySelector<HTMLInputElement>('input[data-field-type]')!;
		input.value = '42';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		next();
		expect(scrollEl.querySelector('[data-field-type]')).toBe(input);
		expect(input.value).toBe('42');
		scrollEl.querySelector<HTMLButtonElement>('.base-form-submit')?.click();
		await vi.waitFor(() => expect(frontmatter.get('0.md')?.score).toBe(42));
		await Promise.resolve();
		next();
		expect(scrollEl.querySelector('[data-field-type]')?.getAttribute('data-file-path')).toBe('50.md');
	});

	it('preserves auto-save and blocks navigation while a write is pending', async () => {
		const { scrollEl, next, frontmatter, app } = setup();
		const input = scrollEl.querySelector<HTMLInputElement>('input[data-field-type]')!;
		input.value = '99';
		input.dispatchEvent(new Event('change', { bubbles: true }));
		next();
		expect(scrollEl.querySelector('[data-field-type]')).toBe(input);
		await vi.waitFor(() => expect(app.fileManager.processFrontMatter).toHaveBeenCalledOnce());
		await Promise.resolve();
		expect(frontmatter.get('0.md')?.score).toBe(99);
		next();
		expect(scrollEl.querySelector('[data-field-type]')?.getAttribute('data-file-path')).toBe('50.md');
	});

	it('keeps invalid drafts on the current page', async () => {
		const { scrollEl, next, app } = setup({ manualSubmit: true });
		const input = scrollEl.querySelector<HTMLInputElement>('input[data-field-type]')!;
		input.value = '2.5';
		input.step = '1';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		scrollEl.querySelector<HTMLButtonElement>('.base-form-submit')?.click();
		await Promise.resolve();
		next();
		expect(scrollEl.querySelector('[data-field-type]')).toBe(input);
		expect(input.getAttribute('aria-invalid')).toBe('true');
		expect(app.fileManager.processFrontMatter).not.toHaveBeenCalled();
	});

	it('retains drafts and blocks navigation after a failed save', async () => {
		const { scrollEl, next, app } = setup({ manualSubmit: true });
		app.fileManager.processFrontMatter.mockRejectedValueOnce(new Error('Write failed'));
		const input = scrollEl.querySelector<HTMLInputElement>('input[data-field-type]')!;
		input.value = '99';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		scrollEl.querySelector<HTMLButtonElement>('.base-form-submit')?.click();
		await vi.waitFor(() => expect(input.getAttribute('aria-invalid')).toBe('true'));
		next();
		expect(scrollEl.querySelector('[data-field-type]')).toBe(input);
		expect(input.value).toBe('99');
	});

	it('clamps the current page after notes disappear from the query', () => {
		const { view, scrollEl, next, entries } = setup();
		next();
		view.data = {
			data: entries.slice(0, 10), properties: ['score'], groupedData: [],
		} as never;
		view.onDataUpdated();
		expect(scrollEl.querySelectorAll('.base-form-entry')).toHaveLength(10);
		expect(scrollEl.querySelector('.base-form-pagination')).toBeNull();
	});

	it('supports the all-notes setting', () => {
		const { scrollEl } = setup({ pageSize: '0' });
		expect(scrollEl.querySelectorAll('.base-form-entry')).toHaveLength(1500);
		expect(scrollEl.querySelector('.base-form-pagination')).toBeNull();
	});
});
