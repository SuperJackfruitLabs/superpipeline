/**
 * The direct push on the relay's envelope (treaty phase 2, ruling 1): CloudEvents binary-mode
 * headers, `x-treaty-signature` signed with the push config's token over `t.id.body`, and the
 * relay's retry rules. `X-Superpipeline-Signature` is still sent beside it until every receiver
 * verifies the treaty header. Checked against treaty's own vectors.
 */
import { runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import vectors from '@superjackfruitlabs/treaty-contracts/data/fixtures/cloudevents/push-delivery.json';
import { SIGNATURE_HEADER, verifyDelivery } from '@superjackfruitlabs/treaty-cloudevents';
import type { BoardDO } from '../src/board/board-do';
import { directPushHeaders, isRetryable, type PushSender } from '../src/push/deliver';
import { verifyGithubSignature } from '../src/references/github-signature';
import { boardStub, STAGES } from './approval-subject-fixtures';

const UTF8 = new TextEncoder();

describe("the direct push matches treaty's delivery vectors", () => {
  it('has vectors to check', () => {
    expect(vectors.deliveries.length).toBeGreaterThan(0);
  });

  for (const d of vectors.deliveries) {
    it(`${d.name}: the same headers and the same x-treaty-signature`, async () => {
      const { id, source } = d.event.attributes;
      const boardId = source.replace('/superpipeline/boards/', '');
      const headers = await directPushHeaders({ eventId: id, body: d.http.body, token: d.secret }, boardId, d.t * 1000);
      // Every header treaty names, exactly; the two old ones beside them.
      for (const [name, value] of Object.entries(d.http.headers)) expect({ name, value: headers[name] }).toEqual({ name, value });
      expect(new Set(Object.keys(headers))).toEqual(new Set([...Object.keys(d.http.headers), 'X-Superpipeline-Event', 'X-Superpipeline-Signature']));
      expect(headers['X-Superpipeline-Event']).toBe(JSON.parse(d.http.body).event);
      const legacy = headers['X-Superpipeline-Signature'] ?? '';
      expect(await verifyGithubSignature(d.secret, d.http.body, legacy)).toBe(true);
      await verifyDelivery(d.secret, headers[SIGNATURE_HEADER] ?? null, id, UTF8.encode(d.http.body), { nowMs: d.t * 1000 });
    });
  }
});

describe('a drained direct push', () => {
  it("is a signed CloudEvent under the event's id, verifiable with the config's token", async () => {
    await runInDurableObject(boardStub('push-envelope-drain'), async (board: BoardDO) => {
      await board.init({ id: 'brd_00000000000000f1', tenantId: 'tnt_env', name: 'Envelope', stages: STAGES });
      await board.registerPushConfig({ agentId: 'svc:prn_0000000000000000c0b3', url: 'https://library.example.com/events', token: 'lib-secret', events: ['card.created'] });
      await board.createCard({ title: 'x', ownerUserId: 'usr_a' });
      const [row] = await board.getPushDeliveries();
      const seen: Array<{ headers: Record<string, string>; body: string }> = [];
      const sender: PushSender = async (_url, init) => {
        seen.push({ headers: init.headers, body: init.body });
        return { status: 202 };
      };
      expect(await board.dispatchPushDeliveries(sender)).toEqual({ sent: 1, failed: 0 });
      const [sent] = seen;
      expect(sent?.headers).toMatchObject({
        'ce-specversion': '1.0',
        'ce-id': row?.eventId,
        'ce-source': '/superpipeline/boards/brd_00000000000000f1',
        'ce-type': 'com.superjackfruit.superpipeline.card.created.v1',
        'ce-dataschema': 'https://raw.githubusercontent.com/SuperJackfruitLabs/treaty/main/schemas/superpipeline/record.v1.json',
        'content-type': 'application/json',
        'X-Superpipeline-Event': 'card.created',
      });
      await verifyDelivery('lib-secret', sent?.headers[SIGNATURE_HEADER] ?? null, sent?.headers['ce-id'] ?? '', UTF8.encode(sent?.body ?? ''));
      const refused = await verifyDelivery('another-secret', sent?.headers[SIGNATURE_HEADER] ?? null, sent?.headers['ce-id'] ?? '', UTF8.encode(sent?.body ?? '')).then(
        () => false,
        () => true,
      );
      expect(refused).toBe(true);
      expect(await verifyGithubSignature('lib-secret', sent?.body ?? '', sent?.headers['X-Superpipeline-Signature'] ?? '')).toBe(true);
    });
  });
});

describe("the relay's retry rules (ruling 4)", () => {
  it('retries 408, 429, 5xx and no answer; nothing else', () => {
    expect([0, 408, 429, 500, 502, 503, 504].filter((s) => !isRetryable(s))).toEqual([]);
    expect([301, 400, 401, 403, 404, 409, 410, 422].filter((s) => isRetryable(s))).toEqual([]);
  });

  for (const [status, after] of [[503, 'failed'], [404, 'dead'], [409, 'dead'], [429, 'failed']] as const) {
    it(`a receiver answering ${status} leaves the delivery ${after} after one attempt`, async () => {
      await runInDurableObject(boardStub(`push-envelope-retry-${status}`), async (board: BoardDO) => {
        await board.init({ id: 'brd_00000000000000f2', tenantId: 'tnt_env', name: 'Retry', stages: STAGES });
        await board.registerPushConfig({ agentId: 'svc:prn_0000000000000000c0b3', url: 'https://library.example.com/events', token: 's', events: ['card.created'] });
        await board.createCard({ title: 'x', ownerUserId: 'usr_a' });
        await board.dispatchPushDeliveries(async () => ({ status }));
        expect((await board.getPushDeliveries()).map((r) => ({ status: r.status, attempts: r.attempts }))).toEqual([{ status: after, attempts: 1 }]);
      });
    });
  }
});
