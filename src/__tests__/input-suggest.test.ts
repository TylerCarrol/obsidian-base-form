import { describe, expect, it, vi } from 'vitest';
import {
	LinkInputSuggest,
	ListInputSuggest,
} from '../form/input-suggest';

class TestLinkInputSuggest extends LinkInputSuggest {
	getMatches(query: string) {
		return this.getSuggestions(query);
	}
}

class TestListInputSuggest extends ListInputSuggest {
	getMatches(query: string) {
		return this.getSuggestions(query);
	}
}

describe('form input suggestions', () => {
	const grace = {
		basename: 'Grace Hopper',
		path: 'Demo notes/Grace Hopper.md',
	};
	const ada = {
		basename: 'Ada Lovelace',
		path: 'Demo notes/Ada Lovelace.md',
	};
	const app = {
		vault: {
			getMarkdownFiles: vi.fn(() => [grace, ada]),
		},
		metadataCache: {
			fileToLinktext: vi.fn((file: { path: string }) =>
				file.path.replace(/\.md$/, ''),
			),
		},
	} as never;

	it('opens with all notes when an untouched input receives focus', () => {
		const input = document.createElement('input');
		document.body.appendChild(input);
		const suggest = new TestLinkInputSuggest(
			app,
			input,
			'Demo notes/Alan Turing.md',
		);
		const open = vi.spyOn(suggest, 'open');

		input.focus();

		expect(open).toHaveBeenCalledOnce();
		input.dispatchEvent(new Event('pointerdown'));
		expect(open).toHaveBeenCalledTimes(2);
		expect(suggest.getMatches('')).toEqual([
			{
				file: ada,
				linkText: 'Demo notes/Ada Lovelace',
			},
			{
				file: grace,
				linkText: 'Demo notes/Grace Hopper',
			},
		]);
		input.remove();
	});

	it('suggests matching Markdown files for an unfinished wikilink', () => {
		const input = document.createElement('input');
		input.value = 'See [[hopper';
		input.setSelectionRange(input.value.length, input.value.length);
		const suggest = new TestLinkInputSuggest(
			app,
			input,
			'Demo notes/Alan Turing.md',
		);

		expect(suggest.getMatches(input.value)).toEqual([
			{
				file: grace,
				linkText: 'Demo notes/Grace Hopper',
			},
		]);
		expect(suggest.getMatches('See [[Grace Hopper]]')).toEqual([]);
	});

	it('renders and inserts the selected wikilink at the cursor', () => {
		const input = document.createElement('input');
		input.value = 'See [[gra today';
		input.setSelectionRange(9, 9);
		const onSelect = vi.fn();
		const onInput = vi.fn();
		input.addEventListener('input', onInput);
		const suggest = new TestLinkInputSuggest(
			app,
			input,
			'Demo notes/Alan Turing.md',
			onSelect,
		);
		const suggestionEl = document.createElement('div');
		const event = new KeyboardEvent('keydown', { key: 'Enter' });
		const suggestion = {
			file: grace,
			linkText: 'Demo notes/Grace Hopper',
		};

		suggest.renderSuggestion(suggestion, suggestionEl);
		suggest.selectSuggestion(suggestion, event);

		expect(suggestionEl.querySelector('.suggestion-title')?.textContent).toBe(
			'Grace Hopper',
		);
		expect(suggestionEl.querySelector('.suggestion-note')?.textContent).toBe(
			'Demo notes/Grace Hopper.md',
		);
		expect(input.value).toBe(
			'See [[Demo notes/Grace Hopper]] today',
		);
		expect(onInput).toHaveBeenCalledOnce();
		expect(onSelect).toHaveBeenCalledOnce();
	});

	it('inserts a selected note into an untouched input', () => {
		const input = document.createElement('input');
		const onInput = vi.fn();
		input.addEventListener('input', onInput);
		const suggest = new TestLinkInputSuggest(
			app,
			input,
			'Demo notes/Alan Turing.md',
		);

		suggest.selectSuggestion(
			{
				file: ada,
				linkText: 'Demo notes/Ada Lovelace',
			},
			new MouseEvent('click'),
		);

		expect(input.value).toBe('[[Demo notes/Ada Lovelace]]');
		expect(onInput).toHaveBeenCalledOnce();
	});
});

describe('list input suggestions', () => {
	it('suggests existing values that are not in the current list', () => {
		const input = document.createElement('input');
		const currentValues = ['[[Grace Hopper]]'];
		const suggest = new TestListInputSuggest(
			{} as never,
			input,
			() => [
				'[[Grace Hopper]]',
				'[[Ada Lovelace]]',
				'[[Alan Turing]]',
				'[[Ada Lovelace]]',
			],
			() => currentValues,
			vi.fn(),
		);

		expect(suggest.getMatches('')).toEqual([
			'[[Ada Lovelace]]',
			'[[Alan Turing]]',
		]);
		expect(suggest.getMatches('alan')).toEqual(['[[Alan Turing]]']);

		currentValues.push('[[Ada Lovelace]]');
		expect(suggest.getMatches('')).toEqual(['[[Alan Turing]]']);
	});

	it('renders the value label and selects the literal list value', () => {
		const input = document.createElement('input');
		const onInput = vi.fn();
		const onSelect = vi.fn();
		input.addEventListener('input', onInput);
		const suggest = new TestListInputSuggest(
			{} as never,
			input,
			() => ['[[Demo notes/Ada Lovelace]]'],
			() => [],
			onSelect,
		);
		const suggestionEl = document.createElement('div');

		suggest.renderSuggestion(
			'[[Demo notes/Ada Lovelace]]',
			suggestionEl,
		);
		suggest.selectSuggestion(
			'[[Demo notes/Ada Lovelace]]',
			new MouseEvent('click'),
		);

		expect(suggestionEl.textContent).toBe('Ada Lovelace');
		expect(input.value).toBe('[[Demo notes/Ada Lovelace]]');
		expect(onInput).toHaveBeenCalledOnce();
		expect(onSelect).toHaveBeenCalledOnce();
	});
});