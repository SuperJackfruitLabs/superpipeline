/**
 * Every event board chat carries goes through the suite's event relay as well as the direct push:
 * gates, questions (an agent's and a broker's), manual-delivery follow-ups, waiting cards,
 * decision reminders and escalations, quorum votes, held approvals released or pulled back, and
 * machine checks failed or overridden. Each is a CloudEvent with treaty's type and schema, on the
 * subject treaty's helpers name for the board's tenant. Record events and `work.available` are not
 * relayed.
 *
 * Each producer is driven for real here, with a relay named for the deployment, so a producer that
 * stops queueing for the relay fails its own test. `test/setup.ts` checks every body read back
 * against treaty's schemas, relay rows included.
 */
import { env, runInDurableObject } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eventSubject, parseType } from '@superjackfruitlabs/treaty-cloudevents';
import catalog from '@superjackfruitlabs/treaty-event-schemas/catalog.json';
import type { BoardDO, BoardInit } from '../src/board/board-do';
import { queueRelay, type PushDeps } from '../src/board/push';
import { hmacSha256Hex } from '../src/crypto/hmac';
import type { PushSender } from '../src/push/deliver';
import { RELAY_CONFIG_ID, RELAYED_EVENTS, relayRequest } from '../src/push/relay';
import { addBoundCard, boardStub, boundDecision, DECIDER, STAGES as BOUND_STAGES } from './approval-subject-fixtures';

const RELAY_URL = 'https://relay.test';
const HOOK = 'https://hub.example/api/bridge/superpipeline/push';
const TENANT = 'tnt_relay_chat';
const GH_SECRET = 'gh-secret';
const SHA = 'a'.repeat(40);
const MIN = 60_000;

/** The board-chat events, in treaty's catalogue order. */
const BOARD_CHAT = [
  'gate.pending',
  'elicitation.pending',
  'delivery.pending',
  'attention.pending',
  'decision.reminded',
  'decision.escalated',
  'gate.approval_recorded',
  'decision.released',
  'decision.pulled_back',
  'check.failed',
  'check.overridden',
];
/** What the board pushes that is not board chat: record events and `work.available`. */
const NOT_RELAYED = ['work.available', 'card.created', 'card.updated', 'card.moved', 'card.advanced', 'card.completed', 'card.comment.added', 'gate.resolved', 'link.added'];

/** Subscribed to everything, so each scenario's direct pushes are there to compare against. */
const ALL_EVENTS = [...BOARD_CHAT, ...NOT_RELAYED];

const entry = (event: string) => {
  const e = catalog.events.find((c) => c.producer === 'superpipeline' && c.pushName === event);
  if (!e) throw new Error(`treaty's catalog has no ${event}`);
  return e;
};

// The DO reads the same env object the test does (the pattern ENFORCE_CONTROL_PAIR tests use).
beforeEach(() => {
  Reflect.set(env, 'RELAY_URL', RELAY_URL);
  Reflect.set(env, 'RELAY_TOKEN', 'producer-token');
});
afterEach(() => {
  Reflect.deleteProperty(env, 'RELAY_URL');
  Reflect.deleteProperty(env, 'RELAY_TOKEN');
});

/** The relay URL, CloudEvent type and dataschema treaty names for one event, for this tenant. */
function expected(event: string): { url: string; type: string; dataschema: string } {
  const { type, dataschema } = entry(event);
  const { product, entity, verb } = parseType(type);
  return { url: `${RELAY_URL}/v1/events/${eventSubject(TENANT, { product, entity, verb })}`, type, dataschema };
}

const plus = (iso: string, minutes: number) => new Date(Date.parse(iso) + minutes * MIN).toISOString();

function eventOf(body: string): string {
  const parsed: unknown = JSON.parse(body);
  return typeof parsed === 'object' && parsed !== null && 'event' in parsed && typeof parsed.event === 'string' ? parsed.event : '';
}

/** The events queued for the relay, and those pushed directly, in queue order. */
async function queued(board: BoardDO): Promise<{ relayed: string[]; pushed: string[] }> {
  const rows = await board.getPushDeliveries();
  return {
    relayed: rows.filter((r) => r.configId === RELAY_CONFIG_ID).map((r) => eventOf(r.body)),
    pushed: rows.filter((r) => r.configId !== RELAY_CONFIG_ID).map((r) => eventOf(r.body)),
  };
}

/**
 * Drain the queue and check what reached the relay: each one the CloudEvent treaty names, on its
 * subject for this tenant, carrying the body the direct push carried.
 */
async function drainAndCheck(board: BoardDO): Promise<string[]> {
  const sent: Array<{ url: string; headers: Record<string, string>; body: string }> = [];
  const sender: PushSender = async (url, init) => {
    sent.push({ url, headers: init.headers, body: init.body });
    return { status: 202 };
  };
  await board.dispatchPushDeliveries(sender);
  const toRelay = sent.filter((s) => s.url.startsWith(`${RELAY_URL}/`));
  const toHub = sent.filter((s) => s.url === HOOK);
  const seen = toRelay.map((s) => ({
    event: eventOf(s.body),
    url: s.url,
    type: s.headers['ce-type'],
    dataschema: s.headers['ce-dataschema'],
    authorization: s.headers.Authorization,
    alsoPushed: toHub.some((h) => h.body === s.body),
  }));
  expect(seen).toEqual(
    seen.map(({ event }) => ({ event, ...expected(event), authorization: 'Bearer producer-token', alsoPushed: true })),
  );
  return toRelay.map((s) => eventOf(s.body));
}

async function setUp(board: BoardDO, id: string, stages: BoardInit['stages']): Promise<void> {
  await board.init({ id, tenantId: TENANT, name: 'Relay chat', stages });
  await board.registerPushConfig({ agentId: 'agt_bridge', url: HOOK, token: 's', events: ALL_EVENTS });
}

async function card(board: BoardDO, title = 'Release notes'): Promise<string> {
  const made = await board.createCard({ title, ownerUserId: 'usr_owner' });
  if (!made.ok) throw new Error(made.message);
  return made.value.id;
}

async function work(board: BoardDO, capability: string): Promise<{ runId: string; leaseEpoch: number }> {
  const c = await board.claim({ agentId: `agt_${capability}`, capabilities: [capability] });
  if (!c.claimed) throw new Error(`expected a ${capability} claim`);
  return { runId: c.runId, leaseEpoch: c.leaseEpoch };
}

async function complete(board: BoardDO, capability: string): Promise<void> {
  const done = await board.complete({ ...(await work(board, capability)), handoff: { summary: capability } });
  if (!done.ok) throw new Error(done.message);
}

/** research (agent) → review (human gate, with `review` merged in) → publish (agent). */
function reviewPipeline(review: Partial<BoardInit['stages'][number]> = {}): BoardInit['stages'] {
  return [
    { key: 'research', name: 'Research', order: 0, ownerKind: 'capability', owner: 'research' },
    { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval', ...review },
    { key: 'publish', name: 'Publish', order: 2, ownerKind: 'capability', owner: 'publish' },
  ];
}

async function onlyGate(board: BoardDO): Promise<string> {
  const gate = (await board.getState()).gates[0];
  if (!gate) throw new Error('no gate opened');
  return gate.id;
}

describe('what the relay carries', () => {
  it('is every board-chat event and nothing else', () => {
    expect(new Set(RELAYED_EVENTS)).toEqual(new Set(BOARD_CHAT));
    expect(NOT_RELAYED.filter((event) => RELAYED_EVENTS.has(event))).toEqual([]);
  });

  it("names each relayed event's treaty type, schema and subject", () => {
    const named = BOARD_CHAT.map((event) => {
      const body = JSON.stringify({ event, ts: '2026-11-12T09:00:00.000Z' });
      const request = relayRequest({ id: 3, body }, { boardId: 'brd_r', tenantId: TENANT }, { url: RELAY_URL, token: 't' });
      return { event, url: request.url, type: request.headers['ce-type'], dataschema: request.headers['ce-dataschema'] };
    });
    expect(named).toEqual(BOARD_CHAT.map((event) => ({ event, ...expected(event) })));
    // Underscored verbs keep their underscore in the subject and the type.
    expect(relayRequest({ id: 1, body: '{"event":"gate.approval_recorded"}' }, { boardId: 'b', tenantId: TENANT }, { url: RELAY_URL, token: 't' }).url).toBe(
      `${RELAY_URL}/v1/events/evt.${TENANT}.superpipeline.gate.approval_recorded`,
    );
    expect(relayRequest({ id: 1, body: '{"event":"decision.pulled_back"}' }, { boardId: 'b', tenantId: TENANT }, { url: RELAY_URL, token: 't' }).headers['ce-type']).toBe(
      'com.superjackfruit.superpipeline.decision.pulled_back.v1',
    );
  });

  it('queues none of the record events or work.available, even with a relay named', async () => {
    await runInDurableObject(boardStub('relay-chat-not'), async (board: BoardDO, state) => {
      await setUp(board, 'brd_relay_not', reviewPipeline());
      const meta: Record<string, string> = { boardId: 'brd_relay_not', tenantId: TENANT };
      const deps: PushDeps = { env, sql: state.storage.sql, now: () => '2026-11-12T09:00:00.000Z', getMeta: (k) => meta[k] ?? null };
      for (const event of NOT_RELAYED) queueRelay(deps, { event });
      expect(await board.getPushDeliveries()).toEqual([]);
      // The control: a board-chat event on the same deps is queued (a full body, as setup.ts checks it).
      const pulledBack = { event: 'decision.pulled_back', boardId: 'brd_relay_not', cardId: 'crd_1', gateId: 'gte_1', pulledBackBy: 'usr_b', at: '2026-11-12T09:00:00.000Z', comment: 'wait' };
      queueRelay(deps, pulledBack);
      expect((await board.getPushDeliveries()).map((r) => r.configId)).toEqual([RELAY_CONFIG_ID]);
    });
  });
});

describe('each board-chat producer queues its event for the relay beside the direct push', () => {
  it('a gate, its reminder and its escalation', async () => {
    await runInDurableObject(boardStub('relay-chat-timeouts'), async (board: BoardDO, state) => {
      await setUp(board, 'brd_relay_timeouts', reviewPipeline({ timeout: { remindAfterMinutes: 60, escalateAfterMinutes: 240 } }));
      await card(board);
      await complete(board, 'research');
      const gateId = await onlyGate(board);
      const since = state.storage.sql.exec(`SELECT waiting_since FROM decision_waits WHERE decision_id = ?`, gateId).one().waiting_since;
      if (typeof since !== 'string') throw new Error('no wait recorded');
      await board.sweepBoard(plus(since, 61));
      await board.sweepBoard(plus(since, 241));
      const { relayed, pushed } = await queued(board);
      expect(relayed).toEqual(['gate.pending', 'decision.reminded', 'decision.escalated']);
      expect(pushed).toEqual(expect.arrayContaining(['card.created', 'gate.pending', 'decision.reminded', 'decision.escalated']));
      expect(await drainAndCheck(board)).toEqual(relayed);
    });
  });

  it("an agent's question", async () => {
    await runInDurableObject(boardStub('relay-chat-question'), async (board: BoardDO) => {
      await setUp(board, 'brd_relay_question', reviewPipeline());
      await card(board);
      const run = await work(board, 'research');
      const posted = await board.postActivity({
        ...run,
        agentId: 'agt_research',
        type: 'elicitation',
        body: 'May I run the test suite?',
        signal: 'select',
        parameter: { options: [{ name: 'run_them', title: 'Run the tests' }, { name: 'skip', title: 'Skip them' }] },
      });
      expect(posted.ok).toBe(true);
      const { relayed, pushed } = await queued(board);
      expect(relayed).toEqual(['elicitation.pending']);
      expect(pushed).toContain('elicitation.pending');
      expect(await drainAndCheck(board)).toEqual(relayed);
    });
  });

  it("a broker's approval request", async () => {
    await runInDurableObject(boardStub('relay-chat-broker'), async (board: BoardDO) => {
      await board.init({ id: 'brd_relay_broker', tenantId: TENANT, name: 'Relay chat', stages: reviewPipeline() });
      // The decision carrier is a service; an agent's config never receives a broker's request.
      await board.registerPushConfig({ agentId: 'svc:prn_0000000000000000c0b3', url: HOOK, token: 's', events: ['elicitation.pending'] });
      const created = await board.createApprovalRequest({
        requestedBy: 'prn_0000000000000000b0b0',
        body: {
          requestId: 'req-1',
          question: 'Let the agent create a GitHub issue?',
          subject: {
            schema: 'stk-capability/v1',
            id: 'stk_relay_1',
            digest: 'sha256:' + 'c'.repeat(64),
            revision: 1,
            expires_at: new Date(Date.now() + 30 * MIN).toISOString(),
            preview: [
              { type: 'field', label: 'Service', value: 'github' },
              { type: 'field', label: 'Capability', value: 'issues.create' },
            ],
            preview_complete: true,
          },
        },
      });
      expect(created.ok).toBe(true);
      const { relayed, pushed } = await queued(board);
      expect(relayed).toEqual(['elicitation.pending']);
      expect(pushed).toEqual(['elicitation.pending']);
      expect(await drainAndCheck(board)).toEqual(relayed);
    });
  });

  it('a manual delivery follow-up', async () => {
    await runInDurableObject(boardStub('relay-chat-delivery'), async (board: BoardDO, state) => {
      await setUp(board, 'brd_relay_delivery', BOUND_STAGES);
      const opened = await addBoundCard(board, state);
      expect((await board.resolveGate(boundDecision(opened.gate, opened.subject, DECIDER, 'approve_manual'))).ok).toBe(true);
      const { relayed, pushed } = await queued(board);
      expect(relayed).toEqual(['gate.pending', 'delivery.pending']);
      expect(pushed).toEqual(expect.arrayContaining(['gate.pending', 'gate.resolved', 'delivery.pending']));
      expect(await drainAndCheck(board)).toEqual(relayed);
    });
  });

  it('a waiting card', async () => {
    await runInDurableObject(boardStub('relay-chat-attention'), async (board: BoardDO) => {
      await setUp(board, 'brd_relay_attention', reviewPipeline());
      await card(board);
      const run = await work(board, 'research');
      await board.block({ ...run, reason: 'the staging database is down' });
      const { relayed, pushed } = await queued(board);
      expect(relayed).toEqual(['attention.pending']);
      expect(pushed).toContain('attention.pending');
      expect(await drainAndCheck(board)).toEqual(relayed);
    });
  });

  it('a vote short of the quorum', async () => {
    await runInDurableObject(boardStub('relay-chat-quorum'), async (board: BoardDO) => {
      await setUp(board, 'brd_relay_quorum', reviewPipeline({ quorum: { required: 2 } }));
      await card(board);
      await complete(board, 'research');
      expect((await board.resolveGate({ gateId: await onlyGate(board), decision: 'approve', decidedBy: 'usr_a' })).ok).toBe(true);
      const { relayed, pushed } = await queued(board);
      expect(relayed).toEqual(['gate.pending', 'gate.approval_recorded']);
      expect(pushed).toContain('gate.approval_recorded');
      expect(await drainAndCheck(board)).toEqual(relayed);
    });
  });

  it('a held approval released at its time', async () => {
    await runInDurableObject(boardStub('relay-chat-released'), async (board: BoardDO) => {
      await setUp(board, 'brd_relay_released', reviewPipeline({ holdFor: 30 }));
      await card(board);
      await complete(board, 'research');
      expect((await board.resolveGate({ gateId: await onlyGate(board), decision: 'approve', decidedBy: 'usr_a' })).ok).toBe(true);
      expect(await board.sweepBoard(new Date(Date.now() + 35 * MIN).toISOString())).toMatchObject({ approvalsReleased: 1 });
      const { relayed, pushed } = await queued(board);
      expect(relayed).toEqual(['gate.pending', 'decision.released']);
      expect(pushed).toEqual(expect.arrayContaining(['gate.resolved', 'decision.released']));
      expect(await drainAndCheck(board)).toEqual(relayed);
    });
  });

  it('a held approval pulled back', async () => {
    await runInDurableObject(boardStub('relay-chat-pulled'), async (board: BoardDO) => {
      await setUp(board, 'brd_relay_pulled', reviewPipeline({ holdFor: 30 }));
      await card(board);
      await complete(board, 'research');
      const gateId = await onlyGate(board);
      expect((await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_a' })).ok).toBe(true);
      expect((await board.pullBackApproval({ gateId, by: 'usr_b', comment: 'wait' })).ok).toBe(true);
      const { relayed, pushed } = await queued(board);
      expect(relayed).toEqual(['gate.pending', 'decision.pulled_back']);
      expect(pushed).toContain('decision.pulled_back');
      expect(await drainAndCheck(board)).toEqual(relayed);
    });
  });

  it('a machine check that fails, and one an admin overrides', async () => {
    await runInDurableObject(boardStub('relay-chat-checks'), async (board: BoardDO) => {
      await setUp(board, 'brd_relay_checks', [
        { key: 'build', name: 'Build', order: 0, ownerKind: 'capability', owner: 'build' },
        { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval', returnStage: 'build', checks: [{ name: 'build', provider: 'ci', contexts: ['unit'] }] },
        { key: 'ship', name: 'Ship', order: 2, ownerKind: 'capability', owner: 'ship' },
      ]);
      await board.setGithubSecret(GH_SECRET);
      const cardId = await card(board, 'Fix the build');
      const ref = await board.addReference({ cardId, url: 'https://github.com/org/repo/pull/7', provider: 'github', sourceType: 'pull_request', externalId: 'org/repo#7' });
      if (!ref.ok) throw new Error(ref.message);
      const repository = { full_name: 'Org/Repo', default_branch: 'main' };
      const deliver = async (event: string, body: unknown) => {
        const rawBody = JSON.stringify(body);
        return board.handleGithubWebhook({ rawBody, deliveryId: crypto.randomUUID(), event, signature: `sha256=${await hmacSha256Hex(GH_SECRET, rawBody)}` });
      };
      await deliver('pull_request', {
        action: 'opened',
        repository,
        pull_request: { number: 7, state: 'open', html_url: 'https://example.test/pr/7', base: { ref: 'main' }, head: { ref: 'fix', sha: SHA } },
      });

      // First arrival: the check fails and the card goes back to build.
      await complete(board, 'build');
      await deliver('check_run', { action: 'completed', repository, check_run: { name: 'unit', head_sha: SHA, status: 'completed', conclusion: 'failure', html_url: 'https://ci/unit/1' } });
      // Second arrival, on a new head: an admin passes the pending check by hand.
      await deliver('pull_request', {
        action: 'synchronize',
        repository,
        pull_request: { number: 7, state: 'open', html_url: 'https://example.test/pr/7', base: { ref: 'main' }, head: { ref: 'fix', sha: 'b'.repeat(40) } },
      });
      await complete(board, 'build');
      expect(await board.overrideCheck({ cardId, name: 'build', by: 'usr_admin', role: 'admin', comment: 'CI is down; checked by hand' })).toMatchObject({ ok: true });

      const { relayed, pushed } = await queued(board);
      expect(relayed).toEqual(['check.failed', 'check.overridden', 'gate.pending']);
      expect(pushed).toEqual(expect.arrayContaining(['check.failed', 'check.overridden', 'gate.pending']));
      expect(await drainAndCheck(board)).toEqual(relayed);
    });
  });
});
