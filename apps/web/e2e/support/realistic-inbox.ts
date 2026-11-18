// apps/web/e2e/support/realistic-inbox.ts — seeds `realisticWorkspace()` (src/lib/fixtures/realistic.ts)
// into the dev API, so a browser spec sees the same workspace a unit test does: three boards, 18 cards
// needing a person, 548 notifications.
//
// Through `POST /v1/dev/fixture`, not the seed.ts helpers: the public API stamps every card, run and
// notification with the time of the request, so it cannot write cards that have waited 30 hours,
// nor 548 notifications, nor the spend that puts one card over its cap. The import replaces the
// tenant `tnt_realistic`, so a second run leaves exactly the same workspace and no other spec's
// boards reach its Inbox.
import type { APIRequestContext, Page } from '@playwright/test';
import type { Card } from '../../src/lib/api';
import {
  realisticWorkspace, usageTokens, REALISTIC_CARD_CAP_USD, REALISTIC_MODEL, REALISTIC_NOW_MS, REALISTIC_TENANT, REALISTIC_USER,
} from '../../src/lib/fixtures/realistic';
import type { FixtureBoard, Row, World } from '../pixel/fixture/types';
import { API } from './seed';

const iso = (ms: number) => new Date(ms).toISOString();
const SETUP = '2026-09-01T00:00:00.000Z';

/** A DO `cards` row for a snapshot card. */
function cardRow(c: Card, extra: { handoff?: string | null; runId?: string | null }): Row {
  return {
    id: c.id, title: c.title, spec_json: '{}', owner_user_id: c.ownerUserId, current_stage_key: c.currentStageKey, state: c.state,
    priority: c.priority, context_id: `ctx_${c.id.slice(5)}`, delegate_agent_id: null, current_run_id: extra.runId ?? null,
    claim_seq: c.attemptCount, failure_count: 0, handoff_json: extra.handoff ?? null, created_at: c.createdAt, updated_at: c.stageSince,
    state_since: c.stageSince, stage_since: c.stageSince, queued_by: c.queuedBy, queued_by_agent_id: null, queued_grant: null,
    queued_grant_owner: null, labels: '[]', due_at: null, overdue_notified_at: null, archived_at: null, pending_advance_json: null,
    project_id: null, needs_human_json: c.needsHuman ? JSON.stringify(c.needsHuman) : null, milestone_id: null, completion_rework_json: null,
    auto_returns: 0, stale_notified_at: null, active_approval_subject_id: null,
  };
}

/** Where Request changes sends a card back: the stage before the gate's. */
const returnStage = (stages: Array<{ key: string; order: number }>, key: string): string => {
  const sorted = stages.toSorted((a, b) => a.order - b.order);
  return sorted[Math.max(0, sorted.findIndex((s) => s.key === key) - 1)]?.key ?? key;
};

/** The workspace as the fixture route takes it. */
export function realisticWorld(): World {
  const w = realisticWorkspace();
  const dos: Record<string, FixtureBoard> = {};
  for (const b of w.boards) {
    const id = b.boardId ?? '';
    const runs: Row[] = [];
    const usage: Row[] = [];
    const cards: Row[] = [];
    for (const c of b.cards) {
      const ask = b.elicitations.find((e) => e.cardId === c.id && e.status === 'pending');
      const gate = b.gates.find((g) => g.cardId === c.id && g.status === 'pending');
      // The question's run, and a working card's, still hold the card; every other run ended.
      const open = Boolean(ask) || c.state === 'working';
      const since = Date.parse(c.stageSince);
      let last: string | null = null;
      for (let i = 1; i <= c.attemptCount; i++) {
        const runId = `run_rl_${c.id.slice(8)}_${i}`;
        const live = open && i === c.attemptCount;
        const start = since - (c.attemptCount - i + 1) * 45 * 60_000;
        const end = i === c.attemptCount ? since : start + 30 * 60_000;
        runs.push({
          id: runId, card_id: c.id, stage_key: c.currentStageKey, agent_id: c.lastAgentId ?? '', lease_epoch: i, status: live ? 'working' : 'ended',
          outcome: live ? null : c.needsHuman && i === c.attemptCount ? 'blocked' : 'pass', last_heartbeat_ms: live ? REALISTIC_NOW_MS : end,
          started_at: iso(start), ended_at: live ? null : iso(end), profile_key: null, completion: null, handoff_json: null, failure_reason: null,
          queued_by: REALISTIC_USER, updated_at: iso(live ? since : end),
        });
        last = runId;
      }
      if (c.costUsd > 0) {
        const t = usageTokens(c.costUsd);
        usage.push({ run_id: last, card_id: c.id, agent_id: c.lastAgentId, model: REALISTIC_MODEL, input_tokens: t.inputTokens, output_tokens: t.outputTokens, cost_usd: c.costUsd, estimated: 0, ts: c.stageSince });
      }
      cards.push(cardRow(c, { handoff: gate?.summary ? JSON.stringify({ summary: gate.summary }) : null, runId: open ? last : null }));
    }
    dos[id] = {
      meta: { staleEnabled: b.stale?.enabled === false ? '0' : '1', staleAfterHours: String(b.stale?.afterHours ?? 24), budgetCardUsdCap: String(REALISTIC_CARD_CAP_USD) },
      cards, runs, usage, activities: [], events: [], approvalSubjects: [], references: [], links: [], comments: [],
      gates: b.gates.map((g) => ({
        id: g.id, card_id: g.cardId, stage_key: g.stageKey, return_stage_key: returnStage(b.stages, g.stageKey), status: g.status, decision: null, comment: null,
        produced_by: g.producedBy, decided_by: null, decided_via: null, options_json: JSON.stringify(g.options), created_at: b.cards.find((c) => c.id === g.cardId)?.stageSince ?? SETUP,
        resolved_at: null, run_id: runs.filter((r) => r.card_id === g.cardId).at(-1)?.id ?? null, approval_subject_id: null, approval_subject_digest: null, approval_decider_ids_json: null,
      })),
      elicitations: b.elicitations.map((e) => ({
        id: e.id, card_id: e.cardId, run_id: e.runId, stage_key: e.stageKey, agent_id: e.agentId, question: e.question, signal: e.signal,
        options_json: JSON.stringify(e.options), status: e.status, answer_option: null, answer_text: null, answered_by: null, created_at: e.createdAt, answered_at: null,
      })),
      notifications: (w.notifications[id] ?? []).map((n) => ({ kind: n.kind, card_id: n.cardId, user_id: REALISTIC_USER, body: n.body, read: n.read ? 1 as const : 0 as const, created_at: n.createdAt })),
    };
  }
  const caps = [...new Set(w.agents.flatMap((a) => a.capabilities))].toSorted((a, b) => a.localeCompare(b));
  return {
    tenant: { id: REALISTIC_TENANT, slug: 'realistic-fixture', name: 'Realistic workspace', forgeHost: null, externalId: null, externalSource: null, createdAt: SETUP },
    user: { id: REALISTIC_USER, email: 'owner@realistic-fixture.invalid', name: 'Asha Rao', createdAt: SETUP },
    membership: { id: 'mbr_rl_owner', role: 'owner', createdAt: SETUP },
    boards: w.boards.map((b) => ({
      id: b.boardId ?? '', name: b.name ?? '', stages: b.stages, createdAt: SETUP, createdBy: REALISTIC_USER,
      updatedAt: b.cards.map((c) => c.stageSince).toSorted((x, y) => x.localeCompare(y)).at(-1) ?? SETUP,
    })),
    agents: w.agents.map((a, i) => ({
      id: a.id, name: a.name, capabilities: a.capabilities, externalId: a.externalId ?? a.id, ownerUserId: REALISTIC_USER, mayQueueTo: null,
      createdAt: iso(Date.parse(SETUP) + (i + 1) * 60_000), tokens: a.tokenIds.length, role: a.role,
    })),
    capabilities: caps.map((key, i) => ({ key, description: null, origin: 'declared' as const, createdAt: iso(Date.parse(SETUP) + i * 60_000) })),
    implications: [], labels: [], projects: [], milestones: [], externalLinks: [],
    dos,
  };
}

/** Replace the `tnt_realistic` tenant with the realistic workspace. Returns its board ids, in fixture order. */
export async function seedRealistic(request: APIRequestContext): Promise<{ boardIds: string[] }> {
  const world = realisticWorld();
  const res = await request.post(`${API}/v1/dev/fixture`, { data: world, headers: { 'Content-Type': 'application/json' } });
  if (!res.ok()) throw new Error(`realistic fixture import failed: ${res.status()} ${await res.text()}`);
  return { boardIds: world.boards.map((b) => b.id) };
}

/** Sign the page in as the realistic workspace's owner, before any page script runs. */
export async function useRealistic(page: Page, boardId?: string): Promise<void> {
  await page.addInitScript(([t, u, b]) => {
    localStorage.setItem('superpipeline.devTenant', t);
    localStorage.setItem('superpipeline.devUser', u);
    if (b) localStorage.setItem('superpipeline.boardId', b);
  }, [REALISTIC_TENANT, REALISTIC_USER, boardId ?? ''] as const);
}
