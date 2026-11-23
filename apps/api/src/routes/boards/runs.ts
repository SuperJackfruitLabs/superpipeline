import { CHECKPOINT_CLAIM_PROTOCOL, CHECKPOINT_CLAIM_PROTOCOLS } from '../../board/checkpoint-claims';
// Claims and the run verbs an agent drives a card with.
import { isKnownProvider, providerKeys, type StageOutcome } from '@superpipeline/contract';
import { z } from 'zod';
import type { AgentActivityType, Result, JsonValue } from '../../board/board-do';
import type { StrictDecision } from '../../board/strict-decision';
import { tenantById, principalIdsFor } from '../../db/catalog';
import { effectiveCapabilities } from '../../db/implications';
import { resolveReferenceInput } from '../../references/resolve';
import { readJson, readObject, refuse, refusal } from '../errors';
import type { BoardRequest } from './request';

// POST /v1/boards/:id/claims — an agent claims a ready card (docs/04 §3). Identity + capabilities
// come from the agent's token; the request body only carries concurrency/profile (and, in dev,
// the capabilities since the dev headers don't encode them).
export async function claim({ request, env, agent, stub }: BoardRequest): Promise<Response> {
  if (!agent!.agentId) return refuse('UNAUTHORIZED', 'an agent identity is required to claim');
  const sent = await readJson(request);
  if (!sent.ok) return sent.response;
  const input = sent.value;
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return refuse('INVALID_BODY', 'claim body must be a JSON object');
  }
  const payload = input as { capabilities?: unknown; maxConcurrency?: unknown; profileKey?: unknown; checkpointProtocol?: unknown; checkpointProtocols?: unknown; checkpointOnly?: unknown };
  if (payload.maxConcurrency !== undefined &&
      (typeof payload.maxConcurrency !== 'number' || !Number.isInteger(payload.maxConcurrency) || payload.maxConcurrency <= 0)) {
    return refuse('INVALID_INPUT', 'maxConcurrency must be a positive finite integer');
  }
  if (payload.capabilities !== undefined &&
      (!Array.isArray(payload.capabilities) || !payload.capabilities.every((cap): cap is string => typeof cap === 'string'))) {
    return refuse('INVALID_INPUT', 'capabilities must be an array of strings');
  }
  if (payload.profileKey !== undefined && typeof payload.profileKey !== 'string') {
    return refuse('INVALID_INPUT', 'profileKey must be a string');
  }
  if (payload.checkpointProtocol !== undefined && payload.checkpointProtocol !== CHECKPOINT_CLAIM_PROTOCOL) {
    return refuse('INVALID_INPUT', 'unsupported checkpointProtocol');
  }
  // Every protocol the claimant speaks, beside `checkpointProtocol` (which a server that predates
  // this list still reads): 1 to 8 known protocols, each once, v1 among them. A stage whose cards
  // choose their repositories is offered only to a claimant that lists v2.
  const protocols = payload.checkpointProtocols;
  if (protocols !== undefined && (payload.checkpointProtocol !== CHECKPOINT_CLAIM_PROTOCOL ||
      !Array.isArray(protocols) || protocols.length < 1 || protocols.length > 8 ||
      new Set(protocols).size !== protocols.length ||
      !protocols.every((p): p is string => typeof p === 'string' && (CHECKPOINT_CLAIM_PROTOCOLS as readonly string[]).includes(p)) ||
      !protocols.includes(CHECKPOINT_CLAIM_PROTOCOL))) {
    return refuse('INVALID_INPUT', 'checkpointProtocols must list 1 to 8 known checkpoint claim protocols, each once, including superpipeline.checkpoint-claim.v1, beside checkpointProtocol');
  }
  if (payload.checkpointOnly !== undefined && (typeof payload.checkpointOnly !== 'boolean' ||
      (payload.checkpointOnly && payload.checkpointProtocol !== CHECKPOINT_CLAIM_PROTOCOL))) {
    return refuse('INVALID_INPUT', 'checkpointOnly must be boolean and requires checkpointProtocol when true');
  }
  // Declared → effective. An agent staffed for `code-review` claims a `code` lane when the
  // workspace has said one implies the other. The expansion happens HERE, at the Worker
  // boundary, because the edges live in the catalog and the Durable Object has no D1: the
  // DO keeps matching a flat set and stays ignorant of where it came from.
  const declared = agent!.capabilities ?? payload.capabilities ?? [];
  const claimResult = await stub.claim({
    agentId: agent!.agentId,
    capabilities: await effectiveCapabilities(env.DB, agent!.tenantId, declared),
    // `agents.concurrency` has existed since migration 0001 and was read by nothing. It is
    // the operator's ceiling, so an agent may ask for LESS than it (a node that knows it is
    // busy) but never for more: the request is a preference, the column is the permission.
    maxConcurrency:
      payload.maxConcurrency !== undefined && agent!.concurrency !== undefined
        ? Math.min(payload.maxConcurrency, agent!.concurrency)
        : (payload.maxConcurrency ?? agent!.concurrency),
    profileKey: payload.profileKey,
    ...(payload.checkpointProtocol === CHECKPOINT_CLAIM_PROTOCOL ? { checkpointProtocol: payload.checkpointProtocol } : {}),
    ...(Array.isArray(protocols) ? { checkpointProtocols: protocols.filter((p): p is string => typeof p === 'string') } : {}),
    ...(payload.checkpointOnly !== undefined ? { checkpointOnly: payload.checkpointOnly } : {}),
    principalId: agent!.externalId,
  });
  return Response.json(claimResult);
}

// GET /v1/boards/:id/runs/:runId — the agent read surface (docs/04 §3 `getCard`): the card
// this run holds, its stage, the upstream handoff and the card's references. Scoped to the
// agent that claimed the run — a shared board is not readable through an agent token.
export async function runRead({ env, tenantId, agent, stub }: BoardRequest, runReadMatch: RegExpMatchArray): Promise<Response> {
  const result = await stub.getRunContext({ runId: runReadMatch[1], agentId: agent!.agentId });
  if (!result.ok) return refusal(result);
  // The answerer by principal too (users.external_id), for a reader that acts as that person in
  // the suite: the hub sets "Always allow" for them and reads their role from the org plane.
  // A user with no principal reads null, never a guess.
  const answerers = await principalIdsFor(env.DB, tenantId, result.value.elicitations.map((e) => e.answer?.answeredBy ?? null));
  return Response.json({
    ...result.value,
    elicitations: result.value.elicitations.map((e) =>
      e.answer ? { ...e, answer: { ...e.answer, answeredByPrincipal: answerers.get(e.answer.answeredBy) ?? null } } : e,
    ),
  });
}

// GET /v1/boards/:id/runs/:runId/attempts — the runs of the card this run holds, for the agent
// that holds the run (operator ruling 2026-10-28, board reads). Read-only; never another card.
export async function runAttempts({ agent, stub }: BoardRequest, runAttemptsMatch: RegExpMatchArray): Promise<Response> {
  const held = await stub.getRunContext({ runId: runAttemptsMatch[1], agentId: agent!.agentId });
  if (!held.ok) return refusal(held);
  return Response.json({ attempts: await stub.getAttempts(held.value.run.cardId) });
}

export async function evidenceReference({ request, env, agent, stub }: BoardRequest, evidenceRefMatch: RegExpMatchArray): Promise<Response> {
  const sent = await readJson(request);
  if (!sent.ok) return sent.response;
  const raw = sent.value;
  const parsed = z.object({ leaseEpoch: z.number().int().positive(), cardId: z.string().min(1).max(256), stageKey: z.string().min(1).max(256), export_id: z.uuid(), manifest_sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict().safeParse(raw);
  if (!parsed.success) return refuse('INVALID_INPUT', 'send leaseEpoch, cardId, stageKey, export_id and manifest_sha256, and nothing else');
  let hub: URL;
  try { hub = new URL(env.HUB_ISSUER ?? ''); } catch { return refuse('EVIDENCE_LINK_UNAVAILABLE', 'this plane has no evidence host configured'); }
  if (hub.protocol !== 'https:' || hub.username || hub.password || hub.pathname !== '/') return refuse('EVIDENCE_LINK_UNAVAILABLE', 'this plane has no evidence host configured');
  const p = parsed.data;
  const result = await stub.attachEvidenceReference({ runId: evidenceRefMatch[1], agentId: agent!.agentId!, leaseEpoch: p.leaseEpoch, cardId: p.cardId, stageKey: p.stageKey, exportId: p.export_id, manifestSha256: p.manifest_sha256,
    url: `${hub.origin}/api/evidence/exports/${p.export_id}?schema_version=agentpod-execution-export%2Fv1` });
  if (!result.ok) return refusal(result);
  return Response.json({ reference_id: result.value.id, verification: 'unverified' });
}

// The publisher's final authenticated lease fence. Authoritative stored bytes are returned
// only while the run/card/stage/subject/gate/account/expiry binding still agrees.
export async function approvalSubjectVerify({ request, agent, stub }: BoardRequest, approvalVerifyMatch: RegExpMatchArray): Promise<Response> {
  const sent = await readJson(request);
  if (!sent.ok) return sent.response;
  const p = (sent.value !== null && typeof sent.value === 'object' ? sent.value : {}) as {
    leaseEpoch?: number;
    expectedSchema?: string;
    expectedSubjectId?: string;
    expectedDigest?: string;
    expectedAccount?: JsonValue;
  };
  if (
    !Number.isInteger(p.leaseEpoch) ||
    typeof p.expectedSchema !== 'string' ||
    p.expectedSchema.length === 0 ||
    typeof p.expectedSubjectId !== 'string' ||
    p.expectedSubjectId.length === 0 ||
    typeof p.expectedDigest !== 'string' ||
    !/^sha256:[0-9a-f]{64}$/.test(p.expectedDigest) ||
    p.expectedAccount === undefined
  ) {
    return refuse('INVALID_APPROVAL_SUBJECT', 'leaseEpoch and exact schema, subject id, digest, and account are required');
  }
  const result = await stub.verifyApprovalSubject({
    runId: approvalVerifyMatch[1],
    leaseEpoch: p.leaseEpoch!,
    agentId: agent!.agentId,
    expectedSchema: p.expectedSchema,
    expectedSubjectId: p.expectedSubjectId,
    expectedDigest: p.expectedDigest,
    expectedAccount: p.expectedAccount,
  });
  if (!result.ok) return refusal(result);
  return Response.json(result.value);
}

/** A run verb's answer: the value under `key`, or the refusal with its status. */
const respond = (r: Result<unknown>, key: string): Response =>
  r.ok
    ? Response.json({ [key]: r.value })
    : refusal(r);

// POST /v1/boards/:id/runs/:runId/:action — agent run verbs (docs/04 §3)
export async function runVerb({ request, env, tenantId, agent, stub }: BoardRequest, runMatch: RegExpMatchArray): Promise<Response> {
  const runId = runMatch[1];
  const action = runMatch[2];
  const sent = await readObject(request);
  if (!sent.ok) return sent.response;
  const p = sent.value as {
    leaseEpoch: number;
    type?: AgentActivityType;
    strictDecision?: StrictDecision;
    ephemeral?: boolean;
    body?: string;
    action?: string;
    parameter?: JsonValue;
    result?: JsonValue;
    signal?: string;
    handoff?: JsonValue;
    outcome?: StageOutcome;
    findings?: string;
    question?: string;
    url?: string;
    title?: string;
    provider?: string;
    sourceType?: string;
    subtitle?: string;
    externalId?: string;
    metadata?: Record<string, unknown>;
    options?: JsonValue;
    output?: JsonValue;
    reason?: string;
    summary?: string;
    usage?: { model?: string; inputTokens?: number; outputTokens?: number; costUsd?: number };
  };

  // The lease says the run is current; `agentId` says it is *yours*. It is the principal the
  // token resolved to, never a client-asserted value (docs/04 §1).
  const lease = { runId, leaseEpoch: p.leaseEpoch, agentId: agent!.agentId };

  switch (action) {
    case 'heartbeat':
      return respond(await stub.heartbeat(lease), 'run');
    case 'activities':
      return respond(
        await stub.postActivity({
          ...lease,
          type: p.type ?? 'thought',
          strictDecision: p.strictDecision,
          ephemeral: p.ephemeral,
          body: p.body,
          action: p.action,
          parameter: p.parameter,
          result: p.result,
          signal: p.signal,
          usage: p.usage,
        }),
        'activity',
      );
    case 'complete':
      return respond(
        await stub.complete({
          ...lease,
          handoff: p.handoff,
          outcome: p.outcome,
          findings: p.findings,
          question: p.question,
          url: p.url,
          options: p.options,
        }),
        'card',
      );
    case 'block':
      return respond(await stub.block({ ...lease, reason: p.reason ?? '', summary: typeof p.summary === 'string' ? p.summary : undefined }), 'card');
    case 'fail':
      return respond(await stub.fail({ ...lease, reason: p.reason ?? '' }), 'card');
    case 'release':
      return respond(await stub.release(lease), 'card');
    case 'references': {
      // The run holder links what it produced from its own card; the card route stays human.
      // oxlint-disable-next-line typescript/no-unnecessary-type-conversion -- the body is cast, not parsed: String() is the parse
      if (p.provider !== undefined && !isKnownProvider(String(p.provider))) {
        // oxlint-disable-next-line typescript/no-unnecessary-type-conversion -- the body is cast, not parsed: String() is the parse
        return refuse('INVALID_INPUT', `unknown reference provider: ${String(p.provider)}. Known: ${providerKeys().join(', ')}`);
      }
      const refTenant = await tenantById(env.DB, tenantId);
      return respond(
        await stub.addRunReference({
          ...lease,
          reference: resolveReferenceInput(
            {
              cardId: '',
              // oxlint-disable-next-line typescript/no-unnecessary-type-conversion -- the body is cast, not parsed: String() is the parse
              url: String(p.url ?? ''),
              provider: p.provider,
              sourceType: p.sourceType,
              title: p.title,
              subtitle: p.subtitle,
              externalId: p.externalId,
              metadata: p.metadata,
              addedBy: 'agent',
            },
            refTenant?.forgeHost ?? null,
          ),
        }),
        'reference',
      );
    }
    case 'submit':
      return respond(await stub.submitForReview({ ...lease, output: p.output }), 'card');
    default:
      return refuse('UNKNOWN_RUN_ACTION', `unknown run action: ${action}`);
  }
}
