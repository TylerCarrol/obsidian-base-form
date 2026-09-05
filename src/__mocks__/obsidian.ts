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

	open(): void {}

	close(): void {}
}

export class Notice {
	constructor(public message: string) {}
}

class ConfirmationButton {
	constructor(private readonly buttonEl: HTMLButtonElement) {}

	setButtonText(text: string): this {
		this.buttonEl.textContent = text;
		return this;
	}

	setCta(): this {
		return this;
	}

	setDestructive(): this {
		this.buttonEl.classList.add('mod-warning');
		return this;
	}

	onClick(callback: () => void): this {
		this.buttonEl.addEventListener('click', callback);
		return this;
	}
}

export class ConfirmationModal {
	readonly titleEl = document.createElement('div');
	readonly contentEl = document.createElement('div');
	private readonly modalEl = document.createElement('div');
	private readonly buttonsEl = document.createElement('div');

	constructor(public app: unknown) {
		this.modalEl.className = 'modal-container';
		this.modalEl.append(this.titleEl, this.contentEl, this.buttonsEl);
	}

	addButton(callback: (button: ConfirmationButton) => void): void {
		const buttonEl = document.createElement('button');
		this.buttonsEl.appendChild(buttonEl);
		callback(new ConfirmationButton(buttonEl));
	}

	addCancelButton(text: string): void {
		const buttonEl = document.createElement('button');
		buttonEl.textContent = text;
		buttonEl.addEventListener('click', () => this.close());
		this.buttonsEl.appendChild(buttonEl);
	}

	open(): void {
		document.body.appendChild(this.modalEl);
	}

	close(): void {
		this.modalEl.remove();
	}
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
