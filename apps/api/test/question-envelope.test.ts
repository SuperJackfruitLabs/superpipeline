/**
 * The decision envelope covers questions (charter: decisions/2026-11-07-the-decision-envelope-
 * covers-questions-and-follow-ups.md).
 *
 * An agent's question reaches a room the way a gate does, so it says what each option means the
 * way a gate's options do: an ordinary option is `choose`; a strict decision's approve is
 * `approve` and its deny is `reject`. A question with no options says how long a typed answer may
 * be, and the answer route enforces that same limit. Every field the question carried before is
 * still there.
 */
import { runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { AgentActivityInput, BoardDO, BoardInit } from '../src/board/board-do';
import { ELICITATION_TEXT_MAX } from '../src/board/elicitations';
import { boardStub as stubFor } from './approval-subject-fixtures';

const HOOK = 'https://hub.example/api/bridge/superpipeline/push';
const PIPELINE: BoardInit['stages'] = [{ key: 'build', name: 'Build', order: 0, ownerKind: 'capability', owner: 'build' }];

async function claimed(board: BoardDO, id: string) {
  await board.init({ id, tenantId: 'tnt_fixture', name: 'Fixture board', stages: PIPELINE });
  await board.registerPushConfig({ agentId: 'agt_bridge', url: HOOK, token: 's', events: ['elicitation.pending'] });
  await board.createCard({ title: 'Fixture card', ownerUserId: 'usr_fixture_owner' });
  const c = await board.claim({ agentId: 'agt_fixture', capabilities: ['build'] });
  if (!c.claimed) throw new Error('expected a claim');
  return { runId: c.runId, leaseEpoch: c.leaseEpoch, agentId: 'agt_fixture' };
}

async function pushedQuestion(board: BoardDO): Promise<Record<string, unknown>> {
  const bodies: unknown[] = (await board.getPushDeliveries()).map((d) => JSON.parse(d.body));
  const found = bodies.find((b): b is Record<string, unknown> => typeof b === 'object' && b !== null && 'event' in b && b.event === 'elicitation.pending');
  if (!found) throw new Error('no elicitation.pending was queued');
  return found;
}

describe('a question on the push says what each option means', () => {
  it('marks an ordinary option `choose`, needing no comment, and keeps id and label', async () => {
    await runInDurableObject(stubFor('qe-choose'), async (board: BoardDO) => {
      const run = await claimed(board, 'brd_qe_choose');
      const posted = await board.postActivity({
        ...run,
        type: 'elicitation',
        body: 'Which source?',
        signal: 'select',
        parameter: { options: [{ name: 'a', title: 'Source A' }, { name: 'b', title: 'Source B' }] },
      });
      expect(posted.ok).toBe(true);

      const push = await pushedQuestion(board);
      expect(push.options).toEqual([
        { id: 'a', label: 'Source A', meaning: 'choose', needsComment: false },
        { id: 'b', label: 'Source B', meaning: 'choose', needsComment: false },
      ]);
      // A question with options takes no free text field.
      expect(push).not.toHaveProperty('freeText');
      // The sweep reads the same body the push carried.
      expect(await board.pendingElicitationDeliveries()).toEqual([push]);
    });
  });

  it("marks a strict decision's approve `approve` and its deny `reject`, on the push and the sweep alike", async () => {
    await runInDurableObject(stubFor('qe-strict'), async (board: BoardDO) => {
      const run = await claimed(board, 'brd_qe_strict');
      const input = {
        ...run,
        type: 'elicitation',
        signal: 'select',
        body: 'Apply exact edit?',
        parameter: { options: [{ name: 'approve', title: 'Approve' }, { name: 'approve-run', title: 'Approve for this run' }, { name: 'deny', title: 'Deny' }] },
        strictDecision: { version: 1, request_id: crypto.randomUUID(), decision_digest: 'a'.repeat(64), expires_at: Date.now() + 60_000 },
      } satisfies AgentActivityInput;
      const posted = await board.postActivity(input);
      expect(posted.ok).toBe(true);

      const push = await pushedQuestion(board);
      expect(push.options).toEqual([
        { id: 'approve', label: 'Approve', meaning: 'approve', needsComment: false },
        { id: 'approve-run', label: 'Approve for this run', meaning: 'approve', needsComment: false },
        { id: 'deny', label: 'Deny', meaning: 'reject', needsComment: false },
      ]);
      expect(await board.pendingElicitationDeliveries()).toEqual([push]);
    });
  });

  it('gives a question with no options a free-text field with the limit the answer route enforces', async () => {
    await runInDurableObject(stubFor('qe-free'), async (board: BoardDO) => {
      const run = await claimed(board, 'brd_qe_free');
      const posted = await board.postActivity({ ...run, type: 'elicitation', body: 'What should the headline say?', signal: 'select', parameter: null });
      expect(posted.ok).toBe(true);

      const push = await pushedQuestion(board);
      expect(push).toMatchObject({ options: [], question: 'What should the headline say?', freeText: { maxLength: ELICITATION_TEXT_MAX } });
      expect(ELICITATION_TEXT_MAX).toBe(2000);
      expect(await board.pendingElicitationDeliveries()).toEqual([push]);
    });
  });
});

describe('the answer route enforces the free-text limit it advertises', () => {
  it('refuses an answer longer than the limit, and takes one at the limit', async () => {
    await runInDurableObject(stubFor('qe-limit'), async (board: BoardDO) => {
      const run = await claimed(board, 'brd_qe_limit');
      const posted = await board.postActivity({ ...run, type: 'elicitation', body: 'Say something', signal: 'select', parameter: null });
      expect(posted.ok).toBe(true);
      const [pending] = await board.pendingElicitationDeliveries();
      if (!pending) throw new Error('expected the question to be pending');
      const elicitationId = pending.elicitationId;

      const tooLong = await board.answerElicitation({ elicitationId, answeredBy: 'usr_fixture_owner', text: 'x'.repeat(ELICITATION_TEXT_MAX + 1) });
      expect(tooLong).toMatchObject({ ok: false, code: 'INVALID_ANSWER' });

      const atLimit = await board.answerElicitation({ elicitationId, answeredBy: 'usr_fixture_owner', text: 'x'.repeat(ELICITATION_TEXT_MAX) });
      expect(atLimit.ok).toBe(true);
    });
  });
});
