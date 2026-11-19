// @vitest-environment jsdom
/** The keys line (contract rule 13): the page's keys as words, the same element and text in every vibe. */
import { afterEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import { renderInVibes } from '$lib/composition/render-vibes';
import { BOARD_KEYS, LIST_KEYS, keysText } from '$lib/keys';
import KeysLine from './KeysLine.svelte';

afterEach(() => document.body.replaceChildren());

describe('KeysLine', () => {
  it('says the keys in words, as the Keyboard line', () => {
    const { container } = render(KeysLine, { keys: LIST_KEYS });
    const el = container.querySelector('.sh-keys');
    expect(el?.getAttribute('aria-label')).toBe('Keyboard');
    expect(el?.textContent).toBe('J / K rows · ↵ open · M move · S sort · R regroup · F filter');
  });

  it('names R, not G, for the List, and only keys the page handles', () => {
    expect(keysText(LIST_KEYS)).not.toMatch(/\bG /);
    expect(keysText(BOARD_KEYS)).toContain('N new card');
  });

  it('draws the same words in all four vibes', async () => {
    const roots = await renderInVibes(KeysLine, { keys: LIST_KEYS });
    const texts = (['daylight', 'paper', 'studio', 'quiet'] as const).map((v) => roots[v].querySelector('.sh-keys')?.textContent);
    roots.unmount();
    expect(new Set(texts).size).toBe(1);
    expect(texts[0]).toBe(keysText(LIST_KEYS));
  });
});
