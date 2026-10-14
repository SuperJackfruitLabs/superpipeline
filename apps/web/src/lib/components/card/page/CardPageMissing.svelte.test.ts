// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import CardPageMissing from './CardPageMissing.svelte';

afterEach(() => cleanup());

describe('CardPageMissing', () => {
  it('a board that could not load says so in words, with Try again and a way home, instead of loading forever', () => {
    render(CardPageMissing, { kind: 'error', boardName: '', boardHref: '/', onRetry: () => {} });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('The card could not load');
    expect(screen.getByText("Couldn't reach Superpipeline. Your boards are safe.")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Go to your Inbox' }).getAttribute('href')).toBe('/inbox');
  });
  it('a board that is not there for you is not a failure to load', () => {
    render(CardPageMissing, { kind: 'gone', boardName: '', boardHref: '/' });
    expect(screen.getByText("This board doesn't exist or isn't shared with you.")).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });
  it('waits in aria-busy while the board loads', () => {
    render(CardPageMissing, { kind: 'loading', boardName: '', boardHref: '/' });
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});
