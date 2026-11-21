// apps/web/src/lib/composition/pages.svelte.test.ts
// @vitest-environment jsdom
/**
 * The composition guards (design spec §9) wired for every page, one row each, on the realistic
 * workspace (`$lib/fixtures/realistic`): each page mounts in every vibe through `renderInVibes`
 * and must pass, in every vibe, vibe parity (the same accessibility tree outside `[data-signature]`),
 * one primary action per row, no repeated paragraph, no raw id or JSON outside a disclosure, no
 * clipped stage name, a signature no larger than its allowed parts (§11.6), and a footer that ends
 * with the page's keys (rule 13). A page is one `PAGES` row: its name, how it mounts, the parts its
 * signature may hold, and its keys. The layout guards (height budget, track width, motion) are in
 * `e2e/composition.spec.ts`. Each guard was proven by breaking a page once (see the commit).
 *
 * Where the realistic workspace has no data for a page (labels, schedules, projects, members), the
 * row adds the smallest set beside it, named in the row.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, waitFor } from '@testing-library/svelte';
import { flushSync, tick, type Component } from 'svelte';
import { VIBES } from '@superjackfruitlabs/vibekit-ui';
import type * as Api from '$lib/api';
import type * as Superlibrary from '$lib/superlibrary';
import type { BoardEvent, BoardSnapshot, CapabilityRecord, Member, Project, StaleCard } from '$lib/api';

vi.hoisted(() => {
  // jsdom has no matchMedia (vibekit's DataTable and the viewport ask it): a desktop window.
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string): MediaQueryList => ({ matches: false, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false }),
  });
  if (!('scrollIntoView' in Element.prototype)) Object.defineProperty(Element.prototype, 'scrollIntoView', { value: () => {}, configurable: true });
});

/** Every read a page makes; writes keep their real (unused) functions. */
type Fn = (...args: never[]) => unknown;
const api = vi.hoisted(() => ({
  getBoard: vi.fn<Fn>(), getBoards: vi.fn<Fn>(), getBoardEvents: vi.fn<Fn>(), getNotifications: vi.fn<Fn>(), getUsage: vi.fn<Fn>(),
  openBoardSocket: vi.fn<Fn>(), listProjects: vi.fn<Fn>(), getProject: vi.fn<Fn>(), getProjectRollup: vi.fn<Fn>(),
  getAgents: vi.fn<Fn>(), getCapabilities: vi.fn<Fn>(), getMembers: vi.fn<Fn>(), listLabels: vi.fn<Fn>(),
  getWorkspace: vi.fn<Fn>(), getForgeHost: vi.fn<Fn>(), getHubPrincipals: vi.fn<Fn>(), getProfiles: vi.fn<Fn>(), getSchedules: vi.fn<Fn>(),
  getCardActivities: vi.fn<Fn>(), getAttempts: vi.fn<Fn>(), getEstimate: vi.fn<Fn>(), listLinks: vi.fn<Fn>(), getComments: vi.fn<Fn>(),
}));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof Api>()), ...api }));
// The drag library cannot run in jsdom (board-view.svelte.test.ts tests the drops).
vi.mock('$lib/dnd', () => ({ cardDraggable: () => ({ update() {}, destroy() {} }), columnDropTarget: () => ({ update() {}, destroy() {} }), trackCellDropTarget: () => ({ update() {}, destroy() {} }) }));
vi.mock('$app/navigation', () => ({ goto: vi.fn<() => Promise<void>>() }));
// The card page route reads its ids from the URL.
vi.mock('$app/state', () => ({ page: { params: { boardId: 'brd_rl_planning', cardId: 'card_rl_planning_001' }, url: new URL('http://localhost/b/brd_rl_planning/c/card_rl_planning_001/page') } }));
vi.mock('$lib/hub-token', () => ({ hubStatus: async () => ({ configured: false }), beginHubAuthorization: async () => {} }));
// The card's related work reads SuperLibrary; nothing is related here.
vi.mock('$lib/superlibrary', async (orig) => ({ ...(await orig<typeof Superlibrary>()), relatedForCard: async () => [] }));
globalThis.ResizeObserver ??= class implements ResizeObserver { observe(): void {} unobserve(): void {} disconnect(): void {} };

import { app } from '$lib/stores/app.svelte';
import { liveUpdates } from '$lib/live/live-updates.svelte';
import { noFilters } from '$lib/stores/card-filters';
import { BOARD_KEYS, CARD_KEYS, INBOX_KEYS, LIST_KEYS, PAGE_KEYS, keysText } from '$lib/keys';
import { REALISTIC_BOARD_IDS, REALISTIC_NOW_MS, REALISTIC_TENANT, REALISTIC_USER, realisticWorkspace } from '$lib/fixtures/realistic';
import { keysLine, parityTree, primaryActionsPerRow, rawMachineText, repeatedParagraphs, signatureSize, truncatedNames } from './guards';
import { renderInVibes, type VibeRoots } from './render-vibes';
import InboxPage from '$lib/components/inbox/InboxPage.svelte';
import { InboxStore } from '$lib/components/inbox/inbox-model.svelte';
import { inboxScope } from '$lib/components/inbox/inbox-scope.svelte';
import BoardView from '$lib/components/board/BoardView.svelte';
import { buildBoardModel } from '$lib/components/board/board-model';
import { stageSummaries, summarize } from '$lib/components/board/card-summary';
import ListView from '$lib/components/plan/list/ListView.svelte';
import { buildRows, groupRows } from '$lib/components/plan/list/list-model';
import ProjectsView from '$lib/components/plan/projects/ProjectsView.svelte';
import { ProjectsModel } from '$lib/components/plan/projects-model.svelte';
import SpendView from '$lib/components/operate/SpendView.svelte';
import BoardLogView from '$lib/components/operate/BoardLogView.svelte';
import CrewView from '$lib/components/workspace/CrewView.svelte';
import { crewLists, workspaceCounts, CREW_TAB_IDS } from '$lib/components/workspace/workspace-counts.svelte';
import SettingsView from '$lib/components/settings/SettingsView.svelte';
import BoardSettingsView from '$lib/components/settings/BoardSettingsView.svelte';
import { BOARD_SETTINGS_TABS, SETTINGS_TABS } from '$lib/components/settings/settings-words';
import { LABELS } from '$lib/components/settings/settings-fixture';
import CardView from '$lib/components/card/CardView.svelte';
import CardPageRoute from '../../routes/b/[boardId]/c/[cardId]/page/+page@.svelte';
import BoardEmpty from '$lib/components/board/BoardEmpty.svelte';
import { CardModel } from '$lib/components/card/card-model.svelte';

// ── The realistic workspace, and what pages need beside it ───────────────────────────────────────

const world = realisticWorkspace();
const byId = (id: string): BoardSnapshot => world.boards.find((b) => b.boardId === id) ?? (() => { throw new Error(`no board ${id}`); })();
const ME = { id: REALISTIC_USER, name: 'Asha Rao', initials: 'AR' };
/** Labels: the workspace's twenty (Settings' fixture), on the Developer Experience board's first cards. */
const devex: BoardSnapshot = (() => {
  const b = byId(REALISTIC_BOARD_IDS.devex);
  return { ...b, cards: b.cards.map((c, i) => ({ ...c, labels: i < 6 ? [LABELS[i % 4].id] : [] })) };
})();
const labelMap = new Map(LABELS.map((l) => [l.id, { name: l.name, colour: l.colour }]));
/** The card rows' card: Planning's review card, at its approval gate, with two labels (Facts names them). */
const REVIEW_CARD = 'card_rl_planning_001';
const planningLabelled: BoardSnapshot = (() => {
  const b = byId(REALISTIC_BOARD_IDS.planning);
  return { ...b, cards: b.cards.map((c) => (c.id === REVIEW_CARD ? { ...c, labels: [LABELS[1].id, LABELS[10].id] } : c)) };
})();
const MEMBERS: Member[] = [
  { userId: REALISTIC_USER, email: 'owner@realistic-fixture.invalid', name: 'Asha Rao', role: 'owner', createdAt: '2026-09-01T00:00:00Z' },
  { userId: 'usr_rl_dev', email: 'dev@realistic-fixture.invalid', name: 'Dev Rao', role: 'member', createdAt: '2026-09-02T00:00:00Z' },
];
/** The capabilities the workspace's agents declare, as the realistic seed records them. */
const CAPS: CapabilityRecord[] = [...new Set(world.agents.flatMap((a) => a.capabilities))].toSorted().map((key) => ({
  id: `cap_rl_${key}`, key, name: key, description: null, tags: [], examples: [], origin: 'declared', externalId: null, externalSource: null,
  inputModes: [], outputModes: [], agentCount: world.agents.filter((a) => a.capabilities.includes(key)).length, boardCount: 1,
}));
/** Two projects over the Planning board's cards (the realistic workspace has none). */
const PROJECTS: Project[] = [
  { id: 'prj_rl_onboarding', tenantId: REALISTIC_TENANT, name: 'Self-serve onboarding — first board in ten minutes', description: null, targetDate: '2026-12-15', state: 'active', health: 'on-track', leadUserId: REALISTIC_USER, createdAt: '2026-10-01T00:00:00Z', updatedAt: null },
  { id: 'prj_rl_pricing', tenantId: REALISTIC_TENANT, name: 'Pricing page and plan comparison', description: null, targetDate: null, state: 'planned', health: null, leadUserId: null, createdAt: '2026-10-02T00:00:00Z', updatedAt: null },
] as Project[];
/** The Developer Experience board's notifications, as its board log reads them: newest first. */
const LOG: BoardEvent[] = (world.notifications[REALISTIC_BOARD_IDS.devex] ?? [])
  .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
  .map((n, i, all) => ({ seq: all.length - i, type: 'notification', payload: { cardId: n.cardId, kind: n.kind, body: n.body }, ts: n.createdAt }));
/** A workspace-feed row: only its board counts (the Inbox's scope numbers). */
const stale = (boardId: string, i: number): StaleCard => ({
  boardId, boardName: '', cardId: `card_${boardId}_${i}`, title: '', ownerUserId: '', stageKey: '', stageName: '', state: 'submitted',
  why: { kind: 'no-owner' }, summary: null, since: '', ageHours: 0, next: '',
});

const settle = async () => { for (let i = 0; i < 5; i++) { await tick(); await new Promise((r) => setTimeout(r, 0)); } flushSync(); };
let stops: Array<() => void> = [];
/** Mounts in every vibe, then lets the pages' reads land. */
async function vibes<P extends Record<string, unknown>>(C: Component<P>, props: P): Promise<VibeRoots> {
  const roots = await renderInVibes(C, props);
  await settle();
  return roots;
}

// ── The pages ────────────────────────────────────────────────────────────────────────────────────

interface PageRow {
  name: string;
  mount: () => Promise<VibeRoots>;
  /** Words from the realistic data that the page must show, so a page that rendered nothing fails. */
  shows: string;
  /** The parts a `[data-signature]` region may hold on this page (§11.6): headline block, ordinals, scope. */
  signature: string[];
  /** The keys line's words (rule 13); null while the page's footer has none yet (pending). */
  keys: string | null;
}

/** Words each Board settings tab shows from the board (its heading sits in the signature). */
const BOARD_SHOWS: Record<(typeof BOARD_SETTINGS_TABS)[number]['id'], string> = {
  stages: 'Reproduce', schedules: 'Weekly dependency check', labels: 'agentpod', caps: '$5.00', github: 'Payload URL', board: 'Agent profiles',
};
const HEAD = (p: string) => [`.${p}-eyebrow`, `.${p}-title`, `.${p}-lede`];
const PAGE = keysText(PAGE_KEYS);

const PAGES: PageRow[] = [
  {
    name: 'Inbox',
    shows: 'Nobody works these stages',
    // The headline block (heading and lede; Studio's figure) and the scope control (QuickFilter, or its place while counting).
    signature: ['.ib-head__h', '.ib-head__lede', '.vk-hero', '.vk-quickfilter', '.ib-scope__wait'],
    keys: keysText(INBOX_KEYS),
    mount: async () => {
      let store!: InboxStore;
      stops.push($effect.root(() => { store = new InboxStore(); }));
      await waitFor(() => expect(store.loading).toBe(false), { timeout: 2_000 });
      await settle();
      return vibes(InboxPage, { store, filters: store.filters, live: liveUpdates });
    },
  },
  {
    name: 'Board',
    shows: 'Reproduce',
    signature: [], // the slot is empty: the masthead names the board
    keys: keysText(BOARD_KEYS),
    mount: () => vibes(BoardView, {
      model: buildBoardModel(devex, devex.cards, { agents: world.agents, members: MEMBERS, labels: labelMap, nowMs: REALISTIC_NOW_MS, me: ME, spend7d: undefined }),
      filters: noFilters(),
    }),
  },
  {
    // Planning & Roadmap: the Idea lane's eleven cards fold to five behind "Show 6 more · 6 want you" (rule 7).
    name: 'Board · folded lane',
    shows: '5 of 11 shown',
    signature: [],
    keys: keysText(BOARD_KEYS),
    mount: () => {
      const planning = byId(REALISTIC_BOARD_IDS.planning);
      app.board = planning;
      app.boardId = planning.boardId ?? null;
      return vibes(BoardView, {
        model: buildBoardModel(planning, planning.cards, { agents: world.agents, members: MEMBERS, labels: labelMap, nowMs: REALISTIC_NOW_MS, me: ME, spend7d: undefined }),
        filters: noFilters(),
      });
    },
  },
  {
    name: 'List',
    shows: 'Reported',
    signature: [], // no slot: the masthead names the board
    keys: keysText(LIST_KEYS),
    mount: () => {
      const stageList = stageSummaries(devex, devex.cards, world.agents);
      const rows = buildRows(summarize(devex, devex.cards, { agents: world.agents, members: MEMBERS, labels: labelMap, nowMs: REALISTIC_NOW_MS }), { boardId: devex.boardId ?? '', agents: world.agents });
      const sort = { key: 'priority' as const, ascending: true };
      return vibes(ListView, {
        filters: noFilters(), boardId: devex.boardId ?? '', boardName: devex.name ?? '',
        groups: groupRows(rows, 'stage', sort, stageList, MEMBERS, world.agents),
        emptyStages: stageList.filter((s) => s.count === 0).map((s) => s.name),
        needsCount: rows.filter((r) => r.state.needsYou).length,
        groupBy: 'stage', sort, hasCards: true,
        stages: devex.stages.toSorted((a, b) => a.order - b.order).map((s) => ({ key: s.key, name: s.name })),
        onGroupBy: () => {}, onSort: () => {}, onSetSort: () => {}, onMove: async () => {}, onOpen: () => {}, onOpenMoveDialog: () => {},
      });
    },
  },
  {
    name: 'Projects',
    shows: PROJECTS[0].name,
    signature: HEAD('pj'),
    keys: PAGE,
    mount: async () => {
      const model = new ProjectsModel();
      await model.refresh();
      return vibes(ProjectsView, { model });
    },
  },
  { name: 'Spend', shows: 'model-standard', signature: HEAD('sp'), keys: PAGE, mount: () => vibes(SpendView, {}) },
  { name: 'Board log', shows: 'Board log', signature: [], keys: PAGE, mount: () => vibes(BoardLogView, { boardId: devex.boardId ?? '', events: LOG, error: null }) },
  ...CREW_TAB_IDS.map((tab): PageRow => ({
    name: `Crew · ${tab}`,
    shows: tab === 'agents' ? 'strategy-sam' : tab === 'people' ? 'Asha Rao' : 'diagnostics',
    signature: HEAD('crew'),
    keys: PAGE,
    mount: () => vibes(CrewView, { tab }),
  })),
  ...SETTINGS_TABS.map(({ id }): PageRow => ({
    name: `Settings · ${id}`,
    shows: id === 'labels' ? 'agentpod' : id === 'connections' ? 'Forge' : id === 'appearance' ? 'Vibe' : 'Sign out',
    signature: HEAD('set'),
    keys: PAGE,
    mount: () => vibes(SettingsView, { initial: id }),
  })),
  ...BOARD_SETTINGS_TABS.map(({ id }): PageRow => ({
    name: `Board settings · ${id}`,
    shows: BOARD_SHOWS[id],
    signature: HEAD('set'),
    keys: PAGE,
    mount: () => vibes(BoardSettingsView, { board: devex, onChanged: () => {}, initial: id }),
  })),
  // The card, on its three surfaces: one composition (§7 Card, §11.3), an empty signature rule.
  ...(['drawer', 'phone', 'page'] as const).map((surface): PageRow => ({
    name: `Card · ${surface}`,
    shows: 'Decide whether the roadmap',
    signature: [],
    // The card's footer is the end of its last block (Raw data), the same on all three surfaces.
    keys: keysText(CARD_KEYS),
    mount: async () => {
      app.board = planningLabelled;
      app.boardId = planningLabelled.boardId ?? null;
      app.labels = LABELS;
      app.members = MEMBERS;
      let model!: CardModel;
      stops.push($effect.root(() => {
        model = new CardModel(() => ({ boardId: planningLabelled.boardId ?? '', cardId: REVIEW_CARD, surface: surface === 'phone' ? 'drawer' : surface }));
      }));
      await waitFor(() => { if (!model.detailLoaded) throw new Error('the card detail is still loading'); }, { timeout: 2_000 });
      // The page surface is mounted through its route, so a keys line the route draws around CardView counts too.
      if (surface === 'page') {
        const roots = await vibes(CardPageRoute, {});
        await waitFor(() => { if (!roots.daylight.querySelector('[data-block="facts"]')) throw new Error('the card page is still loading'); }, { timeout: 2_000 });
        return roots;
      }
      return vibes(CardView, { model, surface, gate: model.gateBinding, question: model.questionBinding, pageHref: model.pageHref, boardHref: model.boardHref, onClose: () => {} });
    },
  })),
  {
    // A board with no live cards: what it does, and the way to write the first card.
    name: 'Board · empty',
    shows: 'No cards yet. Here is what this board does.',
    signature: [],
    keys: keysText(BOARD_KEYS),
    mount: () => {
      const empty: BoardSnapshot = { ...devex, cards: [] };
      return vibes(BoardEmpty, {
        model: buildBoardModel(empty, [], { agents: world.agents, members: MEMBERS, labels: labelMap, nowMs: REALISTIC_NOW_MS, me: ME, spend7d: undefined }),
        intro: empty.intro, me: ME, onCompose: () => {},
      });
    },
  },
];

// ── Setup ────────────────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: REALISTIC_NOW_MS });
  for (const f of Object.values(api)) f.mockReset();
  const boards: Record<string, BoardSnapshot> = Object.fromEntries(world.boards.map((b) => [b.boardId ?? '', b]));
  boards[REALISTIC_BOARD_IDS.devex] = devex;
  api.getBoard.mockImplementation(async (id: string) => boards[id]);
  api.getBoards.mockResolvedValue(world.boards.map((b) => ({ id: b.boardId, name: b.name })));
  api.getBoardEvents.mockResolvedValue(LOG);
  api.getNotifications.mockImplementation(async (id: string) => world.notifications[id] ?? []);
  api.getUsage.mockImplementation(async (id: string) => world.usage[id]);
  api.openBoardSocket.mockImplementation((boardId: string) => Object.assign(new EventTarget(), { boardId, close() {} }));
  api.listProjects.mockResolvedValue(PROJECTS);
  api.getProject.mockImplementation(async (id: string) => ({ project: PROJECTS.find((p) => p.id === id), milestones: [] }));
  api.getProjectRollup.mockImplementation(async (id: string) => ({
    projectId: id, cardsTotal: id === PROJECTS[0].id ? 9 : 4, cardsDone: id === PROJECTS[0].id ? 2 : 0, cardsOverdue: 0,
    costUsd: id === PROJECTS[0].id ? 6.4 : 0, computedAt: '2026-11-18T08:55:00Z', partial: false, boardsUnanswered: 0,
  }));
  api.getAgents.mockResolvedValue(world.agents);
  api.getCapabilities.mockResolvedValue(CAPS);
  api.getMembers.mockResolvedValue(MEMBERS);
  api.listLabels.mockResolvedValue(LABELS);
  api.getWorkspace.mockResolvedValue({ id: REALISTIC_TENANT, name: 'Realistic workspace', externalId: 'fleet_realistic' });
  api.getForgeHost.mockResolvedValue('forge.example.com');
  api.getHubPrincipals.mockResolvedValue([]);
  api.getProfiles.mockResolvedValue([]);
  const gates = planningLabelled.gates.filter((g) => g.cardId === REVIEW_CARD);
  api.getCardActivities.mockResolvedValue({ activities: [], handoff: { summary: gates[0]?.summary ?? null }, gates });
  api.getAttempts.mockResolvedValue([]);
  api.getEstimate.mockResolvedValue({ stageKey: 'decide', estimatedUsd: null, sampleSize: 0 });
  api.listLinks.mockResolvedValue({ links: [], externalLinks: [] });
  api.getComments.mockResolvedValue([]);
  api.getSchedules.mockResolvedValue([{ id: 'sch_rl_1', title: 'Weekly dependency check', rule: 'weekly on mon at 09:00', timezone: 'Asia/Kolkata', stageKey: 'reported', enabled: true, nextFireAt: null, lastFiredAt: null, createdBy: 'Asha Rao', skipCount: 0 }]);

  app.user = { userId: REALISTIC_USER, tenantId: REALISTIC_TENANT, name: 'Asha Rao' };
  app.boards = world.boards.map((b) => ({ id: b.boardId ?? '', name: b.name ?? '', cardCount: b.cards.length, needsYouCount: 0, lastActivityAt: null }));
  const asks = { [REALISTIC_BOARD_IDS.planning]: 13, [REALISTIC_BOARD_IDS.devex]: 3, [REALISTIC_BOARD_IDS.marketing]: 2 };
  app.attention = Object.entries(asks).flatMap(([boardId, n]) => Array.from({ length: n }, (_, i) => stale(boardId, i)));
  app.agents = world.agents;
  app.agentsLoaded = true;
  app.boardId = devex.boardId ?? null;
  app.board = devex;
  app.view = 'board';
  app.syncedAt = new Date(REALISTIC_NOW_MS - 60_000);
  app.boardsLoaded = true;
  app.boardsFailed = false;
  app.attentionSettled = true;
  liveUpdates.resume();
  crewLists.clear();
  workspaceCounts.value = { agents: world.agents.length, capabilities: CAPS.length, people: MEMBERS.length };
});

let roots: VibeRoots | null = null;
afterEach(() => {
  roots?.unmount();
  roots = null;
  cleanup();
  for (const stop of stops.splice(0)) stop();
  inboxScope.choose(null);
  app.board = null;
  app.boardId = null;
  app.boards = [];
  app.labels = [];
  app.members = [];
  app.attention = [];
  vi.useRealTimers();
});

// ── The guards, per page and vibe ────────────────────────────────────────────────────────────────

describe('composition guards on every page, in every vibe', () => {
  it('lists every page once', () => {
    expect(new Set(PAGES.map((p) => p.name)).size).toBe(PAGES.length);
  });

  for (const page of PAGES) {
    it(`${page.name}: the same tree in every vibe, and every guard passes`, async () => {
      const r = roots = await page.mount();
      const tree = parityTree(r.daylight);
      expect(tree, `${page.name} shows the realistic data`).toContain(page.shows);
      for (const v of VIBES) expect(parityTree(r[v]), `${page.name}: ${v} against daylight`).toBe(tree);
      const report = VIBES.map((v) => ({
        v,
        primaryPerRow: primaryActionsPerRow(r[v]),
        saidTwice: repeatedParagraphs(r[v]),
        rawIds: rawMachineText(r[v]),
        clipped: truncatedNames(r[v]),
        signature: signatureSize(r[v], page.signature),
        keys: page.keys === null ? [] : keysLine(r[v], page.keys),
      }));
      expect(report).toEqual(VIBES.map((v) => ({ v, primaryPerRow: [], saidTwice: [], rawIds: [], clipped: [], signature: [], keys: [] })));
      // A pending row is a tripwire: once the page has a keys line, its row must name the keys.
      expect(VIBES.filter((v) => r[v].querySelector('[aria-label="Keyboard"]') !== null), `${page.name}: the vibes with a keys line, which its row must name`).toEqual(page.keys === null ? [] : [...VIBES]);
    });
  }
});
