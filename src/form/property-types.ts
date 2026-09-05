import {
	BooleanValue,
	DateValue,
	ListValue,
	NullValue,
	NumberValue,
	StringValue,
	parsePropertyId,
} from 'obsidian';
import type {
	App,
	BasesEntry,
	BasesPropertyId,
	TFile,
	Value,
} from 'obsidian';
import {
	findFrontmatterKey,
	inferRawFieldType,
	isEditableRawValue,
	normalizePropertyType,
} from './property-values';
import type { FormFieldType } from './property-values';

interface PropertyTypeInfo {
	type?: unknown;
	widget?: unknown;
}

interface MetadataTypeManager {
	getAssignedType?: (name: string) => unknown;
	getPropertyInfo?: (name: string) => PropertyTypeInfo | null;
}

interface AppWithMetadataTypes extends App {
	metadataTypeManager?: MetadataTypeManager;
}

export function resolveFieldTypes(
	app: App,
	entries: BasesEntry[],
	properties: BasesPropertyId[],
): Map<BasesPropertyId, FormFieldType> {
	const fieldTypes = new Map<BasesPropertyId, FormFieldType>();
	for (const propertyId of properties) {
		const property = parsePropertyId(propertyId);
		if (property.type !== 'note') {
			continue;
		}

		const configuredType = getConfiguredFieldType(app, property.name);
		if (configuredType !== null) {
			fieldTypes.set(propertyId, configuredType);
			continue;
		}

		for (const entry of entries) {
			const rawValue = getRawValue(app, entry.file, property.name);
			const inferredType = inferFieldType(
				entry.getValue(propertyId),
				rawValue,
			);
			if (inferredType !== null) {
				fieldTypes.set(propertyId, inferredType);
				break;
			}
		}
	}
	return fieldTypes;
}

export function getRawValue(
	app: App,
	file: TFile,
	propertyName: string,
): unknown {
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	if (frontmatter === undefined) {
		return undefined;
	}

	const values = frontmatter as Record<string, unknown>;
	return values[findFrontmatterKey(values, propertyName)];
}

export function isEditablePropertyValue(
	type: FormFieldType,
	rawValue: unknown,
	value: Value | null,
): boolean {
	if (!isEditableRawValue(type, rawValue)) {
		return false;
	}
	if (
		rawValue !== undefined ||
		value === null ||
		value === NullValue.value
	) {
		return true;
	}

	switch (type) {
		case 'text':
			return value instanceof StringValue;
		case 'list':
			if (!(value instanceof ListValue)) {
				return false;
			}
			for (let index = 0; index < value.length(); index++) {
				if (!(value.get(index) instanceof StringValue)) {
					return false;
				}
			}
			return true;
		case 'number':
			return value instanceof NumberValue;
		case 'checkbox':
			return value instanceof BooleanValue;
		case 'date':
		case 'datetime':
			return value instanceof DateValue;
	}
}

export function isEmptyPropertyValue(
	type: FormFieldType,
	rawValue: unknown,
	value: Value | null,
): boolean {
	if (type === 'checkbox') {
		return rawValue !== true;
	}

	if (value === null || value === NullValue.value) {
		return true;
	}

	return value.toString() === '';
}

export function shouldRenderPropertyInput(
	type: FormFieldType,
	propertyType: 'note' | 'file' | 'formula',
	rawValue: unknown,
	value: Value | null,
	options: {
		hideNonEmptyProperties: boolean;
		hideNonExistentProperties: boolean;
	},
): boolean {
	if (propertyType !== 'note') {
		return true;
	}

	if (options.hideNonExistentProperties && rawValue === undefined) {
		return false;
	}

	if (
		options.hideNonEmptyProperties &&
		!isEmptyPropertyValue(type, rawValue, value)
	) {
		return false;
	}

	return true;
}

export function shouldRenderByVisibilityCondition(
	app: App,
	entry: BasesEntry,
	propertyName: string,
	prefix: string,
	mode: 'show' | 'hide',
): boolean {
	if (prefix === '') {
		return true;
	}

	const controllerName = `${prefix}${propertyName}`;
	const noteController = getRawValue(app, entry.file, controllerName);
	if (noteController !== undefined) {
		return typeof noteController !== 'boolean' ||
			(mode === 'show' ? noteController : !noteController);
	}

	const formulaController = entry.getValue(`formula.${controllerName}`);
	if (!(formulaController instanceof BooleanValue)) {
		return true;
	}

	return mode === 'show'
		? formulaController.isTruthy()
		: !formulaController.isTruthy();
}

function getConfiguredFieldType(
	app: App,
	propertyName: string,
): FormFieldType | null {
	const manager = (app as AppWithMetadataTypes).metadataTypeManager;
	const normalizedName = propertyName.toLowerCase();
	try {
		const info = manager?.getPropertyInfo?.(normalizedName);
		return (
			normalizePropertyType(info?.widget) ??
			normalizePropertyType(info?.type) ??
			normalizePropertyType(
				manager?.getAssignedType?.(normalizedName),
			)
		);
	} catch {
		return null;
	}
}

function inferFieldType(
	value: Value | null,
	rawValue: unknown,
): FormFieldType | null {
	if (value instanceof ListValue) {
		return 'list';
	}
	if (value instanceof BooleanValue) {
		return 'checkbox';
	}
	if (value instanceof NumberValue) {
		return 'number';
	}
	if (value instanceof DateValue) {
		const rawType = inferRawFieldType(rawValue);
		const valueType = inferRawFieldType(value.toString());
		return rawType === 'datetime' || valueType === 'datetime'
			? 'datetime'
			: 'date';
	}
	if (value instanceof StringValue) {
		return 'text';
	}
	return inferRawFieldType(rawValue);
}
