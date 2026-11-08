/**
 * A gate may offer a choice of variants (charter: decisions/2026-11-09-a-gate-may-offer-a-choice-
 * of-variants.md). Operator ruling: at most 3 variants; no editing while choosing; a variant whose
 * preview is incomplete is withheld on its own.
 *
 * Each variant is frozen as its own subject; the gate has no subject until an approval chooses
 * one by its binding, which settles the set in one step. Everything after the choice is the
 * single-subject path, so the publisher verifies the chosen subject unchanged.
 */
import { env, runInDurableObject, SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { boundedPreview, PREVIEW_TOTAL_BYTES, previewBlockBytes, type PreviewBlock } from '../src/approval-subject-kinds/kind';
import type { BoardDO } from '../src/board/board-do';
import { setUserExternalMapping, upsertUserByEmail } from '../src/db/catalog';
import {
  ACCOUNT, DECIDER, OTHER_HUMAN, PRODUCER, PUBLISHER, STAGES, addVariantCard, auth, boardStub, payload, variants, type SubjectRow,
} from './approval-subject-fixtures';

const HOOK = 'https://hub.example/api/bridge/superpipeline/push';

async function initBoard(board: BoardDO, name: string, extra: { tenantId?: string; boardId?: string; stages?: typeof STAGES } = {}) {
  await board.init({ id: extra.boardId ?? `brd_${name}`, tenantId: extra.tenantId ?? 'tnt_fixture', name: 'Fixture board', stages: extra.stages ?? STAGES });
}

/** The element at `i`, which the test put there. */
function at<T>(xs: readonly T[], i: number): T {
  const x = xs[i];
  if (x === undefined) throw new Error(`fixture has no element ${i}`);
  return x;
}

/** The gate a completion opened. */
function gateOf(opened: { gate?: { id: string } }): string {
  if (!opened.gate) throw new Error('no gate was opened');
  return opened.gate.id;
}

const choose = (gateId: string, subject: Pick<SubjectRow, 'id' | 'digest'>, decision: 'approve_automatic' | 'approve_manual' | 'request_changes' | 'reject' = 'approve_automatic', decidedBy = DECIDER) => ({
  gateId,
  decision,
  decidedBy,
  approvalSubjectId: subject.id,
  approvalSubjectDigest: subject.digest,
});

const subjectRow = (state: DurableObjectState, id: string) =>
  state.storage.sql.exec('SELECT status, invalidation_reason FROM approval_subjects WHERE id = ?', id).one();

describe('freezing a choice of variants', () => {
  it('freezes each variant as its own subject, in order, and leaves the gate without one', async () => {
    await runInDurableObject(boardStub('variants-freeze'), async (board: BoardDO, state) => {
      await initBoard(board, 'variants_freeze');
      const opened = await addVariantCard(board, state, { variants: variants(['One.', 'Two.', 'Three.']) });
      expect(opened.completed.ok).toBe(true);
      expect(opened.subjects.map((s) => s.revision)).toEqual([1, 2, 3]);
      expect(new Set(opened.subjects.map((s) => s.digest)).size).toBe(3);
      expect(opened.subjects.every((s) => s.status === 'active')).toBe(true);
      expect(opened.gate).toMatchObject({ status: 'pending', approval_subject_id: null, approval_subject_digest: null });
      expect(state.storage.sql.exec('SELECT active_approval_subject_id FROM cards WHERE id = ?', opened.cardId).one()).toEqual({ active_approval_subject_id: null });
      const rows = state.storage.sql.exec('SELECT position, variant_id, label, subject_id, digest FROM gate_variants ORDER BY position').toArray();
      expect(rows).toEqual(opened.subjects.map((s, i) => ({ position: i, variant_id: `v${i + 1}`, label: `Variant ${i + 1}`, subject_id: s.id, digest: s.digest })));
    });
  });

  it('treats one variant as a choice of one', async () => {
    await runInDurableObject(boardStub('variants-one'), async (board: BoardDO, state) => {
      await initBoard(board, 'variants_one');
      const opened = await addVariantCard(board, state, { variants: variants(['Only.']) });
      expect(opened.completed.ok).toBe(true);
      expect(opened.subjects).toHaveLength(1);
      const only = at(opened.subjects, 0);
      expect((await board.resolveGate(choose(gateOf(opened), only))).ok).toBe(true);
    });
  });

  const base = variants(['A.', 'B.']);
  const first = at(base, 0);
  const second = at(base, 1);
  it.each([
    ['more than three', { variants: variants(['1', '2', '3', '4']) }, /1 to 3/],
    ['none', { variants: [] }, /1 to 3/],
    ['not an array', { variants: { id: 'v1' } }, /1 to 3/],
    ['a repeated id', { variants: [first, { ...second, id: first.id }] }, /not unique/],
    ['an id over 64 characters', { variants: [{ ...first, id: 'i'.repeat(65) }] }, /id must be 1 to 64/],
    ['an empty id', { variants: [{ ...first, id: '' }] }, /id must be 1 to 64/],
    ['a control character in an id', { variants: [{ ...first, id: 'a\nb' }] }, /id must be 1 to 64/],
    ['a label over 80 characters', { variants: [{ ...first, label: 'l'.repeat(81) }] }, /label must be 1 to 80/],
    ['a missing label', { variants: [{ id: first.id, publicationPayload: first.publicationPayload }] }, /label must be 1 to 80/],
    ['variants and a single payload together', { variants: base, publicationPayload: payload() }, /either variants or a single payload/],
    ['a variant the kind refuses', { variants: [first, { ...second, publicationPayload: { ...payload(), channel: 'other' } }] }, /variants\[1\]: publicationPayload.channel/],
  ])('refuses %s, freezing nothing', async (_name, handoff, message) => {
    await runInDurableObject(boardStub(`variants-refuse-${_name}`), async (board: BoardDO, state) => {
      await initBoard(board, `variants_refuse`);
      const opened = await addVariantCard(board, state, handoff);
      expect(opened.completed).toMatchObject({ ok: false, code: 'INVALID_APPROVAL_SUBJECT', message: expect.stringMatching(message) });
      expect(opened.subjects).toEqual([]);
      expect(opened.gate).toBeUndefined();
    });
  });

  it('keeps the limits at their boundaries: three variants, a 64-character id and an 80-character label', async () => {
    await runInDurableObject(boardStub('variants-boundary'), async (board: BoardDO, state) => {
      await initBoard(board, 'variants_boundary');
      const three = variants(['1', '2', '3']);
      three[0] = { ...at(three, 0), id: 'i'.repeat(64), label: 'l'.repeat(80) };
      expect((await addVariantCard(board, state, { variants: three })).completed.ok).toBe(true);
    });
  });
});

describe('a variant gate on the push', () => {
  it('carries the variants inside subject, each with the usual envelope, and no top-level id or digest', async () => {
    await runInDurableObject(boardStub('variants-push'), async (board: BoardDO, state) => {
      await initBoard(board, 'variants_push');
      await board.registerPushConfig({ agentId: 'agt_bridge', url: HOOK, token: 's', events: ['gate.pending'] });
      const opened = await addVariantCard(board, state);
      const [body] = await board.pendingGateDeliveries();
      // The push carries the same body as the pending read.
      const [delivery] = await board.getPushDeliveries();
      expect(JSON.parse(delivery?.body ?? '{}')).toEqual(body);
      expect(body?.approvalSubject).not.toHaveProperty('id');
      expect(body?.approvalSubject).not.toHaveProperty('digest');
      expect(body).toMatchObject({
        event: 'gate.pending',
        handoffSummary: 'Choose one of 2 variants: "Variant 1", "Variant 2". Open the card to see them before approving.',
        reviewUrl: expect.stringContaining(opened.cardId),
        approvalSubject: {
          variants: opened.subjects.map((s, i) => ({
            id: `v${i + 1}`,
            label: `Variant ${i + 1}`,
            subject: {
              id: s.id,
              digest: s.digest,
              schema: 'social-publish/v1',
              revision: i + 1,
              expiresAt: '2030-01-02T03:04:05Z',
              previewComplete: true,
              preview: expect.arrayContaining([{ type: 'text', label: 'Post', text: i === 0 ? 'First draft.' : 'Second draft.' }]),
            },
          })),
        },
      });
      // The options are the gate's usual ones: the choice is the binding, not an option.
      expect(body?.options.map((o) => o.id)).toEqual(['approve_manual', 'approve_automatic', 'request_changes', 'reject']);
    });
  });

  it('bounds each variant to an equal share of the budget, so a long variant never cuts a short one', async () => {
    await runInDurableObject(boardStub('variants-budget'), async (board: BoardDO, state) => {
      await initBoard(board, 'variants_budget');
      // Each of the long ones alone fits the per-text bound but not a third of the budget.
      const long = 'é'.repeat(3_000);
      await addVariantCard(board, state, { variants: variants(['Short.', long, long]) });
      const [body] = await board.pendingGateDeliveries();
      const choice = body?.approvalSubject;
      if (!choice || !('variants' in choice)) throw new Error('the gate did not carry its variants');
      const share = Math.floor(PREVIEW_TOTAL_BYTES / 3);
      for (const v of choice.variants) {
        expect(v.subject.preview.reduce((n, b) => n + previewBlockBytes(b), 0)).toBeLessThanOrEqual(share);
      }
      expect(choice.variants.map((v) => v.subject.previewComplete)).toEqual([true, false, false]);
      const total = choice.variants.flatMap((v) => v.subject.preview).reduce((n, b) => n + previewBlockBytes(b), 0);
      expect(total).toBeLessThanOrEqual(PREVIEW_TOTAL_BYTES);
    });
  });
});

describe('choosing a variant', () => {
  it('settles the set in one step: the chosen variant becomes the gate\'s and the card\'s subject, the others not chosen', async () => {
    await runInDurableObject(boardStub('variants-choose'), async (board: BoardDO, state) => {
      await initBoard(board, 'variants_choose');
      const opened = await addVariantCard(board, state, { variants: variants(['One.', 'Two.', 'Three.']) });
      const [a, b, c] = [at(opened.subjects, 0), at(opened.subjects, 1), at(opened.subjects, 2)];
      const chosen = await board.resolveGate(choose(gateOf(opened), b));
      expect(chosen).toMatchObject({ ok: true, value: { currentStageKey: 'publish' } });
      expect(state.storage.sql.exec('SELECT status, decision, approval_subject_id, approval_subject_digest FROM gates WHERE id = ?', gateOf(opened)).one()).toEqual({
        status: 'resolved', decision: 'approve_automatic', approval_subject_id: b.id, approval_subject_digest: b.digest,
      });
      expect(state.storage.sql.exec('SELECT active_approval_subject_id FROM cards WHERE id = ?', opened.cardId).one()).toEqual({ active_approval_subject_id: b.id });
      expect(subjectRow(state, b.id)).toEqual({ status: 'active', invalidation_reason: null });
      for (const other of [a, c]) expect(subjectRow(state, other.id)).toEqual({ status: 'invalidated', invalidation_reason: 'choice.not_chosen' });

      // The gate reads back with what was chosen, and its history keeps every variant.
      const read = await board.getGate(gateOf(opened));
      expect(read).toMatchObject({ ok: true, value: { approvalSubject: { id: b.id }, variants: [{ id: 'v1', chosen: false, status: 'invalidated' }, { id: 'v2', chosen: true, status: 'active' }, { id: 'v3', chosen: false }] } });

      // From here it is the single-subject path: the publisher verifies the chosen subject unchanged.
      const claim = await board.claim({ agentId: PUBLISHER, capabilities: ['x-publish'] });
      if (!claim.claimed) throw new Error('publisher could not claim the approved card');
      const verify = (subject: Pick<SubjectRow, 'id' | 'digest'>) =>
        board.verifyApprovalSubject({ runId: claim.runId, leaseEpoch: claim.leaseEpoch, agentId: PUBLISHER, expectedSchema: 'social-publish/v1', expectedSubjectId: subject.id, expectedDigest: subject.digest, expectedAccount: ACCOUNT });
      expect(await verify(b)).toMatchObject({ ok: true, value: { subject: { id: b.id }, gate: { id: gateOf(opened) } } });
      expect(await verify(a)).toMatchObject({ ok: false, code: 'APPROVAL_SUBJECT_NOT_VERIFIED' });
    });
  });

  it('owes the manual-delivery follow-up on the chosen subject', async () => {
    await runInDurableObject(boardStub('variants-manual'), async (board: BoardDO, state) => {
      await initBoard(board, 'variants_manual');
      const opened = await addVariantCard(board, state);
      const second = at(opened.subjects, 1);
      expect((await board.resolveGate(choose(gateOf(opened), second, 'approve_manual'))).ok).toBe(true);
      const [follow] = await board.pendingDeliveryFollowUps();
      expect(follow).toMatchObject({ gateId: gateOf(opened), approvalSubject: { id: second.id, digest: second.digest } });
      expect(state.storage.sql.exec('SELECT subject_id, event FROM approval_delivery_events').toArray()).toEqual([{ subject_id: second.id, event: 'approved' }]);
    });
  });

  it('refuses an approval that names no variant, or none at all, and a binding that names no variant', async () => {
    await runInDurableObject(boardStub('variants-mismatch'), async (board: BoardDO, state) => {
      await initBoard(board, 'variants_mismatch');
      const opened = await addVariantCard(board, state);
      const [a, b] = [at(opened.subjects, 0), at(opened.subjects, 1)];
      const gateId = gateOf(opened);
      const refusals = [
        { gateId, decision: 'approve_automatic' as const, decidedBy: DECIDER },
        choose(gateId, { ...a, digest: b.digest }),
        choose(gateId, { ...a, id: 'aps_not_a_variant' }),
        choose(gateId, { ...a, id: 'aps_not_a_variant' }, 'reject'),
      ];
      for (const decision of refusals) {
        expect(await board.resolveGate(decision)).toMatchObject({ ok: false, code: 'APPROVAL_SUBJECT_MISMATCH' });
      }
      expect(await board.resolveGate(choose(gateId, a, 'approve_automatic', OTHER_HUMAN))).toMatchObject({ ok: false, code: 'APPROVAL_DECIDER_NOT_ALLOWED' });
      expect(await board.resolveGate(choose(gateId, a, 'approve_automatic', 'agt_fixture_other'))).toMatchObject({ ok: false, code: 'APPROVAL_DECIDER_NOT_ALLOWED' });
      expect(await board.resolveGate(choose(gateId, a, 'approve_automatic', PRODUCER))).toMatchObject({ ok: false, code: 'SEPARATION_OF_DUTIES' });
      expect(await board.resolveGate({ ...choose(gateId, a), decision: 'approve' })).toMatchObject({ ok: false, code: 'GATE_DECISION_NOT_ALLOWED' });
      // Nothing moved.
      expect(await board.getGate(gateId)).toMatchObject({ value: { status: 'pending' } });
      expect(opened.subjects.map((s) => subjectRow(state, s.id).status)).toEqual(['active', 'active']);
    });
  });

  it('refuses a variant whose subject is no longer active', async () => {
    await runInDurableObject(boardStub('variants-inactive'), async (board: BoardDO, state) => {
      await initBoard(board, 'variants_inactive');
      const opened = await addVariantCard(board, state);
      const a = at(opened.subjects, 0);
      state.storage.sql.exec(`UPDATE approval_subjects SET status = 'invalidated' WHERE id = ?`, a.id);
      expect(await board.resolveGate(choose(gateOf(opened), a))).toMatchObject({ ok: false, code: 'APPROVAL_SUBJECT_MISMATCH', message: expect.stringContaining('no longer active') });
    });
  });

  it.each(['request_changes', 'reject'] as const)('%s acts on the whole set, with or without a binding', async (decision) => {
    for (const bound of [false, true]) {
      await runInDurableObject(boardStub(`variants-${decision}-${bound}`), async (board: BoardDO, state) => {
        await initBoard(board, `variants_${decision}`);
        const opened = await addVariantCard(board, state);
        const a = at(opened.subjects, 0);
        const answer = bound ? choose(gateOf(opened), a, decision) : { gateId: gateOf(opened), decision, decidedBy: DECIDER, comment: 'Tighter, please.' };
        expect((await board.resolveGate(answer)).ok).toBe(true);
        for (const s of opened.subjects) expect(subjectRow(state, s.id)).toEqual({ status: 'invalidated', invalidation_reason: `gate.${decision}` });
        expect(state.storage.sql.exec('SELECT approval_subject_id FROM gates WHERE id = ?', gateOf(opened)).one()).toEqual({ approval_subject_id: null });
      });
    }
  });

  it('cancels the choice when the card changes while it waits: no editing while choosing', async () => {
    await runInDurableObject(boardStub('variants-edit'), async (board: BoardDO, state) => {
      await initBoard(board, 'variants_edit');
      const opened = await addVariantCard(board, state);
      expect((await board.updateCard(opened.cardId, { title: 'Retitled' })).ok).toBe(true);
      expect(await board.getGate(gateOf(opened))).toMatchObject({ value: { status: 'cancelled' } });
      for (const s of opened.subjects) expect(subjectRow(state, s.id)).toEqual({ status: 'invalidated', invalidation_reason: 'card.changed' });
      expect(await board.pendingGateDeliveries()).toEqual([]);
    });
  });

  it('is decided through the signed-in human route with the binding, which is how a board user chooses', async () => {
    const tenantId = 'tnt_variant_route';
    const boardId = 'brd_variant_route';
    let gateId = '';
    let chosen = { id: '', digest: '' };
    await runInDurableObject(boardStub(`${tenantId}:${boardId}`), async (board: BoardDO, state) => {
      await initBoard(board, 'variant_route', { tenantId, boardId });
      const opened = await addVariantCard(board, state);
      gateId = gateOf(opened);
      chosen = at(opened.subjects, 1);
    });
    const url = `https://api.test/v1/boards/${boardId}/gates/${gateId}`;
    const read = await SELF.fetch(url, { headers: auth(tenantId, { 'X-User-Id': DECIDER }) });
    const pending = await read.json<{ gate: Record<string, unknown> }>();
    // No subject of its own until one is chosen; the variants and a summary of the choice instead.
    expect(pending.gate).not.toHaveProperty('approvalSubject');
    expect(pending).toMatchObject({ gate: { status: 'pending', summary: expect.stringContaining('Choose one of 2'), variants: [{ id: 'v1', chosen: false }, { id: 'v2', chosen: false, status: 'active', approvalSubject: { id: chosen.id } }] } });
    const unbound = await SELF.fetch(`${url}/resolve`, { method: 'POST', headers: auth(tenantId, { 'X-User-Id': DECIDER }), body: JSON.stringify({ decision: 'approve_manual' }) });
    expect(unbound.status).toBe(409);
    expect(await unbound.json()).toMatchObject({ error: { code: 'APPROVAL_SUBJECT_MISMATCH' } });
    const response = await SELF.fetch(`${url}/resolve`, {
      method: 'POST',
      headers: auth(tenantId, { 'X-User-Id': DECIDER }),
      body: JSON.stringify({ decision: 'approve_manual', approvalSubjectId: chosen.id, approvalSubjectDigest: chosen.digest }),
    });
    expect(response.status).toBe(200);
    const after = await SELF.fetch(url, { headers: auth(tenantId, { 'X-User-Id': DECIDER }) });
    expect(await after.json()).toMatchObject({ gate: { status: 'resolved', decision: 'approve_manual', approvalSubject: { id: chosen.id } } });
  });
});

describe('a variant gate decided by a suite principal', () => {
  it('maps the signed-in person to their principal before a variant is chosen, as for a single subject', async () => {
    const tenantId = 'tnt_variant_principal';
    const boardId = 'brd_variant_principal';
    const principal = 'prn_0123456789abcdef0e01';
    const person = await upsertUserByEmail(env.DB, { email: 'variant-decider@example.com' });
    await setUserExternalMapping(env.DB, person.id, { externalId: principal, externalSource: 'agentpod' });
    const stages = STAGES.map((st) => (st.key === 'approve' ? { ...st, approvalDeciderPrincipalIds: [principal] } : st));
    let gateId = '';
    let chosen = { id: '', digest: '' };
    await runInDurableObject(boardStub(`${tenantId}:${boardId}`), async (board: BoardDO, state) => {
      await initBoard(board, 'variant_principal', { tenantId, boardId, stages });
      const opened = await addVariantCard(board, state);
      gateId = gateOf(opened);
      chosen = at(opened.subjects, 0);
    });
    const response = await SELF.fetch(`https://api.test/v1/boards/${boardId}/gates/${gateId}/resolve`, {
      method: 'POST',
      headers: auth(tenantId, { 'X-User-Id': person.id }),
      body: JSON.stringify({ decision: 'approve_automatic', approvalSubjectId: chosen.id, approvalSubjectDigest: chosen.digest }),
    });
    expect(response.status).toBe(200);
    const read = await SELF.fetch(`https://api.test/v1/boards/${boardId}/gates/${gateId}`, { headers: auth(tenantId, { 'X-User-Id': person.id }) });
    expect(await read.json()).toMatchObject({ gate: { decidedBy: principal, approvalSubject: { id: chosen.id } } });
  });
});

describe('a variant gate expires variant by variant', () => {
  it('refuses a variant past its expiry while another can still be chosen', async () => {
    await runInDurableObject(boardStub('variants-one-expired'), async (board: BoardDO, state) => {
      await initBoard(board, 'variants_one_expired');
      const opened = await addVariantCard(board, state, { variants: variants(['Old.', 'Live.'], ['2020-01-01T00:00:00Z', '2040-01-01T00:00:00Z']) });
      const [old, live] = [at(opened.subjects, 0), at(opened.subjects, 1)];
      expect(await board.resolveGate(choose(gateOf(opened), old))).toMatchObject({ ok: false, code: 'DECISION_EXPIRED', message: expect.stringContaining('choose another') });
      expect(await board.getGate(gateOf(opened))).toMatchObject({ value: { status: 'pending' } });
      expect((await board.resolveGate(choose(gateOf(opened), live))).ok).toBe(true);
    });
  });

  it('closes the gate as expired when every variant has expired, retiring them all', async () => {
    await runInDurableObject(boardStub('variants-all-expired'), async (board: BoardDO, state) => {
      await initBoard(board, 'variants_all_expired');
      const opened = await addVariantCard(board, state, { variants: variants(['Old.', 'Older.'], ['2020-01-01T00:00:00Z', '2019-01-01T00:00:00Z']) });
      const old = at(opened.subjects, 0);
      expect(await board.resolveGate(choose(gateOf(opened), old))).toMatchObject({ ok: false, code: 'DECISION_EXPIRED', message: expect.stringContaining('closed as expired') });
      expect(await board.getGate(gateOf(opened))).toMatchObject({ value: { status: 'resolved', decision: 'expired', decidedBy: null } });
      for (const s of opened.subjects) expect(subjectRow(state, s.id)).toEqual({ status: 'invalidated', invalidation_reason: 'gate.expired' });
    });
  });

  it('is closed by the sweep only once its last variant expires', async () => {
    await runInDurableObject(boardStub('variants-sweep'), async (board: BoardDO, state) => {
      await initBoard(board, 'variants_sweep');
      const opened = await addVariantCard(board, state, { variants: variants(['Soon.', 'Later.'], ['2030-01-01T00:00:00Z', '2040-01-01T00:00:00Z']) });
      expect(await board.sweepBoard('2035-01-01T00:00:00.000Z')).toMatchObject({ gatesExpired: 0 });
      expect(await board.getGate(gateOf(opened))).toMatchObject({ value: { status: 'pending' } });
      expect(await board.sweepBoard('2041-01-01T00:00:00.000Z')).toMatchObject({ gatesExpired: 1 });
      expect(await board.getGate(gateOf(opened))).toMatchObject({ value: { status: 'resolved', decision: 'expired' } });
      for (const s of opened.subjects) expect(subjectRow(state, s.id).status).toBe('invalidated');
    });
  });
});

describe('a preview bounded by bytes', () => {
  const blocks: PreviewBlock[] = [
    { type: 'text', label: 'Post', text: 'x'.repeat(500) },
    { type: 'field', label: 'Account', value: '@fixture on X' },
  ];
  const cost = blocks.reduce((n, b) => n + previewBlockBytes(b), 0);

  it('is unchanged and complete when it fits', () => {
    expect(boundedPreview(blocks, cost)).toEqual({ blocks, complete: true });
  });

  it('shortens the text that does not fit, drops what follows, and says it is incomplete', () => {
    const { blocks: kept, complete } = boundedPreview(blocks, 300);
    expect(complete).toBe(false);
    expect(kept).toHaveLength(1);
    expect(kept.reduce((n, b) => n + previewBlockBytes(b), 0)).toBeLessThanOrEqual(300);
    expect(kept[0]).toMatchObject({ type: 'text', label: 'Post', text: expect.stringMatching(/^x+…$/) });
  });

  it('never splits a character made of two UTF-16 units', () => {
    const { blocks: kept } = boundedPreview([{ type: 'text', text: '😀'.repeat(100) }], 41);
    const text = kept[0]?.type === 'text' ? kept[0].text : '';
    expect(text.endsWith('…')).toBe(true);
    expect(text.slice(0, -1)).toBe('😀'.repeat(text.slice(0, -1).length / 2));
  });
});
