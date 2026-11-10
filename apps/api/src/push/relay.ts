/**
 * Publishing through the suite's event relay (treaty plan step 7).
 *
 * A deployment with `RELAY_URL` and `RELAY_TOKEN` sends each relayed event to the relay as a
 * CloudEvent in HTTP binary mode, beside the direct push, which keeps running. The body is the
 * same JSON the push carries; the relay publishes it to NATS JetStream, and subscribers (the
 * AgentPod hub) receive it from there.
 *
 * The delivery row is the outbox: it is queued in the transaction that opened the gate, and the
 * drain retries it like any push. Its id is fixed per row, so a retry the relay already stored
 * is a duplicate there, not a second event.
 */
import { eventSubject, eventType, toBinary, type CloudEvent } from '@superjackfruitlabs/treaty-cloudevents';
import catalog from '@superjackfruitlabs/treaty-event-schemas/catalog.json';
import type { Env } from '../env';

/** The config id a relay delivery row carries. Not a registered push config. */
export const RELAY_CONFIG_ID = 'relay';

/** What goes through the relay in step 7: gates only (treaty docs/2026-11-11-step-7-plan.md). */
export const RELAYED_EVENTS: ReadonlySet<string> = new Set(['gate.pending']);

export interface RelaySettings {
  url: string;
  token: string;
}

/** The relay this deployment publishes to, or null when it publishes to none. */
export function relaySettings(env: Pick<Env, 'RELAY_URL' | 'RELAY_TOKEN'> | undefined): RelaySettings | null {
  const url = env?.RELAY_URL?.trim();
  const token = env?.RELAY_TOKEN?.trim();
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

const dataschemaFor = new Map(catalog.events.filter((e) => e.producer === 'superpipeline').map((e) => [e.pushName, e.dataschema]));

/** The relay request for one delivery row: where to POST and the CloudEvent's headers. */
export function relayRequest(
  delivery: { id: number; body: string },
  board: { boardId: string; tenantId: string },
  relay: RelaySettings,
): { url: string; headers: Record<string, string> } {
  const parsed: unknown = JSON.parse(delivery.body);
  const event = typeof parsed === 'object' && parsed !== null && 'event' in parsed ? String(parsed.event) : '';
  const ts = typeof parsed === 'object' && parsed !== null && 'ts' in parsed ? String(parsed.ts) : '';
  const parts = event.split('.');
  const verb = parts.pop() ?? '';
  const name = { product: 'superpipeline', entity: parts.join('_'), verb };
  const dataschema = dataschemaFor.get(event);
  if (!dataschema) throw new Error(`no treaty schema for ${event}`);
  const attributes: Record<string, string> = {
    specversion: '1.0',
    id: `${board.boardId}:${delivery.id}`,
    source: `/superpipeline/boards/${board.boardId}`,
    type: eventType(name, 1),
    datacontenttype: 'application/json',
    dataschema,
  };
  if (ts) attributes.time = ts;
  const cloudEvent: CloudEvent = { attributes };
  const subject = eventSubject(board.tenantId, name);
  return {
    url: `${relay.url}/v1/events/${subject}`,
    headers: { ...toBinary(cloudEvent, 'http').headers, Authorization: `Bearer ${relay.token}` },
  };
}
