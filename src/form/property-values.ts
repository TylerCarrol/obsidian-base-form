export const FORM_FIELD_TYPES = [
	'text',
	'list',
	'number',
	'checkbox',
	'date',
	'datetime',
] as const;

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];
export type FormControlValue = string | boolean;
export type PersistedFormValue =
	| string
	| string[]
	| number
	| boolean
	| null;

export type ParsedFormValue =
	| { ok: true; value: PersistedFormValue }
	| { ok: false; message: string };

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME_PATTERN =
	/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;
const DATETIME_PREFIX_PATTERN =
	/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/;

export function isFormFieldType(value: string): value is FormFieldType {
	return FORM_FIELD_TYPES.some((type) => type === value);
}

export function normalizePropertyType(value: unknown): FormFieldType | null {
	if (typeof value !== 'string') {
		return null;
	}

	switch (value.toLowerCase()) {
		case 'text':
			return 'text';
		case 'aliases':
		case 'list':
		case 'multitext':
		case 'tags':
			return 'list';
		case 'number':
			return 'number';
		case 'checkbox':
			return 'checkbox';
		case 'date':
			return 'date';
		case 'datetime':
			return 'datetime';
		default:
			return null;
	}
}

export function inferRawFieldType(value: unknown): FormFieldType | null {
	if (Array.isArray(value)) {
		return 'list';
	}
	if (typeof value === 'boolean') {
		return 'checkbox';
	}
	if (typeof value === 'number') {
		return 'number';
	}
	if (typeof value !== 'string') {
		return null;
	}
	if (isValidDate(value)) {
		return 'date';
	}
	if (hasValidDateTimePrefix(value)) {
		return 'datetime';
	}
	return 'text';
}

export function isEditableRawValue(
	type: FormFieldType,
	value: unknown,
): boolean {
	if (value === null || value === undefined) {
		return true;
	}

	switch (type) {
		case 'text':
			return typeof value === 'string' && !value.includes('\r');
		case 'list':
			return (
				Array.isArray(value) &&
				value.every(
					(item) =>
						typeof item === 'string' &&
						!item.includes('\n') &&
						!item.includes('\r'),
				) &&
				!(value.length === 1 && value[0] === '')
			);
		case 'number':
			return typeof value === 'number' && Number.isFinite(value);
		case 'checkbox':
			return typeof value === 'boolean';
		case 'date':
			return typeof value === 'string' && isValidDate(value);
		case 'datetime':
			return (
				typeof value === 'string' &&
				normalizeDateTimeForInput(value) !== ''
			);
	}
}

export function formatFormValue(
	type: FormFieldType,
	rawValue: unknown,
	fallback: FormControlValue = '',
): FormControlValue {
	switch (type) {
		case 'checkbox':
			return typeof rawValue === 'boolean'
				? rawValue
				: fallback === true || fallback === 'true';
		case 'list':
			return Array.isArray(rawValue)
				? rawValue
						.filter((item) => item !== null && item !== undefined)
						.map(String)
						.join('\n')
				: String(fallback);
		case 'date': {
			const value =
				typeof rawValue === 'string' ? rawValue : String(fallback);
			const date = value.slice(0, 10);
			return isValidDate(date) ? date : '';
		}
		case 'datetime': {
			const value =
				typeof rawValue === 'string' ? rawValue : String(fallback);
			return normalizeDateTimeForInput(value);
		}
		case 'number':
		case 'text':
			return rawValue === null || rawValue === undefined
				? String(fallback)
				: primitiveToString(rawValue, fallback);
	}
}

export function parseFormValue(
	type: FormFieldType,
	controlValue: FormControlValue,
): ParsedFormValue {
	if (type === 'checkbox') {
		return typeof controlValue === 'boolean'
			? { ok: true, value: controlValue }
			: { ok: false, message: 'Choose a checkbox value.' };
	}
	if (typeof controlValue !== 'string') {
		return { ok: false, message: 'Enter a valid value.' };
	}

	switch (type) {
		case 'text':
			return { ok: true, value: controlValue };
		case 'list':
			return {
				ok: true,
				value:
					controlValue === ''
						? []
						: controlValue.split(/\r?\n/),
			};
		case 'number': {
			const trimmed = controlValue.trim();
			if (trimmed === '') {
				return { ok: true, value: null };
			}
			const value = Number(trimmed);
			return Number.isFinite(value)
				? { ok: true, value }
				: { ok: false, message: 'Enter a valid number.' };
		}
		case 'date':
			if (controlValue === '') {
				return { ok: true, value: null };
			}
			return isValidDate(controlValue)
				? { ok: true, value: controlValue }
				: { ok: false, message: 'Enter a valid date.' };
		case 'datetime':
			if (controlValue === '') {
				return { ok: true, value: null };
			}
			return isValidDateTime(controlValue)
				? { ok: true, value: controlValue }
				: { ok: false, message: 'Enter a valid date and time.' };
	}
}

export function findFrontmatterKey(
	frontmatter: Record<string, unknown>,
	propertyName: string,
): string {
	if (Object.prototype.hasOwnProperty.call(frontmatter, propertyName)) {
		return propertyName;
	}

	const normalizedName = propertyName.toLowerCase();
	return (
		Object.keys(frontmatter).find(
			(key) => key.toLowerCase() === normalizedName,
		) ?? propertyName
	);
}

function normalizeDateTimeForInput(value: string): string {
	const match = DATETIME_PATTERN.exec(value);
	if (!match) {
		return '';
	}

	const [, date, hour, minute, second] = match;
	if (
		date === undefined ||
		hour === undefined ||
		minute === undefined ||
		!isValidDate(date) ||
		!isValidTime(hour, minute, second)
	) {
		return '';
	}

	return `${date}T${hour}:${minute}${second ? `:${second}` : ''}`;
}

function hasValidDateTimePrefix(value: string): boolean {
	const match = DATETIME_PREFIX_PATTERN.exec(value);
	if (!match) {
		return false;
	}

	const [, date, hour, minute, second] = match;
	return (
		date !== undefined &&
		hour !== undefined &&
		minute !== undefined &&
		isValidDate(date) &&
		isValidTime(hour, minute, second)
	);
}

function isValidDateTime(value: string): boolean {
	const match = DATETIME_PATTERN.exec(value);
	if (!match) {
		return false;
	}

	const [, date, hour, minute, second] = match;
	return (
		date !== undefined &&
		hour !== undefined &&
		minute !== undefined &&
		isValidDate(date) &&
		isValidTime(hour, minute, second)
	);
}

function isValidDate(value: string): boolean {
	const match = DATE_PATTERN.exec(value);
	if (!match) {
		return false;
	}

	const [, yearText, monthText, dayText] = match;
	const year = Number(yearText);
	const month = Number(monthText);
	const day = Number(dayText);
	if (year < 1 || month < 1 || month > 12 || day < 1) {
		return false;
	}

	const leapYear =
		year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
	const daysInMonth = [
		31,
		leapYear ? 29 : 28,
		31,
		30,
		31,
		30,
		31,
		31,
		30,
		31,
		30,
		31,
	];
	return day <= (daysInMonth[month - 1] ?? 0);
}

function isValidTime(
	hourText: string,
	minuteText: string,
	secondText?: string,
): boolean {
	const hour = Number(hourText);
	const minute = Number(minuteText);
	const second = secondText === undefined ? 0 : Number(secondText);
	return (
		hour >= 0 &&
		hour <= 23 &&
		minute >= 0 &&
		minute <= 59 &&
		second >= 0 &&
		second <= 59
	);
}

function primitiveToString(
	value: unknown,
	fallback: FormControlValue,
): string {
	switch (typeof value) {
		case 'string':
			return value;
		case 'number':
		case 'bigint':
		case 'boolean':
			return String(value);
		default:
			return String(fallback);
	}
}
