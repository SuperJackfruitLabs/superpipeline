// apps/web/src/lib/components/plan/list/ListDaylight.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import ListDaylight from './ListDaylight.svelte';
import { listProps } from '$lib/test/list-props';
import { C63AC } from '$lib/test/dx-snapshot';

afterEach(cleanup);
const row63 = () => screen.getByRole('row', { name: /Fix the highest-severity blocker/ });

describe('ListDaylight', () => {
  it('only the active column carries aria-sort; a header click sorts', async () => {
    const p = listProps();
    render(ListDaylight, p);
    const heads = screen.getAllByRole('columnheader');
    expect(heads.filter((h) => h.hasAttribute('aria-sort')).map((h) => [h.textContent, h.getAttribute('aria-sort')])).toEqual([['Priority, sorted highest first', 'ascending']]);
    await fireEvent.click(screen.getByRole('button', { name: 'Card' }));
    expect(p.onSort).toHaveBeenCalledWith('title');
  });

  it('Move opens a menu of every stage; the current one is here and inert', async () => {
    render(ListDaylight, listProps());
    const move = within(row63()).getByRole('button', { name: /^Move$/ });
    await fireEvent.click(move);
    expect(move.getAttribute('aria-expanded')).toBe('true');
    const items = within(screen.getByRole('menu', { name: 'Move to' })).getAllByRole('menuitem');
    expect(items.map((i) => i.textContent)).toEqual(['Reportedhere', 'Reproduce', 'Failing test', 'Fix', 'Integrate', 'Signed off', 'Shipped']);
    expect(items[0]!.getAttribute('aria-disabled')).toBe('true');
  });

  it('picking a stage moves the card and returns focus to Move (the page-level region says so)', async () => {
    const p = listProps();
    render(ListDaylight, p);
    const move = within(row63()).getByRole('button', { name: /^Move$/ });
    await fireEvent.click(move);
    await fireEvent.click(screen.getByRole('menuitem', { name: 'Reproduce' }));
    expect(p.onMove).toHaveBeenCalledWith(C63AC.id, 'reproduce');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(move);
  });

  it('Escape closes the menu and returns focus', async () => {
    render(ListDaylight, listProps());
    const move = within(row63()).getByRole('button', { name: /^Move$/ });
    await fireEvent.click(move);
    await fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(move);
  });

  it('says why the list is empty', () => {
    render(ListDaylight, listProps({ groups: [], cardCount: 0, filtersOn: true }));
    expect(screen.getByText('No cards match these filters.')).toBeTruthy();
    cleanup();
    render(ListDaylight, listProps({ groups: [], cardCount: 0, hasCards: false }));
    expect(screen.getByText('No cards on this board')).toBeTruthy();
  });
});
