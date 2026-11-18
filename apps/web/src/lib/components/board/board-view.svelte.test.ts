// @vitest-environment jsdom
/**
 * The board page's composition (BoardView, variant A), in every vibe, on the realistic Developer
 * Experience board. Drag and drop first (the characterization test, kept from the old Daylight
 * board): the drag library cannot run in jsdom, so `$lib/dnd` is replaced by recorders that keep each
 * drop target's params, and a test drops by calling `onDrop`.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { VIBES } from '@superjackfruitlabs/vibekit-ui';

type DropParams = { stageKey: string; onDrop: (cardId: string) => void };
const { drops, target } = vi.hoisted(() => {
  const recs: Array<{ node: HTMLElement; kind: 'lane' | 'cell'; params: DropParams }> = [];
  const make = (kind: 'lane' | 'cell') => (node: HTMLElement, params: DropParams) => {
    const rec = { node, kind, params };
    recs.push(rec);
    return { update(next: DropParams) { rec.params = next; }, destroy() { recs.splice(recs.indexOf(rec), 1); } };
  };
  return { drops: recs, target: make };
});
vi.mock('$lib/dnd', () => ({ cardDraggable: () => ({ update() {}, destroy() {} }), columnDropTarget: target('lane'), trackCellDropTarget: target('cell') }));

import type { StaleCard } from '$lib/api';
import { app } from '$lib/stores/app.svelte';
import { noFilters } from '$lib/stores/card-filters';
import { parityTree, primaryActionsPerRow, rawMachineText, truncatedNames } from '$lib/composition/guards';
import { renderInVibes } from '$lib/composition/render-vibes';
import { REALISTIC_NOW_MS, REALISTIC_USER, realisticWorkspace } from '$lib/fixtures/realistic';
import { buildBoardModel } from './board-model';
import BoardView from './BoardView.svelte';

beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: false, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }));
  // jsdom has no scrollIntoView; "Show the first" calls it.
  if (!('scrollIntoView' in Element.prototype)) Object.defineProperty(Element.prototype, 'scrollIntoView', { value: () => {}, configurable: true });
});

const w = realisticWorkspace();
const devex = w.boards.find((b) => b.name === 'Developer Experience')!;
const moveCard = vi.spyOn(app, 'moveCard').mockImplementation(async () => {});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: REALISTIC_NOW_MS });
  app.user = { userId: REALISTIC_USER, tenantId: 'tnt_realistic', name: 'Rakesh Gangwar' } as never;
  app.boardId = devex.boardId ?? null;
  app.board = devex;
  app.agents = w.agents;
  app.agentsLoaded = true;
  app.view = 'board';
  app.syncedAt = new Date('2026-11-18T03:24:00');
  // Seven things wait on you across the workspace; the footer counts this board's alone.
  app.attention = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((cardId) => ({ cardId }) as StaleCard);
});
afterEach(() => { cleanup(); vi.useRealTimers(); moveCard.mockClear(); app.board = null; app.attention = []; });

const props = () => ({
  model: buildBoardModel(devex, devex.cards, { agents: w.agents, members: [], labels: new Map(), nowMs: REALISTIC_NOW_MS, me: { id: REALISTIC_USER, name: 'Rakesh Gangwar', initials: 'RG' }, spend7d: undefined }),
  filters: noFilters(),
  onCompose: vi.fn(),
});

describe('the board: drag and drop', () => {
  it('moving a card calls app.moveCard with the stage key', () => {
    render(BoardView, props());
    const lane = drops.find((d) => d.kind === 'lane' && d.params.stageKey === 'reported');
    expect(lane, 'the Reported lane is a drop target').toBeTruthy();
    lane!.params.onDrop('card_x');
    expect(moveCard).toHaveBeenCalledWith('card_x', 'reported');
  });
  it('every stage in the track is a drop target, even one with no lane', () => {
    render(BoardView, props());
    const cells = drops.filter((d) => d.kind === 'cell');
    expect(cells.map((c) => c.params.stageKey)).toEqual(['reported', 'reproduce', 'test', 'fix', 'integrate', 'signed-off', 'shipped']);
    expect(cells.every((c) => c.node.tagName === 'LI')).toBe(true);
    cells.find((c) => c.params.stageKey === 'fix')!.params.onDrop('card_y');
    expect(moveCard).toHaveBeenCalledWith('card_y', 'fix');
  });
});

describe('the board in every vibe', () => {
  it('renders the same accessibility tree in all four vibes outside the signature slot', async () => {
    const roots = await renderInVibes(BoardView, props());
    try {
      const trees = Object.fromEntries(VIBES.map((v) => [v, parityTree(roots[v])]));
      for (const v of VIBES) expect(trees[v], `${v} against daylight`).toBe(trees.daylight);
      expect(trees.daylight.match(/^§$/gm)).toHaveLength(1);
      // No vibe adds words of its own to a tile: Quiet's needs mark is weight and colour, not a prefix.
      const states = (v: (typeof VIBES)[number]) => [...roots[v].querySelectorAll('.bv-st')].map((e) => e.textContent);
      for (const v of VIBES) expect(states(v)).toEqual(states('daylight'));
      expect(states('quiet')[0]).toBe('With you · no agent works this stage');
      // Per vibe: one signature slot with no words in it, one action per row, no raw ids, no clipped
      // stage names, and nothing read from Studio's annual root.
      const report = VIBES.map((v) => ({
        v,
        signatures: roots[v].querySelectorAll('[data-signature]').length,
        words: roots[v].querySelector('[data-signature]')?.textContent ?? null,
        rows: primaryActionsPerRow(roots[v]),
        raw: rawMachineText(roots[v]),
        clipped: truncatedNames(roots[v]),
        annual: roots[v].querySelector('.ar') !== null,
      }));
      expect(report).toEqual(VIBES.map((v) => ({ v, signatures: 1, words: '', rows: [], raw: [], clipped: [], annual: false })));
    } finally {
      roots.unmount();
    }
  });

  it('every stage is named in the track and only stages with cards get a lane', () => {
    render(BoardView, props());
    const track = screen.getByRole('list', { name: 'Stages' });
    expect([...track.querySelectorAll('.vk-stages__name')].map((n) => n.textContent)).toEqual(['Reported', 'Reproduce', 'Failing test', 'Fix', 'Integrate', 'Signed off', 'Shipped']);
    // The full text, hidden words included. vibekit 0.0.20's board form says "(to do)" for every stage, which is
    // false on a board (follow-up filed for vibekit 0.0.21); when vibekit drops it this line changes with it.
    expect(within(track).getAllByRole('listitem')[0]!.textContent).toBe('Reported, 3 · a person(to do)');
    expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual(['Reported', 'Shipped']);
    expect(screen.getByRole('region', { name: 'Reported' }).querySelector('header')!.textContent).toBe('Reported 3 cards a person works this');
  });

  it('a tile has one state line and a quiet Move, never a primary button', () => {
    const { container } = render(BoardView, props());
    const tiles = [...container.querySelectorAll('article[data-card-id]')];
    expect(tiles.length).toBeGreaterThan(0);
    for (const t of tiles) {
      expect(t.querySelectorAll('.bv-st'), 'one state line').toHaveLength(1);
      const buttons = [...t.querySelectorAll('.vk-button')];
      expect(buttons.map((b) => b.textContent!.trim())).toEqual(['Move']);
      expect(buttons[0]!.className).toContain('vk-button--quiet');
      expect(t.querySelector('.vk-button--primary, .vk-button--signal')).toBeNull();
    }
  });

  it('unclaimed tiles carry data-needs', () => {
    const { container } = render(BoardView, props());
    const reported = container.querySelector('[data-lane="reported"]')!;
    const shipped = container.querySelector('[data-lane="shipped"]')!;
    const needs = [...reported.querySelectorAll('article')];
    expect(needs).toHaveLength(3);
    for (const t of needs) {
      expect(t.getAttribute('data-needs')).toBe('1');
      expect(t.querySelector('.bv-st')!.textContent).toBe('With you · no agent works this stage');
    }
    expect([...shipped.querySelectorAll('article')].map((t) => t.getAttribute('data-needs'))).toEqual(['0', '0', '0']);
  });

  it('the attention line says how many cards here want you, and Show the first goes to the first one', async () => {
    const { container } = render(BoardView, props());
    expect(screen.getByText('3 cards want you here.')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Show the first' }));
    expect(document.activeElement).toBe(container.querySelector('[data-lane="reported"] article [data-card-open]'));
  });

  it('finished work folds after three tiles; Show 10 more shows the rest', async () => {
    const { container } = render(BoardView, props());
    const shipped = () => container.querySelectorAll('[data-lane="shipped"] article');
    expect(shipped()).toHaveLength(3);
    await fireEvent.click(screen.getByRole('button', { name: 'Show 10 more' }));
    expect(shipped()).toHaveLength(13);
  });

  it('the footer counts this board, not every board (the status-scope rule)', async () => {
    render(BoardView, props());
    await tick();
    expect(screen.getByText('16 cards · 3 need you · 13 shipped · synced 03:24')).toBeTruthy();
    expect(screen.queryByText(/7 need you/)).toBeNull();
  });
});
