import type { App, BasesEntry } from 'obsidian';

export function collectListPropertyValues(
	app: App,
	entries: readonly BasesEntry[],
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

	for (const entry of entries) {
		const frontmatter = app.metadataCache.getFileCache(entry.file)?.frontmatter;
		if (frontmatter === undefined) {
			continue;
		}

		for (const [key, rawValue] of Object.entries(frontmatter)) {
			const propertyName = key.toLocaleLowerCase();
			if (!requestedNames.has(propertyName) || !Array.isArray(rawValue)) {
				continue;
			}

			const values = collectedValues.get(propertyName);
			const seen = seenValues.get(propertyName);
			if (values === undefined || seen === undefined) {
				continue;
			}

			for (const item of rawValue) {
				if (typeof item !== 'string' || item === '' || seen.has(item)) {
					continue;
				}
				seen.add(item);
				values.push(item);
			}
		}
	}

	return collectedValues;
}