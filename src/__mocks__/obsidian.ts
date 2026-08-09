export abstract class AbstractInputSuggest<T> {
	private readonly selectCallbacks: Array<(
		value: T,
		event: MouseEvent | KeyboardEvent,
	) => unknown> = [];

	constructor(
		public app: unknown,
		private readonly textInputEl: HTMLInputElement | HTMLDivElement,
	) {}

	protected abstract getSuggestions(query: string): T[] | Promise<T[]>;

	abstract renderSuggestion(value: T, el: HTMLElement): void;

	getValue(): string {
		return this.textInputEl instanceof HTMLInputElement
			? this.textInputEl.value
			: this.textInputEl.textContent ?? '';
	}

	setValue(value: string): void {
		if (this.textInputEl instanceof HTMLInputElement) {
			this.textInputEl.value = value;
		} else {
			this.textInputEl.textContent = value;
		}
	}

	onSelect(
		callback: (
			value: T,
			event: MouseEvent | KeyboardEvent,
		) => unknown,
	): this {
		this.selectCallbacks.push(callback);
		return this;
	}

	selectSuggestion(
		value: T,
		event: MouseEvent | KeyboardEvent,
	): void {
		for (const callback of this.selectCallbacks) {
			callback(value, event);
		}
	}

	close(): void {}
}

export class Notice {
	constructor(public message: string) {}
}

export class Plugin {}

export class BasesView {
	constructor(public controller?: unknown) {}
}

export class BooleanValue {
	constructor(private readonly value = false) {}

	isTruthy(): boolean {
		return this.value;
	}

	toString(): string {
		return String(this.value);
	}
}

export class DateValue {
	constructor(private readonly value = '') {}

	toString(): string {
		return this.value;
	}
}

export class ListValue {
	constructor(private readonly items: unknown[] = []) {}

	length(): number {
		return this.items.length;
	}

	get(index: number): unknown {
		return this.items[index];
	}

	toString(): string {
		return this.items.map(String).join('\n');
	}
}

export const NullValue = {
	value: null,
};

export class NumberValue {
	constructor(private readonly value = 0) {}

	toString(): string {
		return String(this.value);
	}
}

export class StringValue {
	constructor(private readonly value = '') {}

	toString(): string {
		return this.value;
	}
}

export class RenderContext {}

export function parsePropertyId(propertyId: string): {
	type: 'note' | 'file' | 'formula';
	name: string;
} {
	const [type, ...rest] = propertyId.split(':');
	if (type === 'file' || type === 'formula') {
		return {
			type,
			name: rest.join(':') || propertyId,
		};
	}

	return {
		type: 'note',
		name: propertyId,
	};
}
