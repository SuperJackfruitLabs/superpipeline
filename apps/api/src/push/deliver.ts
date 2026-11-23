/**
 * Outbound push delivery (docs/05 §4): sign a queued delivery and POST it. Pull is the default; push
 * is an accelerator that just tells an agent to `claim`. The sender is injected so the send is
 * testable and so durability (Queue + Workflow with exponential backoff) can wrap it in production.
 *
 * The direct push travels on the relay's envelope (treaty phase 2, ruling 1): the CloudEvent in
 * HTTP binary mode under the event's id, signed `x-treaty-signature` with the config's token over
 * `<t>.<id>.<body>`. `X-Superpipeline-Signature` (an HMAC over the body alone) is still sent beside
 * it, until every receiver verifies the treaty header.
 */
import { SIGNATURE_HEADER, signDelivery, toBinary } from '@superjackfruitlabs/treaty-cloudevents';
import { hmacSignatureHeader } from '../crypto/hmac';
import { cloudEventFor } from './relay';

export interface PushDelivery {
  id: number;
  /** The event's id, `<boardId>:<seq>`: the CloudEvent id and what the treaty signature binds. */
  eventId: string;
  url: string;
  body: string; // JSON string — the exact bytes that are signed
  token: string; // per-config signing secret
}

export type PushSender = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{ status: number }>;

/** How long one push may take. A slow or down endpoint must not hold up the rest of the drain. */
export const PUSH_TIMEOUT_MS = 10_000;

export interface PushOutcome {
  id: number;
  ok: boolean;
  status: number;
}

/**
 * Whether a failed delivery is worth sending again: the relay's rule (treaty's receiver status
 * contract). 408, 429, 5xx and no answer at all (0) are transient; any other answer is the
 * receiver refusing the event for good, and retrying cannot change it.
 */
export function isRetryable(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

const UTF8 = new TextEncoder();

/** The headers one direct push carries: the CloudEvent's, both signatures and the event's name. */
export async function directPushHeaders(delivery: Pick<PushDelivery, 'eventId' | 'body' | 'token'>, boardId: string, nowMs = Date.now()): Promise<Record<string, string>> {
  const { event } = cloudEventFor(delivery, boardId);
  const parsed: unknown = JSON.parse(delivery.body);
  const name = typeof parsed === 'object' && parsed !== null && 'event' in parsed ? String(parsed.event) : '';
  return {
    ...toBinary(event, 'http').headers,
    [SIGNATURE_HEADER]: await signDelivery(delivery.token, delivery.eventId, UTF8.encode(delivery.body), nowMs),
    'X-Superpipeline-Signature': await hmacSignatureHeader(delivery.token, delivery.body),
    'X-Superpipeline-Event': name,
  };
}

/** Sign one direct push and send it. A body that cannot be built into its CloudEvent is not sent (status 0). */
export async function signAndSend(delivery: PushDelivery, boardId: string, sender: PushSender, timeoutMs = PUSH_TIMEOUT_MS, nowMs?: number): Promise<PushOutcome> {
  let headers: Record<string, string>;
  try {
    headers = await directPushHeaders(delivery, boardId, nowMs);
  } catch {
    return { id: delivery.id, ok: false, status: 0 };
  }
  return postWithTimeout(delivery.id, delivery.url, headers, delivery.body, sender, timeoutMs);
}

/** POST one delivery, cut off at `timeoutMs`. Never throws: a failure is `ok: false`, status 0 when nothing answered. */
export async function postWithTimeout(
  id: number,
  url: string,
  headers: Record<string, string>,
  body: string,
  sender: PushSender,
  timeoutMs = PUSH_TIMEOUT_MS,
): Promise<PushOutcome> {
  // The abort signal cuts a real fetch; the race cuts a sender that ignores it.
  const abort = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      abort.abort();
      reject(new Error('push timed out'));
    }, timeoutMs);
  });
  try {
    const res = await Promise.race([sender(url, { method: 'POST', headers, body, signal: abort.signal }), timedOut]);
    return { id, ok: res.status >= 200 && res.status < 300, status: res.status };
  } catch {
    return { id, ok: false, status: 0 };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
