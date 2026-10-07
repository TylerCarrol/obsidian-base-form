export interface FormGroup<T> {
	key?: unknown;
	hasKey?: () => boolean;
	entries: T[];
}

export function paginateFormGroups<T>(
	groups: readonly FormGroup<T>[],
	page: number,
	pageSize: number,
): { groups: FormGroup<T>[]; page: number; pageCount: number; start: number; total: number } {
	const total = groups.reduce((sum, group) => sum + group.entries.length, 0);
	const pageCount = pageSize === 0 ? 1 : Math.max(1, Math.ceil(total / pageSize));
	const currentPage = Math.max(0, Math.min(page, pageCount - 1));
	const start = pageSize === 0 ? 0 : currentPage * pageSize;
	const end = pageSize === 0 ? total : start + pageSize;
	const visibleGroups: FormGroup<T>[] = [];
	let offset = 0;
	for (const group of groups) {
		const from = Math.max(0, start - offset);
		const to = Math.min(group.entries.length, end - offset);
		if (from < to) {
			visibleGroups.push({
				key: group.key,
				hasKey: () => group.hasKey?.() ?? false,
				entries: group.entries.slice(from, to),
			});
		}
		offset += group.entries.length;
		if (offset >= end) {
			break;
		}
	}
	return { groups: visibleGroups, page: currentPage, pageCount, start, total };
}
