import { runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { BoardDO } from '../src/board/board-do';
import { DECIDER, boardStub, boundDecision, openBoundGate } from './approval-subject-fixtures';

/** Manual delivery after approval: the live URL, its credential-free read-back, and reminders. */
describe('manual delivery after approval', () => {
  it('records a manual live URL with actor/time audit and an explicit unverified read-back status', async () => {
    const stub = boardStub('approval-manual-live-url');
    await runInDurableObject(stub, async (board: BoardDO, state) => {
      const opened = await openBoundGate(board, state, 'manual-live-url');
      await board.resolveGate({ ...boundDecision(opened.gate, opened.subject), decision: 'approve_manual' } as never);
      const recorded = await board.updateApprovalDelivery({
        gateId: opened.gate.id,
        actor: DECIDER,
        liveUrl: 'https://x.example.invalid/fixture/status/1',
      });
      expect(recorded).toMatchObject({
        ok: true,
        value: { delivery: { mode: 'manual', liveUrl: 'https://x.example.invalid/fixture/status/1', readBackStatus: 'not_checked' } },
      });
      expect(
        state.storage.sql
          .exec('SELECT event, actor, live_url FROM approval_delivery_events WHERE event = ?', 'live_url_recorded')
          .one(),
      ).toEqual({ event: 'live_url_recorded', actor: DECIDER, live_url: 'https://x.example.invalid/fixture/status/1' });
    });
  });

  it.each([
    ['matched', (digest: string) => digest], ['mismatch', () => `sha256:${'f'.repeat(64)}`],
  ] as const)('reads a public live URL back without posting credentials and marks %s', async (expectedStatus, liveDigest) => {
    const stub = boardStub(`approval-readback-${expectedStatus}`);
    await runInDurableObject(stub, async (board: BoardDO, state) => {
      const opened = await openBoundGate(board, state, `readback-${expectedStatus}`);
      await board.resolveGate(boundDecision(opened.gate, opened.subject, DECIDER, 'approve_manual'));
      const realFetch = globalThis.fetch;
      let requestHeaders = new Headers();
      globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
        requestHeaders = new Headers(init?.headers);
        return new Response('{}', { status: 200, headers: { 'content-type': 'application/json', 'x-superpipeline-approved-digest': liveDigest(opened.subject.digest) } });
      });
      try {
        const recorded = await board.updateApprovalDelivery({ gateId: opened.gate.id, actor: DECIDER, liveUrl: `https://x.com/fixture/status/${expectedStatus}` });
        expect(recorded).toMatchObject({ ok: true, value: { delivery: { readBackStatus: expectedStatus } } });
        expect(requestHeaders.has('authorization')).toBe(false);
        expect(state.storage.sql.exec('SELECT live_post_readback_status FROM gates WHERE id = ?', opened.gate.id).one()).toEqual({ live_post_readback_status: expectedStatus });
      } finally { globalThis.fetch = realFetch; }
    });
  });

  it('does not follow a redirect off the read-back host, and bounds the read-back with a timeout signal', async () => {
    const stub = boardStub('approval-readback-redirect');
    await runInDurableObject(stub, async (board: BoardDO, state) => {
      const opened = await openBoundGate(board, state, 'readback-redirect');
      await board.resolveGate(boundDecision(opened.gate, opened.subject, DECIDER, 'approve_manual'));
      const realFetch = globalThis.fetch;
      let redirectMode: RequestInit['redirect'];
      let hasSignal = false;
      globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
        redirectMode = init?.redirect;
        hasSignal = init?.signal instanceof AbortSignal;
        return new Response(null, { status: 302, headers: { location: 'https://internal.example.invalid/' } });
      });
      try {
        const recorded = await board.updateApprovalDelivery({ gateId: opened.gate.id, actor: DECIDER, liveUrl: 'https://x.com/fixture/status/redirect' });
        expect(recorded).toMatchObject({ ok: true, value: { delivery: { readBackStatus: 'not_checked' } } });
        expect(redirectMode).toBe('manual');
        expect(hasSignal).toBe(true);
      } finally { globalThis.fetch = realFetch; }
    });
  });

  it('does not record a live URL over a change made while the read-back was in flight', async () => {
    const stub = boardStub('approval-readback-race');
    await runInDurableObject(stub, async (board: BoardDO, state) => {
      const opened = await openBoundGate(board, state, 'readback-race');
      await board.resolveGate(boundDecision(opened.gate, opened.subject, DECIDER, 'approve_manual'));
      const realFetch = globalThis.fetch;
      globalThis.fetch = (async () => {
        // Another request lands mid-fetch and records its own live URL first.
        state.storage.sql.exec(`UPDATE gates SET live_post_url = ? WHERE id = ?`, 'https://x.com/fixture/status/first', opened.gate.id);
        return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
      });
      try {
        const recorded = await board.updateApprovalDelivery({ gateId: opened.gate.id, actor: DECIDER, liveUrl: 'https://x.com/fixture/status/second' });
        expect(recorded).toMatchObject({ ok: false, code: 'APPROVAL_SUBJECT_MISMATCH' });
        expect(state.storage.sql.exec('SELECT live_post_url FROM gates WHERE id = ?', opened.gate.id).one()).toEqual({ live_post_url: 'https://x.com/fixture/status/first' });
        expect(state.storage.sql.exec("SELECT COUNT(*) AS n FROM approval_delivery_events WHERE event = 'live_url_recorded'").one()).toEqual({ n: 0 });
      } finally { globalThis.fetch = realFetch; }
    });
  });

  it('stores a reminder time in one canonical form, so the sweep compares like with like', async () => {
    const stub = boardStub('approval-manual-reminder-offset');
    await runInDurableObject(stub, async (board: BoardDO, state) => {
      const opened = await openBoundGate(board, state, 'manual-reminder-offset');
      await board.resolveGate(boundDecision(opened.gate, opened.subject, DECIDER, 'approve_manual'));
      // 08:34:05 at +05:30 is 03:04:05 UTC; stored as typed, it would sort after every UTC time that day.
      expect(await board.updateApprovalDelivery({ gateId: opened.gate.id, actor: DECIDER, remindAt: '2029-01-02T08:34:05+05:30' })).toMatchObject({
        ok: true, value: { delivery: { remindAt: '2029-01-02T03:04:05.000Z' } },
      });
      await board.sweepBoard('2029-01-02T03:04:05.000Z');
      expect((await board.getNotifications()).filter((note) => note.kind === 'approval-delivery-reminder')).toHaveLength(1);
    });
  });

  it('reminds at the chosen time when manual delivery still has no live URL', async () => {
    const stub = boardStub('approval-manual-reminder');
    await runInDurableObject(stub, async (board: BoardDO, state) => {
      const opened = await openBoundGate(board, state, 'manual-reminder');
      await board.resolveGate(boundDecision(opened.gate, opened.subject, DECIDER, 'approve_manual'));
      const remindAt = '2029-01-02T03:04:05.000Z';
      expect(await board.updateApprovalDelivery({ gateId: opened.gate.id, actor: DECIDER, remindAt })).toMatchObject({
        ok: true, value: { delivery: { mode: 'manual', liveUrl: null, remindAt } },
      });
      await board.sweepBoard('2029-01-02T03:04:04.999Z');
      expect((await board.getNotifications()).filter((note) => note.kind === 'approval-delivery-reminder')).toHaveLength(0);
      await board.sweepBoard(remindAt);
      const reminders = (await board.getNotifications()).filter((note) => note.kind === 'approval-delivery-reminder');
      expect(reminders).toHaveLength(1);
      const [reminder] = reminders;
      expect(reminder).toMatchObject({ cardId: opened.cardId, userId: 'usr_fixture_owner' });
      expect(reminder?.body).toMatch(/record the live post URL.*switch to automatic/);
      expect((await board.staleCards({ nowIso: remindAt, attention: true })).find((card) => card.cardId === opened.cardId)).toMatchObject({
        why: { kind: 'needs-human', detail: expect.stringContaining('live post URL') },
      });
      const audits = state.storage.sql.exec("SELECT event FROM approval_delivery_events WHERE event IN ('reminder_scheduled', 'reminder_sent') ORDER BY created_at").toArray();
      expect(audits).toEqual([{ event: 'reminder_scheduled' }, { event: 'reminder_sent' }]);
    });
  });

});
