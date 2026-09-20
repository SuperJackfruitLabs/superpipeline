import { describe, it, expect, beforeAll } from 'vitest';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { verifyHubToken, planeAudience } from '../src/auth/hub-jwt';

/**
 * The audience check has to REFUSE something.
 *
 * It asked for `opts.issuer`, which is the same value as `issuer` — and every token the hub mints
 * carries the issuer in `aud` by construction. So the check passed for every token ever issued,
 * including one obtained by another client for another purpose and replayed here. An audience
 * equal to the issuer is not an audience check; it is the issuer check written twice, and a test
 * that only ever feeds it a well-formed token cannot tell the two apart.
 *
 * The first test below is therefore the whole file: a token that names the issuer and NOT this
 * plane must be refused. Deleting the change makes it fail.
 */

const ISSUER = 'https://hub.audience.test';
const PLANE = 'https://app.audience.test';
const OTHER_PLANE = 'https://console.audience.test';
const KID = 'audience-kid';

let signingKey: CryptoKey;
let jwksBody: string;

beforeAll(async () => {
  const pair = await generateKeyPair('EdDSA', { extractable: true });
  signingKey = pair.privateKey;
  jwksBody = JSON.stringify({ keys: [{ ...(await exportJWK(pair.publicKey)), alg: 'EdDSA', kid: KID }] });
});

/** The issuer's key set, served without touching the network. */
const jwks = (async () => new Response(jwksBody, { headers: { 'Content-Type': 'application/json' } })) as unknown as typeof fetch;

async function tokenFor(aud: string | string[]): Promise<string> {
  return new SignJWT({ principalKind: 'human', tenant: 'fleet_audience', sub: 'hubsub_audience' })
    .setProtectedHeader({ alg: 'EdDSA', kid: KID })
    .setIssuer(ISSUER)
    .setAudience(aud)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(signingKey);
}

const opts = { issuer: ISSUER, audience: PLANE, fetch: jwks };

describe('the audience a hub token must name', () => {
  it('is the ONLY thing separating the two cases below', async () => {
    // The guard on this whole file. `verifyHubToken` also requires `sub`, `tenant`, `exp`, `iat`
    // and a known `kid`; if any of those were missing, every token here would be null and every
    // refusal test would pass while proving nothing. One token, verified against two different
    // audiences: accepted for one, refused for the other, same bytes.
    const token = await tokenFor([ISSUER, PLANE]);
    expect(await verifyHubToken(token, { ...opts, audience: PLANE })).not.toBeNull();
    expect(await verifyHubToken(token, { ...opts, audience: OTHER_PLANE })).toBeNull();
  });

  it('refuses a token that names only the issuer', async () => {
    // The shape every token had before the hub learned per-client audiences, and the shape a
    // token minted for a DIFFERENT client still has. This is the case the old check admitted.
    expect(await verifyHubToken(await tokenFor(ISSUER), opts)).toBeNull();
  });

  it('accepts a token that names this plane alongside the issuer', async () => {
    const claims = await verifyHubToken(await tokenFor([ISSUER, PLANE]), opts);
    expect(claims).not.toBeNull();
    expect(claims?.tenant).toBe('fleet_audience');
  });

  it('accepts a token that names this plane alone', async () => {
    // What the registry should eventually hand a client that never calls the hub. Accepting it
    // is what makes narrowing the registry possible later without a second code change.
    expect(await verifyHubToken(await tokenFor(PLANE), opts)).not.toBeNull();
  });

  it('refuses a token minted for a different plane', async () => {
    // Two products, one issuer. A token the console obtained must not authenticate here.
    expect(await verifyHubToken(await tokenFor([ISSUER, OTHER_PLANE]), opts)).toBeNull();
  });

  it('refuses a token with no audience at all', async () => {
    const token = await new SignJWT({ principalKind: 'human', tenant: 'fleet_audience', sub: 'hubsub_audience' })
      .setProtectedHeader({ alg: 'EdDSA', kid: KID })
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(signingKey);
    expect(await verifyHubToken(token, opts)).toBeNull();
  });
});

describe('planeAudience', () => {
  it('prefers the configured origin over the host the caller typed', () => {
    // The whole reason the field exists. A Worker reachable on two hosts must demand one
    // audience, not whichever one the request arrived on.
    const request = new Request('https://superpipeline-api.workers.dev/v1/boards');
    expect(planeAudience(request, { APP_URL: PLANE })).toBe(PLANE);
  });

  it('falls back to the request origin when nothing is configured', () => {
    const request = new Request('https://app.audience.test/v1/boards');
    expect(planeAudience(request, {})).toBe(PLANE);
  });

  it('treats an empty APP_URL as unset rather than as an empty audience', () => {
    // An empty string would make `jwtVerify` demand `aud: ""`, which nothing carries — every
    // hub token refused, from one stray `APP_URL=` in a config file.
    const request = new Request('https://app.audience.test/v1/boards');
    expect(planeAudience(request, { APP_URL: '' })).toBe(PLANE);
  });
});
