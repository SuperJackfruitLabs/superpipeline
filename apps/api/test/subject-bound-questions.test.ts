/**
 * Strict decisions and harness permissions bind their subject (charter: decisions/2026-11-07-
 * strict-decisions-and-permissions-bind-their-subject.md, decisions 1–4 and 7).
 *
 * A strict decision reaches chat as a question with a `salaam-operation/v1` subject built from the
 * stored offer: its identity, digest, expiry and a bounded preview of what will be written. Each
 * option says what it means, its scope and who may take it. A board-dispatched harness permission
 * arrives as an ordinary question whose poster says each option's meaning and scope and attaches a
 * `harness-permission/v1` subject. Either way, an approving answer must carry the binding the
 * person saw; a rejecting one need not.
 */
import { runInDurableObject } from 'cloudflare:test';
import { describe, expect, it, vi } from 'vitest';
import { PREVIEW_FIELD_MAX } from '../src/approval-subject-kinds/kind';
import type { AgentActivityInput, BoardDO, BoardInit } from '../src/board/board-do';
import type { JsonValue } from '../src/json';
import { ApprovalDetail } from '../src/board/strict-decision';
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

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

async function pushedQuestion(board: BoardDO): Promise<Record<string, unknown>> {
  const bodies: unknown[] = (await board.getPushDeliveries()).map((d) => JSON.parse(d.body));
  const found = bodies.findLast((b): b is Record<string, unknown> => isRecord(b) && b.event === 'elicitation.pending');
  if (!found) throw new Error('no elicitation.pending was queued');
  return found;
}

const DETAIL: JsonValue & { files: Array<{ path: string; change: string; bytes: number | null; preview: string | null; preview_truncated?: boolean }> } = {
  version: 1,
  summary: 'Create runs/run_x/answer.md in the workspace',
  reason: 'Write the quoted sentence the card asks for.',
  files: [{ path: 'runs/run_x/answer.md', change: 'create', bytes: 27, preview: '# RFC 9110: 502 Bad Gateway', preview_truncated: false }],
  digest: 'f'.repeat(64),
};

const STRICT_OPTIONS: JsonValue[] = [
  { name: 'approve', title: 'Approve once' },
  { name: 'approve-run', title: 'Approve for this run' },
  { name: 'always', title: 'Always allow', requires: 'workspace-admin' },
  { name: 'deny', title: 'Deny' },
];

/** `null` offers no detail at all. */
function strictParameter(detail: JsonValue): JsonValue {
  return detail === null ? { options: STRICT_OPTIONS } : { options: STRICT_OPTIONS, detail };
}

function strictInput(run: { runId: string; leaseEpoch: number; agentId: string }, detail: JsonValue = DETAIL) {
  return {
    ...run,
    type: 'elicitation',
    signal: 'select',
    body: 'Create runs/run_x/answer.md in the workspace?',
    parameter: strictParameter(detail),
    strictDecision: { version: 1, request_id: crypto.randomUUID(), decision_digest: 'a'.repeat(64), expires_at: Date.now() + 60_000 },
  } satisfies AgentActivityInput;
}

async function strictQuestion(board: BoardDO, name: string, detail: JsonValue = DETAIL) {
  const run = await claimed(board, name);
  const input = strictInput(run, detail);
  const posted = await board.postActivity(input);
  if (!posted.ok || !posted.value.elicitationId) throw new Error(`strict post failed: ${JSON.stringify(posted)}`);
  return { input, elicitationId: posted.value.elicitationId };
}

describe('a strict decision travels as a question with a salaam-operation/v1 subject', () => {
  it('carries id, digest, revision, expiry and the bounded preview, and options with scope and requires; the sweep reads the same body', async () => {
    await runInDurableObject(stubFor('sbq-strict-push'), async (board: BoardDO) => {
      const { input } = await strictQuestion(board, 'brd_sbq_strict_push');
      const push = await pushedQuestion(board);
      expect(push.approvalSubject).toEqual({
        id: input.strictDecision.request_id,
        digest: input.strictDecision.decision_digest,
        schema: 'salaam-operation/v1',
        revision: 1,
        expiresAt: new Date(input.strictDecision.expires_at).toISOString(),
        preview: [
          { type: 'text', text: DETAIL.summary },
          { type: 'text', label: 'Reason', text: DETAIL.reason },
          { type: 'field', label: 'File', value: 'runs/run_x/answer.md · create · 27 bytes' },
          { type: 'text', text: '# RFC 9110: 502 Bad Gateway' },
        ],
        previewComplete: true,
      });
      expect(push.options).toEqual([
        { id: 'approve', label: 'Approve once', meaning: 'approve', needsComment: false, scope: 'once' },
        { id: 'approve-run', label: 'Approve for this run', meaning: 'approve', needsComment: false, scope: 'run' },
        { id: 'always', label: 'Always allow', meaning: 'approve', needsComment: false, scope: 'always', requires: 'workspace-admin' },
        { id: 'deny', label: 'Deny', meaning: 'reject', needsComment: false, scope: 'once' },
      ]);
      expect(await board.pendingElicitationDeliveries()).toEqual([push]);
    });
  });

  it('puts the same subject on the board read the web app answers from', async () => {
    await runInDurableObject(stubFor('sbq-strict-view'), async (board: BoardDO) => {
      const { input } = await strictQuestion(board, 'brd_sbq_strict_view');
      const context = await board.getRunContext(input);
      const view = context.ok ? context.value.elicitations[0] : undefined;
      expect(view?.approvalSubject).toMatchObject({ id: input.strictDecision.request_id, digest: input.strictDecision.decision_digest, schema: 'salaam-operation/v1' });
    });
  });

  it('is never complete without a detail', async () => {
    await runInDurableObject(stubFor('sbq-strict-nodetail'), async (board: BoardDO) => {
      await strictQuestion(board, 'brd_sbq_strict_nodetail', null);
      const push = await pushedQuestion(board);
      expect(push.approvalSubject).toMatchObject({ preview: [], previewComplete: false });
    });
  });

  it('is incomplete when the producer says a file preview was cut', async () => {
    await runInDurableObject(stubFor('sbq-strict-cut'), async (board: BoardDO) => {
      await strictQuestion(board, 'brd_sbq_strict_cut', { ...DETAIL, files: [{ ...DETAIL.files[0], bytes: 27, preview_truncated: true }] });
      expect((await pushedQuestion(board)).approvalSubject).toMatchObject({ previewComplete: false });
    });
  });

  it('without the flag, infers a cut preview from a file larger than its preview', async () => {
    await runInDurableObject(stubFor('sbq-strict-infer'), async (board: BoardDO) => {
      const { preview_truncated: _, ...older } = DETAIL.files[0];
      await strictQuestion(board, 'brd_sbq_strict_infer', { ...DETAIL, files: [{ ...older, bytes: 4000 }] });
      expect((await pushedQuestion(board)).approvalSubject).toMatchObject({ previewComplete: false });
    });
  });

  it('without the flag, a whole preview of an older offer is complete', async () => {
    await runInDurableObject(stubFor('sbq-strict-older'), async (board: BoardDO) => {
      const { preview_truncated: _, ...older } = DETAIL.files[0];
      await strictQuestion(board, 'brd_sbq_strict_older', { ...DETAIL, files: [older] });
      expect((await pushedQuestion(board)).approvalSubject).toMatchObject({ previewComplete: true });
    });
  });

  it('without the flag, an edit whose content was not shown at all is incomplete', async () => {
    await runInDurableObject(stubFor('sbq-strict-unshown'), async (board: BoardDO) => {
      await strictQuestion(board, 'brd_sbq_strict_unshown', { ...DETAIL, files: [{ path: 'a.md', change: 'edit', bytes: null, preview: null }] });
      expect((await pushedQuestion(board)).approvalSubject).toMatchObject({ previewComplete: false });
    });
  });

  it('a delete with nothing to preview is complete', async () => {
    await runInDurableObject(stubFor('sbq-strict-delete'), async (board: BoardDO) => {
      await strictQuestion(board, 'brd_sbq_strict_delete', { ...DETAIL, files: [{ path: 'a.md', change: 'delete', bytes: null, preview: null, preview_truncated: false }] });
      const subject = (await pushedQuestion(board)).approvalSubject;
      expect(subject).toMatchObject({ previewComplete: true });
      expect(isRecord(subject) && subject.preview).toContainEqual({ type: 'field', label: 'File', value: 'a.md · delete' });
    });
  });

  it('is incomplete when a block had to be cut to the wire bounds', async () => {
    await runInDurableObject(stubFor('sbq-strict-bounds'), async (board: BoardDO) => {
      await strictQuestion(board, 'brd_sbq_strict_bounds', { ...DETAIL, files: [{ ...DETAIL.files[0], path: `${'d/'.repeat(PREVIEW_FIELD_MAX)}x.md` }] });
      expect((await pushedQuestion(board)).approvalSubject).toMatchObject({ previewComplete: false });
    });
  });
});

describe('the strict detail takes an optional preview_truncated per file', () => {
  it('accepts it, accepts its absence, and refuses anything but a boolean', () => {
    const { preview_truncated: _, ...older } = DETAIL.files[0];
    expect(ApprovalDetail.safeParse(DETAIL).success).toBe(true);
    expect(ApprovalDetail.safeParse({ ...DETAIL, files: [older] }).success).toBe(true);
    expect(ApprovalDetail.safeParse({ ...DETAIL, files: [{ ...older, preview_truncated: 'yes' }] }).success).toBe(false);
  });

  it('refuses a strict offer whose options carry their own meaning or scope', async () => {
    await runInDurableObject(stubFor('sbq-strict-poster-meaning'), async (board: BoardDO) => {
      const run = await claimed(board, 'brd_sbq_strict_poster_meaning');
      const input = strictInput(run);
      const options: JsonValue[] = [{ name: 'approve', title: 'Approve once', meaning: 'reject' }, { name: 'deny', title: 'Deny' }];
      expect(await board.postActivity({ ...input, parameter: { options, detail: DETAIL } })).toMatchObject({ ok: false, code: 'INVALID_STRICT_DECISION' });
      const scoped: JsonValue[] = [{ name: 'approve', title: 'Approve once', scope: 'always' }, { name: 'deny', title: 'Deny' }];
      expect(await board.postActivity({ ...input, parameter: { options: scoped, detail: DETAIL } })).toMatchObject({ ok: false, code: 'INVALID_STRICT_DECISION' });
    });
  });
});

describe('an answer to a strict decision binds its subject', () => {
  it('refuses an approval with no binding or a wrong one, and takes the exact one', async () => {
    await runInDurableObject(stubFor('sbq-strict-bind'), async (board: BoardDO) => {
      const { input, elicitationId } = await strictQuestion(board, 'brd_sbq_strict_bind');
      const id = input.strictDecision.request_id;
      const digest = input.strictDecision.decision_digest;
      expect(await board.answerElicitation({ elicitationId, answeredBy: 'usr_h', option: 'approve' })).toMatchObject({ ok: false, code: 'APPROVAL_SUBJECT_MISMATCH' });
      expect(await board.answerElicitation({ elicitationId, answeredBy: 'usr_h', option: 'approve-run', subject: { id, digest: 'b'.repeat(64) } })).toMatchObject({ ok: false, code: 'APPROVAL_SUBJECT_MISMATCH' });
      expect(await board.answerElicitation({ elicitationId, answeredBy: 'usr_h', option: 'approve', subject: { id: crypto.randomUUID(), digest } })).toMatchObject({ ok: false, code: 'APPROVAL_SUBJECT_MISMATCH' });
      // Byte for byte: the same digest in another case is another digest.
      expect(await board.answerElicitation({ elicitationId, answeredBy: 'usr_h', option: 'approve', subject: { id, digest: digest.toUpperCase() } })).toMatchObject({ ok: false, code: 'APPROVAL_SUBJECT_MISMATCH' });
      expect(await board.answerElicitation({ elicitationId, answeredBy: 'usr_h', option: 'approve', subject: { id, digest } })).toMatchObject({ ok: true });
    });
  });

  it('takes a denial with no binding', async () => {
    await runInDurableObject(stubFor('sbq-strict-deny'), async (board: BoardDO) => {
      const { elicitationId } = await strictQuestion(board, 'brd_sbq_strict_deny');
      expect(await board.answerElicitation({ elicitationId, answeredBy: 'usr_h', option: 'deny' })).toMatchObject({ ok: true });
    });
  });
});

const HARNESS_SUBJECT = {
  schema: 'harness-permission/v1',
  id: 'ses_1:7',
  digest: 'e'.repeat(64),
  revision: 1,
  expires_at: '2099-01-01T00:00:00.000Z',
  preview: [
    { type: 'field', label: 'Tool', value: 'Edit · edit' },
    { type: 'text', label: 'src/a.ts', text: 'export const a = 1;\n' },
  ],
  preview_complete: true,
};

const HARNESS_OPTIONS = [
  { name: 'allow_once', title: 'Allow once', meaning: 'approve', scope: 'once' },
  { name: 'allow_always', title: 'Always allow', meaning: 'approve', scope: 'always' },
  { name: 'reject_once', title: 'Reject', meaning: 'reject', scope: 'once' },
  { name: 'reject_always', title: 'Always reject', meaning: 'reject', scope: 'always' },
];

function harnessInput(run: { runId: string; leaseEpoch: number; agentId: string }, parameter: unknown = { options: HARNESS_OPTIONS, subject: HARNESS_SUBJECT }) {
  return { ...run, type: 'elicitation', signal: 'select', body: 'Edit src/a.ts?', parameter: JSON.parse(JSON.stringify(parameter)) } satisfies AgentActivityInput;
}

async function harnessQuestion(board: BoardDO, name: string, subject: unknown = HARNESS_SUBJECT) {
  const run = await claimed(board, name);
  const posted = await board.postActivity(harnessInput(run, { options: HARNESS_OPTIONS, subject }));
  if (!posted.ok) throw new Error(`post failed: ${JSON.stringify(posted)}`);
  const [pending] = await board.pendingElicitationDeliveries();
  if (!pending) throw new Error('expected a pending question');
  return { run, elicitationId: pending.elicitationId };
}

describe('a poster may say what each option means and attach a harness-permission/v1 subject', () => {
  it('echoes the meanings, scopes and the subject on the push and the sweep', async () => {
    await runInDurableObject(stubFor('sbq-harness-push'), async (board: BoardDO) => {
      const { run } = await harnessQuestion(board, 'brd_sbq_harness_push');
      const push = await pushedQuestion(board);
      expect(push.options).toEqual([
        { id: 'allow_once', label: 'Allow once', meaning: 'approve', needsComment: false, scope: 'once' },
        { id: 'allow_always', label: 'Always allow', meaning: 'approve', needsComment: false, scope: 'always' },
        { id: 'reject_once', label: 'Reject', meaning: 'reject', needsComment: false, scope: 'once' },
        { id: 'reject_always', label: 'Always reject', meaning: 'reject', needsComment: false, scope: 'always' },
      ]);
      expect(push.approvalSubject).toEqual({
        id: 'ses_1:7',
        digest: 'e'.repeat(64),
        schema: 'harness-permission/v1',
        revision: 1,
        expiresAt: '2099-01-01T00:00:00.000Z',
        preview: HARNESS_SUBJECT.preview,
        previewComplete: true,
      });
      expect(await board.pendingElicitationDeliveries()).toEqual([push]);
      const context = await board.getRunContext(run);
      const view = context.ok ? context.value.elicitations[0] : undefined;
      expect(view?.approvalSubject).toEqual(push.approvalSubject);
    });
  });

  it("keeps the poster's incomplete flag, and cuts an oversized preview to the bounds, marking it incomplete", async () => {
    await runInDurableObject(stubFor('sbq-harness-bounds'), async (board: BoardDO) => {
      await harnessQuestion(board, 'brd_sbq_harness_bounds', { ...HARNESS_SUBJECT, preview_complete: false });
      expect((await pushedQuestion(board)).approvalSubject).toMatchObject({ previewComplete: false });
    });
    await runInDurableObject(stubFor('sbq-harness-bounds2'), async (board: BoardDO) => {
      await harnessQuestion(board, 'brd_sbq_harness_bounds2', { ...HARNESS_SUBJECT, preview: [{ type: 'field', label: 'Tool', value: 'x'.repeat(PREVIEW_FIELD_MAX + 1) }] });
      const subject = (await pushedQuestion(board)).approvalSubject;
      expect(subject).toMatchObject({ previewComplete: false });
      expect(isRecord(subject) && Array.isArray(subject.preview) && isRecord(subject.preview[0]) && String(subject.preview[0].value).length).toBe(PREVIEW_FIELD_MAX);
    });
  });

  it('refuses a malformed subject, an unknown meaning or scope, and a subject on options without meanings', async () => {
    await runInDurableObject(stubFor('sbq-harness-bad'), async (board: BoardDO) => {
      const run = await claimed(board, 'brd_sbq_harness_bad');
      for (const subject of [
        { ...HARNESS_SUBJECT, schema: 'social-publish/v1' },
        { ...HARNESS_SUBJECT, digest: '' },
        { ...HARNESS_SUBJECT, id: 'x'.repeat(257) },
        { ...HARNESS_SUBJECT, revision: 0 },
        { ...HARNESS_SUBJECT, expires_at: 'tomorrow' },
        { ...HARNESS_SUBJECT, preview: [{ type: 'image', url: 'x' }] },
        { ...HARNESS_SUBJECT, preview_complete: 'yes' },
        { ...HARNESS_SUBJECT, extra: 1 },
        'ses_1:7',
      ]) expect(await board.postActivity(harnessInput(run, { options: HARNESS_OPTIONS, subject }))).toMatchObject({ ok: false, code: 'INVALID_APPROVAL_SUBJECT' });
      expect(await board.postActivity(harnessInput(run, { options: [{ name: 'a', title: 'A', meaning: 'maybe' }] }))).toMatchObject({ ok: false, code: 'INVALID_ELICITATION' });
      expect(await board.postActivity(harnessInput(run, { options: [{ name: 'a', title: 'A', scope: 'forever' }] }))).toMatchObject({ ok: false, code: 'INVALID_ELICITATION' });
      expect(await board.postActivity(harnessInput(run, { options: [{ name: 'a', title: 'A' }, HARNESS_OPTIONS[2]], subject: HARNESS_SUBJECT }))).toMatchObject({ ok: false, code: 'INVALID_ELICITATION' });
      expect(await board.postActivity(harnessInput(run, { options: [], subject: HARNESS_SUBJECT }))).toMatchObject({ ok: false, code: 'INVALID_ELICITATION' });
      // Nothing was asked by any refused post.
      expect(await board.pendingElicitationDeliveries()).toEqual([]);
    });
  });

  it('a question without these fields is unchanged', async () => {
    await runInDurableObject(stubFor('sbq-plain'), async (board: BoardDO) => {
      const run = await claimed(board, 'brd_sbq_plain');
      expect((await board.postActivity(harnessInput(run, { options: [{ name: 'a', title: 'A' }] }))).ok).toBe(true);
      const push = await pushedQuestion(board);
      expect(push.options).toEqual([{ id: 'a', label: 'A', meaning: 'choose', needsComment: false }]);
      expect(push).not.toHaveProperty('approvalSubject');
      const [pending] = await board.pendingElicitationDeliveries();
      if (!pending) throw new Error('expected a pending question');
      expect(await board.answerElicitation({ elicitationId: pending.elicitationId, answeredBy: 'usr_h', option: 'a' })).toMatchObject({ ok: true });
    });
  });

  it('meanings without a subject travel, and need no binding', async () => {
    await runInDurableObject(stubFor('sbq-meaning-only'), async (board: BoardDO) => {
      const run = await claimed(board, 'brd_sbq_meaning_only');
      expect((await board.postActivity(harnessInput(run, { options: HARNESS_OPTIONS }))).ok).toBe(true);
      const push = await pushedQuestion(board);
      expect(push.options).toContainEqual({ id: 'reject_always', label: 'Always reject', meaning: 'reject', needsComment: false, scope: 'always' });
      const [pending] = await board.pendingElicitationDeliveries();
      if (!pending) throw new Error('expected a pending question');
      expect(await board.answerElicitation({ elicitationId: pending.elicitationId, answeredBy: 'usr_h', option: 'allow_once' })).toMatchObject({ ok: true });
    });
  });
});

describe('an answer to a harness permission binds its subject', () => {
  it('refuses an approval with no binding or a wrong one, and takes the exact one', async () => {
    await runInDurableObject(stubFor('sbq-harness-bind'), async (board: BoardDO) => {
      const { elicitationId } = await harnessQuestion(board, 'brd_sbq_harness_bind');
      // Typed text is not an option, and never stands in for one on a bound question.
      expect(await board.answerElicitation({ elicitationId, answeredBy: 'usr_h', text: 'allow_once' })).toMatchObject({ ok: false, code: 'INVALID_ANSWER' });
      expect(await board.answerElicitation({ elicitationId, answeredBy: 'usr_h', option: 'allow_once' })).toMatchObject({ ok: false, code: 'APPROVAL_SUBJECT_MISMATCH' });
      expect(await board.answerElicitation({ elicitationId, answeredBy: 'usr_h', option: 'allow_always', subject: { id: 'ses_1:7', digest: 'd'.repeat(64) } })).toMatchObject({ ok: false, code: 'APPROVAL_SUBJECT_MISMATCH' });
      expect(await board.answerElicitation({ elicitationId, answeredBy: 'usr_h', option: 'allow_once', subject: { id: 'ses_1:8', digest: 'e'.repeat(64) } })).toMatchObject({ ok: false, code: 'APPROVAL_SUBJECT_MISMATCH' });
      expect(await board.answerElicitation({ elicitationId, answeredBy: 'usr_h', option: 'allow_once', subject: { id: 'ses_1:7', digest: 'e'.repeat(64) } })).toMatchObject({ ok: true });
    });
  });

  it('takes a rejection with no binding, but not one with a wrong binding', async () => {
    await runInDurableObject(stubFor('sbq-harness-reject'), async (board: BoardDO) => {
      const { elicitationId } = await harnessQuestion(board, 'brd_sbq_harness_reject');
      expect(await board.answerElicitation({ elicitationId, answeredBy: 'usr_h', option: 'reject_always', subject: { id: 'ses_1:7', digest: 'd'.repeat(64) } })).toMatchObject({ ok: false, code: 'APPROVAL_SUBJECT_MISMATCH' });
      expect(await board.answerElicitation({ elicitationId, answeredBy: 'usr_h', option: 'reject_always' })).toMatchObject({ ok: true });
    });
  });

  it('refuses any answer after the subject expires', async () => {
    await runInDurableObject(stubFor('sbq-harness-expired'), async (board: BoardDO) => {
      const expiresAt = new Date(Date.now() + 60_000).toISOString();
      const { elicitationId } = await harnessQuestion(board, 'brd_sbq_harness_expired', { ...HARNESS_SUBJECT, expires_at: expiresAt });
      const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse(expiresAt) + 1);
      try {
        expect(await board.answerElicitation({ elicitationId, answeredBy: 'usr_h', option: 'allow_once', subject: { id: 'ses_1:7', digest: 'e'.repeat(64) } })).toMatchObject({ ok: false, code: 'DECISION_EXPIRED' });
        expect(await board.answerElicitation({ elicitationId, answeredBy: 'usr_h', option: 'reject_once' })).toMatchObject({ ok: false, code: 'DECISION_EXPIRED' });
      } finally {
        clock.mockRestore();
      }
    });
  });
});
