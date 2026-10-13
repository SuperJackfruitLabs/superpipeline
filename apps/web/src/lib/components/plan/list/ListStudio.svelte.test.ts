// apps/web/src/lib/components/plan/list/ListStudio.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import ListStudio from './ListStudio.svelte';
import { listProps } from '$lib/test/list-props';
import { C4605 } from '$lib/test/dx-snapshot';

afterEach(cleanup);
const sel = () => document.querySelector('tr.sel[aria-current="true"]');
const foot = () => [...document.querySelectorAll('.ls-foot > span')].map((s) => s.textContent);

describe('ListStudio keyboard', () => {
  it('nothing is selected until J; J twice is row 2, 4605', async () => {
    render(ListStudio, listProps());
    expect(sel()).toBeNull();
    expect(foot()).toEqual(['7 cards', '5 groups · 2 empty stages hidden', 'sort Pri ↑', '$0.00 total']);
    await fireEvent.keyDown(window, { key: 'j' });
    await fireEvent.keyDown(window, { key: 'j' });
    expect(sel()?.textContent).toContain(C4605.title);
    expect(foot().at(-1)).toBe('row 2 of 7');
    await fireEvent.keyDown(window, { key: 'k' });
    await fireEvent.keyDown(window, { key: 'k' });
    expect(foot().at(-1)).toBe('row 1 of 7');
  });

  it('Enter opens, M moves, S and G cycle; a modifier does nothing', async () => {
    const p = listProps();
    render(ListStudio, p);
    await fireEvent.keyDown(window, { key: 'j' });
    await fireEvent.keyDown(window, { key: 'j' });
    await fireEvent.keyDown(window, { key: 'Enter' });
    expect(p.onOpen).toHaveBeenCalledWith(C4605.id);
    await fireEvent.keyDown(window, { key: 'm' });
    expect(p.onOpenMoveDialog).toHaveBeenCalledWith(C4605.id);
    await fireEvent.keyDown(window, { key: 's' });
    expect(p.onSort).toHaveBeenCalledWith('title');
    await fireEvent.keyDown(window, { key: 'g' });
    expect(p.onGroupBy).toHaveBeenCalledWith('state');
    await fireEvent.keyDown(window, { key: 'j', ctrlKey: true });
    expect(foot().at(-1)).toBe('row 2 of 7');
  });

  it('the quick filter narrows the rows and the hero follows', async () => {
    render(ListStudio, listProps());
    await fireEvent.click(screen.getByRole('button', { name: 'Needs 4' }));
    expect(document.querySelector('.ls-hero .big')?.textContent).toBe('4');
    expect(screen.getByText('Waiting cards, by stage')).toBeTruthy();
    expect(document.querySelectorAll('.ls-tbl tbody tr:not(.g)')).toHaveLength(4);
    await fireEvent.click(screen.getByRole('button', { name: 'Working 0' }));
    expect(screen.getByText('No cards match these filters.')).toBeTruthy();
  });
});
