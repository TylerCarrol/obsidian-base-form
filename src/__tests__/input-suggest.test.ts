import { describe, expect, it, vi } from 'vitest';
import { LinkInputSuggest } from '../form/input-suggest';

class TestLinkInputSuggest extends LinkInputSuggest {
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
});