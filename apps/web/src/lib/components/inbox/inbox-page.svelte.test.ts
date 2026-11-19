// apps/web/src/lib/components/inbox/inbox-page.svelte.test.ts
// @vitest-environment jsdom
/**
 * The Inbox, one composition in every vibe (composition contract §7, Inbox), on the realistic
 * workspace (18 cards need you across three boards, 548 notifications): the contract order, the same
 * tree outside the signature slots, one verb per row, counts once, the hidden filter row, jargon
 * anchored where it is first used, and live changes that move only when motion is on.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { flushSync, tick } from 'svelte';
import { VIBES } from '@superjackfruitlabs/vibekit-ui';
import type * as Api from '$lib/api';
import type { BoardSnapshot, StaleCard } from '$lib/api';
import { realisticWorkspace, REALISTIC_BOARD_IDS } from '$lib/fixtures/realistic';
import { INBOX_KEYS, keysText } from '$lib/keys';

vi.hoisted(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string): MediaQueryList => ({ matches: false, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false }),
  });
});

type ApiFn = (...args: never[]) => Promise<unknown>;
const api = vi.hoisted(() => ({
  getBoard: vi.fn<ApiFn>(), getNotifications: vi.fn<ApiFn>(), getUsage: vi.fn<ApiFn>(),
  sockets: [] as Array<{ boardId: string; emit: (e: unknown) => void }>,
  openBoardSocket: vi.fn<(boardId: string, onEvent: (e: unknown) => void) => unknown>(),
}));
api.openBoardSocket.mockImplementation((boardId, onEvent) => {
  const s = Object.assign(new EventTarget(), { boardId, close() {}, emit: onEvent });
  api.sockets.push(s);
  return s;
});
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof Api>()), ...api }));
vi.mock('$app/navigation', () => ({ goto: vi.fn<() => Promise<void>>() }));

import { app } from '$lib/stores/app.svelte';
import { liveUpdates } from '$lib/live/live-updates.svelte';
import { parityTree, primaryActionsPerRow, rawMachineText, repeatedParagraphs } from '$lib/composition/guards';
import { renderInVibes, type VibeRoots } from '$lib/composition/render-vibes';
import { InboxStore } from './inbox-model.svelte';
import { InboxUi } from './inbox-ui.svelte';
import { inboxScope } from './inbox-scope.svelte';
import { GROUP_EXPLANATION } from './inbox-words';
import InboxPage from './InboxPage.svelte';

const world = realisticWorkspace();
/** A workspace-feed row: only its board counts here (the Show row's numbers). */
const stale = (boardId: string, i: number): StaleCard => ({
  boardId, boardName: '', cardId: `card_${boardId}_${i}`, title: '', ownerUserId: '', stageKey: '', stageName: '', state: 'submitted',
  why: { kind: 'no-owner' }, summary: null, since: '', ageHours: 0, next: '',
});
let boards: Record<string, BoardSnapshot> = {};
let stop: (() => void) | null = null;
let roots: VibeRoots | null = null;

const make = (): InboxStore => {
  let s!: InboxStore;
  stop = $effect.root(() => { s = new InboxStore(); });
  return s;
};
const settle = async () => { for (let i = 0; i < 5; i++) { await tick(); await Promise.resolve(); } flushSync(); };
/** A store that has counted every board. */
async function counted(): Promise<InboxStore> {
  const store = make();
  await waitFor(() => expect(store.loading).toBe(false), { timeout: 2_000 });
  await settle();
  return store;
}
const props = (store: InboxStore) => ({ store, filters: store.filters, live: liveUpdates });
/** The one element `sel` names under `root`; a missing one fails the test where it is asked for. */
function one(root: Element, sel: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(sel);
  if (!el) throw new Error(`nothing matches ${sel}`);
  return el;
}
function button(root: Element, start: string): HTMLButtonElement {
  const b = [...root.querySelectorAll('button')].find((x) => x.textContent?.trim().startsWith(start));
  if (!b) throw new Error(`no button "${start}…"`);
  return b;
}
const stopped = (root: Element) => one(root, '[data-attention-row="blocked"]');

beforeEach(() => {
  boards = Object.fromEntries(world.boards.map((b) => [b.boardId ?? '', b]));
  api.getBoard.mockImplementation(async (id: string) => boards[id]);
  api.getNotifications.mockImplementation(async (id: string) => world.notifications[id] ?? []);
  api.getUsage.mockImplementation(async (id: string) => world.usage[id]);
  app.boards = world.boards.map((b) => ({ id: b.boardId ?? '', name: b.name ?? '', cardCount: b.cards.length, needsYouCount: 0, lastActivityAt: null }));
  const counts = { [REALISTIC_BOARD_IDS.planning]: 13, [REALISTIC_BOARD_IDS.devex]: 3, [REALISTIC_BOARD_IDS.marketing]: 2 };
  app.attention = Object.entries(counts).flatMap(([boardId, n]) => Array.from({ length: n }, (_, i) => stale(boardId, i)));
  app.agents = world.agents;
  app.boardId = '';
  app.board = null;
  app.boardsLoaded = true;
  app.boardsFailed = false;
  app.attentionSettled = true;
  liveUpdates.resume();
});
afterEach(() => {
  roots?.unmount();
  roots = null;
  cleanup();
  stop?.();
  stop = null;
  api.sockets = [];
  inboxScope.choose(null);
  app.boards = [];
  app.attention = [];
  vi.clearAllMocks();
});

const titles = (root: Element) => [...root.querySelectorAll('.ib-group .vk-sectionheader__title')].map((h) => h.textContent);

describe('InboxPage in every vibe', () => {
  it('renders the contract order in all four vibes with the same tree outside the signature', async () => {
    roots = await renderInVibes(InboxPage, props(await counted()));
    const day = roots.daylight;
    // Headline, scope, tabs (with Filter at the end), the filter row, the groups, the footer.
    const order = ['.ib-head[data-signature]', '.ib-scope[data-signature]', '[role="tablist"]', '.vk-tabs__end', '.ib-filters', '.ib-group', '.ib-foot'];
    const at = order.map((sel) => one(day, sel));
    for (let i = 1; i < at.length; i++) expect(at[i - 1].compareDocumentPosition(at[i]) & Node.DOCUMENT_POSITION_FOLLOWING, `${order[i - 1]} before ${order[i]}`).toBeTruthy();
    expect(titles(day)).toEqual(['Review', 'Answer', 'Resume a stopped agent', 'Over budget', 'Nobody works these stages']);
    expect([...day.querySelectorAll('[role="tab"]')].map((t) => t.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Needs you18 (18)', 'Running1 (1)', 'Spend$38.37 ($38.37)', 'Activity115 (115)']);
    const tree = parityTree(day);
    for (const v of VIBES) expect(parityTree(roots[v]), `${v} vibe`).toBe(tree);
    // The vibes differ inside the headline only: Daylight greets, Studio sets the figure.
    expect(day.querySelector('.ib-head h1')?.textContent).toMatch(/18 cards want you\.$/);
    expect(roots.studio.querySelector('.vk-hero__figure')?.textContent).toBe('18');
    expect(roots.paper.querySelector('.ib-head h1')?.textContent).toBe('18 cards want you.');
  });

  it('one primary action per row', async () => {
    roots = await renderInVibes(InboxPage, props(await counted()));
    for (const v of VIBES) {
      expect(roots[v].querySelectorAll('[data-row]').length, `${v}: rows`).toBeGreaterThan(0);
      expect(primaryActionsPerRow(roots[v]), `${v} vibe`).toEqual([]);
    }
    // Review, Answer, Resume and Raise the cap are the row's one primary verb; Move stays quiet.
    const day = roots.daylight;
    const verbs = (key: string) => [...day.querySelectorAll(`#ib-g-${key} [data-row] .vk-button--primary`)].map((b) => b.textContent?.trim());
    expect(verbs('review')).toEqual(['Review']);
    expect(verbs('resume')).toEqual(['Resume']);
    expect(verbs('budget')).toEqual(['Raise the cap']);
    expect(verbs('unclaimed')).toEqual([]);
  });

  it('no repeated paragraph and no raw ids', async () => {
    roots = await renderInVibes(InboxPage, props(await counted()));
    for (const v of VIBES) {
      expect(repeatedParagraphs(roots[v]), `${v} vibe`).toEqual([]);
      expect(rawMachineText(roots[v]), `${v} vibe`).toEqual([]);
    }
  });

  it('counts appear once', async () => {
    roots = await renderInVibes(InboxPage, props(await counted()));
    for (const v of VIBES) {
      const root = roots[v];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const eighteen: string[] = [];
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!el || el.closest('[data-signature], [role="tablist"]')) continue;
        if (/\b18\b/.test(n.textContent ?? '')) eighteen.push(n.textContent ?? '');
      }
      expect(eighteen, `${v}: the footer says it, nothing else`).toEqual([expect.stringMatching(/^18 need you · /)]);
    }
  });

  it('the filter row is hidden until the Filter button is pressed and shows the active count', async () => {
    const store = await counted();
    roots = await renderInVibes(InboxPage, props(store));
    const day = roots.daylight;
    const row = one(day, '.ib-filters');
    const control = button(day, 'Filter');
    expect(row.getAttribute('data-open')).toBe('false');
    const shut = one(row, ':scope > div');
    const inert = () => shut.inert || shut.hasAttribute('inert');
    expect(inert(), 'shut: out of reach').toBe(true);
    expect(control.getAttribute('aria-expanded')).toBe('false');
    expect(control.querySelector('.vk-badge')).toBeNull();
    await fireEvent.click(control);
    await settle();
    expect(row.getAttribute('data-open')).toBe('true');
    expect(inert()).toBe(false);
    expect(control.getAttribute('aria-expanded')).toBe('true');
    // A group chip narrows to its group, and the control counts the filter that is on.
    const chip = button(row, 'Unclaimed');
    await fireEvent.click(chip);
    await settle();
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    expect(control.querySelector('.vk-badge')?.textContent).toContain('1');
    expect(titles(day)).toEqual(['Nobody works these stages']);
  });

  it('the first stage, attempt and gate word on the page sits in a sentence that says what it is', async () => {
    const store = await counted();
    roots = await renderInVibes(InboxPage, props(store));
    for (const v of VIBES) {
      const root = roots[v];
      const lede = root.querySelector('[data-signature] .ib-head__lede, [data-signature] .vk-hero__lede')?.textContent;
      expect(lede, `${v}: the headline lede`).toBe(store.headlineFor(v).lede);
      expect(lede).toBe('One review, one question, one stopped agent, one card over budget, and 14 cards nobody is set up to work. One running.');
      const blocks = [...root.querySelectorAll('h1, h2, h3, h4, p, li, summary, button, a')].filter((el) => !el.closest('[data-signature]'));
      for (const word of [/\bgate\b/i, /\battempt\b/i, /\bstage\b/i]) {
        const first = blocks.find((el) => word.test(el.textContent ?? ''));
        expect(first?.textContent, `${v}: first ${word}`).toBe(GROUP_EXPLANATION.review);
      }
      expect([...root.querySelectorAll('.ib-why')].map((p) => p.textContent).slice(0, 4)).toEqual([GROUP_EXPLANATION.review, GROUP_EXPLANATION.answer, GROUP_EXPLANATION.resume, GROUP_EXPLANATION.budget]);
    }
  });

  it('under data-motion=reduce a live change produces no running animations; with motion on it produces at least one', async () => {
    const store = await counted();
    roots = await renderInVibes(InboxPage, props(store));
    // Daylight with motion on; Paper keeps renderInVibes' reduced motion.
    const motionOn = roots.daylight;
    const reduced = roots.paper;
    motionOn.removeAttribute('data-motion');
    expect(stopped(motionOn).classList.contains('vk-flash')).toBe(false);
    // The marketing board speaks: its stopped card now says something new, read and applied.
    const m = boards[REALISTIC_BOARD_IDS.marketing];
    boards[REALISTIC_BOARD_IDS.marketing] = { ...m, cards: m.cards.map((c) => (c.needsHuman ? { ...c, needsHuman: { ...c.needsHuman, detail: 'The release page is up now; the link still points at the old address.' } } : c)) };
    const feed = api.sockets.find((s) => s.boardId === REALISTIC_BOARD_IDS.marketing);
    if (!feed) throw new Error('the marketing board has no feed');
    feed.emit({ seq: 1, type: 'card.updated', payload: {}, ts: '2026-11-18T09:00:00.000Z' });
    await waitFor(() => expect(stopped(motionOn).textContent).toContain('The release page is up now'));
    await settle();
    expect(stopped(motionOn).classList.contains('vk-flash'), 'motion on: the changed row flashes').toBe(true);
    expect(stopped(reduced).textContent).toContain('The release page is up now');
    expect(stopped(reduced).classList.contains('vk-flash'), 'reduced: it changes in place').toBe(false);
  });

  it('Running pages like a group: five, then "Show N more" (rule 7)', async () => {
    // Thirty cards at work across the boards.
    const d = boards[REALISTIC_BOARD_IDS.devex];
    const extra = Array.from({ length: 30 - d.cards.length }, (_, i) => ({ ...d.cards[0], id: `card_rl_devex_x${i}`, title: `Running card ${i}` }));
    boards[REALISTIC_BOARD_IDS.devex] = { ...d, cards: [...d.cards, ...extra].map((c) => ({ ...c, state: 'working' as const, delegateAgentId: c.lastAgentId })) };
    const store = await counted();
    const ui = new InboxUi(() => store);
    ui.tab = 'running';
    roots = await renderInVibes(InboxPage, { ...props(store), ui });
    const day = roots.daylight;
    if (!(day instanceof HTMLElement)) throw new Error('the vibe root is not an element');
    expect(store.running.length).toBeGreaterThanOrEqual(30);
    expect(day.querySelectorAll('.ib-row--run')).toHaveLength(5);
    await fireEvent.click(within(day).getByRole('button', { name: /^Show 20 more/ }));
    await settle();
    expect(day.querySelectorAll('.ib-row--run')).toHaveLength(25);
    for (const v of VIBES) expect(primaryActionsPerRow(roots[v]), `${v} vibe`).toEqual([]);
  });

  it('paused, the footer says so and leaves the count of waiting updates to the Live pill (rule 2)', async () => {
    const store = await counted();
    roots = await renderInVibes(InboxPage, props(store));
    liveUpdates.pause();
    for (const k of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) liveUpdates.push(`test:${k}`, () => {});
    await settle();
    // The footer's words, then its keys line (rule 13).
    const footEl = one(roots.daylight, '.ib-foot');
    const foot = (footEl.textContent ?? '').replace(footEl.querySelector('.sh-keys')?.textContent ?? '', '').trim();
    expect(foot).toMatch(/· paused$/);
    expect(roots.daylight.textContent).not.toMatch(/updates? waiting/);
    liveUpdates.queued = [];
  });

  it('the footer line ends with the Inbox keys, the same words in every vibe (rule 13)', async () => {
    roots = await renderInVibes(InboxPage, props(await counted()));
    for (const v of VIBES) {
      const keys = one(roots[v], '.ib-foot').lastElementChild;
      expect(keys?.getAttribute('aria-label'), `${v} vibe`).toBe('Keyboard');
      expect(keys?.textContent, `${v} vibe`).toBe(keysText(INBOX_KEYS));
    }
    // The keys the Inbox answers: its row keys (InboxPage onkeydown), F (its filter row) and the shell's.
    expect(keysText(INBOX_KEYS)).toBe('J / K rows · O open · M move · R resume · F filter · ⌘K search · G I / P / C go to Inbox, Plan, Crew');
  });

  it('Studio says the count in words beside its figure, as the mockup does', async () => {
    roots = await renderInVibes(InboxPage, props(await counted()));
    expect(one(roots.studio, '.vk-hero__headline').textContent).toContain('Eighteen cards want you.');
  });

  it('a filter menu’s chevron stays out of its trigger’s name', async () => {
    roots = await renderInVibes(InboxPage, props(await counted()));
    const row = one(roots.daylight, '.ib-filters');
    for (const name of ['Agent · any', 'Label · any', 'Priority · any', 'Oldest first']) {
      expect(within(row).getByRole('button', { name, hidden: true }).getAttribute('aria-haspopup')).toBe('menu');
    }
  });

  it('with the Resume form open, its Send back to work is the row’s one primary (rule 3)', async () => {
    roots = await renderInVibes(InboxPage, props(await counted()));
    for (const v of VIBES) {
      const row = stopped(roots[v]);
      await fireEvent.click(within(row).getByRole('button', { name: 'Resume' }));
      await settle();
      expect(within(row).getByRole('button', { name: 'Send back to work' })).toBeTruthy();
      expect(within(row).queryByRole('button', { name: 'Resume' })).toBeNull();
      expect(primaryActionsPerRow(roots[v]), `${v} vibe`).toEqual([]);
      expect(row.querySelectorAll('.vk-button--primary')).toHaveLength(1);
    }
  });
});

/** One page (the four-vibe render would put four window handlers on one window), with what the key tests ask of it. */
async function keysPage() {
  const store = await counted();
  const ui = new InboxUi(() => store);
  const { container } = render(InboxPage, { ...props(store), ui });
  await settle();
  const rows = () => [...container.querySelectorAll<HTMLElement>('.ib-needs .ib-row[data-row]')];
  const current = () => rows().filter((r) => r.getAttribute('aria-current') === 'true').map((r) => r.dataset.row);
  /** Presses `key` on `target`; true when the page took it (preventDefault). */
  const press = async (key: string, target: Window | Element = window) => { const taken = !(await fireEvent.keyDown(target, { key })); await settle(); return taken; };
  /** Selects a row the way Tab does (focus in it), then leaves focus on the page so the next key reaches the window. */
  const focusRow = async (row: HTMLElement) => {
    row.querySelector<HTMLElement>('.ib-row__t a')?.focus();
    await settle();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  };
  return { store, ui, container, rows, current, press, focusRow };
}

describe('InboxPage keys (INBOX_KEYS)', () => {
  it('J and K move the selection down and up the drawn rows, and it is marked aria-current', async () => {
    const { rows, current, press } = await keysPage();
    expect(rows().length).toBeGreaterThan(2);
    expect(current()).toEqual([]);
    expect(await press('j')).toBe(true);
    expect(current()).toEqual([rows()[0]?.dataset.row]);
    // Announced as the List's table does it: focus moves to the selected row's title link (the card's title).
    expect(document.activeElement).toBe(rows()[0]?.querySelector('.ib-row__t a'));
    await press('j');
    expect(document.activeElement).toBe(rows()[1]?.querySelector('.ib-row__t a'));
    expect(current()).toEqual([rows()[1]?.dataset.row]);
    await press('k');
    await press('K');
    expect(current()).toEqual([rows()[0]?.dataset.row]);
  });

  it('a selection the reader can no longer see is cleared: O does nothing, J starts at the top again', async () => {
    const { store, ui, rows, current, press } = await keysPage();
    const open = vi.spyOn(store, 'open').mockImplementation(() => {});
    await press('j');
    const first = rows()[0]?.dataset.row;
    const other = rows()[1]?.querySelector('.ib-row__t a')?.textContent ?? '';
    expect(current()).toEqual([first]);
    // Filter the selected row away (find matches only another row's title).
    store.filters.find = other;
    await settle();
    expect(rows().map((r) => r.dataset.row)).not.toContain(first);
    expect(ui.selected).toBeNull();
    expect(await press('o')).toBe(false);
    expect(open).not.toHaveBeenCalled();
    await press('j');
    expect(current()).toEqual([rows()[0]?.dataset.row]);
    // Another tab clears it too.
    ui.tab = 'running';
    await settle();
    ui.tab = 'needs';
    await settle();
    expect(ui.selected).toBeNull();
  });

  it('with motion on, a row filtered away while it fades out is no longer selected and O does nothing', async () => {
    const { store, ui, container, press, focusRow } = await keysPage();
    // Motion on (keysPage renders without renderInVibes' data-motion="reduce"; matchMedia says no reduced motion).
    expect(container.closest('[data-motion="reduce"]')).toBeNull();
    const open = vi.spyOn(store, 'open').mockImplementation(() => {});
    // A group with two rows: select its first, keep its second, so the selected row leaves through its own
    // out:fade while the group stays.
    const pair = [...container.querySelectorAll('.ib-needs .ib-group')].map((g) => [...g.querySelectorAll<HTMLElement>('.ib-row[data-row]')]).find((r) => r.length >= 2);
    if (!pair) throw new Error('no group with two rows');
    const [first, sibling] = pair;
    if (!first || !sibling) throw new Error('no pair');
    await focusRow(first);
    expect(ui.selected).toBe(first.dataset.row);
    const title = sibling.querySelector('.ib-row__t a')?.textContent ?? '';
    expect(title).not.toBe('');
    // jsdom has no Web Animations: Svelte's transitions get an animation that runs and never finishes, so the
    // leaving row's out:fade is still under way when the keys are pressed.
    const had = { animate: Object.getOwnPropertyDescriptor(Element.prototype, 'animate'), getAnimations: Object.getOwnPropertyDescriptor(Element.prototype, 'getAnimations') };
    Object.defineProperty(Element.prototype, 'animate', { configurable: true, writable: true, value: () => ({ onfinish: null, cancel() {}, play() {}, pause() {}, currentTime: 0, playState: 'running' }) });
    Object.defineProperty(Element.prototype, 'getAnimations', { configurable: true, writable: true, value: () => [] });
    try {
      store.filters.find = title;
      flushSync();
      await tick();
      // The fade has not finished: the row is still in the DOM, but the page no longer holds it.
      expect(first.isConnected, 'the leaving row is still drawn').toBe(true);
      expect(ui.selected).toBeNull();
      expect(await press('o')).toBe(false);
      expect(open).not.toHaveBeenCalled();
    } finally {
      for (const [name, d] of Object.entries(had)) {
        if (d) Object.defineProperty(Element.prototype, name, d);
        else Reflect.deleteProperty(Element.prototype, name);
      }
    }
  });

  it('an open Move menu keeps the keys: J does not move the selection', async () => {
    const { ui, current, press } = await keysPage();
    await press('j');
    const at = current();
    ui.moveOpen = at[0] ?? null;
    expect(await press('j')).toBe(false);
    expect(current()).toEqual(at);
  });

  it('O opens the selected row’s card', async () => {
    const { store, press } = await keysPage();
    const open = vi.spyOn(store, 'open').mockImplementation(() => {});
    expect(await press('o')).toBe(false);
    expect(open).not.toHaveBeenCalled();
    await press('j');
    expect(await press('o')).toBe(true);
    const first = store.needGroups[0]?.items[0];
    expect(open).toHaveBeenCalledWith(first?.cardId, first?.boardId);
  });

  it('R opens Resume’s form only on a row that offers Resume', async () => {
    const { container, press, focusRow } = await keysPage();
    await press('j');
    expect(container.querySelector('.ib-row[aria-current="true"]')?.getAttribute('data-attention-row')).not.toBe('blocked');
    expect(await press('r')).toBe(false);
    expect(container.querySelector('.ib-resume')).toBeNull();
    const row = stopped(container);
    await focusRow(row);
    expect(row.getAttribute('aria-current')).toBe('true');
    expect(await press('r')).toBe(true);
    expect(row.querySelector('.ib-resume')).not.toBeNull();
  });

  it('M opens the Move menu only on a row that offers Move', async () => {
    const { container, ui, press, focusRow } = await keysPage();
    await press('j');
    expect(await press('m')).toBe(false);
    expect(ui.moveOpen).toBeNull();
    const row = [...container.querySelectorAll<HTMLElement>('[data-attention-row="no-owner"]')].find((r) => within(r).queryByRole('button', { name: 'Move' }));
    if (!row) throw new Error('no unclaimed row with a Move menu');
    await focusRow(row);
    expect(await press('m')).toBe(true);
    expect(ui.moveOpen).toBe(row.dataset.row);
  });

  it('leaves a bare G to the shell’s chords, and keys typed in the find field move no row', async () => {
    const { container, current, press } = await keysPage();
    expect(await press('g')).toBe(false);
    await fireEvent.click(button(container, 'Filter'));
    await settle();
    expect(await press('j', one(container, '#ib-filter-row input'))).toBe(false);
    expect(current()).toEqual([]);
  });
});
