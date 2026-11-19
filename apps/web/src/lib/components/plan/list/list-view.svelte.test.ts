// apps/web/src/lib/components/plan/list/list-view.svelte.test.ts
// @vitest-environment jsdom
/**
 * The List, one composition in every vibe (composition contract): the board's top row with Group by
 * and Sort by, one grouped DataTable, one action per row (Move), "Show N more", the keyboard line and
 * the footer. The behaviour the four old layouts had is kept here: header sorting, the Move menu, the
 * pickers, J / K / ↵ / M / S / G, and the empty sentences.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { VIBES } from '@superjackfruitlabs/vibekit-ui';
import ListView from './ListView.svelte';
import { ListUi } from './list-ui.svelte';
import { listProps } from '$lib/test/list-props';
import { C4605, C63AC } from '$lib/test/dx-snapshot';
import { parityTree, primaryActionsPerRow, rawMachineText, repeatedParagraphs } from '$lib/composition/guards';
import { renderInVibes, type VibeRoots } from '$lib/composition/render-vibes';
import type { ListGroup } from './types';

beforeAll(() => {
  // jsdom has no matchMedia (vibekit's DataTable asks it for the phone width): a desktop window.
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string): MediaQueryList => ({ matches: false, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false }),
  });
  if (!('scrollIntoView' in Element.prototype)) Object.defineProperty(Element.prototype, 'scrollIntoView', { value: () => {}, configurable: true });
});

let roots: VibeRoots | null = null;
afterEach(() => { roots?.unmount(); roots = null; cleanup(); });

const row = (title: RegExp) => screen.getByRole('row', { name: title });
const row63 = () => row(/Fix the highest-severity blocker/);
const selected = () => document.querySelector('tr[aria-current="true"]');
const rowCount = () => document.querySelectorAll('tr[data-row]').length;

describe('ListView in every vibe', () => {
  it('renders the same accessibility tree in all four vibes, and passes the guards', async () => {
    roots = await renderInVibes(ListView, listProps());
    const day = parityTree(roots.daylight);
    expect(day).toContain('Fix the highest-severity blocker');
    for (const v of VIBES) {
      expect(parityTree(roots[v]), `${v} vibe`).toBe(day);
      expect(primaryActionsPerRow(roots[v]), `${v}: one primary per row`).toEqual([]);
      expect(rawMachineText(roots[v]), `${v}: no raw ids`).toEqual([]);
      expect(repeatedParagraphs(roots[v]), `${v}: nothing said twice`).toEqual([]);
      // The masthead names the board: the List has no signature slot.
      expect(roots[v].querySelectorAll('[data-signature]'), `${v} vibe`).toHaveLength(0);
    }
  });
});

describe('ListView', () => {
  it('one row: Board | List, Filter, the pickers and the attention line; a footer says the sort', () => {
    render(ListView, listProps());
    expect(within(screen.getByRole('navigation', { name: 'View' })).getByRole('link', { name: 'List' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Filter cards/ })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: /Group by/ })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: /Sort by/ })).toBeTruthy();
    expect(screen.getByText('4 cards want you here.')).toBeTruthy();
    expect(screen.getByText('Sorted by priority, highest first. Stages with no cards are left out: Integrate and Signed off.')).toBeTruthy();
    expect(screen.getByLabelText('Keyboard').textContent).toMatch(/J \/ K rows · ↵ open/);
  });

  it('the table is described by the keys words', async () => {
    render(ListView, listProps());
    await tick();
    const table = screen.getByRole('table');
    const id = table.getAttribute('aria-describedby') ?? '';
    expect(id).not.toBe('');
    const sentence = document.getElementById(id);
    expect(sentence?.textContent).toBe(screen.getByLabelText('Keyboard').textContent);
  });

  it('groups say who works them; each row has one action, Move', () => {
    render(ListView, listProps());
    const heads = [...document.querySelectorAll('.vk-datatable__group th')].map((h) => h.textContent?.replace(/\s+/g, ' ').trim());
    expect(heads).toEqual(['Reported · a person 1', 'Reproduce · diagnostics · error-eric 1', 'Failing test · testing · tester-tim 3', 'Fix · code · 2 agents 1', 'Shipped · a person 1']);
    expect(within(row63()).getAllByRole('button').map((b) => b.textContent?.trim())).toEqual(['Move']);
    expect(within(row63()).getByRole('link', { name: C63AC.title }).getAttribute('href')).toBe(`/b/brd_134a0ddb6d434478/c/${C63AC.id}`);
    expect(row63().textContent).toContain('Waiting on you, no owner');
  });

  it('the active column carries its sort; a header click sorts', async () => {
    const p = listProps();
    render(ListView, p);
    const heads = screen.getAllByRole('columnheader');
    expect(heads.filter((h) => ['ascending', 'descending'].includes(h.getAttribute('aria-sort') ?? '')).map((h) => [h.textContent, h.getAttribute('aria-sort')])).toEqual([['Priority, sorted ascending', 'ascending']]);
    await fireEvent.click(screen.getByRole('button', { name: 'Card' }));
    expect(p.onSort).toHaveBeenCalledWith('title');
  });

  it('Sort by sets the whole sort; Group by sets the grouping; a sort it does not list shows first', async () => {
    const p = listProps();
    render(ListView, p);
    await fireEvent.change(screen.getByRole('combobox', { name: /Sort by/ }), { target: { value: '5' } });
    expect(p.onSetSort).toHaveBeenCalledWith({ key: 'cost', ascending: false });
    await fireEvent.change(screen.getByRole('combobox', { name: /Group by/ }), { target: { value: 'owner' } });
    expect(p.onGroupBy).toHaveBeenCalledWith('owner');
    cleanup();
    render(ListView, listProps({ sort: { key: 'age', ascending: false } }));
    const picker = screen.getByRole<HTMLSelectElement>('combobox', { name: /Sort by/ });
    expect(picker.selectedOptions[0]?.textContent).toBe('Age, highest first');
  });

  it('Move opens a menu of every stage; the current one is here and inert; picking moves and returns focus', async () => {
    const p = listProps();
    render(ListView, p);
    const move = within(row63()).getByRole('button', { name: /^Move$/ });
    await fireEvent.click(move);
    expect(move.getAttribute('aria-expanded')).toBe('true');
    const items = within(screen.getByRole('menu', { name: 'Move to' })).getAllByRole('menuitem');
    expect(items.map((i) => i.textContent)).toEqual(['Reportedhere', 'Reproduce', 'Failing test', 'Fix', 'Integrate', 'Signed off', 'Shipped']);
    expect(items[0]?.getAttribute('aria-disabled')).toBe('true');
    await fireEvent.click(screen.getByRole('menuitem', { name: 'Reproduce' }));
    expect(p.onMove).toHaveBeenCalledWith(C63AC.id, 'reproduce');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(move);
  });

  it('Escape closes the Move menu and returns focus', async () => {
    render(ListView, listProps());
    const move = within(row63()).getByRole('button', { name: /^Move$/ });
    await fireEvent.click(move);
    await fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(move);
  });

  it('keys: nothing is selected until J; J twice is row 2; ↵ opens, M moves, S and R cycle; a modifier does nothing', async () => {
    const p = listProps();
    render(ListView, p);
    expect(selected()).toBeNull();
    await fireEvent.keyDown(window, { key: 'j' });
    await fireEvent.keyDown(window, { key: 'j' });
    expect(selected()?.textContent).toContain(C4605.title);
    await fireEvent.keyDown(window, { key: 'k' });
    await fireEvent.keyDown(window, { key: 'k' });
    expect(selected()?.textContent).toContain(C63AC.title);
    await fireEvent.keyDown(window, { key: 'j' });
    await fireEvent.keyDown(window, { key: 'Enter' });
    expect(p.onOpen).toHaveBeenCalledWith(C4605.id);
    await fireEvent.keyDown(window, { key: 'm' });
    expect(p.onOpenMoveDialog).toHaveBeenCalledWith(C4605.id);
    await fireEvent.keyDown(window, { key: 's' });
    expect(p.onSort).toHaveBeenCalledWith('title');
    await fireEvent.keyDown(window, { key: 'r' });
    expect(p.onGroupBy).toHaveBeenCalledWith('state');
    await fireEvent.keyDown(window, { key: 'j', ctrlKey: true });
    expect(selected()?.textContent).toContain(C4605.title);
  });

  it('G alone does nothing here: it starts the shell\'s G I / G P / G C chords', async () => {
    const p = listProps();
    render(ListView, p);
    const g = new KeyboardEvent('keydown', { key: 'g', bubbles: true, cancelable: true });
    window.dispatchEvent(g);
    await tick();
    expect(p.onGroupBy).not.toHaveBeenCalled();
    expect(g.defaultPrevented).toBe(false);
    expect(screen.getByLabelText('Keyboard').textContent).toMatch(/S sort · R regroup/);
  });

  it('focus in a row selects it, so M moves what has focus', async () => {
    const p = listProps();
    render(ListView, p);
    within(row63()).getByRole('link').focus();
    await tick();
    expect(selected()?.textContent).toContain(C63AC.title);
  });

  it('"Show the first" focuses the first row that wants you', async () => {
    render(ListView, listProps());
    await fireEvent.click(screen.getByRole('button', { name: 'Show the first' }));
    expect(document.activeElement?.textContent).toBe(C63AC.title);
  });

  it('pages: a long list shows the first page, then Show N more', async () => {
    const base = listProps();
    const many = base.groups.find((g) => g.label === 'Failing test')?.rows ?? [];
    expect(many).toHaveLength(3);
    const big: ListGroup[] = Array.from({ length: 12 }, (_, i) => ({ key: `g${i}`, label: `Group ${i + 1}`, order: i, owner: null, rows: many.map((r) => ({ ...r, s: { ...r.s, id: `${r.s.id}_${i}` } })) }));
    render(ListView, listProps({ groups: big, ui: new ListUi() }));
    expect(rowCount()).toBe(30);
    await fireEvent.click(screen.getByRole('button', { name: /^Show 6 more/ }));
    expect(rowCount()).toBe(36);
    expect(screen.queryByRole('button', { name: /^Show \d+ more/ })).toBeNull();
    // The button is gone; focus is on the first new row, not lost to the page (M6).
    await tick();
    expect(document.querySelectorAll('tr[data-row]')[30]?.contains(document.activeElement)).toBe(true);
  });

  it('a regroup, a new sort or new filters start again at the first page', async () => {
    const base = listProps();
    const many = base.groups.find((g) => g.label === 'Failing test')?.rows ?? [];
    const big: ListGroup[] = Array.from({ length: 12 }, (_, i) => ({ key: `g${i}`, label: `Group ${i + 1}`, order: i, owner: null, rows: many.map((r) => ({ ...r, s: { ...r.s, id: `${r.s.id}_${i}` } })) }));
    const ui = new ListUi();
    const view = render(ListView, listProps({ groups: big, ui }));
    await fireEvent.click(screen.getByRole('button', { name: /^Show 6 more/ }));
    expect(ui.limit).toBe(60);
    // The same view, redrawn (live data): the page is kept.
    await view.rerender(listProps({ groups: big, ui }));
    expect(ui.limit).toBe(60);
    await view.rerender(listProps({ groups: big, ui, groupBy: 'state' }));
    expect(ui.limit).toBe(30);
    expect(rowCount()).toBe(30);
    ui.limit = 60;
    await view.rerender(listProps({ groups: big, ui, groupBy: 'state', sort: { key: 'title', ascending: true } }));
    expect(ui.limit).toBe(30);
    ui.limit = 60;
    await view.rerender(listProps({ groups: big, ui, groupBy: 'state', sort: { key: 'title', ascending: true }, filters: { ...base.filters, minPriority: 2 } }));
    expect(ui.limit).toBe(30);
  });

  it('says why the list is empty, once', () => {
    render(ListView, listProps({ groups: [] }));
    expect(screen.getByText('No cards match these filters.')).toBeTruthy();
    expect(screen.queryByText(/^Sorted by/)).toBeNull();
    cleanup();
    // A board with no card: the top row's line says so, and the table adds nothing.
    render(ListView, listProps({ groups: [], hasCards: false }));
    expect(screen.getAllByText('No cards on this board')).toHaveLength(1);
    expect(screen.queryByText('No cards match these filters.')).toBeNull();
  });
});
