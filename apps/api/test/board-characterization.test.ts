import { env, runInDurableObject, runDurableObjectAlarm } from 'cloudflare:test';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { BoardDO, BoardInit } from '../src/board/board-do';
import type { PushSender } from '../src/push/deliver';

/**
 * What the Board Durable Object does, pinned before it is split into modules
 * (docs/contributor/modularity-plan.md, Phase 2).
 *
 * One board is driven through every family of its verbs: cards, stages and moves, claims and runs,
 * questions, gates, comments, references and links, budgets and usage, schedules, the stale sweep,
 * push delivery, notifications, triggers, the alarm and the WebSocket hub. For each step the test
 * records the verb's answer and every SQL statement the object ran, in order, with its bindings;
 * the schema the constructor builds and the messages a connected socket received are recorded too.
 * The clock steps one millisecond per reading, so no two readings tie, and generated ids and
 * timestamps are replaced by stable placeholders, so the record is the same on every run and a
 * reordered statement, a changed binding or a changed answer fails.
 *
 * The record is a snapshot (`__snapshots__/board-characterization.test.ts.snap`). It is written
 * once against the code before the split and must not be regenerated to make a restructuring pass.
 */

const STAGES: BoardInit['stages'] = [
  { key: 'inbox', name: 'Inbox', order: 0, ownerKind: 'human', summary: 'Where cards start' },
  { key: 'research', name: 'Research', order: 1, ownerKind: 'capability', owner: 'research', instructions: 'Find the sources.' },
  { key: 'review', name: 'Review', order: 2, ownerKind: 'capability', owner: 'review', gate: 'approval' },
  { key: 'judge', name: 'Judge', order: 3, ownerKind: 'capability', owner: 'judge', returnStage: 'research' },
  { key: 'done', name: 'Done', order: 4 },
];

const INIT: BoardInit = {
  id: 'brd_char',
  tenantId: 'tnt_a',
  name: 'Characterization',
  stages: STAGES,
  intro: { lede: 'Pinned before the split.', composeHint: 'Type a card.' },
};

type Statement = string;
interface Step {
  step: string;
  result: unknown;
  sql: Statement[];
}

const steps: Step[] = [];
let recording: Statement[] | null = null;
let restore: (() => void) | null = null;

/**
 * Stable placeholders for what changes between runs: ids, digests, and the clock's readings. A
 * timestamp (ISO or epoch milliseconds, from the stepping clock below) becomes `t#n` by the order it
 * first appears, so which values are the same reading stays pinned while the absolute value, which
 * moves with how often the test runner itself reads the clock, does not.
 */
/** The placeholder for `value`: `<prefix>#<n>`, n counting the distinct values seen so far. */
function named(seen: Map<string, string>, value: string, prefix: string): string {
  let name = seen.get(value);
  if (!name) {
    name = `${prefix}#${seen.size + 1}`;
    seen.set(value, name);
  }
  return name;
}

function normalizer(): (value: unknown) => unknown {
  const ids = new Map<string, string>();
  const times = new Map<string, string>();
  const text = (s: string): string =>
    s
      .replace(/\b([a-z]+)_[0-9a-f]{16}\b/g, (id, prefix: string) => named(ids, id, prefix))
      .replace(/\b2031-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\b/g, (ts) => named(times, ts, 't'))
      .replace(/\b1[6-9]\d{11}\b/g, (ms) => named(times, new RealDate(Number(ms)).toISOString(), 't'))
      .replace(/\b[0-9a-f]{64}\b/g, '<sha256>');
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return text(v);
    if (typeof v === 'number' && v > 1.6e12 && v < 4e12) return text(String(v));
    if (v instanceof ArrayBuffer) return `<bytes:${v.byteLength}>`;
    if (ArrayBuffer.isView(v)) return `<bytes:${v.byteLength}>`;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk;
}
const normalize = normalizer();

function format(query: string, bindings: unknown[]): Statement {
  const sql = query.replace(/\s+/g, ' ').trim();
  return bindings.length ? `${sql}  <-  ${JSON.stringify(normalize(bindings))}` : sql;
}

/** Record every statement run on any SqlStorage in this isolate, by patching its prototype. */
function patchSql(sql: SqlStorage): void {
  if (restore) return;
  const proto: { exec: (q: string, ...b: unknown[]) => unknown } = Object.getPrototypeOf(sql);
  const original = proto.exec;
  proto.exec = function (this: unknown, query: string, ...bindings: unknown[]) {
    recording?.push(format(query, bindings));
    return original.call(this, query, ...bindings);
  };
  restore = () => {
    proto.exec = original;
  };
}

const RealDate = Date;

/**
 * A clock that moves one millisecond on every reading, from a fixed start, so ordering by time
 * never depends on a tie. The start is in the future, so the alarms the board arms never come due
 * on their own: the alarm runs only when the test runs it.
 */
function stepClock(): void {
  let tick = RealDate.parse('2031-01-01T12:00:00.000Z');
  class StepDate extends RealDate {
    constructor(...args: [] | [string | number | Date]) {
      if (args.length === 0) super(tick++);
      else super(args[0]);
    }
    static override now(): number {
      return tick++;
    }
  }
  Object.defineProperty(globalThis, 'Date', { value: StepDate, writable: true, configurable: true });
}

/** Every stub of the `BOARD_DO` namespace is a Board Durable Object (wrangler.jsonc). */
function isBoard(_stub: DurableObjectStub): _stub is DurableObjectStub<BoardDO> {
  return true;
}

function stubFor(name: string): DurableObjectStub<BoardDO> {
  const stub = env.BOARD_DO.get(env.BOARD_DO.idFromName(name));
  if (!isBoard(stub)) throw new Error('BOARD_DO is not a board namespace');
  return stub;
}

async function record<T>(step: string, run: () => Promise<T>): Promise<T> {
  recording = [];
  try {
    const result = await run();
    steps.push({ step, result: normalize(JSON.parse(JSON.stringify(result ?? null))), sql: recording });
    return result;
  } catch (err) {
    steps.push({ step, result: { threw: String(err) }, sql: recording });
    throw err;
  } finally {
    recording = null;
  }
}

function must<T>(r: { ok: true; value: T } | { ok: false; code: string; message: string }): T {
  if (!r.ok) throw new Error(`${r.code}: ${r.message}`);
  return r.value;
}

function recordedSender(calls: unknown[]): PushSender {
  return async (url, init) => {
    calls.push(normalize({ url, body: JSON.parse(init.body) }));
    return { status: 200 };
  };
}

beforeAll(async () => {
  stepClock();
  // Any instance gives the prototype; the board under test is constructed after the patch, so its
  // constructor's statements are recorded too.
  await runInDurableObject(stubFor('char-prototype'), async (_b: BoardDO, state) => {
    patchSql(state.storage.sql);
  });
});

afterAll(() => {
  restore?.();
  Object.defineProperty(globalThis, 'Date', { value: RealDate, writable: true, configurable: true });
});

describe('the Board Durable Object, pinned before the split', () => {
  it('runs the same statements and gives the same answers for every family of verbs', async () => {
    const stub = stubFor('char-board');
    const sockets: unknown[] = [];

    await record('constructor', () => runInDurableObject(stub, async () => null));

    await runInDurableObject(stub, async (board: BoardDO, state) => {
      steps.push({
        step: 'schema',
        result: state.storage.sql
          .exec(`SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name != '_cf_KV' ORDER BY rowid`)
          .toArray()
          .map((r) => normalize({ ...r, sql: typeof r.sql === 'string' ? r.sql.replace(/\s+/g, ' ') : r.sql })),
        sql: [],
      });

      await record('init', () => board.init(INIT));
      await record('init again', () => board.init(INIT));
    });

    // The hub: a socket connected now hears every event that follows.
    const res = await stub.fetch('https://board.test/ws', { headers: { Upgrade: 'websocket' } });
    const ws = res.webSocket;
    if (!ws) throw new Error('expected a websocket');
    ws.accept();
    ws.addEventListener('message', (e) => {
      sockets.push(normalize(JSON.parse(String(e.data))));
    });
    await record('fetch without upgrade', async () => {
      const r = await stub.fetch('https://board.test/ws');
      return { status: r.status, body: await r.text() };
    });

    await runInDurableObject(stub, async (board: BoardDO) => {
      // ----- cards -----
      const a = must(await record('createCard', () => board.createCard({ title: 'Card A', ownerUserId: 'usr_a', spec: { goal: 'pin' }, priority: 2, dueAt: '2001-01-01', labels: ['alpha', 'beta'] })));
      const b = must(await record('createCard in a stage', () => board.createCard({ title: 'Card B', ownerUserId: 'usr_a', stageKey: 'research', queuedBy: 'usr_a', queuedGrant: ['research'] })));
      await record('createCard refused', () => board.createCard({ title: '', ownerUserId: 'usr_a' }));
      const child = must(await record('createChildCard', () => board.createChildCard(a.id, { title: 'Child of A', ownerUserId: 'usr_a' })));
      await record('splitCard', () => board.splitCard(a.id, ['- [ ] First part', '2. Second part', '  '], 'usr_a'));
      await record('updateCard', () => board.updateCard(a.id, { title: 'Card A, renamed', spec: { goal: 'pin', due: 'x' }, labels: ['gamma'], priority: 3 }));
      await record('updateCard stale precondition', () => board.updateCard(a.id, { title: 'nope', expectedUpdatedAt: '2001-01-01T00:00:00.000Z' }));
      await record('getCardView', () => board.getCardView(a.id));
      await record('getCardView missing', () => board.getCardView('card_0000000000000000'));
      await record('moveCard', () => board.moveCard(child.id, 'research', 'usr_a', ['research']));
      await record('moveCard to an unknown stage', () => board.moveCard(child.id, 'nowhere', 'usr_a'));

      // ----- profiles -----
      await record('setProfile', () => board.setProfile({ key: 'fast', name: 'Fast', harness: 'claude', model: 'claude-sonnet', capabilities: ['research'] }));
      await record('getProfiles', () => board.getProfiles());

      // ----- links -----
      await record('addLink', () => board.addLink({ fromCardId: a.id, toCardId: b.id, kind: 'blocks', createdBy: 'usr_a' }));
      await record('listLinks', () => board.listLinks(a.id));
      await record('countReadyForCapabilities', () => board.countReadyForCapabilities('agt_r', ['research']));
      await record('removeLink', () => board.removeLink(a.id, b.id, 'blocks'));

      // ----- claims and runs -----
      const claim1 = await record('claim', () => board.claim({ agentId: 'agt_r', capabilities: ['research'], profileKey: 'fast' }));
      if (!claim1.claimed) throw new Error('expected a claim');
      const run1 = { runId: claim1.runId, leaseEpoch: claim1.leaseEpoch, agentId: 'agt_r' };
      await record('claim with nothing ready for the capability', () => board.claim({ agentId: 'agt_x', capabilities: ['nothing'] }));
      await record('heartbeat', () => board.heartbeat(run1));
      await record('heartbeat stale lease', () => board.heartbeat({ ...run1, leaseEpoch: run1.leaseEpoch + 7 }));
      await record('postActivity thought with usage', () =>
        board.postActivity({ ...run1, type: 'thought', body: 'Reading', usage: { model: 'claude-sonnet-4-5', inputTokens: 1000, outputTokens: 200 } }),
      );
      await record('postActivity action', () => board.postActivity({ ...run1, type: 'action', action: 'search', parameter: { q: 'x' }, result: { hits: 2 } }));
      const asked = await record('postActivity elicitation', () =>
        board.postActivity({ ...run1, type: 'elicitation', body: 'Which source?', signal: 'select', parameter: { options: [{ name: 'a', title: 'A' }, { name: 'b', title: 'B' }] } }),
      );
      await record('pendingElicitationDeliveries', () => board.pendingElicitationDeliveries());
      const elicitationId = asked.ok ? ((await board.getState()).elicitations[0]?.id ?? '') : '';
      await record('answerElicitation by the asker is refused', () => board.answerElicitation({ elicitationId, answeredBy: 'agt_r', option: 'a' }));
      await record('answerElicitation', () => board.answerElicitation({ elicitationId, answeredBy: 'usr_a', answererRole: 'owner', option: 'a' }));
      await record('addRunReference', () => board.addRunReference({ ...run1, reference: { cardId: b.id, url: 'https://github.com/o/r/pull/1', provider: 'github', sourceType: 'pull_request', title: 'PR 1', addedBy: 'agent' } }));
      await record('addRunComment', () => board.addRunComment({ runId: run1.runId, agentId: 'agt_r', agentName: 'Researcher', body: 'Found two sources.' }));
      await record('listRunComments', () => board.listRunComments({ runId: run1.runId, agentId: 'agt_r' }));
      await record('getRunContext', () => board.getRunContext({ runId: run1.runId, agentId: 'agt_r' }));
      await record('getRunContext foreign agent', () => board.getRunContext({ runId: run1.runId, agentId: 'agt_other' }));
      await record('complete to a gated stage', () => board.complete({ ...run1, handoff: { summary: 'Two sources found.' } }));

      // ----- gates -----
      const state1 = await board.getState();
      const gate = state1.gates[0];
      await record('pendingGateDeliveries', () => board.pendingGateDeliveries());
      if (gate) {
        await record('getGate', () => board.getGate(gate.id));
        await record('resolveGate request_changes', () => board.resolveGate({ gateId: gate.id, decision: 'request_changes', decidedBy: 'usr_a', comment: 'More please', via: 'web' }));
      }
      await record('getCardActivities', () => board.getCardActivities(b.id));
      await record('getAttempts', () => board.getAttempts(b.id));
      await record('getRunEvidence', () => board.getRunEvidence(run1.runId));

      // The card is back in research after a change request; run it again, through the gate this time.
      const claim2 = await record('claim again', () => board.claim({ agentId: 'agt_r', capabilities: ['research'] }));
      if (claim2.claimed) {
        const run2 = { runId: claim2.runId, leaseEpoch: claim2.leaseEpoch, agentId: 'agt_r' };
        await record('complete again', () => board.complete({ ...run2, handoff: { summary: 'Three sources.' } }));
        const g2 = (await board.getState()).gates[0];
        if (g2) await record('resolveGate approve', () => board.resolveGate({ gateId: g2.id, decision: 'approve', decidedBy: 'usr_a', via: 'api' }));
      }
      const claim3 = await record('claim review', () => board.claim({ agentId: 'agt_v', capabilities: ['review'] }));
      if (claim3.claimed) {
        const run3 = { runId: claim3.runId, leaseEpoch: claim3.leaseEpoch, agentId: 'agt_v' };
        await record('submitForReview', () => board.submitForReview({ ...run3, output: { verdict: 'fine' } }));
        const g3 = (await board.getState()).gates[0];
        if (g3) await record('resolveGate approve review', () => board.resolveGate({ gateId: g3.id, decision: 'approve', decidedBy: 'usr_a' }));
      }
      const claim4 = await record('claim judge', () => board.claim({ agentId: 'agt_j', capabilities: ['judge'] }));
      if (claim4.claimed) {
        const run4 = { runId: claim4.runId, leaseEpoch: claim4.leaseEpoch, agentId: 'agt_j' };
        await record('complete without an outcome on a judging stage', () => board.complete({ ...run4, handoff: { summary: 'ok' } }));
        await record('complete changes-needed', () => board.complete({ ...run4, outcome: 'changes-needed', findings: 'Cite the second source.' }));
      }

      // block, fail, release, each on a card of its own
      for (const title of ['To release', 'To fail', 'To block']) {
        await record(`createCard ${title}`, () => board.createCard({ title, ownerUserId: 'usr_a', stageKey: 'research' }));
      }
      const claim5 = await record('claim child', () => board.claim({ agentId: 'agt_r2', capabilities: ['research'] }));
      if (claim5.claimed) {
        const run5 = { runId: claim5.runId, leaseEpoch: claim5.leaseEpoch, agentId: 'agt_r2' };
        await record('release', () => board.release({ ...run5, reason: 'Out of time' }));
      }
      const claim6 = await record('claim to fail', () => board.claim({ agentId: 'agt_r2', capabilities: ['research'] }));
      if (claim6.claimed) {
        await record('fail', () => board.fail({ runId: claim6.runId, leaseEpoch: claim6.leaseEpoch, agentId: 'agt_r2', reason: 'Crashed' }));
      }
      const claim7 = await record('claim to block', () => board.claim({ agentId: 'agt_r2', capabilities: ['research'] }));
      if (claim7.claimed) {
        await record('block', () => board.block({ runId: claim7.runId, leaseEpoch: claim7.leaseEpoch, agentId: 'agt_r2', reason: 'Needs a login', summary: 'Stuck' }));
      }

      // A review gate asked for changes, then refused.
      await record('createCard To gate', () => board.createCard({ title: 'To gate', ownerUserId: 'usr_a', stageKey: 'review' }));
      for (const decision of ['request_changes', 'reject'] as const) {
        const c = await record(`claim review for ${decision}`, () => board.claim({ agentId: 'agt_v', capabilities: ['review'] }));
        if (!c.claimed) continue;
        await record(`submitForReview for ${decision}`, () => board.submitForReview({ runId: c.runId, leaseEpoch: c.leaseEpoch, agentId: 'agt_v', output: { draft: decision } }));
        const g = (await board.getState()).gates[0];
        if (!g) continue;
        await record(`getGate for ${decision}`, () => board.getGate(g.id));
        await record(`resolveGate ${decision}`, () => board.resolveGate({ gateId: g.id, decision, decidedBy: 'usr_a', comment: 'Not yet', via: 'matrix' }));
        await record(`resolveGate ${decision} again`, () => board.resolveGate({ gateId: g.id, decision: 'approve', decidedBy: 'usr_a' }));
        await record(`getRunEvidenceV1 for ${decision}`, () => board.getRunEvidenceV1(c.runId));
      }
      await record('setGithubSecret', () => board.setGithubSecret('gh-shh'));

      // ----- comments and resume -----
      const comment = await record('addComment', () => board.addComment({ cardId: a.id, author: { kind: 'human', id: 'usr_a', name: 'Ann' }, body: 'Looks right.' }));
      await record('listComments', () => board.listComments(a.id));
      if (comment.ok) await record('deleteComment', () => board.deleteComment({ cardId: a.id, commentId: comment.value.id, userId: 'usr_a' }));
      await record('resumeCard', () => board.resumeCard({ cardId: child.id, comment: 'Logged in; carry on.', actor: { id: 'usr_a', name: 'Ann' } }));

      // ----- references -----
      await record('addReference', () => board.addReference({ cardId: a.id, url: 'https://example.com/doc', provider: 'web', sourceType: 'link', title: 'Doc', addedBy: 'user' }));
      await record('addReference refused', () => board.addReference({ cardId: 'card_0000000000000000', url: 'https://example.com/x', provider: 'web', sourceType: 'link' }));

      // ----- budgets and usage -----
      await record('setBudget', () => board.setBudget({ boardUsdCap: 100, cardUsdCap: 5 }));
      await record('getUsage', () => board.getUsage());
      await record('getUsage window', () => board.getUsage({ window: '7d' }));
      await record('estimateCardCost', () => board.estimateCardCost(b.id));
      await record('projectSummary', () => board.projectSummary('prj_none'));
      await record('summaryCounts', () => board.summaryCounts());
      await record('agentLoad', () => board.agentLoad());

      // ----- schedules -----
      const schedule = await record('createSchedule', () => board.createSchedule({ title: 'Weekly digest', rule: 'daily at 09:00', timezone: 'UTC', overlap: 'skip', createdBy: 'usr_a', labels: ['digest'], priority: 1 }));
      await record('createSchedule refused', () => board.createSchedule({ title: 'Bad', rule: 'whenever', timezone: 'UTC', overlap: 'skip', createdBy: 'usr_a' }));
      await record('listSchedules', () => board.listSchedules());
      if (schedule.ok) await record('updateSchedule', () => board.updateSchedule(schedule.value.id, { title: 'Weekly digest, renamed', overlap: 'allow' }));
      await record('fireDueSchedules', () => board.fireDueSchedules('2099-01-05T10:00:00.000Z'));
      if (schedule.ok) await record('deleteSchedule', () => board.deleteSchedule(schedule.value.id));

      // ----- stale cards and the sweep -----
      await record('setStaleSettings', () => board.setStaleSettings({ enabled: true, afterHours: 1 }));
      await record('staleCards', () => board.staleCards({ nowIso: '2099-01-01T00:00:00.000Z' }));
      await record('sweepBoard', () => board.sweepBoard('2099-01-01T00:00:00.000Z'));

      // ----- push -----
      await record('registerPushConfig', () => board.registerPushConfig({ agentId: 'agt_r', url: 'https://agent.example.com/push', token: 'tok', capabilities: ['research'], events: ['work.available', 'gate.pending'] }));
      await record('registerPushConfig refused', () => board.registerPushConfig({ agentId: 'agt_r', url: 'http://127.0.0.1/push', token: 'tok' }));
      await record('createCard notifies push', () => board.createCard({ title: 'Card C', ownerUserId: 'usr_a', stageKey: 'research' }));
      await record('getPushDeliveries', () => board.getPushDeliveries());
      const sent: unknown[] = [];
      await record('dispatchPushDeliveries', async () => ({ result: await board.dispatchPushDeliveries(recordedSender(sent)), sent }));

      // ----- notifications -----
      const notes = await record('getNotifications', () => board.getNotifications());
      await record('getNotifications unread for a user', () => board.getNotifications({ unreadOnly: true, userId: 'usr_a' }));
      const first = notes[0];
      if (first) await record('markNotificationRead', () => board.markNotificationRead(first.seq));

      // ----- triggers -----
      await record('setGithubConfig', () => board.setGithubConfig({ secret: 'shh', issueTrigger: true, triggerGrant: ['research'] }));
      await record('createCardFromTrigger', () => board.createCardFromTrigger({ title: 'From an issue', ownerUserId: 'usr_a', source: { url: 'https://github.com/o/r/issues/7', provider: 'github', sourceType: 'issue', externalId: '7', title: 'Issue 7' } }));
      await record('handleGithubWebhook bad signature', () => board.handleGithubWebhook({ rawBody: '{}', signature: 'sha256=00', deliveryId: 'd1', event: 'issues' }));
      await record('setForgeSecret', () => board.setForgeSecret('forge-shh'));
      await record('handleForgeWebhook unsigned', () => board.handleForgeWebhook({ rawBody: '{}', signature: null, deliveryId: 'd2', event: 'issues' }));

      // ----- run reports -----
      await record('getRunReportOutbox', () => board.getRunReportOutbox());
      await record('enqueueAllRunReports', () => board.enqueueAllRunReports());

      // ----- stages and the board -----
      await record('updateStage', () => board.updateStage('research', { summary: 'Find sources', wipLimit: 3 }));
      await record('updateStage refused', () => board.updateStage('research', { wipLimit: 0 }));
      await record('setStages', () => board.setStages([...STAGES, { key: 'archive', name: 'Archive', order: 5 }]));
      await record('setName', () => board.setName('Characterization, renamed'));
      await record('deleteCard', () => board.deleteCard(child.id));
      await record('getState', () => board.getState());
      await record('getEvents', () => board.getEvents(500));
    });

    // ----- the alarm: a run that went dark is reclaimed -----
    await runInDurableObject(stub, async (board: BoardDO) => {
      const c = await record('claim before the alarm', () => board.claim({ agentId: 'agt_dark', capabilities: ['research'] }));
      await record('reclaimExpired', async () => board.reclaimExpired(0));
      if (c.claimed) await record('heartbeat before the alarm', () => board.heartbeat({ runId: c.runId, leaseEpoch: c.leaseEpoch, agentId: 'agt_dark' }));
    });
    await record('alarm', () => runDurableObjectAlarm(stub));
    await runInDurableObject(stub, async (board: BoardDO) => {
      await record('reclaimExpired far future', async () => board.reclaimExpired(8_000_000_000_000));
      await record('getEvents after the alarm', () => board.getEvents(20));
    });

    // Let the socket deliver what is in flight before it is read.
    await new Promise((r) => setTimeout(r, 50));
    ws.close();
    steps.push({ step: 'websocket messages', result: sockets, sql: [] });

    await runInDurableObject(stub, async (board: BoardDO) => {
      await record('destroy', () => board.destroy());
    });

    expect(steps).toMatchSnapshot();
  });
});
