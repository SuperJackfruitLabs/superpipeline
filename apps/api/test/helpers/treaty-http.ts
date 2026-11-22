/**
 * Treaty phase 1: every request and response on a contracted route is checked against treaty's
 * HTTP contracts, in every test that makes one.
 *
 * `test/setup.ts` wraps the Worker's own `fetch` (what `SELF.fetch` reaches) with `checkExchange`.
 * A request to a route none of the three documents describe is not checked: those routes are not
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
} as const;

const bundle = createBundle({
  [DOCUMENTS.agentWork]: agentWork,
  [DOCUMENTS.decisions]: decisions,
  [DOCUMENTS.approvals]: approvals,
  'schemas/common/error.v1.json': errorV1,
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
 * Operations whose request body the document marks optional (`requestBody.required: false`), where
 * a request with no body at all is valid. treaty's `validateRequest` does not read `required`
 * (reported), so this hook does.
 */
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const OPTIONAL_BODY = new Set(
  [agentWork, decisions, approvals].flatMap((doc) =>
    Object.values(doc.paths).flatMap((ops: unknown) =>
      (isRecord(ops) ? Object.values(ops) : []).flatMap((op) =>
        isRecord(op) && typeof op.operationId === 'string' && isRecord(op.requestBody) && op.requestBody.required !== true ? [op.operationId] : [],
      ),
    ),
  ),
);

/**
 * Where this product and the contract disagree and the contract is believed wrong: reported, and
 * held here so the rest of the suite stays checked. Each entry names one operation and one status,
 * and why. Keep it empty; an entry that no longer matches anything fails (`unusedAllowances`).
 */
export const ALLOWED_MISMATCHES: readonly { operation: string; status: number; why: string }[] = [];

/** How many exchanges were checked in this test file, by document, so a test can prove the hook ran. */
export const treatyHttpChecked: Record<string, number> = {
  [DOCUMENTS.agentWork]: 0,
  [DOCUMENTS.decisions]: 0,
  [DOCUMENTS.approvals]: 0,
};

const mismatches: string[] = [];
const allowanceUsed = new Set<number>();

/** The mismatches recorded since the last call, and clears them. */
export function takeMismatches(): string[] {
  return mismatches.splice(0);
}

function operationFor(method: string, path: string): { api: Api; operation: string } | null {
  for (const api of APIS) {
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

/** Check one exchange. `requestText` and `responseText` are the bodies as sent. */
export function checkExchange(method: string, url: string, requestText: string, status: number, contentType: string | null, responseText: string): void {
  const path = new URL(url).pathname;
  const found = operationFor(method, path);
  if (!found) return;
  const { api, operation } = found;
  treatyHttpChecked[api.path] = (treatyHttpChecked[api.path] ?? 0) + 1;
  const problems: string[] = [];

  // The request: a body the contract refuses (or one that is not JSON) must be refused.
  const sent = parse(requestText);
  const request = !sent.ok
    ? { valid: false, errors: ['the body is not JSON'] }
    : sent.value === undefined && OPTIONAL_BODY.has(operation)
      ? { valid: true, errors: [] }
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
    checkExchange(request.method, request.url, requestText, response.status, response.headers.get('content-type'), responseText);
    return response;
  };
}
