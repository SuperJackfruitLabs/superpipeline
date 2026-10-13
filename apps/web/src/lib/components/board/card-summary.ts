/**
 * The board, as one list every board layout reads (spec §3.5). Built once per snapshot.
 * Everything a tile or a list row shows today is here, so a layout cannot drop a fact by not
 * knowing about it: Paper, Studio and Quiet render CardFacts from this, Daylight's PdTile reads
 * the same helpers directly.
 */
import type { Mood } from '@superjackfruit/vibekit';
import type { AgentSummary, BoardSnapshot, Card, Member, Reference } from '$lib/api';
import { itemsFromBoard, type AttentionItem, type AttentionKind } from '$lib/components/attention/attention';
import { cardLead, moodFor, type CardLead } from '$lib/components/card/card-lead';
import { ageLong, ageShort, agoWords } from '$lib/age';
import { displayAgent, shortId } from '$lib/names';
import { blockedCountInStage, isHeld } from './board-counts';
import { enforcedBadge, type BlockedBadge } from './card-blocked';
import { childCountsByParent, childCounter, type ChildCounter } from './card-children';
import { overdue } from './card-due';
import { cardProvenance } from './card-provenance';
import { personInitials } from './board-words';
import { ownerLong, ownerShort, stageOwner, type StageOwnerLabel } from './stage-owner';

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
  /** Still waiting on a blocker (`isHeld`); a done card can show the badge and not be held. */
  held: boolean;
  children: ChildCounter | null;
  labels: Array<{ id: string; name: string; colour: string }>;
  moreLabels: number;
  firstRef: Reference | null;
  delegate: AgentRef | null;
  /** Set whenever an agent queued the card (the chip shows even when that agent's row is gone); `agent` is null then. */
  queuedBy: { name: string; agent: { id: string; iconUrl: string | null } | null } | null;
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
  createdAt: string;
  /** The person answerable for the card; `isMe` when that is the signed-in user. */
  owner: { id: string; name: string; initials: string; isMe: boolean };
  /** The agent of the card's most recent run, any status (`Card.lastAgentId`). Stopped cards have no delegate, so this is who speaks for them. */
  lastAgent: AgentRef | null;
  ageShort: string;
  ageLong: string;
  agoWords: string;
  /** Why it waits on you: the agent's detail verbatim, or for an unowned stage the attention instruction. */
  stopReason: string | null;
  /** The agent's own one-line summary of the stop (`needsHuman.summary`), verbatim. */
  summaryLine: string | null;
  /** Every label id on the card, resolvable or not (G8: a deleted label still counts toward "+N"). */
  labelsAll: number;
  kind: AttentionKind | null;
  /** The card sits in the board's last stage. */
  terminal: boolean;
  /** 1-based place in `BoardModel.ordered`; 0 outside a board model. */
  ix: number;
  /** Footnote number on the Studio board; 0 outside a board model. */
  fnNumber: number;
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
  /** 1-based position. */
  index: number;
  terminal: boolean;
  ownerLong: string;
  ownerShort: string;
  /** Agents declaring what the stage asks for, by name (empty for a human stage). */
  declaredBy: string[];
}

export interface SummaryContext {
  agents: AgentSummary[];
  members: Member[];
  labels: Map<string, { name: string; colour: string }>;
  nowMs: number;
  me?: { id: string; name: string; initials: string } | null;
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
    // An id with no catalogue entry (a deleted label) renders nothing but still counts toward "+N" (G8).
    const labels = c.labels.flatMap((id) => { const l = ctx.labels.get(id); return l ? [{ id, ...l }] : []; });
    const shown = labels.slice(0, 3);
    const since = c.stateSince ? Date.parse(c.stateSince) : Number.NaN;
    const hours = Number.isNaN(since) ? null : Math.max(0, (ctx.nowMs - since) / 3_600_000);
    const urgency = urgencyOf(c, att);
    const isMe = !!ctx.me && c.ownerUserId === ctx.me.id;
    const ownerName = isMe ? ctx.me!.name : ctx.members.find((m) => m.userId === c.ownerUserId)?.name ?? shortId(c.ownerUserId);
    const last = c.lastAgentId ? agentById.get(c.lastAgentId) : undefined;
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
      held: isHeld(c),
      children: childCounter(c.openChildCount, childCounts.get(c.id) ?? 0),
      labels: shown,
      moreLabels: Math.max(0, c.labels.length - shown.length),
      firstRef: board.references.find((r) => r.cardId === c.id) ?? null,
      delegate: c.delegateAgentId ? { id: c.delegateAgentId, name: displayAgent(c.delegateAgentId, ctx.agents), iconUrl: held?.iconUrl ?? null } : null,
      queuedBy: prov.byAgent ? { name: prov.queuedByName, agent: prov.agent ? { id: prov.agent.id, iconUrl: prov.agent.iconUrl ?? null } : null } : null,
      cost: c.costUsd,
      overBudget: c.overBudget,
      cardCap,
      costPct: cardCap && c.costUsd > 0 ? Math.min(100, Math.round((c.costUsd / cardCap) * 100)) : null,
      dueAt: c.dueAt,
      overdue: overdue(c.dueAt, c.state, today),
      gatePending: gate !== null,
      questionFrom: ask ? displayAgent(ask.agentId, ctx.agents) : null,
      attention: att,
      urgency,
      lead,
      mood: moodFor(lead.kind, !!c.delegateAgentId),
      attemptCount: c.attemptCount,
      stateSince: c.stateSince ?? null,
      ageHours: hours,
      createdAt: c.createdAt,
      owner: { id: c.ownerUserId, name: ownerName, initials: isMe ? ctx.me!.initials : personInitials(ownerName), isMe },
      // A run's agent that no longer exists is "an agent", not a short id.
      lastAgent: c.lastAgentId ? { id: c.lastAgentId, name: last?.name?.trim() || 'an agent', iconUrl: last?.iconUrl ?? null } : null,
      ageShort: ageShort(hours, urgency === 'done'),
      ageLong: ageLong(hours),
      agoWords: agoWords(hours, urgency === 'done'),
      stopReason: att ? (att.kind === 'no-owner' ? att.instruction : att.detail) : null,
      summaryLine: c.needsHuman?.summary ?? null,
      labelsAll: c.labels.length,
      kind: att?.kind ?? null,
      terminal: idx === stages.length - 1,
      ix: 0,
      fnNumber: 0,
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
    .map((s, i, all) => {
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
        index: i + 1,
        terminal: i === all.length - 1,
        ownerLong: ownerLong(s, agents),
        ownerShort: ownerShort(s, agents),
        declaredBy: stageOwner(s, agents).declaredBy,
      };
    });
}

/** The agents currently holding open cards, once each (a layout's "who is working" strip). */
export function crewOf(list: CardSummary[]): Array<AgentRef & { mood: Mood }> {
  const seen = new Map<string, AgentRef & { mood: Mood }>();
  for (const s of list) {
    if (s.delegate && !s.archived && s.urgency !== 'done' && s.urgency !== 'closed' && !seen.has(s.delegate.id)) seen.set(s.delegate.id, { ...s.delegate, mood: s.mood });
  }
  return [...seen.values()];
}
