// @vitest-environment jsdom
/**
 * The board page's composition (BoardView, variant A), in every vibe, on the realistic Developer
 * Experience board. Drag and drop first (the characterization test, kept from the old Daylight
 * board): the drag library cannot run in jsdom, so `$lib/dnd` is replaced by recorders that keep each
 * drop target's params, and a test drops by calling `onDrop`.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { flushSync, mount, tick, unmount } from 'svelte';
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

import type { BoardSnapshot, StaleCard } from '$lib/api';
import { app } from '$lib/stores/app.svelte';
import { noFilters } from '$lib/stores/card-filters';
import { parityTree, primaryActionsPerRow, rawMachineText, truncatedNames } from '$lib/composition/guards';
import { renderInVibes } from '$lib/composition/render-vibes';
import { REALISTIC_NOW_MS, REALISTIC_USER, realisticWorkspace } from '$lib/fixtures/realistic';
import { buildBoardModel } from './board-model';
import BoardView from './BoardView.svelte';
import { durationOf, stubWebAnimations } from '$lib/test/web-animations';

// The lanes' live motion runs on Web Animations, which jsdom lacks (motion is on here, as in a browser).
const animations = stubWebAnimations();
afterAll(() => animations.restore());

beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: false, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }));
  // jsdom has no scrollIntoView; "Show the first" calls it.
  if (!('scrollIntoView' in Element.prototype)) Object.defineProperty(Element.prototype, 'scrollIntoView', { value: () => {}, configurable: true });
});

const w = realisticWorkspace();
/** The value, or a failed test naming what was missing. */
function req<T>(x: T | null | undefined, what: string): T {
  if (x === null || x === undefined) throw new Error(`missing: ${what}`);
  return x;
}
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
  it('renders the same accessibility tree in every vibe outside the signature slot', async () => {
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

  it('the open control is a stretch target: its focus ring is drawn on ::after, which the probe reads by this marker', () => {
    const { container } = render(BoardView, props());
    const opens = [...container.querySelectorAll('article[data-card-id] .bv-open')];
    expect(opens.length).toBeGreaterThan(0);
    for (const o of opens) expect(o.hasAttribute('data-stretch-target')).toBe(true);
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

  it('a long lane is a list (rule 7): five tiles, then Show N more saying who waits; the count stays the lane\'s', async () => {
    // Planning & Roadmap: eleven cards in Idea, every one waiting on you, plus a working card to mix in.
    const planning = req(w.boards.find((b) => b.name === 'Planning & Roadmap'), 'the Planning board');
    const idea = planning.cards.filter((c) => c.currentStageKey === 'idea');
    expect(idea).toHaveLength(11);
    app.board = planning;
    const model = buildBoardModel(planning, planning.cards, { agents: w.agents, members: [], labels: new Map(), nowMs: REALISTIC_NOW_MS, me: { id: REALISTIC_USER, name: 'Rakesh Gangwar', initials: 'RG' }, spend7d: undefined });
    const { container } = render(BoardView, { ...props(), model });
    const lane = () => req(container.querySelector<HTMLElement>('[data-lane="idea"]'), 'the Idea lane');
    const tiles = () => [...lane().querySelectorAll('article')];
    const order = model.ordered.filter((s) => s.stageKey === 'idea').map((s) => s.id);
    expect(tiles().map((t) => t.querySelector('[data-card-open]')?.getAttribute('data-card-open'))).toEqual(order.slice(0, 5));
    expect(lane().querySelector('.bv-ct')?.textContent).toBe('11 cards');
    const more = within(lane()).getByRole('button', { name: /^Show 6 more · 6 want you/ });
    expect(within(lane()).getByText('5 of 11 shown')).toBeTruthy();
    await fireEvent.click(more);
    await tick();
    expect(tiles()).toHaveLength(11);
    expect(tiles().map((t) => t.querySelector('[data-card-open]')?.getAttribute('data-card-open'))).toEqual(order);
    expect(document.activeElement).toBe(tiles()[5].querySelector('[data-card-open]'));
    expect(lane().querySelector('.bv-ct')?.textContent).toBe('11 cards');
    expect(within(lane()).queryByRole('button', { name: /^Show \d+ more/ })).toBeNull();
    expect(within(lane()).getByText('All 11 shown')).toBeTruthy();
    // A drop on the folded lane still lands: the whole lane is the target.
    req(drops.find((d) => d.kind === 'lane' && d.params.stageKey === 'idea'), 'the Idea lane drop target').params.onDrop('card_z');
    expect(moveCard).toHaveBeenCalledWith('card_z', 'idea');
  });

  it('the fold counts only the hidden cards that want you', async () => {
    const planning = req(w.boards.find((b) => b.name === 'Planning & Roadmap'), 'the Planning board');
    // Two of the eleven Idea cards are taken by an agent: they no longer want you, and sort after the rest.
    const idea = planning.cards.filter((c) => c.currentStageKey === 'idea').map((c) => c.id);
    const taken = new Set(idea.slice(-2));
    const cards = planning.cards.map((c) => (taken.has(c.id) ? { ...c, state: 'working' as const, lastAgentId: w.agents[0].id, delegateAgentId: w.agents[0].id } : c));
    const board = { ...planning, cards };
    app.board = board;
    const model = buildBoardModel(board, cards, { agents: w.agents, members: [], labels: new Map(), nowMs: REALISTIC_NOW_MS, me: null, spend7d: undefined });
    const { container } = render(BoardView, { ...props(), model });
    const lane = req(container.querySelector<HTMLElement>('[data-lane="idea"]'), 'the Idea lane');
    expect(within(lane).getByRole('button', { name: /^Show 6 more · 4 want you/ })).toBeTruthy();
  });

  it('the fold\'s two numbers agree: past a page, it counts the wanting cards the press shows, not every hidden one', async () => {
    const planning = req(w.boards.find((b) => b.name === 'Planning & Roadmap'), 'the Planning board');
    const idea = planning.cards.filter((c) => c.currentStageKey === 'idea');
    // Thirty cards in Idea, every one waiting on you: 25 hidden, the next press shows 20 of them.
    const extra = Array.from({ length: 30 - idea.length }, (_, i) => ({ ...idea[1], id: `card_rl_planning_x${i}`, title: `Another idea ${i}` }));
    const board = { ...planning, cards: [...planning.cards, ...extra] };
    app.board = board;
    const model = buildBoardModel(board, board.cards, { agents: w.agents, members: [], labels: new Map(), nowMs: REALISTIC_NOW_MS, me: null, spend7d: undefined });
    const { container } = render(BoardView, { ...props(), model });
    const lane = req(container.querySelector<HTMLElement>('[data-lane="idea"]'), 'the Idea lane');
    await fireEvent.click(within(lane).getByRole('button', { name: /^Show 20 more · 20 want you/ }));
    await tick();
    expect(within(lane).getByRole('button', { name: /^Show 5 more · 5 want you/ })).toBeTruthy();
  });

  it('the footer counts this board, not every board (the status-scope rule)', async () => {
    render(BoardView, props());
    await tick();
    expect(screen.getByText('16 cards · 3 need you · 13 shipped · synced 03:24')).toBeTruthy();
    expect(screen.queryByText(/7 need you/)).toBeNull();
  });
});

const modelOf = (b: BoardSnapshot) => buildBoardModel(b, b.cards, { agents: w.agents, members: [], labels: new Map(), nowMs: REALISTIC_NOW_MS, me: { id: REALISTIC_USER, name: 'Rakesh Gangwar', initials: 'RG' }, spend7d: undefined });
/** The board, then a live read: one reported card is now worked by an agent, and a new card is reported. */
async function liveChange(): Promise<{ host: HTMLElement; changed: HTMLElement; count: HTMLElement; stop: () => void }> {
  const host = document.body.appendChild(document.createElement('div'));
  const p = $state({ model: modelOf(devex), filters: noFilters() });
  const view = mount(BoardView, { target: host, props: p });
  flushSync();
  animations.calls.length = 0;
  const next: BoardSnapshot = {
    ...devex,
    cards: [
      ...devex.cards.map((c) => (c.id === 'card_rl_devex_002' ? { ...c, state: 'working' as const, delegateAgentId: 'agt_rl_coder_kai' } : c)),
      { ...req(devex.cards.find((c) => c.id === 'card_rl_devex_003'), 'a reported card'), id: 'card_rl_devex_new', title: 'A bug reported just now' },
    ],
  };
  app.board = next;
  p.model = modelOf(next);
  flushSync();
  await tick();
  const changed = req(host.querySelector<HTMLElement>('[data-card-id="card_rl_devex_002"]'), 'the changed tile');
  const count = req(host.querySelector<HTMLElement>('[data-lane="reported"] .bv-ct > span'), 'the Reported count');
  return { host, changed, count, stop: () => { void unmount(view); host.remove(); } };
}

describe('the board: live changes move (rule 9)', () => {
  it('with motion on, the new tile rises in, the changed tile flashes and the lane count ticks and bumps', async () => {
    const { host, changed, count, stop } = await liveChange();
    try {
      expect(host.querySelector('[data-card-id="card_rl_devex_new"]')).toBeTruthy();
      expect(animations.calls.length, 'something animates').toBeGreaterThan(0);
      expect(changed.classList.contains('vk-flash'), 'the changed tile flashes').toBe(true);
      expect(count.classList.contains('vk-bump'), 'the count bumps').toBe(true);
    } finally { stop(); }
  });

  it('under data-motion="reduce" the same change moves nothing', async () => {
    document.documentElement.setAttribute('data-motion', 'reduce');
    try {
      const { host, changed, count, stop } = await liveChange();
      try {
        expect(host.querySelector('[data-card-id="card_rl_devex_new"]')).toBeTruthy();
        expect(count.textContent).toBe('4');
        expect(animations.calls.filter((c) => durationOf(c) > 0), 'nothing runs for a while').toEqual([]);
        expect(changed.classList.contains('vk-flash')).toBe(false);
        expect(count.classList.contains('vk-bump')).toBe(false);
      } finally { stop(); }
    } finally { document.documentElement.removeAttribute('data-motion'); }
  });
});
