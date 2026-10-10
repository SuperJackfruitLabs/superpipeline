/**
 * The board, as one list every board layout reads (spec §3.5). Built once per snapshot.
 * Everything a tile or a list row shows today is here, so a layout cannot drop a fact by not
 * knowing about it: Paper, Studio and Quiet render CardFacts from this, Daylight's CardTile reads
 * the same helpers directly.
 */
import type { Mood } from '@superjackfruit/vibekit';
import type { AgentSummary, BoardSnapshot, Card, Member, Reference } from '$lib/api';
import { itemsFromBoard, type AttentionItem } from '$lib/components/attention/attention';
import { cardLead, moodFor, type CardLead } from '$lib/components/card/card-lead';
import { displayAgent } from '$lib/names';
import { blockedCountInStage } from './board-counts';
import { enforcedBadge, type BlockedBadge } from './card-blocked';
import { childCountsByParent, childCounter, type ChildCounter } from './card-children';
import { overdue } from './card-due';
import { cardProvenance } from './card-provenance';
import { stageOwner, type StageOwnerLabel } from './stage-owner';

export type Urgency = 'needs' | 'working' | 'queued' | 'done' | 'closed';
export const URGENCY_ORDER: readonly Urgency[] = ['needs', 'working', 'queued', 'done', 'closed'];

export interface AgentRef { id: string; name: string; iconUrl: string | null }

export interface CardSummary {
  card: Card;
  id: string;
  title: string;
  stageKey: string;
  stageName: string;
  stageIndex: number;
  stageCount: number;
  state: string;
  priority: number;
  live: boolean;
  archived: boolean;
  blocked: BlockedBadge | null;
  children: ChildCounter | null;
  labels: Array<{ id: string; name: string; colour: string }>;
  moreLabels: number;
  firstRef: Reference | null;
  delegate: AgentRef | null;
  queuedBy: AgentRef | null;
  cost: number;
  overBudget: boolean;
  cardCap: number | null;
  costPct: number | null;
  dueAt: string | null;
  overdue: boolean;
  gatePending: boolean;
  questionFrom: string | null;
  attention: AttentionItem | null;
  urgency: Urgency;
  lead: CardLead;
  mood: Mood;
  attemptCount: number;
  stateSince: string | null;
  ageHours: number | null;
}

export interface StageSummary {
  key: string;
  name: string;
  order: number;
  count: number;
  wipLimit: number | null;
  atLimit: boolean;
  blocked: number;
  gate: boolean;
  manager: boolean;
  owner: StageOwnerLabel;
  empty: boolean;
}

export interface SummaryContext {
  agents: AgentSummary[];
  members: Member[];
  labels: Map<string, { name: string; colour: string }>;
  nowMs: number;
}

export function urgencyOf(card: Card, attention: AttentionItem | null): Urgency {
  if (attention) return 'needs';
  if (card.state === 'working') return 'working';
  if (card.state === 'completed') return 'done';
  if (card.state === 'canceled' || card.state === 'rejected') return 'closed';
  return 'queued';
}

export function summarize(board: BoardSnapshot, cards: Card[], ctx: SummaryContext): CardSummary[] {
  const stages = [...board.stages].sort((a, b) => a.order - b.order);
  const childCounts = childCountsByParent(board.cards);
  const attention = new Map(itemsFromBoard(board, ctx.agents, ctx.nowMs).map((a) => [a.cardId, a]));
  const today = new Date(ctx.nowMs).toISOString().slice(0, 10);
  const agentById = new Map(ctx.agents.map((a) => [a.id, a]));
  const cap = board.usage?.cardUsdCap ?? null;
  const cardCap = cap && cap > 0 ? cap : null;

  return cards.map((c) => {
    const gate = board.gates.find((g) => g.cardId === c.id && g.status === 'pending') ?? null;
    const ask = board.elicitations.find((e) => e.cardId === c.id && e.status === 'pending') ?? null;
    const idx = stages.findIndex((s) => s.key === c.currentStageKey);
    const att = attention.get(c.id) ?? null;
    const lead = cardLead({ card: c, gate, elicitation: ask });
    const held = c.delegateAgentId ? agentById.get(c.delegateAgentId) : undefined;
    const prov = cardProvenance(c, ctx.members, ctx.agents);
    const labels = c.labels.map((id) => ({ id, ...(ctx.labels.get(id) ?? { name: id, colour: '' }) }));
    const since = c.stateSince ? Date.parse(c.stateSince) : Number.NaN;
    return {
      card: c,
      id: c.id,
      title: c.title,
      stageKey: c.currentStageKey,
      stageName: stages[idx]?.name ?? c.currentStageKey,
      stageIndex: Math.max(0, idx),
      stageCount: stages.length,
      state: c.state,
      priority: c.priority,
      live: c.state === 'working',
      archived: c.archivedAt !== null,
      blocked: enforcedBadge(c.blockedBy),
      children: childCounter(c.openChildCount, childCounts.get(c.id) ?? 0),
      labels: labels.slice(0, 3),
      moreLabels: Math.max(0, labels.length - 3),
      firstRef: board.references.find((r) => r.cardId === c.id) ?? null,
      delegate: c.delegateAgentId ? { id: c.delegateAgentId, name: displayAgent(c.delegateAgentId, ctx.agents), iconUrl: held?.iconUrl ?? null } : null,
      queuedBy: prov.known && prov.byAgent && prov.agent ? { id: prov.agent.id, name: prov.queuedByName, iconUrl: prov.agent.iconUrl } : null,
      cost: c.costUsd,
      overBudget: c.overBudget,
      cardCap,
      costPct: cardCap && c.costUsd > 0 ? Math.min(100, Math.round((c.costUsd / cardCap) * 100)) : null,
      dueAt: c.dueAt,
      overdue: overdue(c.dueAt, c.state, today),
      gatePending: gate !== null,
      questionFrom: ask ? displayAgent(ask.agentId, ctx.agents) : null,
      attention: att,
      urgency: urgencyOf(c, att),
      lead,
      mood: moodFor(lead.kind, !!c.delegateAgentId),
      attemptCount: c.attemptCount,
      stateSince: c.stateSince ?? null,
      ageHours: Number.isNaN(since) ? null : Math.max(0, (ctx.nowMs - since) / 3_600_000),
    };
  });
}

const rank = (p: number) => (p > 0 ? p : Number.MAX_SAFE_INTEGER);

/** Every group, even an empty one: a layout says "None." rather than silently skipping it. */
export function groupByUrgency(list: CardSummary[]): Array<{ urgency: Urgency; cards: CardSummary[] }> {
  return URGENCY_ORDER.map((urgency) => ({
    urgency,
    cards: list
      .filter((s) => s.urgency === urgency)
      .sort((a, b) => rank(a.priority) - rank(b.priority) || (b.ageHours ?? -1) - (a.ageHours ?? -1) || a.title.localeCompare(b.title)),
  }));
}

export function stageSummaries(board: BoardSnapshot, cards: Card[], agents: AgentSummary[]): StageSummary[] {
  return [...board.stages]
    .sort((a, b) => a.order - b.order)
    .map((s) => {
      const here = cards.filter((c) => c.currentStageKey === s.key);
      const wip = s.wipLimit ?? null;
      return {
        key: s.key,
        name: s.name,
        order: s.order,
        count: here.length,
        wipLimit: wip,
        atLimit: wip !== null && here.length >= wip,
        blocked: blockedCountInStage(here),
        gate: s.gate === 'approval',
        manager: s.routing === 'manager',
        owner: stageOwner(s, agents),
        empty: here.length === 0,
      };
    });
}
