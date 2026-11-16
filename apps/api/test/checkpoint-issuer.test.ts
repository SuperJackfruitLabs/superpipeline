import { env } from 'cloudflare:test';
import { beforeAll, expect, it } from 'vitest';
import { decodeJwt } from 'jose';
import { setupCatalog } from './helpers/catalog';
import { ensureOrgTenant } from '../src/auth/org-tenancy';
import { resolveCheckpointReporter } from '../src/auth/checkpoint-reporter';
import { withOrgPlane, planeToken, planeEnv, ORG, SERVICE } from './helpers/org-plane';

beforeAll(setupCatalog);

function request(token?: string): Request {
  return new Request('https://api.test/v1/boards/brd_example/runs/run_example/checkpoints', {
    method: 'POST',
    body: JSON.stringify({ principalKind: 'service', principalId: SERVICE, scope: 'checkpoints:submit', expiresAt: Date.now() + 60000 }),
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'X-Principal-Kind': 'service',
      'X-Principal-Id': SERVICE,
      'X-Scope': 'checkpoints:submit',
    },
  });
}

const signed = (over: Record<string, unknown> = {}) => planeToken({
  sub: SERVICE, principalKind: 'service', scope: 'checkpoints:submit', ...over,
});

it('resolves the actual issuer service, exact policy reporter and tenant with immutable expiry', async () => {
  await withOrgPlane(async () => {
    const tenantId = await ensureOrgTenant(env.DB, ORG);
    const token = await signed();
    expect(await resolveCheckpointReporter(request(token), planeEnv(), { tenantId, reporterPrincipalId: SERVICE })).toEqual({
      kind: 'service', principalId: SERVICE, tenantId, scopes: ['checkpoints:submit'],
      expiresAt: (decodeJwt(token).exp ?? 0) * 1000,
    });
  });
});

it('refuses a different reporter or tenant even with a valid scoped service token', async () => {
  await withOrgPlane(async () => {
    const tenantId = await ensureOrgTenant(env.DB, ORG);
    const token = await signed();
    expect(await resolveCheckpointReporter(request(token), planeEnv(), { tenantId, reporterPrincipalId: 'prn_ffffffffffffffffffff' })).toBeNull();
    expect(await resolveCheckpointReporter(request(token), planeEnv(), { tenantId: 'tnt_another', reporterPrincipalId: SERVICE })).toBeNull();
  });
});

it('does not promote humans, agents, asserted humans or body/header claims into a reporter', async () => {
  await withOrgPlane(async () => {
    const tenantId = await ensureOrgTenant(env.DB, ORG);
    const expected = { tenantId, reporterPrincipalId: SERVICE };
    expect(await resolveCheckpointReporter(request(), planeEnv(), expected)).toBeNull();
    for (const principalKind of ['human', 'agent']) {
      const token = await signed({ principalKind, act: { sub: SERVICE } });
      expect(await resolveCheckpointReporter(request(token), planeEnv(), expected)).toBeNull();
    }
  });
});

it('requires the exact submit scope rather than service kind, read permission or an agent credential', async () => {
  await withOrgPlane(async () => {
    const tenantId = await ensureOrgTenant(env.DB, ORG);
    const expected = { tenantId, reporterPrincipalId: SERVICE };
    for (const scope of [undefined, 'checkpoints:read', 'checkpoints:*', 'run claim']) {
      expect(await resolveCheckpointReporter(request(await signed({ scope })), planeEnv(), expected)).toBeNull();
    }
    expect(await resolveCheckpointReporter(request('spa_private-fixture'), planeEnv(), expected)).toBeNull();
  });
});

it('refuses an expired token or a token for another audience', async () => {
  await withOrgPlane(async () => {
    const tenantId = await ensureOrgTenant(env.DB, ORG);
    const expected = { tenantId, reporterPrincipalId: SERVICE };
    const claims = { sub: SERVICE, principalKind: 'service', scope: 'checkpoints:submit' };
    for (const token of [await planeToken(claims, { exp: '-1s' }), await planeToken(claims, { aud: 'https://api.test/mcp' })]) {
      expect(await resolveCheckpointReporter(request(token), planeEnv(), expected)).toBeNull();
    }
  });
});
