import { env } from 'cloudflare:test';

/**
 * The issuers currently installed, innermost last. A stack rather than a save/restore pair:
 * when a test times out, vitest moves on but its `withIssuer` body keeps running, and its
 * `finally` used to restore the fetch it saw and delete `HUB_ISSUER` in the middle of the NEXT
 * test's `withIssuer` — which then read 401s from a token it had signed correctly. Each exit now
 * removes only its own entry, and the global state is torn down only when the stack is empty.
 */
const active: Array<{ issuer: string; jwksBody: string }> = [];
let realFetch: typeof fetch | undefined;

function apply(): void {
  const vars = env as unknown as Record<string, unknown>;
  const top = active[active.length - 1];
  if (top) {
    vars.HUB_ISSUER = top.issuer;
    return;
  }
  delete vars.HUB_ISSUER;
  if (realFetch) globalThis.fetch = realFetch;
  realFetch = undefined;
}

/**
 * Run `fn` with `HUB_ISSUER` set to `issuer` and the issuer's JWKS URL answered from `jwksBody`;
 * every other fetch goes to the real one. Restores both afterwards.
 */
export async function withIssuer<T>(issuer: string, jwksBody: string, fn: () => Promise<T>): Promise<T> {
  const entry = { issuer, jwksBody };
  if (!realFetch) {
    const original = globalThis.fetch;
    realFetch = original;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const hit = [...active].reverse().find((e) => String(input) === `${e.issuer}/api/auth/jwks`);
      return hit
        ? new Response(hit.jwksBody, { headers: { 'content-type': 'application/json' } })
        : original(input as RequestInfo, init);
    }) as typeof fetch;
  }
  active.push(entry);
  apply();
  try {
    return await fn();
  } finally {
    active.splice(active.indexOf(entry), 1);
    apply();
  }
}
