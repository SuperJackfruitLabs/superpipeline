/**
 * The hub callback signs you in.
 *
 * superpipeline already walked through the hub's front door — PKCE, state, a server-to-server
 * exchange (`hub-oauth.test.ts` covers all of that) — and then treated what came back as a bearer
 * token to hand to the SPA rather than as proof of who somebody is. It created no user and minted
 * no session, where the GitHub callback at `auth/routes.ts` does both.
 *
 * Resolution is by principal, then by verified email exactly once, then create.
 *
 * **The adoption step is the riskiest behaviour in this repository's auth**, because it is the one
 * place a wrong decision attaches one person's account to another person's identity. Two
 * conditions guard it and neither is optional:
 *
 *   - without `email_verified === true`, anyone who can make the issuer assert an address takes
 *     over the account at that address;
 *   - without the has-no-mapping check, a second principal captures an account that already
 *     belongs to somebody.
 *
 * Each is pinned below by a test that fails if its condition is deleted, which is the only kind of
 * test worth having here: a guard nothing discriminates on is a comment.
 *
 * The last property is the one that makes this safe to deploy on a service with no staging
 * environment: a token this code cannot turn into a person — no mapping, no verified email, not
 * even verifiable — is handed on to the SPA exactly as it was before, so that caller is never
 * worse off than it was.
 */
import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { handleHubRoute } from '../src/auth/hub-oauth';
import { verifySession, type SessionPayload } from '../src/auth/session';
import {
  findUserByExternal,
  primaryTenant,
  setUserExternalMapping,
  upsertUserByEmail,
} from '../src/db/catalog';
import type { Env } from '../src/env';

const ISSUER = 'https://hub.signin.test';
const APP = 'https://superpipeline.signin.test';
const FLEET = 'fleet_0000000000000signin';
const SECRET = 'test-session-secret';
const KID = 'signin-kid';

/**
 * ONE issuer for the whole file, minted once (the same trap `hub-principal-role.test.ts` names):
 * `hub-jwt.ts` caches a JWKS per issuer for ten minutes and refetches only on an unknown `kid`, so
 * a fresh key pair per test reusing this `kid` would verify against the first test's cached key
 * and fail — the cache working correctly, not a bug.
 */
let issuerOnce: Promise<{ signingKey: CryptoKey; jwksBody: string }> | null = null;
function issuerKeys() {
  issuerOnce ??= (async () => {
    const pair = await generateKeyPair('EdDSA', { extractable: true });
    const jwksBody = JSON.stringify({ keys: [{ ...(await exportJWK(pair.publicKey)), alg: 'EdDSA', kid: KID }] });
    return { signingKey: pair.privateKey, jwksBody };
  })();
  return issuerOnce;
}

/** A hub token over the given claims. `sub`, `tenant` and `principalKind` default to a person. */
async function mintToken(claims: Record<string, unknown>): Promise<string> {
  const { signingKey } = await issuerKeys();
  return new SignJWT({ principalKind: 'human', tenant: FLEET, ...claims })
    .setProtectedHeader({ alg: 'EdDSA', kid: KID })
    .setIssuer(ISSUER)
    .setAudience(ISSUER)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(signingKey);
}

function envWith(over: Record<string, unknown> = {}): Env {
  return { ...env, HUB_ISSUER: ISSUER, APP_URL: APP, SESSION_SECRET: SECRET, ...over } as unknown as Env;
}

/**
 * The hub, from this Worker's side: it publishes a key set and it answers one exchange.
 *
 * Both go through the injected `fetch`, so a test never has to reach for `globalThis` — the
 * callback now makes two outbound calls, not one, and the second one (the JWKS) is what turns the
 * exchanged token into claims.
 */
function hubStub(token: string | null) {
  const exchanges: { url: string; init: RequestInit }[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === `${ISSUER}/api/auth/jwks`) {
      const { jwksBody } = await issuerKeys();
      return new Response(jwksBody, { headers: { 'Content-Type': 'application/json' } });
    }
    exchanges.push({ url, init: init ?? {} });
    return new Response(JSON.stringify(token === null ? { error_description: 'no' } : { token, expiresIn: 300 }), {
      status: token === null ? 400 : 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return { impl, exchanges };
}

function setCookies(res: Response): string[] {
  return (res.headers as unknown as { getSetCookie(): string[] }).getSetCookie();
}

function cookieOf(cookies: string[], name: string): string | null {
  for (const c of cookies) {
    const [pair] = c.split(';');
    const [k, ...v] = pair.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

/** The session this callback minted, verified as `resolveUser` would verify it. Null when none. */
async function sessionOf(res: Response): Promise<SessionPayload | null> {
  const raw = cookieOf(setCookies(res), 'superpipeline_session');
  if (!raw) return null;
  return verifySession(raw, SECRET);
}

/** Walk the whole flow: connect, then land on the callback with `token` coming back from the hub. */
async function callbackWithToken(token: string | null, over: Record<string, unknown> = {}) {
  const e = envWith(over);
  const connected = await handleHubRoute(new Request(`${APP}/hub/connect`, { method: 'POST' }), e, '/hub/connect');
  if (!connected) throw new Error('/hub/connect was not routed');
  const pkce = cookieOf(setCookies(connected), 'superpipeline_hub_pkce');
  const { url } = (await connected.json()) as { url: string };
  const state = new URL(url).searchParams.get('state') ?? '';

  const hub = hubStub(token);
  const res = await handleHubRoute(
    new Request(`${APP}/hub/callback?code=c0de&state=${encodeURIComponent(state)}`, {
      headers: { Cookie: `superpipeline_hub_pkce=${pkce}` },
    }),
    e,
    '/hub/callback',
    hub.impl,
  );
  if (!res) throw new Error('/hub/callback was not routed');
  return { res, hub };
}

/** Sign in through the hub with a token carrying exactly these claims. */
async function signInViaHub(claims: Record<string, unknown>, over: Record<string, unknown> = {}) {
  return callbackWithToken(await mintToken(claims), over);
}

describe('the hub callback resolves a local user', () => {
  it('adopts an existing user on a verified email, once', async () => {
    const existing = await upsertUserByEmail(env.DB, { email: 'adopt@example.com', name: 'A' });

    const { res } = await signInViaHub({ sub: 'prn_adopt', email: 'adopt@example.com', email_verified: true });

    const mapped = await findUserByExternal(env.DB, 'agentpod', 'prn_adopt');
    expect(mapped?.id).toBe(existing.id);
    // Adopted, not duplicated: the row that existed is the row that is now linked.
    const session = await sessionOf(res);
    expect(session?.userId).toBe(existing.id);
    // And the SPA still gets its token — signing in is something the callback does AS WELL AS
    // handing the token on, never instead of it.
    expect(cookieOf(setCookies(res), 'superpipeline_hub_token')).toBeTruthy();
    expect(res.status).toBe(302);
  });

  it('refuses to adopt on an unverified email', async () => {
    // Delete `claims.email_verified === true` from the guard and this test fails: anyone who can
    // make the issuer assert an address would otherwise take over the account at that address.
    const existing = await upsertUserByEmail(env.DB, { email: 'unverified@example.com', name: 'A' });

    const { res } = await signInViaHub({ sub: 'prn_unverified', email: 'unverified@example.com', email_verified: false });

    expect(await findUserByExternal(env.DB, 'agentpod', 'prn_unverified')).toBeNull();
    expect(await sessionOf(res)).toBeNull();
    // Untouched, not merely unmapped — no session names that person either.
    expect((await findUserByExternal(env.DB, 'agentpod', 'prn_unverified'))?.id).not.toBe(existing.id);
    // The token is handed on regardless: nobody is worse off than before this change.
    expect(res.status).toBe(302);
    expect(cookieOf(setCookies(res), 'superpipeline_hub_token')).toBeTruthy();
  });

  it('treats a missing email_verified claim as unverified', async () => {
    // A token minted before the hub grew the claim carries an email and no verdict on it. That is
    // not a verdict of "verified", and `=== true` is what makes the difference.
    await upsertUserByEmail(env.DB, { email: 'noverdict@example.com', name: 'A' });

    const { res } = await signInViaHub({ sub: 'prn_noverdict', email: 'noverdict@example.com' });

    expect(await findUserByExternal(env.DB, 'agentpod', 'prn_noverdict')).toBeNull();
    expect(await sessionOf(res)).toBeNull();
  });

  it('refuses to adopt a user who already has a mapping', async () => {
    // Delete the has-no-mapping check and this test fails: a second principal asserting the same
    // address would capture an account that already belongs to somebody.
    const existing = await upsertUserByEmail(env.DB, { email: 'taken@example.com', name: 'A' });
    await setUserExternalMapping(env.DB, existing.id, { externalId: 'prn_first', externalSource: 'agentpod' });

    const { res } = await signInViaHub({ sub: 'prn_second', email: 'taken@example.com', email_verified: true });

    const first = await findUserByExternal(env.DB, 'agentpod', 'prn_first');
    expect(first?.id, 'the first principal still holds that account').toBe(existing.id);
    expect(await findUserByExternal(env.DB, 'agentpod', 'prn_second')).toBeNull();
    expect(await sessionOf(res)).toBeNull();
    expect(res.status).toBe(302);
  });

  it('resolves an already-mapped user from a token with no email at all', async () => {
    // The tokens in production today carry no email claim. A principal somebody has already
    // linked must still sign in from one, or this change would be undeployable until the hub's
    // new claims are live everywhere.
    const existing = await upsertUserByEmail(env.DB, { email: 'mapped@example.com', name: 'M' });
    await setUserExternalMapping(env.DB, existing.id, { externalId: 'prn_mapped', externalSource: 'agentpod' });

    const { res } = await signInViaHub({ sub: 'prn_mapped' });

    const session = await sessionOf(res);
    expect(session?.userId).toBe(existing.id);
    expect(session?.tenantId).toBeTruthy();
  });

  it('creates a user and a workspace when nothing matches', async () => {
    const { res } = await signInViaHub({ sub: 'prn_new', email: 'new@example.com', email_verified: true });

    const created = await findUserByExternal(env.DB, 'agentpod', 'prn_new');
    expect(created).not.toBeNull();
    expect(created!.email).toBe('new@example.com');
    const tenant = await primaryTenant(env.DB, created!.id);
    expect(tenant, 'a new user with no workspace has nowhere to be').not.toBeNull();

    const session = await sessionOf(res);
    expect(session?.userId).toBe(created!.id);
    expect(session?.tenantId).toBe(tenant!.id);
  });

  it('does not create a second user for a principal that already has one', async () => {
    await signInViaHub({ sub: 'prn_twice', email: 'twice@example.com', email_verified: true });
    const first = await findUserByExternal(env.DB, 'agentpod', 'prn_twice');
    const { res } = await signInViaHub({ sub: 'prn_twice', email: 'twice@example.com', email_verified: true });
    const second = await findUserByExternal(env.DB, 'agentpod', 'prn_twice');
    expect(second?.id).toBe(first?.id);
    expect((await sessionOf(res))?.userId).toBe(first?.id);
  });

  it('follows the principal, not the email, once the two disagree', async () => {
    // The mapping is the identity. A person who changed their address at the hub is still the
    // same row here, and must not be adopted into — or create — a second one.
    const existing = await upsertUserByEmail(env.DB, { email: 'old@example.com', name: 'O' });
    await setUserExternalMapping(env.DB, existing.id, { externalId: 'prn_moved', externalSource: 'agentpod' });

    const { res } = await signInViaHub({ sub: 'prn_moved', email: 'new-address@example.com', email_verified: true });

    expect((await sessionOf(res))?.userId).toBe(existing.id);
    expect(
      await env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind('new-address@example.com').first(),
      'no second row for the new address',
    ).toBeNull();
  });
});

describe('a token the callback cannot turn into a person', () => {
  it('is handed to the SPA exactly as before, signing nobody in', async () => {
    // Neither a mapping nor a verified email. This is the property that makes the change safe to
    // deploy: that caller is no worse off than it was, and the flow it already had still works.
    const { res } = await signInViaHub({ sub: 'prn_stranger' });

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/');
    expect(cookieOf(setCookies(res), 'superpipeline_hub_token')).toBeTruthy();
    expect(await sessionOf(res)).toBeNull();
    expect(await findUserByExternal(env.DB, 'agentpod', 'prn_stranger')).toBeNull();
  });

  it('does not sign in an agent or a service principal', async () => {
    // `resolveHubUser` refuses a non-human token outright; minting a browser session for one here
    // would be the same confusion with a cookie attached.
    for (const principalKind of ['agent', 'service']) {
      const sub = `prn_${principalKind}`;
      const { res } = await signInViaHub({ sub, principalKind, email: `${principalKind}@example.com`, email_verified: true });
      expect(await sessionOf(res)).toBeNull();
      expect(await findUserByExternal(env.DB, 'agentpod', sub)).toBeNull();
    }
  });

  it('does not fail the callback when the token does not verify at all', async () => {
    // A forged, expired or foreign token reaching here is not this route's problem to report: it
    // buys nothing anywhere else either, because every route verifies it again.
    const { res } = await callbackWithToken('not.a.jwt');
    expect(res.status).toBe(302);
    expect(cookieOf(setCookies(res), 'superpipeline_hub_token')).toBe('not.a.jwt');
    expect(await sessionOf(res)).toBeNull();
  });

  it('signs nobody in when this deployment has no session secret', async () => {
    // Without it there is nothing to sign a cookie with. The hub handoff predates human sign-in
    // on this deployment shape and must keep working without one.
    const { res } = await signInViaHub({ sub: 'prn_nosecret', email: 'nosecret@example.com', email_verified: true }, { SESSION_SECRET: undefined });
    expect(res.status).toBe(302);
    expect(cookieOf(setCookies(res), 'superpipeline_session')).toBeNull();
  });

  it('never reaches the identity step when the hub refused to issue a token', async () => {
    const { res } = await callbackWithToken(null);
    expect(res.status).toBe(400);
    expect(cookieOf(setCookies(res), 'superpipeline_session')).toBeNull();
  });
});
