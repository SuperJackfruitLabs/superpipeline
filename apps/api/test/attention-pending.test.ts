/**
 * A waiting card reaches chat (charter: decisions/2026-11-08-waiting-cards-and-broker-approvals-
 * reach-chat.md, decisions 1–2).
 *
 * A card that parks for a person for a reason other than a question or a review — blocked by its
 * agent, tripped by the breaker, refused dispatch — is pushed as `attention.pending` and read back
 * by a sweep for as long as the same wait stands. Each wait has its own id; resume and archive take
 * the id the person answered and refuse `WAIT_CHANGED` once that wait has ended.
 */
import { SELF, env, runInDurableObject } from 'cloudflare:test';
import { boardStub as stubFor } from './approval-subject-fixtures';
import { beforeAll, describe, expect, it } from 'vitest';
import { setupCatalog } from './helpers/catalog';
import { createAgent, createAgentToken } from '../src/db/catalog';
import type { BoardDO, BoardInit, CardView } from '../src/board/board-do';
import { ATTENTION_INPUT_MAX } from '../src/board/attention';
import { requiredScope, SCOPE_FORBIDDEN } from '../src/auth/scopes';

beforeAll(setupCatalog);

const HOOK = 'https://hub.example/api/bridge/superpipeline/push';
const STAGES: BoardInit['stages'] = [
  { key: 'plan', name: 'Plan', order: 0, ownerKind: 'capability', owner: 'plan' },
  { key: 'build', name: 'Build', order: 1, ownerKind: 'capability', owner: 'build' },
  { key: 'review', name: 'Review', order: 2, ownerKind: 'human', gate: 'approval' },
  { key: 'done', name: 'Done', order: 3, ownerKind: 'human' },
];
const PLANNER = { agentId: 'agt_p', capabilities: ['plan'] };
const BUILDER = { agentId: 'agt_b', capabilities: ['build'] };
const PERSON = { id: 'usr_lead', name: 'Lead' };
const INPUT = { kind: 'text', label: 'What should the next attempt do?', required: true, maxLength: ATTENTION_INPUT_MAX };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** A string at `path` in a parsed body, or the test fails saying which. */
function textAt(v: unknown, ...path: Array<string | number>): string {
  let at: unknown = v;
  for (const k of path) at = Array.isArray(at) && typeof k === 'number' ? at[k] : isRecord(at) && typeof k === 'string' ? at[k] : undefined;
  if (typeof at !== 'string') throw new Error(`expected a string at ${path.join('.')}`);
  return at;
}

const base = 'https://api.test';
const human = (tenantId: string) => ({ 'X-Tenant-Id': tenantId, 'X-User-Id': 'usr_lead', 'Content-Type': 'application/json' });

async function attentionPushes(b: BoardDO): Promise<Record<string, unknown>[]> {
  const bodies: unknown[] = (await b.getPushDeliveries()).map((d) => JSON.parse(d.body));
  return bodies.filter((x): x is Record<string, unknown> => isRecord(x) && x.event === 'attention.pending');
}

async function setUp(b: BoardDO, id: string, events = ['attention.pending']): Promise<string> {
  await b.init({ id, tenantId: 'tnt_attention', name: 'Attention board', stages: STAGES });
  await b.registerPushConfig({ agentId: 'agt_bridge', url: HOOK, token: 's', events });
  const created = await b.createCard({ title: 'Add login', ownerUserId: 'usr_owner' });
  if (!created.ok) throw new Error(created.message);
  return created.value.id;
}

/** Plan done, then the build agent blocks. */
async function blockAtBuild(b: BoardDO, reason = 'the staging database is down', summary?: string): Promise<void> {
  const p = await b.claim(PLANNER);
  if (!p.claimed) throw new Error('expected plan claim');
  await b.complete({ runId: p.runId, leaseEpoch: p.leaseEpoch, handoff: { plan: 'use the session table' } });
  const c = await b.claim(BUILDER);
  if (!c.claimed) throw new Error('expected build claim');
  await b.block({ runId: c.runId, leaseEpoch: c.leaseEpoch, reason, ...(summary ? { summary } : {}) });
}

async function read(b: BoardDO, cardId: string): Promise<CardView> {
  const r = await b.getCardView(cardId);
  if (!r.ok) throw new Error(r.message);
  return r.value;
}

async function waitOf(b: BoardDO): Promise<string> {
  const [first] = await b.pendingAttention();
  if (!first) throw new Error('expected a waiting card');
  return first.waitId;
}

describe('attention.pending — a waiting card reaches chat', () => {
  it('is pushed when an agent blocks, with the card, stage, reason, wait id and the options; the sweep reads the same body', async () => {
    await runInDurableObject(stubFor('att-blocked'), async (b: BoardDO) => {
      const cardId = await setUp(b, 'brd_att_blocked');
      await blockAtBuild(b, 'the staging database is down', 'Staging DB down');

      const pushes = await attentionPushes(b);
      expect(pushes).toHaveLength(1);
      const [push] = pushes;
      expect(push).toEqual({
        event: 'attention.pending',
        boardId: 'brd_att_blocked',
        boardName: 'Attention board',
        cardId,
        cardTitle: 'Add login',
        stageKey: 'build',
        stageName: 'Build',
        waitId: expect.stringMatching(/^wait_[0-9a-f]{16}$/),
        reason: 'blocked',
        detail: 'the staging database is down',
        summary: 'Staging DB down',
        failureCount: null,
        earlierStages: [{ key: 'plan', name: 'Plan' }],
        options: [
          { id: 'resume_here', label: 'Resume here', meaning: 'approve', needsComment: false, input: INPUT },
          { id: 'resume_at:plan', label: 'Resume at Plan', meaning: 'choose', needsComment: false, input: INPUT },
          { id: 'archive', label: 'Archive', meaning: 'reject', needsComment: false },
        ],
        ts: expect.any(String),
      });
      expect(await b.pendingAttention()).toEqual(pushes);
    });
  });

  it('carries the failure count when the breaker trips', async () => {
    await runInDurableObject(stubFor('att-breaker'), async (b: BoardDO) => {
      await setUp(b, 'brd_att_breaker');
      for (let i = 0; i < 2; i++) {
        const c = await b.claim(PLANNER);
        if (!c.claimed) throw new Error('expected claim');
        await b.fail({ runId: c.runId, leaseEpoch: c.leaseEpoch, reason: 'flaky' });
      }
      const [push] = await attentionPushes(b);
      expect(push).toMatchObject({ reason: 'repeated-failure', failureCount: 2, detail: 'flaky', stageKey: 'plan', earlierStages: [] });
      // No earlier stage, so only resume here and archive.
      expect(push?.options).toEqual([
        { id: 'resume_here', label: 'Resume here', meaning: 'approve', needsComment: false, input: INPUT },
        { id: 'archive', label: 'Archive', meaning: 'reject', needsComment: false },
      ]);
    });
  });

  it('is pushed when dispatch is refused (not-authorised)', async () => {
    Reflect.set(env, 'ENFORCE_CONTROL_PAIR', 'true');
    try {
      await runInDurableObject(stubFor('att-notauth'), async (b: BoardDO) => {
        await setUp(b, 'brd_att_notauth');
        expect((await b.claim({ ...PLANNER, principalId: null })).claimed).toBe(false);
        const [push] = await attentionPushes(b);
        expect(push).toMatchObject({ reason: 'not-authorised', stageKey: 'plan' });
      });
    } finally {
      Reflect.deleteProperty(env, 'ENFORCE_CONTROL_PAIR');
    }
  });

  it('is not pushed or listed for a question or a review, which already reach chat', async () => {
    await runInDurableObject(stubFor('att-quiet'), async (b: BoardDO) => {
      await setUp(b, 'brd_att_quiet');
      const p = await b.claim(PLANNER);
      if (!p.claimed) throw new Error('expected claim');
      await b.postActivity({ runId: p.runId, leaseEpoch: p.leaseEpoch, type: 'elicitation', body: 'Which table?', signal: 'select', parameter: { options: ['a', 'b'] } });
      expect((await b.getState()).cards[0]?.needsHuman?.reason).toBe('question');
      expect(await attentionPushes(b)).toEqual([]);
      expect(await b.pendingAttention()).toEqual([]);

      await b.submitForReview({ runId: p.runId, leaseEpoch: p.leaseEpoch });
      expect((await b.getState()).cards[0]?.needsHuman?.reason).toBe('review');
      expect(await attentionPushes(b)).toEqual([]);
      expect(await b.pendingAttention()).toEqual([]);
    });
  });

  it('is not pushed to a config that did not subscribe to it, and the sweep does not need one', async () => {
    await runInDurableObject(stubFor('att-unsub'), async (b: BoardDO) => {
      await setUp(b, 'brd_att_unsub', ['gate.pending']);
      await blockAtBuild(b);
      expect(await attentionPushes(b)).toEqual([]);
      expect(await b.pendingAttention()).toHaveLength(1);
    });
  });

  it('gives every wait its own id and stops listing a wait once it ends', async () => {
    await runInDurableObject(stubFor('att-waits'), async (b: BoardDO) => {
      const cardId = await setUp(b, 'brd_att_waits');
      await blockAtBuild(b);
      const first = await waitOf(b);

      const resumed = await b.resumeCard({ cardId, comment: 'Staging is back.', actor: PERSON, expectedWaitId: first });
      expect(resumed.ok).toBe(true);
      expect(await b.pendingAttention()).toEqual([]);

      const c = await b.claim(BUILDER);
      if (!c.claimed) throw new Error('expected claim');
      await b.block({ runId: c.runId, leaseEpoch: c.leaseEpoch, reason: 'the staging database is down' });
      const second = await waitOf(b);
      expect(second).not.toBe(first);
      expect((await attentionPushes(b)).map((p) => p.waitId)).toEqual([first, second]);
    });
  });

  it('changes the wait id when the reason changes, and clears it when the wait ends', async () => {
    await runInDurableObject(stubFor('att-wait-ids'), async (b: BoardDO, state) => {
      const cardId = await setUp(b, 'brd_att_wait_ids');
      const stored = () => state.storage.sql.exec(`SELECT needs_human_id FROM cards WHERE id = ?`, cardId).one().needs_human_id;
      const p = await b.claim(PLANNER);
      if (!p.claimed) throw new Error('expected claim');
      await b.postActivity({ runId: p.runId, leaseEpoch: p.leaseEpoch, type: 'elicitation', body: 'Which table?', signal: 'select', parameter: { options: ['a', 'b'] } });
      const asking = stored();
      expect(asking).toEqual(expect.stringMatching(/^wait_[0-9a-f]{16}$/));
      // The agent blocks instead of waiting for the answer: a different wait.
      await b.block({ runId: p.runId, leaseEpoch: p.leaseEpoch, reason: 'gave up waiting' });
      const blocked = await waitOf(b);
      expect(blocked).not.toBe(asking);
      expect(stored()).toBe(blocked);

      await b.resumeCard({ cardId, comment: 'Use table a.', actor: PERSON });
      expect(stored()).toBeNull();
    });
  });

  it('ends the wait when the card is moved or archived, without pushing a wait for an archived card', async () => {
    await runInDurableObject(stubFor('att-moved'), async (b: BoardDO) => {
      const cardId = await setUp(b, 'brd_att_moved');
      await blockAtBuild(b);
      expect(await b.moveCard(cardId, 'plan', 'usr_lead')).toMatchObject({ ok: true });
      expect(await b.pendingAttention()).toEqual([]);
    });
    await runInDurableObject(stubFor('att-archived'), async (b: BoardDO) => {
      const cardId = await setUp(b, 'brd_att_archived');
      const p = await b.claim(PLANNER);
      if (!p.claimed) throw new Error('expected claim');
      await b.submitForReview({ runId: p.runId, leaseEpoch: p.leaseEpoch });
      // Archiving cancels the review and records the card as blocked; it waits on nobody.
      await b.updateCard(cardId, { archivedAt: new Date().toISOString() });
      expect((await read(b, cardId)).needsHuman?.reason).toBe('blocked');
      expect(await attentionPushes(b)).toEqual([]);
      expect(await b.pendingAttention()).toEqual([]);
    });
  });
});

describe('resume and archive take the wait the person answered', () => {
  it('resume refuses a different wait, and a card no longer waiting, with WAIT_CHANGED and changes nothing', async () => {
    await runInDurableObject(stubFor('att-resume-stale'), async (b: BoardDO) => {
      const cardId = await setUp(b, 'brd_att_rs');
      await blockAtBuild(b);
      const wait = await waitOf(b);

      expect(await b.resumeCard({ cardId, comment: 'go', actor: PERSON, expectedWaitId: 'wait_0000000000000000' })).toMatchObject({ ok: false, code: 'WAIT_CHANGED' });
      expect((await read(b, cardId)).state).toBe('input-required');

      expect(await b.resumeCard({ cardId, comment: 'go', toStageKey: 'plan', actor: PERSON, expectedWaitId: wait })).toMatchObject({ ok: true });
      // A late second tap on the same wait.
      expect(await b.resumeCard({ cardId, comment: 'go', actor: PERSON, expectedWaitId: wait })).toMatchObject({ ok: false, code: 'WAIT_CHANGED' });
      // Without an expected wait, the old refusal stands.
      expect(await b.resumeCard({ cardId, comment: 'go', actor: PERSON })).toMatchObject({ ok: false, code: 'CARD_NOT_WAITING' });
    });
  });

  it('archive archives the card in the wait named, with the comment on its thread; a stale wait is refused', async () => {
    await runInDurableObject(stubFor('att-archive'), async (b: BoardDO) => {
      const cardId = await setUp(b, 'brd_att_ar');
      await blockAtBuild(b);
      const wait = await waitOf(b);

      expect(await b.archiveCard({ cardId, actor: PERSON, expectedWaitId: 'wait_ffffffffffffffff' })).toMatchObject({ ok: false, code: 'WAIT_CHANGED' });
      expect((await read(b, cardId)).archivedAt).toBeNull();

      const archived = await b.archiveCard({ cardId, actor: PERSON, expectedWaitId: wait, comment: 'Not needed any more.' });
      if (!archived.ok) throw new Error(archived.message);
      expect(archived.value.card.archivedAt).toEqual(expect.any(String));
      expect(archived.value.comment).toMatchObject({ body: 'Not needed any more.', author: { kind: 'human', id: 'usr_lead' } });
      expect(await b.pendingAttention()).toEqual([]);

      // The same tap again: the wait ended with the archive.
      expect(await b.archiveCard({ cardId, actor: PERSON, expectedWaitId: wait })).toMatchObject({ ok: false, code: 'WAIT_CHANGED' });
      // The board's own archive of an archived card changes nothing.
      const again = await b.archiveCard({ cardId, actor: PERSON });
      expect(again).toMatchObject({ ok: true, value: { comment: null, card: { archivedAt: archived.value.card.archivedAt } } });
    });
  });

  it('archive cancels a pending review exactly as the card PATCH does', async () => {
    await runInDurableObject(stubFor('att-archive-review'), async (b: BoardDO) => {
      const cardId = await setUp(b, 'brd_att_arr');
      const p = await b.claim(PLANNER);
      if (!p.claimed) throw new Error('expected claim');
      await b.submitForReview({ runId: p.runId, leaseEpoch: p.leaseEpoch });
      expect(await b.pendingGateDeliveries()).toHaveLength(1);
      expect(await b.archiveCard({ cardId, actor: PERSON })).toMatchObject({ ok: true });
      expect(await b.pendingGateDeliveries()).toEqual([]);
      expect((await read(b, cardId)).needsHuman?.reason).toBe('blocked');
    });
  });
});

async function boardWithBlockedCard(tenantId: string): Promise<{ boardId: string; cardId: string; token: string }> {
  const res = await SELF.fetch(`${base}/v1/boards`, { method: 'POST', headers: human(tenantId), body: JSON.stringify({ name: 'Attention', stages: STAGES }) });
  expect(res.status).toBe(201);
  const boardId = textAt(await res.json(), 'boardId');
  const card = await SELF.fetch(`${base}/v1/boards/${boardId}/cards`, { method: 'POST', headers: human(tenantId), body: JSON.stringify({ title: 'Add login', stageKey: 'build' }) });
  const cardId = textAt(await card.json(), 'card', 'id');
  const agent = await createAgent(env.DB, tenantId, { name: 'builder', capabilities: ['build'] });
  const { token } = await createAgentToken(env.DB, tenantId, agent.id, ['claim', 'run']);
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const claim: unknown = await (await SELF.fetch(`${base}/v1/boards/${boardId}/claims`, { method: 'POST', headers: auth, body: '{}' })).json();
  const leaseEpoch = isRecord(claim) ? claim.leaseEpoch : null;
  const blocked = await SELF.fetch(`${base}/v1/boards/${boardId}/runs/${textAt(claim, 'runId')}/block`, { method: 'POST', headers: auth, body: JSON.stringify({ leaseEpoch, reason: 'no credentials' }) });
  expect(blocked.status).toBe(200);
  return { boardId, cardId, token };
}

describe('over the wire', () => {
  it('the sweep is readable by an agent and by a person, and not signed out', async () => {
    const { boardId, cardId, token } = await boardWithBlockedCard('tnt_att_wire1');
    const asAgent = await SELF.fetch(`${base}/v1/boards/${boardId}/attention/pending`, { headers: { Authorization: `Bearer ${token}` } });
    expect(asAgent.status).toBe(200);
    expect(await asAgent.json()).toEqual({ attention: [expect.objectContaining({ cardId, reason: 'blocked' })] });
    expect((await SELF.fetch(`${base}/v1/boards/${boardId}/attention/pending`, { headers: human('tnt_att_wire1') })).status).toBe(200);
    expect((await SELF.fetch(`${base}/v1/boards/${boardId}/attention/pending`)).status).toBe(401);
  });

  it('resume and archive take expectedWaitId; a stale one is a 409 WAIT_CHANGED; an agent cannot archive', async () => {
    const { boardId, cardId, token } = await boardWithBlockedCard('tnt_att_wire2');
    const waitId = textAt(await (await SELF.fetch(`${base}/v1/boards/${boardId}/attention/pending`, { headers: human('tnt_att_wire2') })).json(), 'attention', 0, 'waitId');

    const stale = await SELF.fetch(`${base}/v1/boards/${boardId}/cards/${cardId}/resume`, { method: 'POST', headers: human('tnt_att_wire2'), body: JSON.stringify({ comment: 'go', expectedWaitId: 'wait_0000000000000000' }) });
    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({ error: { code: 'WAIT_CHANGED' } });

    const badType = await SELF.fetch(`${base}/v1/boards/${boardId}/cards/${cardId}/archive`, { method: 'POST', headers: human('tnt_att_wire2'), body: JSON.stringify({ expectedWaitId: 7 }) });
    expect(badType.status).toBe(400);

    // Refused by scope as well as by the route: archiving is the human half of a wait.
    expect(requiredScope(`cards/${cardId}/archive`, 'POST')).toBe(SCOPE_FORBIDDEN);
    const byAgent = await SELF.fetch(`${base}/v1/boards/${boardId}/cards/${cardId}/archive`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedWaitId: waitId }) });
    expect(byAgent.status).toBe(403);

    const archived = await SELF.fetch(`${base}/v1/boards/${boardId}/cards/${cardId}/archive`, { method: 'POST', headers: human('tnt_att_wire2'), body: JSON.stringify({ expectedWaitId: waitId, comment: 'Dropping it.' }) });
    expect(archived.status).toBe(200);
    expect(await archived.json()).toMatchObject({ card: { id: cardId, archivedAt: expect.any(String) }, comment: { body: 'Dropping it.' } });

    const late = await SELF.fetch(`${base}/v1/boards/${boardId}/cards/${cardId}/resume`, { method: 'POST', headers: human('tnt_att_wire2'), body: JSON.stringify({ comment: 'go', expectedWaitId: waitId }) });
    expect(late.status).toBe(409);
  });

  it('a push config may subscribe to attention.pending', async () => {
    const res = await SELF.fetch(`${base}/v1/boards`, { method: 'POST', headers: human('tnt_att_wire3'), body: JSON.stringify({ name: 'Attention', stages: STAGES }) });
    const boardId = textAt(await res.json(), 'boardId');
    const sub = await SELF.fetch(`${base}/v1/boards/${boardId}/push-configs`, { method: 'POST', headers: { ...human('tnt_att_wire3'), 'X-Agent-Id': 'agt_bridge' }, body: JSON.stringify({ url: HOOK, token: 's', events: ['attention.pending'] }) });
    expect(sub.status).toBe(201);
  });
});
