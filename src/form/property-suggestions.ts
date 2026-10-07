import type { App, TFile } from 'obsidian';

function readListValues(
	frontmatter: Record<string, unknown> | undefined,
	names: ReadonlySet<string>,
): Map<string, string[]> {
	const result = new Map<string, string[]>();
	for (const [key, rawValue] of Object.entries(frontmatter ?? {})) {
		const name = key.toLocaleLowerCase();
		if (!names.has(name) || !Array.isArray(rawValue)) {
			continue;
		}
		const values = result.get(name) ?? [];
		for (const item of rawValue) {
			if (typeof item === 'string' && item !== '') {
				values.push(item);
			}
		}
		result.set(name, values);
	}
	for (const [name, values] of result) {
		result.set(name, [...new Set(values)]);
	}
	return result;
}

export function collectListPropertyValues(
	app: App,
	propertyNames: readonly string[],
): Map<string, readonly string[]> {
	const requestedNames = new Set(
		propertyNames.map((name) => name.toLocaleLowerCase()),
	);
	const collectedValues = new Map<string, string[]>();
	const seenValues = new Map<string, Set<string>>();
	if (requestedNames.size === 0) {
		return collectedValues;
	}

	for (const propertyName of requestedNames) {
		collectedValues.set(propertyName, []);
		seenValues.set(propertyName, new Set());
	}

	for (const file of app.vault.getMarkdownFiles()) {
		const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
		if (frontmatter === undefined) {
			continue;
		}

		for (const [propertyName, items] of readListValues(frontmatter, requestedNames)) {
			const values = collectedValues.get(propertyName);
			const seen = seenValues.get(propertyName);
			if (values === undefined || seen === undefined) {
				continue;
			}

			for (const item of items) {
				if (seen.has(item)) {
					continue;
				}
				seen.add(item);
				values.push(item);
			}
		}
	}

	return collectedValues;
}

export class ListPropertySuggestions {
	private names = new Set<string>();
	private initialized = false;
	private readonly files = new Map<string, Map<string, string[]>>();
	private readonly counts = new Map<string, Map<string, number>>();
	private readonly cached = new Map<string, readonly string[]>();

	constructor(private readonly app: App) {}

	setProperties(propertyNames: readonly string[]): void {
		const names = new Set(propertyNames.map((name) => name.toLocaleLowerCase()));
		if (names.size === this.names.size && [...names].every((name) => this.names.has(name))) {
			return;
		}
		this.clear();
		this.names = names;
	}

	get(propertyName: string): readonly string[] {
		const name = propertyName.toLocaleLowerCase();
		if (!this.names.has(name)) {
			return [];
		}
		if (!this.initialized) {
			this.initialized = true;
			for (const file of this.app.vault.getMarkdownFiles()) {
				this.update(file);
			}
		}
		let values = this.cached.get(name);
		if (values === undefined) {
			values = [...(this.counts.get(name)?.keys() ?? [])];
			this.cached.set(name, values);
		}
		return values;
	}

	update(file: TFile): void {
		if (!this.initialized || file.extension !== 'md') {
			return;
		}
		this.replace(file.path, readListValues(
			this.app.metadataCache.getFileCache(file)?.frontmatter, this.names,
		));
	}

	remove(path: string): void {
		this.replace(path, new Map());
		this.files.delete(path);
	}

	clear(): void {
		this.initialized = false;
		this.files.clear();
		this.counts.clear();
		this.cached.clear();
		this.names.clear();
	}

	private replace(path: string, next: Map<string, string[]>): void {
		const previous = this.files.get(path);
		for (const name of this.names) {
			const oldValues = previous?.get(name) ?? [];
			const newValues = next.get(name) ?? [];
			if (oldValues.length === newValues.length &&
				oldValues.every((value, index) => value === newValues[index])) {
				continue;
			}
			const counts = this.counts.get(name) ?? new Map<string, number>();
			for (const value of oldValues) {
				const count = (counts.get(value) ?? 0) - 1;
				if (count <= 0) {
					counts.delete(value);
				} else {
					counts.set(value, count);
				}
			}
			for (const value of newValues) {
				counts.set(value, (counts.get(value) ?? 0) + 1);
			}
			this.counts.set(name, counts);
			this.cached.delete(name);
		}
		if (next.size > 0) {
			this.files.set(path, next);
		} else {
			this.files.delete(path);
		}
	}
}