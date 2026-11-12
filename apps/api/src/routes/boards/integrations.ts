// Push delivery, GitHub and Forgejo configuration, triggers and webhooks.
import type { JsonValue } from '../../board/board-do';
import { effectiveCapabilities } from '../../db/implications';
import { statusForCode } from '../errors';
import type { BoardRequest } from './request';

// POST /v1/boards/:id/push-configs — register an agent push subscription (docs/05 §4)
export async function pushConfigRegister({ request, env, tenantId, agent, stub }: BoardRequest): Promise<Response> {
  // An agent token subscribes the agent it authenticates — never the one a header names. A
  // person (session cookie or dev headers) still names the subscriber with `X-Agent-Id`.
  const agentId = agent ? agent.agentId : request.headers.get('X-Agent-Id');
  if (!agentId || agentId.trim() === '') return Response.json({ error: 'X-Agent-Id required' }, { status: 400 });
  // `svc:<prn>` names a service's own subscription (serviceRoute). registerPushConfig upserts on
  // (agent_id, url), so a person naming one could overwrite a service's config.
  if (agentId.startsWith('svc:')) return Response.json({ error: 'X-Agent-Id may not name a service' }, { status: 400 });
  const body = (await request.json()) as { url: string; token: string; capabilities?: string[]; events?: string[] };
  // Built from named fields rather than `...body`: `agentId` is the caller's own identity,
  // asserted by the `X-Agent-Id` header above — `as` strips nothing at runtime, so a body
  // `agentId` would otherwise win over the header for this call (it did, before this fix: a
  // caller could register the subscription under any agent id it liked while authenticating
  // as a different one). A cast is not validation, so the route has to name what it accepts
  // rather than forward what it received.
  if (body.events !== undefined && (!Array.isArray(body.events) || body.events.some((e) => typeof e !== 'string'))) {
    return Response.json({ error: { code: 'INVALID_BODY', message: '`events` must be an array of event names' } }, { status: 400 });
  }
  if (body.capabilities !== undefined && (!Array.isArray(body.capabilities) || body.capabilities.some((c) => typeof c !== 'string'))) {
    return Response.json({ error: { code: 'INVALID_BODY', message: '`capabilities` must be an array of strings' } }, { status: 400 });
  }
  // The capabilities `work.available` is matched on, chosen as a claim chooses them
  // (`routes/boards/runs.ts`): an agent token's own catalog row first, the body only where the
  // caller has no row (dev headers, or a person naming the subscriber), then expanded through the
  // workspace's implication edges. Without the expansion a config staffed for `code-review` was
  // never told of a `code` lane it could claim. The edges are read now, so a config picks up an
  // edge added later when it registers again.
  const declared = agent?.capabilities ?? body.capabilities ?? [];
  const result = await stub.registerPushConfig({
    agentId,
    url: body.url,
    token: body.token,
    capabilities: await effectiveCapabilities(env.DB, tenantId, declared),
    events: body.events,
  });
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json(result.value, { status: 201 });
}

// POST /v1/boards/:id/push/dispatch — drain the delivery queue (cron/admin) (docs/05 §4)
export async function pushDispatch({ stub }: BoardRequest): Promise<Response> {
  return Response.json(await stub.dispatchPushDeliveries());
}

// GET /v1/boards/:id/push/deliveries — inspect the delivery queue (docs/05 §4)
export async function pushDeliveries({ stub }: BoardRequest): Promise<Response> {
  return Response.json({ deliveries: await stub.getPushDeliveries() });
}

// PUT /v1/boards/:id/github — configure GitHub: webhook secret + issue→card trigger (docs/06 §3, docs/05 §6)
export async function githubConfig({ request, user, stub }: BoardRequest): Promise<Response> {
  const body = (await request.json()) as { secret?: string; issueTrigger?: boolean };
  // Wiring a repository to a board IS the act of authorising automated
  // dispatch from it, so the grant the operator holds at that moment is
  // recorded with the configuration. A webhook fires with nobody present;
  // without this the card it creates carries no authority and can never be
  // claimed under enforcement.
  //
  // Re-sent on every config write, deliberately: the grant is only as good
  // as the last person who confirmed it, and re-saving the settings is how
  // an operator refreshes it after their own permissions change.
  // Built from named fields rather than `{ ...body, triggerGrant }`: the spread came BEFORE
  // `triggerGrant`, so that field already wins today, but the cast above does not stop a
  // body from carrying other keys `setGithubConfig` happens to read — safe only because its
  // input type coincides with this one.
  const result = await stub.setGithubConfig({
    secret: body.secret,
    issueTrigger: body.issueTrigger,
    triggerGrant: user?.mayDispatch ?? null,
  });
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json(result.value);
}

// POST /v1/boards/:id/triggers — generic inbound trigger → one createCard path (docs/05 §6)
export async function triggerCreate({ request, user, stub }: BoardRequest): Promise<Response> {
  const body = (await request.json()) as {
    title: string;
    ownerUserId?: string;
    spec?: JsonValue;
    source?: { url: string; provider?: string; sourceType?: string; externalId?: string; title?: string; metadata?: JsonValue };
  };
  const result = await stub.createCardFromTrigger({
    title: body.title,
    ownerUserId: body.ownerUserId ?? user?.userId ?? 'usr_trigger',
    spec: body.spec,
    // This route DOES have a caller, unlike the webhook — so the grant
    // comes from them, and the board's standing grant is only the
    // fallback for when it doesn't.
    queuedGrant: user?.mayDispatch ?? null,
    source: body.source,
  });
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json(result.value, { status: 201 });
}

// PUT /v1/boards/:id/forge — this board's forge webhook secret.
//
// Separate from `PUT …/github` and holding its own secret: a board may legitimately receive
// from a forge-primary repository AND its GitHub mirror, and one shared secret would mean
// revoking either side's access revokes the other's.
export async function forgeSecret({ request, stub }: BoardRequest): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { secret?: string } | null;
  if (!body || typeof body.secret !== 'string' || body.secret.trim() === '') {
    return Response.json({ error: 'secret is required' }, { status: 400 });
  }
  const result = await stub.setForgeSecret(body.secret);
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json(result.value);
}

// POST /v1/boards/:id/webhooks/forge — inbound Forgejo webhook.
//
// Forgejo sends its own `X-Forgejo-*` headers and, for compatibility, GitHub-spelled ones
// too. The event and delivery are read from either, because a Gitea-typed webhook on an
// older instance sends `X-Gitea-*` and both are the same claim. The SIGNATURE is read only
// from Forgejo's own header: accepting `X-Hub-Signature-256` here would let a payload
// signed for the GitHub door in through this one.
export async function forgeWebhook({ request, stub }: BoardRequest): Promise<Response> {
  const rawBody = await request.text();
  const header = (...names: string[]): string | null => {
    for (const n of names) {
      const v = request.headers.get(n);
      if (v) return v;
    }
    return null;
  };
  const result = await stub.handleForgeWebhook({
    rawBody,
    signature: header('X-Forgejo-Signature', 'X-Gitea-Signature'),
    deliveryId: header('X-Forgejo-Delivery', 'X-Gitea-Delivery', 'X-GitHub-Delivery'),
    event: header('X-Forgejo-Event', 'X-Gitea-Event', 'X-GitHub-Event') ?? '',
  });
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json(result.value);
}

// POST /v1/boards/:id/webhooks/github — inbound GitHub webhook (docs/06 §3).
// GitHub can't send X-Tenant-Id, so the configured webhook URL carries ?tenant=; the HMAC
// signature (verified in the DO) is the real authentication.
export async function githubWebhook({ request, stub }: BoardRequest): Promise<Response> {
  const rawBody = await request.text();
  const result = await stub.handleGithubWebhook({
    rawBody,
    signature: request.headers.get('X-Hub-Signature-256'),
    deliveryId: request.headers.get('X-GitHub-Delivery'),
    event: request.headers.get('X-GitHub-Event') ?? '',
  });
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json(result.value);
}
