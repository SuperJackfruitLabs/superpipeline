import { describe, it, expect, beforeEach } from 'vitest';
import { SignJWT } from 'jose';
import fixture from '@superjackfruitlabs/treaty-ecosystem-identity/token_claims.json';
import { verifyOrgPlaneToken, type OrgPlaneConfig } from '../src/auth/org-plane';
import { __resetJwksCacheForTests } from '../src/auth/hub-jwt';
import { PLANE, PLANE_JWKS, APP_AUD, MCP_AUD, KID, planeKeys } from './helpers/org-plane';

/**
 * treaty's `token_claims.json` (the package pinned in package.json) is the contract, and the
 * organization plane mints it. Bump only after diffing the two versions and fixing org-plane.ts.
 */
const FIXTURE_VERSION = 9;

/** sign() sets the registered claims itself: the examples' own iss and aud name the real plane. */
const SET_BY_SIGN = new Set(['iss', 'aud', 'iat', 'exp', 'jti']);
const examples = Object.entries(fixture.examples).map(
  ([name, example]): [string, Record<string, unknown>] => [
    name,
    Object.fromEntries(Object.entries(example).filter(([k]) => !SET_BY_SIGN.has(k))),
  ],
);
const always = [...fixture.standard, ...fixture.issued].filter((c) => c.required).map((c) => c.claim);
const CFG: OrgPlaneConfig = { issuer: PLANE, jwksUrl: PLANE_JWKS, audience: APP_AUD, mcpAudience: MCP_AUD, url: PLANE };
const fetchImpl = (async () =>
  new Response((await planeKeys()).jwksBody, { headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch;

async function sign(payload: Record<string, unknown>, drop?: string): Promise<string> {
  const { privateKey } = await planeKeys();
  const p: Record<string, unknown> = { jti: crypto.randomUUID(), ...payload };
  // Drop BEFORE constructing: SignJWT copies the payload, so a later delete would not reach the token.
  if (drop && drop in p) delete p[drop];
  let t = new SignJWT(p).setProtectedHeader({ alg: 'EdDSA', kid: KID });
  if (drop !== 'iss') t = t.setIssuer(PLANE);
  if (drop !== 'aud') t = t.setAudience([APP_AUD, `${PLANE}/api/auth/oauth2/userinfo`]);
  if (drop !== 'iat') t = t.setIssuedAt();
  if (drop !== 'exp') t = t.setExpirationTime('5m');
  return t.sign(privateKey);
}

beforeEach(() => __resetJwksCacheForTests());

describe('the plane claim contract, as superpipeline reads it', () => {
  it('pins the fixture version', () => {
    expect(fixture.version, 'contract fixture changed: diff it, fix org-plane.ts, then bump').toBe(FIXTURE_VERSION);
  });

  it.each(examples)('verifies the %s example verbatim', async (_name, example) => {
    const claims = await verifyOrgPlaneToken(await sign(example), CFG, APP_AUD, fetchImpl);
    expect(claims).not.toBeNull();
    for (const [k, v] of Object.entries(example)) expect(claims![k as keyof typeof claims]).toEqual(v);
  });

  it.each(always)('refuses a token missing the always-present claim %s', async (name) => {
    const token = await sign({ ...fixture.examples['oauth-human'] }, name);
    expect(await verifyOrgPlaneToken(token, CFG, APP_AUD, fetchImpl)).toBeNull();
  });

  it('never needs the removed tenant claim', async () => {
    expect(fixture.removed.map((r) => r.claim)).toContain('tenant');
    for (const [, example] of examples) expect('tenant' in example).toBe(false);
  });
});
