import corpus from './fixtures/strict-decision-v1.json';
import { StrictDecision } from '../src/board/strict-decision';
import { env, runInDurableObject } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { BoardDO, type AgentActivityInput } from '../src/board/board-do';

async function setup(board: BoardDO) {
  await board.init({ id: 'brd_strict', tenantId: 'tnt_a', name: 'Strict', stages: [{ key: 'build', name: 'Build', order: 0, ownerKind: 'capability', owner: 'build' }] });
  await board.createCard({ title: 'Work', ownerUserId: 'usr_a' });
  const c = await board.claim({ agentId: 'agt_a', capabilities: ['build'] });
  if (!c.claimed) throw new Error('claim failed');
  return { runId: c.runId, leaseEpoch: c.leaseEpoch, agentId: 'agt_a', type: 'elicitation', signal: 'select', body: 'Apply exact edit?', parameter: { options: [{ name: 'approve', title: 'Approve' }, { name: 'deny', title: 'Deny' }] }, strictDecision: { version: 1, request_id: crypto.randomUUID(), decision_digest: 'a'.repeat(64), expires_at: Date.now() + 60000 } } satisfies AgentActivityInput;
}
function testBoard(name: string, test: (board: BoardDO) => Promise<void>) {
  return runInDurableObject(env.BOARD_DO.get(env.BOARD_DO.idFromName(name)) as unknown as DurableObjectStub<BoardDO>, test);
}
describe('strict decision identity and durable response', () => {
  it('replays lost responses without another activity/question, detects changed payload and foreign owner', () => testBoard('strict-dedup', async board => {
    const input = await setup(board);
    const first = await board.postActivity(input);
    expect(first.ok).toBe(true);
    expect(await board.postActivity(input)).toEqual(first);
    for (const changed of [
      { ...input, body: 'Different operation?' },
      { ...input, strictDecision: { ...input.strictDecision, decision_digest: 'd'.repeat(64) } },
      { ...input, strictDecision: { ...input.strictDecision, expires_at: input.strictDecision.expires_at + 1 } },
      { ...input, leaseEpoch: input.leaseEpoch + 1 },
      { ...input, parameter: { options: [{ name: 'approve', title: 'Approve changed action' }, { name: 'deny', title: 'Deny' }] } },
    ]) expect(await board.postActivity(changed)).toMatchObject({ ok: false, code: 'DECISION_CONFLICT' });
    expect(await board.postActivity({ ...input, agentId: 'agt_b' })).toMatchObject({ ok: false, code: 'NOT_RUN_OWNER' });
    const context = await board.getRunContext(input);
    expect(context.ok && context.value.elicitations).toHaveLength(1);
    expect(context.ok && context.value.elicitations[0]).toMatchObject({ strictDecision: input.strictDecision, runId: input.runId, agentId: input.agentId });
  }));
  it('never applies a reversed older answer or reopens superseded questions', () => testBoard('strict-order', async board => {
    const input = await setup(board);
    const first = await board.postActivity(input);
    const second = await board.postActivity({ ...input, strictDecision: { ...input.strictDecision, request_id: crypto.randomUUID(), decision_digest: 'b'.repeat(64) } });
    if (!first.ok || !second.ok) throw new Error('post failed');
    expect(await board.postActivity(input)).toEqual(first);
    expect(await board.answerElicitation({ elicitationId: first.value.elicitationId!, answeredBy: 'usr_h', option: 'approve' })).toMatchObject({ ok: false, code: 'ELICITATION_NOT_PENDING' });
    expect(await board.answerElicitation({ elicitationId: second.value.elicitationId!, answeredBy: 'agt_a', option: 'approve' })).toMatchObject({ ok: false, code: 'SEPARATION_OF_DUTIES' });
    expect(await board.answerElicitation({ elicitationId: second.value.elicitationId!, answeredBy: 'usr_h', text: 'approve' })).toMatchObject({ ok: false, code: 'INVALID_ANSWER' });
    expect(await board.answerElicitation({ elicitationId: second.value.elicitationId!, answeredBy: 'usr_h', option: 'approve' })).toMatchObject({ ok: true });
    expect(await board.answerElicitation({ elicitationId: second.value.elicitationId!, answeredBy: 'usr_h', option: 'deny' })).toMatchObject({ ok: false, code: 'ELICITATION_NOT_PENDING' });
  }));
  it('fails closed for expiry, version, missing identity, changed lease and revoked run; saved receipt remains historical', () => testBoard('strict-fences', async board => {
    const input = await setup(board);
    expect(await board.postActivity({ ...input, strictDecision: { ...input.strictDecision, expires_at: 1 } })).toMatchObject({ ok: false, code: 'DECISION_EXPIRED' });
    expect(await board.postActivity({ ...input, strictDecision: { ...input.strictDecision, version: 2 } as never })).toMatchObject({ ok: false, code: 'INVALID_STRICT_DECISION' });
    expect(await board.postActivity({ ...input, agentId: undefined })).toMatchObject({ ok: false, code: 'INVALID_STRICT_DECISION' });
    expect(await board.postActivity({ ...input, leaseEpoch: input.leaseEpoch + 1 })).toMatchObject({ ok: false, code: 'STALE_LEASE' });
    const first = await board.postActivity(input);
    if (!first.ok) throw new Error('post failed');
    expect(await board.release(input)).toMatchObject({ ok: true });
    expect(await board.postActivity(input)).toEqual(first);
    expect(await board.answerElicitation({ elicitationId: first.value.elicitationId!, answeredBy: 'usr_h', option: 'approve' })).toMatchObject({ ok: false });
    expect(await board.postActivity({ ...input, strictDecision: { ...input.strictDecision, request_id: crypto.randomUUID() } })).toMatchObject({ ok: false, code: 'STALE_LEASE' });
  }));
  it('rejects expired answer and heartbeat lease before alarm reclaim', () => testBoard('strict-time', async board => {
    const input = await setup(board);
    const posted = await board.postActivity(input);
    if (!posted.ok) throw new Error('post failed');
    const clock = vi.spyOn(Date, 'now').mockReturnValue(input.strictDecision.expires_at + 1);
    try {
      expect(await board.answerElicitation({ elicitationId: posted.value.elicitationId!, answeredBy: 'usr_h', option: 'approve' })).toMatchObject({ ok: false, code: 'DECISION_EXPIRED' });
      expect(await board.postActivity(input)).toEqual(posted);
      clock.mockReturnValue(input.strictDecision.expires_at + 1000000);
      expect(await board.postActivity({ ...input, strictDecision: { ...input.strictDecision, request_id: crypto.randomUUID(), expires_at: input.strictDecision.expires_at + 2000000 } })).toMatchObject({ ok: false, code: 'STALE_LEASE' });
    } finally { clock.mockRestore(); }
  }));

  // A person approving an operation sees what it is: the producer's structured detail rides with
  // the strict decision, is checked here, and comes back on the question, never parsed from text.
  it('carries a structured approval detail onto the question, and refuses a malformed one', () => testBoard('strict-detail', async board => {
    const input = await setup(board);
    const detail = {
      version: 1,
      summary: 'Create runs/run_x/answer.md in the workspace',
      reason: 'Write the quoted sentence the card asks for.',
      files: [{ path: 'runs/run_x/answer.md', change: 'create', bytes: 249, preview: '# RFC 9110: 502 Bad Gateway' }],
      digest: 'f'.repeat(64),
    };
    const withDetail = { ...input, parameter: { ...input.parameter, detail } };
    for (const bad of [
      { ...detail, version: 2 },
      { ...detail, digest: 'not-a-digest' },
      { ...detail, files: [{ ...detail.files[0], change: 'rename' }] },
      { ...detail, extra: true },
      { ...detail, summary: '' },
    ]) expect(await board.postActivity({ ...input, parameter: { ...input.parameter, detail: bad } })).toMatchObject({ ok: false, code: 'INVALID_STRICT_DECISION' });
    expect(await board.postActivity({ ...input, parameter: { ...input.parameter, note: 'x' } })).toMatchObject({ ok: false, code: 'INVALID_STRICT_DECISION' });
    const posted = await board.postActivity(withDetail);
    expect(posted.ok).toBe(true);
    // The detail is part of the bound payload: a replay with a different detail is a conflict.
    expect(await board.postActivity({ ...withDetail, parameter: { ...withDetail.parameter, detail: { ...detail, summary: 'Something else' } } })).toMatchObject({ ok: false, code: 'DECISION_CONFLICT' });
    const context = await board.getRunContext(input);
    expect(context.ok && context.value.elicitations[0]).toMatchObject({ detail });
  }));
  it('a strict question without detail has none', () => testBoard('strict-no-detail', async board => {
    const input = await setup(board);
    expect((await board.postActivity(input)).ok).toBe(true);
    const context = await board.getRunContext(input);
    expect(context.ok && context.value.elicitations[0]?.detail).toBeUndefined();
  }));

  // Approval scopes: "Approve for this run" between approve and deny; nothing else, no other order.
  it('accepts approve, approve-run, deny, and answers approve-run', () => testBoard('strict-run-grant', async board => {
    const input = await setup(board);
    const options = [{ name: 'approve', title: 'Approve once' }, { name: 'approve-run', title: 'Approve for this run' }, { name: 'deny', title: 'Deny' }];
    for (const bad of [
      [options[1], options[0], options[2]],
      [options[0], { name: 'approve-always', title: 'Always' }, options[2]],
      [options[0], options[1]],
    ]) expect(await board.postActivity({ ...input, parameter: { options: bad } })).toMatchObject({ ok: false, code: 'INVALID_STRICT_DECISION' });
    const posted = await board.postActivity({ ...input, parameter: { options } });
    if (!posted.ok) throw new Error('post failed');
    const answered = await board.answerElicitation({ elicitationId: posted.value.elicitationId!, answeredBy: 'usr_h', option: 'approve-run' }); expect(answered).toMatchObject({ ok: true });
  }));

});

for (const example of corpus) it(`strict wire corpus: ${example.name}`, () => { expect(StrictDecision.safeParse(example.value).success).toBe(example.valid); });
