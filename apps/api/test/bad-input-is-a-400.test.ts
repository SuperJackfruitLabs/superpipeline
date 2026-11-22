import { SELF, env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { GateView } from '../src/board/views';
import type { BoardStub } from '../src/board/board-do';
import { boardStub } from '../src/board/stub';

// Bad input is a 400, never a 500, and never a different action (treaty phase 1, ruling 4).
// Each case here was a 500, a 403, or an action taken, before the fix it pins.

const TENANT = 'tnt_bad_input';
const STAGES = [
  { key: 'research', name: 'Research', order: 0, ownerKind: 'capability', owner: 'research' },
  { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval' },
  { key: 'publish', name: 'Publish', order: 2, ownerKind: 'capability', owner: 'publish' },
];

const headers = (extra: Record<string, string> = {}) => ({ 'X-Tenant-Id': TENANT, 'Content-Type': 'application/json', ...extra });
const send = (path: string, body: string | undefined, extra: Record<string, string> = {}, method = 'POST') =>
  SELF.fetch(`https://api.test/v1/boards/${path}`, { method, headers: headers(extra), ...(body === undefined ? {} : { body }) });
const AGENT = { 'X-Agent-Id': 'agt_bad_input' };

async function json<T>(res: Response): Promise<T> {
  return res.json<T>();
}

async function board(): Promise<string> {
  const res = await SELF.fetch('https://api.test/v1/boards', { method: 'POST', headers: headers(), body: JSON.stringify({ name: 'Bad input', stages: STAGES }) });
  expect(res.status).toBe(201);
  return (await json<{ boardId: string }>(res)).boardId;
}

async function card(boardId: string, title = 'Write it'): Promise<string> {
  const res = await send(`${boardId}/cards`, JSON.stringify({ title, ownerUserId: 'usr_a' }));
  expect(res.status).toBe(201);
  return (await json<{ card: { id: string } }>(res)).card.id;
}

/** A board with one card waiting on its plain review gate. */
async function pendingGate(): Promise<{ boardId: string; cardId: string; gateId: string }> {
  const boardId = await board();
  const cardId = await card(boardId);
  const claimed = await json<{ runId: string; leaseEpoch: number }>(await send(`${boardId}/claims`, JSON.stringify({ capabilities: ['research'] }), AGENT));
  const done = await send(`${boardId}/runs/${claimed.runId}/complete`, JSON.stringify({ leaseEpoch: claimed.leaseEpoch, handoff: { summary: 'drafted' } }), AGENT);
  expect(done.status).toBe(200);
  const state = await json<{ gates: { id: string; status: string }[] }>(await send(boardId, undefined, {}, 'GET'));
  const gate = state.gates.find((g) => g.status === 'pending');
  if (!gate) throw new Error('expected a pending gate');
  return { boardId, cardId, gateId: gate.id };
}

/** A refusal as status and code, after checking it carries a message. */
async function refusalOf(res: Response): Promise<{ status: number; code: string }> {
  const body = await res.json<{ error?: { code?: unknown; message?: unknown } }>();
  if (typeof body.error?.message !== 'string') throw new Error(`no error.message in ${JSON.stringify(body)}`);
  return { status: res.status, code: String(body.error.code) };
}
const refused = (status: number, code: string) => ({ status, code });

describe('malformed JSON is 400 INVALID_JSON', () => {
  it('on the run verbs, the approval-subject verify, the claim and the evidence reference', async () => {
    const boardId = await board();
    for (const path of ['runs/run_0000000000000000/heartbeat', 'runs/run_0000000000000000/complete', 'runs/run_0000000000000000/approval-subject/verify', 'claims', 'runs/run_0000000000000000/evidence-reference']) {
      expect(await refusalOf(await send(`${boardId}/${path}`, '{not json', AGENT))).toEqual(refused(400, 'INVALID_JSON'));
    }
  });

  it('on gate resolve, pull back and delivery, and on answering a question', async () => {
    const { boardId, gateId } = await pendingGate();
    for (const path of [`gates/${gateId}/resolve`, `gates/${gateId}/pull-back`, `gates/${gateId}/delivery`, 'elicitations/elc_0000000000000000/answer']) {
      expect(await refusalOf(await send(`${boardId}/${path}`, '{not json'))).toEqual(refused(400, 'INVALID_JSON'));
    }
  });

  it('on the card routes that read a body', async () => {
    const boardId = await board();
    const cardId = await card(boardId);
    for (const [path, method] of [['cards', 'POST'], [`cards/${cardId}`, 'PATCH'], [`cards/${cardId}/move`, 'POST'], [`cards/${cardId}/resume`, 'POST'], [`cards/${cardId}/checks/lint/override`, 'POST']] as const) {
      expect(await refusalOf(await send(`${boardId}/${path}`, '{not json', {}, method))).toEqual(refused(400, 'INVALID_JSON'));
    }
  });
});

describe('a body that is JSON but not an object', () => {
  it('is 400 on a run verb, never a 500', async () => {
    const boardId = await board();
    expect(await refusalOf(await send(`${boardId}/runs/run_0000000000000000/heartbeat`, 'null', AGENT))).toEqual(refused(400, 'INVALID_BODY'));
  });

  it('is INVALID_BODY on a claim, and a bad field INVALID_INPUT', async () => {
    const boardId = await board();
    expect(await refusalOf(await send(`${boardId}/claims`, 'null', AGENT))).toEqual(refused(400, 'INVALID_BODY'));
    expect(await refusalOf(await send(`${boardId}/claims`, '[]', AGENT))).toEqual(refused(400, 'INVALID_BODY'));
    expect(await refusalOf(await send(`${boardId}/claims`, JSON.stringify({ maxConcurrency: 0 }), AGENT))).toEqual(refused(400, 'INVALID_INPUT'));
  });
});

describe('archiving a card', () => {
  it('refuses malformed JSON and leaves the card where it is', async () => {
    const boardId = await board();
    const cardId = await card(boardId);
    expect(await refusalOf(await send(`${boardId}/cards/${cardId}/archive`, '{"comment":'))).toEqual(refused(400, 'INVALID_JSON'));
    const read = await json<{ card: { archivedAt: string | null } }>(await send(`${boardId}/cards/${cardId}`, undefined, {}, 'GET'));
    expect(read.card.archivedAt).toBeNull();
  });

  it('still archives with no body at all', async () => {
    const boardId = await board();
    const cardId = await card(boardId);
    expect((await send(`${boardId}/cards/${cardId}/archive`, undefined)).status).toBe(200);
    const read = await json<{ card: { archivedAt: string | null } }>(await send(`${boardId}/cards/${cardId}`, undefined, {}, 'GET'));
    expect(read.card.archivedAt).not.toBeNull();
  });
});

describe('a decision outside the vocabulary', () => {
  it('is 400 GATE_DECISION_NOT_ALLOWED on a plain gate, and the card is not rejected', async () => {
    const { boardId, cardId, gateId } = await pendingGate();
    expect(await refusalOf(await send(`${boardId}/gates/${gateId}/resolve`, JSON.stringify({ decision: 'aprove' })))).toEqual(refused(400, 'GATE_DECISION_NOT_ALLOWED'));
    expect(await refusalOf(await send(`${boardId}/gates/${gateId}/resolve`, JSON.stringify({})))).toEqual(refused(400, 'GATE_DECISION_NOT_ALLOWED'));
    expect(await refusalOf(await send(`${boardId}/gates/${gateId}/resolve`, 'null'))).toEqual(refused(400, 'GATE_DECISION_NOT_ALLOWED'));
    const gate = await json<{ gate: { status: string } }>(await send(`${boardId}/gates/${gateId}`, undefined, {}, 'GET'));
    expect(gate.gate.status).toBe('pending');
    const read = await json<{ card: { state: string } }>(await send(`${boardId}/cards/${cardId}`, undefined, {}, 'GET'));
    expect(read.card.state).not.toBe('rejected');
  });
});

describe('the types say what the board returns', () => {
  it('a gate the board cancelled reads `cancelled`', async () => {
    const { boardId, gateId } = await pendingGate();
    const { cardId } = await json<{ cards: { id: string }[] }>(await send(boardId, undefined, {}, 'GET')).then((s) => ({ cardId: s.cards[0]?.id ?? '' }));
    // Moving the card off the gate's stage cancels the gate.
    expect((await send(`${boardId}/cards/${cardId}/move`, JSON.stringify({ toStageKey: 'research' }))).status).toBe(200);
    const stub = boardStub(env, TENANT, boardId);
    const read = await stub.getGate(gateId);
    if (!read.ok) throw new Error(read.message);
    // A type error without `cancelled` in GateView['status'].
    const status: GateView['status'] = read.value.status;
    const cancelled: GateView['status'] = 'cancelled';
    expect(status).toBe(cancelled);
  });

  it('the verify RPC carries `expiresAt` and `gateStatus`', () => {
    // A type error without them on BoardStub['confirmApprovalSubject'].
    type Confirmed = Extract<Awaited<ReturnType<BoardStub['confirmApprovalSubject']>>, { ok: true }>['value'];
    const fields: (keyof Confirmed)[] = ['approved', 'deliveryMode', 'subjectId', 'digest', 'gateId', 'expiresAt', 'gateStatus'];
    expect(fields).toHaveLength(7);
  });
});
