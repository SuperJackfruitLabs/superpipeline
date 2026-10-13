// apps/api/test/plane-session.test.ts
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import worker from '../src/index';
import type { Env } from '../src/env';
import { setupCatalog } from './helpers/catalog';
import { planeEnv, planeKeys, planeToken, PLANE, PLANE_JWKS, APP_AUD, ORG, HUMAN } from './helpers/org-plane';
import { handleSessionRenewal, displayName } from '../src/auth/plane-signin';
import { verifySession } from '../src/auth/session';
import { findTenantByExternal, findUserByExternal } from '../src/db/catalog';
import { __resetJwksCacheForTests } from '../src/auth/hub-jwt';

beforeAll(setupCatalog);
beforeEach(() => __resetJwksCacheForTests());

const SECRET = 'plane-session-secret';
const envOn = (over: Record<string, unknown> = {}) => planeEnv({ APP_URL: APP_AUD, SESSION_SECRET: SECRET, HUB_ISSUER: undefined, ...over });
const post = (cookie?: string, extra: Record<string, string> = {}) => new Request('https://api.test/hub/session', { method: 'POST', headers: { ...(cookie ? { Cookie: cookie } : {}), ...extra } });

function plane(answer: () => Record<string, unknown> | null) {
  const tokenRequests: URLSearchParams[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === PLANE_JWKS) return new Response((await planeKeys()).jwksBody, { headers: { 'content-type': 'application/json' } });
    if (url === `${PLANE}/api/auth/oauth2/token`) {
      tokenRequests.push(new URLSearchParams(String(init?.body)));
      const body = answer();
      return body ? Response.json(body) : Response.json({ error: 'invalid_grant' }, { status: 400 });
    }
    return new Response('unexpected', { status: 599 });
  }) as unknown as typeof fetch;
  return { impl, tokenRequests };
}
function cookies(res: Response): Map<string, string> {
  const out = new Map<string, string>();
  for (const c of (res.headers as unknown as { getSetCookie(): string[] }).getSetCookie()) {
    const [pair] = c.split(';');
    const [k, ...v] = pair!.trim().split('=');
    out.set(k!, v.join('='));
  }
  return out;
}

describe('POST /hub/session — renew a lapsed session in the background', () => {
  it('answers only POST', async () => {
    const res = await handleSessionRenewal(new Request('https://api.test/hub/session'), envOn());
    expect(res.status).toBe(405);
  });

  it('spends the refresh cookie, re-signs the session and rotates the refresh token', async () => {
    const access = await planeToken({ name: 'Ira Mehta' });
    const fake = plane(() => ({ access_token: access, refresh_token: 'r2', expires_in: 300 }));
    const res = await handleSessionRenewal(post('superpipeline_plane_refresh=r1'), envOn(), fake.impl);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fake.tokenRequests[0]!.get('grant_type')).toBe('refresh_token');
    expect(fake.tokenRequests[0]!.get('refresh_token')).toBe('r1');
    const c = cookies(res);
    const session = await verifySession(c.get('superpipeline_session')!, SECRET);
    expect(session?.tenantId).toBe(await findTenantByExternal(env.DB, 'org-plane', ORG));
    expect(session?.userId).toBe((await findUserByExternal(env.DB, 'org-plane', HUMAN))?.id);
    expect(session?.name).toBe('Ira Mehta');
    expect(c.get('superpipeline_hub_token')).toBe(access);
    expect(c.get('superpipeline_plane_refresh')).toBe('r2');
  });

  it('a refused grant is login_required, names the issuer, and leaves the refresh cookie alone', async () => {
    const res = await handleSessionRenewal(post('superpipeline_plane_refresh=spent'), envOn(), plane(() => null).impl);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false, reason: 'login_required', issuer: 'accounts.test', reauthorize: '/auth/login' });
    expect(cookies(res).has('superpipeline_plane_refresh')).toBe(false);
  });

  it('no refresh cookie is no_refresh', async () => {
    const res = await handleSessionRenewal(post(), envOn(), plane(() => null).impl);
    expect(await res.json()).toEqual({ ok: false, reason: 'no_refresh' });
  });

  it.each([
    ['a 5xx from the plane', (): Response => new Response('upstream', { status: 502 })],
    ['the plane unreachable', (): Response => { throw new TypeError('network'); }],
  ])('on %s, answers a retryable 503 and spends nothing', async (_n, answer) => {
    const impl = ((_i: RequestInfo | URL) => Promise.resolve(answer())) as unknown as typeof fetch;
    const res = await handleSessionRenewal(post('superpipeline_plane_refresh=still-good'), envOn(), impl);
    expect(res.status).toBe(503);
    expect(res.headers.get('Retry-After')).toBe('5');
    expect(await res.json()).toEqual({ ok: false, reason: 'plane_unavailable', retryable: true });
    expect(cookies(res).has('superpipeline_plane_refresh')).toBe(false);
  });

  it('a renewed token that is not a person present at sign-in renews nothing', async () => {
    const access = await planeToken({ principalKind: 'agent' });
    const res = await handleSessionRenewal(post('superpipeline_plane_refresh=r1'), envOn(), plane(() => ({ access_token: access, refresh_token: 'r2' })).impl);
    expect(await res.json()).toEqual({ ok: false, reason: 'login_required', issuer: 'accounts.test', reauthorize: '/auth/login' });
    expect(cookies(res).has('superpipeline_session')).toBe(false);
  });

  it('GitHub sign-in has no background renewal, and is wired through the router', async () => {
    const github = { ...env, DEV_AUTH: undefined, ORG_PLANE_ISSUER: undefined } as unknown as Env;
    const res = await worker.fetch(post(), github);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false, reason: 'no_refresh' });
  });

  it('under DEV_AUTH it is a stub the e2e suite can steer', async () => {
    const dev = { ...env, DEV_AUTH: 'true', ORG_PLANE_ISSUER: undefined } as unknown as Env;
    expect(await (await handleSessionRenewal(post(), dev)).json()).toEqual({ ok: true });
    expect(await (await handleSessionRenewal(post('superpipeline_plane_refresh=refused'), dev)).json())
      .toEqual({ ok: false, reason: 'login_required', issuer: 'accounts.superjackfruit.com', reauthorize: '/auth/login' });
    const sleep = vi.fn(async () => {});
    expect(await (await handleSessionRenewal(post('superpipeline_plane_refresh=slow'), dev, fetch, sleep)).json()).toEqual({ ok: true });
    expect(sleep).toHaveBeenCalledWith(10_000);
  });

  it('names the person by name, else by email (D-4)', () => {
    expect(displayName({ name: 'Ira Mehta', email: 'ira@vibes-fixture.invalid' })).toBe('Ira Mehta');
    expect(displayName({ name: '  ', email: 'ira@vibes-fixture.invalid' })).toBe('ira@vibes-fixture.invalid');
    expect(displayName({})).toBe('Member');
  });
});

describe('POST /hub/session — every refusal mints nothing', () => {
  const access = () => planeToken({ name: 'Ira Mehta' });
  const ok = async () => { const a = await access(); return plane(() => ({ access_token: a, refresh_token: 'r2' })); };

  it.each([
    ['a cross-site fetch', { 'Sec-Fetch-Site': 'cross-site' }],
    ['a same-site (sibling subdomain) fetch', { 'Sec-Fetch-Site': 'same-site' }],
    ['a foreign Origin', { Origin: 'https://evil.example' }],
    ['a null Origin', { Origin: 'null' }],
  ])('refuses %s with 403 before spending the refresh cookie', async (_n, h) => {
    const fake = await ok();
    const res = await handleSessionRenewal(post('superpipeline_plane_refresh=r1', h), envOn(), fake.impl);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ ok: false, reason: 'forbidden' });
    expect(fake.tokenRequests).toHaveLength(0);
    expect(cookies(res).size).toBe(0);
  });

  it('accepts a same-origin fetch that names this app as its Origin', async () => {
    const fake = await ok();
    const res = await handleSessionRenewal(post('superpipeline_plane_refresh=r1', { 'Sec-Fetch-Site': 'same-origin', Origin: APP_AUD }), envOn(), fake.impl);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('never puts a token in the body, and is not cacheable', async () => {
    const a = await access();
    const res = await handleSessionRenewal(post('superpipeline_plane_refresh=r1'), envOn(), plane(() => ({ access_token: a, refresh_token: 'r2' })).impl);
    const text = await res.text();
    expect(text).toBe('{"ok":true}');
    expect(text).not.toContain(a);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    for (const c of (res.headers as unknown as { getSetCookie(): string[] }).getSetCookie()) expect(c).toMatch(/HttpOnly/);
  });

  it('a token for a workspace not entitled to superpipeline renews nothing', async () => {
    const a = await planeToken({ ent: ['superlibrary'] });
    const res = await handleSessionRenewal(post('superpipeline_plane_refresh=r1'), envOn(), plane(() => ({ access_token: a, refresh_token: 'r2' })).impl);
    expect((await res.json() as { reason: string }).reason).toBe('login_required');
    expect(cookies(res).size).toBe(0);
  });

  it('a delegated (act) token renews nothing', async () => {
    const a = await planeToken({ act: { sub: 'prn_000000000000000000a2' } });
    const res = await handleSessionRenewal(post('superpipeline_plane_refresh=r1'), envOn(), plane(() => ({ access_token: a, refresh_token: 'r2' })).impl);
    expect((await res.json() as { reason: string }).reason).toBe('login_required');
    expect(cookies(res).size).toBe(0);
  });

  it('a renewed token signed by another key renews nothing', async () => {
    const { privateKey } = await (await import('jose')).generateKeyPair('EdDSA', { extractable: true });
    const a = await planeToken({}, { key: privateKey });
    const res = await handleSessionRenewal(post('superpipeline_plane_refresh=r1'), envOn(), plane(() => ({ access_token: a, refresh_token: 'r2' })).impl);
    expect((await res.json() as { reason: string }).reason).toBe('login_required');
    expect(cookies(res).size).toBe(0);
  });

  it('a session cookie alone, with no refresh cookie, is no_refresh and calls nobody', async () => {
    const fake = await ok();
    const res = await handleSessionRenewal(post('superpipeline_session=forged'), envOn(), fake.impl);
    expect(await res.json()).toEqual({ ok: false, reason: 'no_refresh' });
    expect(fake.tokenRequests).toHaveLength(0);
    expect(cookies(res).size).toBe(0);
  });

  it('plane mode without a session secret is unavailable and mints nothing', async () => {
    const fake = await ok();
    const res = await handleSessionRenewal(post('superpipeline_plane_refresh=r1'), envOn({ SESSION_SECRET: undefined }), fake.impl);
    expect(res.status).toBe(503);
    expect(fake.tokenRequests).toHaveLength(0);
  });

  it('GitHub sign-in (no plane, no DEV_AUTH) ignores any refresh cookie it is handed', async () => {
    const github = { ...env, DEV_AUTH: undefined, ORG_PLANE_ISSUER: undefined } as unknown as Env;
    const res = await worker.fetch(post('superpipeline_plane_refresh=refused'), github);
    expect(await res.json()).toEqual({ ok: false, reason: 'no_refresh' });
    expect(cookies(res).size).toBe(0);
  });

  it('GET through the router is refused', async () => {
    const res = await worker.fetch(new Request('https://api.test/hub/session'), env as unknown as Env);
    expect(res.status).toBe(405);
  });
});
