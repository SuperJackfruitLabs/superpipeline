import { describe, it, expect } from 'vitest';
import { signAndSend, type PushSender } from '../src/push/deliver';
import { SIGNATURE_HEADER, verifyDelivery } from '@superjackfruitlabs/treaty-cloudevents';

const WORK = JSON.stringify({ event: 'work.available', boardId: 'b', cardId: 'c', stageKey: 's', ts: '2026-11-23T00:00:00.000Z' });

/** docs/05 §4: each outbound delivery is signed `x-treaty-signature`; the receiver verifies, then may claim. */
describe('signAndSend', () => {
  it('signs the body with the config token and POSTs it (verifiable by the receiver)', async () => {
    const calls: Array<{ url: string; headers: Record<string, string>; body: string }> = [];
    const sender: PushSender = async (url, init) => {
      calls.push({ url, headers: init.headers, body: init.body });
      return { status: 200 };
    };
    const body = JSON.stringify({ event: 'work.available', boardId: 'brd_1', cardId: 'card_1' });
    const out = await signAndSend({ id: 1, eventId: 'brd_1:1', url: 'https://agent.example/hook', body, token: 's3cret' }, 'brd_1', sender);

    expect(out.ok).toBe(true);
    expect(out.status).toBe(200);
    expect(calls[0]!.url).toBe('https://agent.example/hook');
    const headers = calls[0]!.headers;
    // Treaty's verifier, the one every receiver uses, accepts it under the config's token and no other.
    const bytes = new TextEncoder().encode(body);
    await verifyDelivery('s3cret', headers[SIGNATURE_HEADER] ?? null, 'brd_1:1', bytes);
    await expect(verifyDelivery('wrong', headers[SIGNATURE_HEADER] ?? null, 'brd_1:1', bytes)).rejects.toThrow('signature does not match');
    // The older body-only signature and event name are no longer sent.
    expect(headers).not.toHaveProperty('X-Superpipeline-Signature');
    expect(headers).not.toHaveProperty('X-Superpipeline-Event');
  });

  it('reports a non-2xx response as not ok', async () => {
    const out = await signAndSend({ id: 1, eventId: 'b:1', url: 'x', body: WORK, token: 't' }, 'b', async () => ({ status: 500 }));
    expect(out.ok).toBe(false);
    expect(out.status).toBe(500);
  });

  it('reports a thrown sender (network failure) as not ok', async () => {
    const out = await signAndSend({ id: 1, eventId: 'b:1', url: 'x', body: WORK, token: 't' }, 'b', async () => {
      throw new Error('network down');
    });
    expect(out.ok).toBe(false);
    expect(out.status).toBe(0);
  });

  it('sends nothing for a body treaty has no schema for, and reports it as not answered', async () => {
    let called = false;
    const out = await signAndSend({ id: 1, eventId: 'b:1', url: 'x', body: '{}', token: 't' }, 'b', async () => {
      called = true;
      return { status: 200 };
    });
    expect(out).toEqual({ id: 1, ok: false, status: 0 });
    expect(called).toBe(false);
  });
});
