// apps/web/src/lib/components/board/board-model.ts
/**
 * The board, once, for every layout (spec SB §2). PlanView builds it from the snapshot and the
 * filtered cards; a layout never re-derives what is here, so the four vibes cannot disagree about
 * which card needs you, which comes first, or what a stage is called.
 */
import type { BoardSnapshot, Card, Stage } from '$lib/api';
import type { AttentionItem } from '$lib/components/attention/attention';
import { stageSummaries, summarize, type AgentRef, type CardSummary, type StageSummary, type SummaryContext, type Urgency } from './card-summary';

export interface Me { id: string; name: string; initials: string }
export interface BoardContext extends SummaryContext { me: Me | null; spend7d: number | null }

/** One small square per card, in the Studio multiples and the share bar. */
export type Unit = 'needs' | 'blocked' | 'queued' | 'working' | 'done' | 'off';
const UNIT_ORDER: readonly Unit[] = ['needs', 'blocked', 'queued', 'working', 'done', 'off'];
export type BoardStage = StageSummary & { units: Unit[] };

export interface BoardModel {
  boardId: string;
  boardName: string;
  /** Non-archived, filtered cards, in the API's order. */
  cards: CardSummary[];
  /** People needed first (plan ruling X-1). */
  ordered: CardSummary[];
  stages: BoardStage[];
  /** The board's stage definitions, in order (what CardMoveMenu takes). */
  stageDefs: Stage[];
  needs: CardSummary[];
  working: CardSummary[];
  queued: CardSummary[];
  done: CardSummary[];
  closed: CardSummary[];
  counts: { all: number; needs: number; working: number; queued: number; queuedBlocked: number; done: number; closed: number; overdue: number; overBudget: number; blocked: number };
  spend7d: number | null;
  /** The clock the model was built at (ages, "five days overdue"). */
  nowMs: number;
  attention: AttentionItem[];
  /** The agents of the needs cards, once each, in `ordered` order (Daylight "Holding cards"). */
  holders: AgentRef[];
  fn: { spend: number };
}

const RANK: Record<Urgency, number> = { needs: 0, working: 1, queued: 2, done: 3, closed: 4 };

/** Needs first, then working, queued, done, closed; inside each group the oldest card first. */
export function orderForBoard(cards: CardSummary[]): CardSummary[] {
  return [...cards].sort((a, b) => RANK[a.urgency] - RANK[b.urgency] || Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));
}

export function unitOf(s: CardSummary): Unit {
  if (s.urgency === 'needs') return 'needs';
  if (s.urgency === 'queued') return s.held ? 'blocked' : 'queued';
  if (s.urgency === 'working') return 'working';
  if (s.urgency === 'done') return 'done';
  return 'off';
}

export function buildBoardModel(board: BoardSnapshot, filteredCards: Card[], ctx: BoardContext): BoardModel {
  const live = filteredCards.filter((c) => c.archivedAt === null);
  const cards = summarize(board, live, ctx);

  // Footnotes: each needs card its own number; each other group one shared number; spend last.
  const sorted = orderForBoard(cards);
  const fnOf = new Map<string, number>();
  let n = 0;
  for (const s of sorted) if (s.urgency === 'needs') fnOf.set(s.id, ++n);
  const shared: CardSummary[][] = [
    sorted.filter((s) => s.urgency === 'working'),
    sorted.filter((s) => s.urgency === 'queued' && s.held),
    sorted.filter((s) => s.urgency === 'queued' && !s.held),
    sorted.filter((s) => s.urgency === 'done'),
    sorted.filter((s) => s.urgency === 'closed'),
  ];
  for (const g of shared) if (g.length) { n += 1; for (const s of g) fnOf.set(s.id, n); }

  const ordered = sorted.map((s, i) => ({ ...s, ix: i + 1, fnNumber: fnOf.get(s.id) ?? 0 }));
  const byId = new Map(ordered.map((s) => [s.id, s]));
  const inApiOrder = cards.map((s) => byId.get(s.id)!);
  const group = (u: Urgency) => ordered.filter((s) => s.urgency === u);

  const stages: BoardStage[] = stageSummaries(board, live, ctx.agents).map((st) => ({
    ...st,
    units: ordered.filter((s) => s.stageKey === st.key).map(unitOf).sort((a, b) => UNIT_ORDER.indexOf(a) - UNIT_ORDER.indexOf(b)),
  }));

  const needs = group('needs');
  const holders: AgentRef[] = [];
  for (const s of needs) if (s.lastAgent && !holders.some((h) => h.id === s.lastAgent!.id)) holders.push(s.lastAgent);

  const queued = group('queued');
  return {
    boardId: board.boardId ?? '',
    boardName: board.name ?? '',
    cards: inApiOrder,
    ordered,
    stages,
    stageDefs: [...board.stages].sort((a, b) => a.order - b.order),
    needs,
    working: group('working'),
    queued,
    done: group('done'),
    closed: group('closed'),
    counts: {
      all: ordered.length,
      needs: needs.length,
      working: group('working').length,
      queued: queued.length,
      queuedBlocked: queued.filter((s) => s.held).length,
      done: group('done').length,
      closed: group('closed').length,
      overdue: ordered.filter((s) => s.overdue).length,
      overBudget: ordered.filter((s) => s.overBudget).length,
      blocked: ordered.filter((s) => s.held).length,
    },
    spend7d: ctx.spend7d,
    nowMs: ctx.nowMs,
    attention: ordered.flatMap((s) => (s.attention ? [s.attention] : [])),
    holders,
    fn: { spend: n + 1 },
  };
}
