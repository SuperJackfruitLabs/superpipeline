// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import CardPageMissing from './CardPageMissing.svelte';

afterEach(() => cleanup());

describe('CardPageMissing', () => {
  it('a board that failed to open says so, with the way back, instead of loading forever', () => {
    render(CardPageMissing, { kind: 'error', boardName: '', boardHref: '/' });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Board not available');
    expect(screen.getByRole('alert').textContent).toContain('could not be opened');
    expect(screen.getByRole('link', { name: 'Back to your boards' }).getAttribute('href')).toBe('/');
    expect(screen.queryByText('Loading the card…')).toBeNull();
  });
});
