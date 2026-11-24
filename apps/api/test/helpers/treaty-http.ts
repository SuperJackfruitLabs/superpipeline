/**
 * Treaty phase 1: every request and response on a contracted route is checked against treaty's
 * HTTP contracts, in every test that makes one.
 *
 * `test/setup.ts` wraps the Worker's own `fetch` (what `SELF.fetch` reaches) with `checkExchange`.
 * A request to a route none of the documents describe is not checked: those routes are not
 * contracted yet. On a contracted operation:
 *
 * - the response must validate against the operation's contract for its status (a status the
 *   contract does not name is a mismatch);
 * - a request the contract refuses must be refused (4xx). Tests send bad bodies on purpose, so an
 *   invalid request is not itself a mismatch; a server that accepts one is.
 *
 * A mismatch is recorded, and `setup.ts`'s `afterEach` fails the test that made it, naming the
 * operation, the status and the first errors.
 */
import { createBundle, matchRoute, openApi, validateRequest, validateResponse, type Api } from '@superjackfruitlabs/treaty-contracts';
import agentWork from '@superjackfruitlabs/treaty-contracts/data/schemas/http/superpipeline/agent-work.v1.openapi.json';
import approvals from '@superjackfruitlabs/treaty-contracts/data/schemas/http/superpipeline/approvals.v1.openapi.json';
import decisions from '@superjackfruitlabs/treaty-contracts/data/schemas/http/superpipeline/decisions.v1.openapi.json';
import push from '@superjackfruitlabs/treaty-contracts/data/schemas/http/superpipeline/push.v1.openapi.json';
import boardRead from '@superjackfruitlabs/treaty-contracts/data/schemas/http/superpipeline/board-read.v1.openapi.json';
import placement from '@superjackfruitlabs/treaty-contracts/data/schemas/http/superpipeline/placement.v1.openapi.json';
import cardRepositories from '@superjackfruitlabs/treaty-contracts/data/schemas/superpipeline-api/card-repositories.v1.json';
import runCheckpointPolicyV2 from '@superjackfruitlabs/treaty-contracts/data/schemas/superpipeline-api/run-checkpoint-policy.v2.json';
import errorV1 from '@superjackfruitlabs/treaty-contracts/data/schemas/common/error.v1.json';
import attentionPending from '@superjackfruitlabs/treaty-contracts/data/schemas/superpipeline/attention.pending.v1.json';
import deliveryPending from '@superjackfruitlabs/treaty-contracts/data/schemas/superpipeline/delivery.pending.v1.json';
import elicitationPending from '@superjackfruitlabs/treaty-contracts/data/schemas/superpipeline/elicitation.pending.v1.json';
import gatePending from '@superjackfruitlabs/treaty-contracts/data/schemas/superpipeline/gate.pending.v1.json';
import checkpointSettlement from '@superjackfruitlabs/treaty-contracts/data/schemas/superpipeline-api/checkpoint-settlement.v1.json';
import runCheckpoint from '@superjackfruitlabs/treaty-contracts/data/schemas/superpipeline-api/run-checkpoint.v1.json';
import runCheckpointPolicy from '@superjackfruitlabs/treaty-contracts/data/schemas/superpipeline-api/run-checkpoint-policy.v1.json';
import runCheckpointReceipt from '@superjackfruitlabs/treaty-contracts/data/schemas/superpipeline-api/run-checkpoint-receipt.v1.json';

export const DOCUMENTS = {
  agentWork: 'schemas/http/superpipeline/agent-work.v1.openapi.json',
  decisions: 'schemas/http/superpipeline/decisions.v1.openapi.json',
  approvals: 'schemas/http/superpipeline/approvals.v1.openapi.json',
  push: 'schemas/http/superpipeline/push.v1.openapi.json',
  boardRead: 'schemas/http/superpipeline/board-read.v1.openapi.json',
  placement: 'schemas/http/superpipeline/placement.v1.openapi.json',
} as const;

const bundle = createBundle({
  [DOCUMENTS.agentWork]: agentWork,
  [DOCUMENTS.decisions]: decisions,
  [DOCUMENTS.approvals]: approvals,
  [DOCUMENTS.push]: push,
  [DOCUMENTS.boardRead]: boardRead,
  [DOCUMENTS.placement]: placement,
  'schemas/common/error.v1.json': errorV1,
  'schemas/superpipeline-api/card-repositories.v1.json': cardRepositories,
  'schemas/superpipeline-api/run-checkpoint-policy.v2.json': runCheckpointPolicyV2,
  'schemas/superpipeline/attention.pending.v1.json': attentionPending,
  'schemas/superpipeline/delivery.pending.v1.json': deliveryPending,
  'schemas/superpipeline/elicitation.pending.v1.json': elicitationPending,
  'schemas/superpipeline/gate.pending.v1.json': gatePending,
  'schemas/superpipeline-api/checkpoint-settlement.v1.json': checkpointSettlement,
  'schemas/superpipeline-api/run-checkpoint.v1.json': runCheckpoint,
  'schemas/superpipeline-api/run-checkpoint-policy.v1.json': runCheckpointPolicy,
  'schemas/superpipeline-api/run-checkpoint-receipt.v1.json': runCheckpointReceipt,
});
const APIS: Api[] = Object.values(DOCUMENTS).map((path) => openApi(bundle, path));

/**
 * Documents that describe a service's routes only (every operation is `serviceToken`): checked on an
 * exchange a service token made. A person reaching the same path is answered by the person's route
 * (the board list with its counts, a 405 for a hold), which these contracts do not describe.
 */
const SERVICE_DOCUMENTS: ReadonlySet<string> = new Set([DOCUMENTS.boardRead, DOCUMENTS.placement]);

/**
 * Where this product and the contract disagree and the contract is believed wrong: reported, and
 * held here so the rest of the suite stays checked. Each entry names one operation and one status,
 * and why. Keep it empty; an entry that no longer matches anything fails (`unusedAllowances`).
 */
export const ALLOWED_MISMATCHES: readonly { operation: string; status: number; why: string }[] = [
  {
    operation: 'readBoard',
    status: 403,
    why: 'In Organization-plane mode a token whose org is not entitled to SuperPipeline is refused before any route runs with the plane contract\'s `{error: "product_not_enabled", org}` (accounts.token-claims), not error.v1; board-read.v1 names only error.v1 for 403. Reported to treaty.',
  },
];

/** How many exchanges were checked in this test file, by document, so a test can prove the hook ran. */
export const treatyHttpChecked: Record<string, number> = {
  [DOCUMENTS.agentWork]: 0,
  [DOCUMENTS.decisions]: 0,
  [DOCUMENTS.approvals]: 0,
  [DOCUMENTS.push]: 0,
  [DOCUMENTS.boardRead]: 0,
  [DOCUMENTS.placement]: 0,
};

const mismatches: string[] = [];
const allowanceUsed = new Set<number>();

/** The mismatches recorded since the last call, and clears them. */
export function takeMismatches(): string[] {
  return mismatches.splice(0);
}

function operationFor(method: string, path: string, service: boolean): { api: Api; operation: string } | null {
  for (const api of APIS) {
    if (!service && SERVICE_DOCUMENTS.has(api.path)) continue;
    const operation = matchRoute(api, method, path);
    if (operation) return { api, operation };
  }
  return null;
}

function parse(text: string): { ok: true; value: unknown } | { ok: false } {
  if (text === '') return { ok: true, value: undefined };
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

const first = (errors: string[]) => errors.slice(0, 5).join('\n  ');

/** Whether a request carries a service's bearer (a JWT whose `principalKind` is `service`), decoded only to choose documents. */
export function isServiceRequest(request: Request): boolean {
  const m = (request.headers.get('Authorization') ?? '').match(/^Bearer\s+[^.\s]+\.([^.\s]+)\.[^.\s]+$/);
  if (!m) return false;
  try {
    const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims: unknown = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)));
    return typeof claims === 'object' && claims !== null && 'principalKind' in claims && claims.principalKind === 'service';
  } catch {
    return false;
  }
}

/**
 * Check one exchange. `requestText` and `responseText` are the bodies as sent; `service` says the
 * request carried a service token, which the service-only documents need.
 */
export function checkExchange(method: string, url: string, requestText: string, status: number, contentType: string | null, responseText: string, service = false): void {
  const path = new URL(url).pathname;
  const found = operationFor(method, path, service);
  if (!found) return;
  const { api, operation } = found;
  treatyHttpChecked[api.path] = (treatyHttpChecked[api.path] ?? 0) + 1;
  const problems: string[] = [];

  // The request: a body the contract refuses (or one that is not JSON) must be refused.
  const sent = parse(requestText);
  const request = !sent.ok
    ? { valid: false, errors: ['the body is not JSON'] }
    : validateRequest(bundle, api, operation, sent.value);
  if (!request.valid && status < 400) {
    problems.push(`${operation} accepted (${status}) a request the contract refuses:\n  ${first(request.errors)}`);
  }

  // The response: always, against its status.
  if (status === 101) return; // a WebSocket upgrade carries no body
  const isJson = (contentType ?? '').includes('application/json');
  const received = isJson ? parse(responseText) : responseText === '' ? { ok: true as const, value: undefined } : { ok: false as const };
  if (!received.ok) {
    problems.push(`${operation} ${status}: the response is not JSON (${contentType ?? 'no content-type'})`);
  } else {
    const result = validateResponse(bundle, api, operation, status, received.value);
    if (!result.valid) problems.push(`${operation} ${status} does not validate against ${api.path}:\n  ${first(result.errors)}\n  body: ${responseText.slice(0, 400)}`);
  }

  if (problems.length === 0) return;
  const allowance = ALLOWED_MISMATCHES.findIndex((a) => a.operation === operation && a.status === status);
  if (allowance >= 0) {
    allowanceUsed.add(allowance);
    return;
  }
  mismatches.push(`${method} ${path}\n${problems.join('\n')}`);
}

/** Allowances no exchange in this file matched (for a test that wants to prove each is still needed). */
export function unusedAllowances(): string[] {
  return ALLOWED_MISMATCHES.filter((_, i) => !allowanceUsed.has(i)).map((a) => `${a.operation} ${a.status}`);
}

/**
 * Wrap a Worker `fetch` so every exchange it serves is checked. The request and response are
 * cloned, so the handler and the caller read the bodies they always did.
 */
export function withTreatyCheck<E, C>(fetch: (request: Request, env: E, ctx?: C) => Promise<Response>) {
  return async (request: Request, env: E, ctx?: C): Promise<Response> => {
    const requestText = request.body ? await request.clone().text() : '';
    const response = await fetch(request, env, ctx);
    if (response.status === 101 || response.webSocket) return response;
    const responseText = await response.clone().text();
    checkExchange(request.method, request.url, requestText, response.status, response.headers.get('content-type'), responseText, isServiceRequest(request));
    return response;
  };
}
