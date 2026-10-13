// apps/web/src/lib/components/operate/operate-data.ts
/** The lists Operate draws, built from the board snapshot. Pure: every vibe reads the same rows. */
import type { AgentSummary, BoardSnapshot, BoardUsage, Notification, Stage, UsageSummary } from '$lib/api';
import type { AttentionItem } from '$lib/components/attention/attention';
import { overdue } from '$lib/components/board/card-due';
import { displayAgent } from '$lib/names';
import { CAP_ERROR } from './operate-words';
import type { ActivityGroup, NeedRow, RunningRow, SpendView } from './layouts/types';

const byOrder = (stages: Stage[]): Stage[] => [...stages].sort((a, b) => a.order - b.order);

export function needRows(board: BoardSnapshot, agents: AgentSummary[], items: AttentionItem[], nowMs: number): NeedRow[] {
  const stages = byOrder(board.stages);
  const today = new Date(nowMs).toISOString().slice(0, 10);
  return items.flatMap((item) => {
    const card = board.cards.find((c) => c.id === item.cardId);
    const idx = stages.findIndex((s) => s.key === item.stageKey);
    if (!card || idx < 0) return [];
    // A card in a stage nothing claims is unclaimed, whoever last touched it.
    const agentId = item.kind === 'no-owner' ? null : (card.delegateAgentId ?? card.lastAgentId ?? null);
    return [{
      item, card, stage: stages[idx]!, stageIndex: idx + 1,
      agentName: agentId ? displayAgent(agentId, agents) : null,
      iconUrl: agentId ? (agents.find((a) => a.id === agentId)?.iconUrl ?? null) : null,
      actions: item.actions,
      overdue: overdue(card.dueAt, card.state, today),
    }];
  });
}

/** The agents waiting on you, once each, in row order (Daylight's crew). */
export function crewOf(rows: NeedRow[]): Array<{ name: string; iconUrl: string | null }> {
  const seen = new Map<string, { name: string; iconUrl: string | null }>();
  for (const r of rows) if (r.agentName && !seen.has(r.agentName)) seen.set(r.agentName, { name: r.agentName, iconUrl: r.iconUrl });
  return [...seen.values()];
}

export function activityGroups(notifications: Notification[], showRead: boolean, needs: NeedRow[], board: BoardSnapshot, agents: AgentSummary[]): ActivityGroup[] {
  const shown = showRead ? notifications : notifications.filter((n) => !n.read);
  const byCard = new Map<string, Notification[]>();
  for (const n of shown) {
    const list = byCard.get(n.cardId);
    if (list) list.push(n);
    else byCard.set(n.cardId, [n]);
  }
  const groups = [...byCard.entries()].map(([cardId, list]): ActivityGroup => {
    const sorted = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.seq - a.seq);
    const card = board.cards.find((c) => c.id === cardId);
    const need = needs.find((r) => r.item.cardId === cardId) ?? null;
    const agentId = need ? (need.agentName ? (card?.delegateAgentId ?? card?.lastAgentId ?? null) : null) : (card?.delegateAgentId ?? card?.lastAgentId ?? null);
    return {
      cardId, title: card?.title ?? cardId,
      agentName: agentId ? displayAgent(agentId, agents) : null,
      iconUrl: agentId ? (agents.find((a) => a.id === agentId)?.iconUrl ?? null) : null,
      latest: sorted[0]!, earlier: sorted.slice(1), need,
    };
  });
  return groups.sort((a, b) => b.latest.createdAt.localeCompare(a.latest.createdAt));
}

export function runningRows(board: BoardSnapshot, agents: AgentSummary[]): RunningRow[] {
  return board.cards
    .filter((c) => c.state === 'working' && !c.archivedAt)
    .map((c) => {
      const agentId = c.delegateAgentId ?? null;
      return {
        cardId: c.id, title: c.title,
        stageName: board.stages.find((s) => s.key === c.currentStageKey)?.name ?? c.currentStageKey,
        agentName: agentId ? displayAgent(agentId, agents) : null,
        iconUrl: agentId ? (agents.find((a) => a.id === agentId)?.iconUrl ?? null) : null,
        costUsd: c.costUsd,
      };
    });
}

export function spendView(usage: UsageSummary | null, caps: BoardUsage | null, agents: AgentSummary[]): SpendView {
  const total = usage?.totalCostUsd ?? 0;
  const cap = caps?.budgetUsd ?? null;
  return {
    total, cap, cardCap: caps?.cardUsdCap ?? null, overBudget: caps?.overBudget ?? false,
    pct: cap && cap > 0 ? Math.min(100, Math.round((total / cap) * 100)) : null,
    top: (usage?.byAgent ?? [])
      .filter((a) => a.costUsd > 0)
      .sort((a, b) => b.costUsd - a.costUsd)
      .slice(0, 5)
      .map((a) => ({ name: displayAgent(a.agentId, agents), costUsd: a.costUsd })),
  };
}

/** Where an unclaimed card can go: stages an agent works, the current one left out (OP-G6). */
export function moveTargets(stages: Stage[], currentKey: string): Stage[] {
  return byOrder(stages).filter((s) => s.key !== currentKey && (s.ownerKind === 'capability' || s.ownerKind === 'agent'));
}

export function parseCap(text: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = text.trim();
  if (t === '') return { ok: true, value: null };
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? { ok: true, value: n } : { ok: false, error: CAP_ERROR };
}
