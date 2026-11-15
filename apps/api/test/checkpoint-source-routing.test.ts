import { beforeAll, expect, it } from 'vitest';
import { boards } from '../src/routes/boards/entry';
import { setupCatalog } from './helpers/catalog';
import { withOrgPlane, planeEnv, planeToken, SERVICE } from './helpers/org-plane';

beforeAll(setupCatalog);
const path = '/v1/boards/brd_example/runs/run_example/checkpoint-source';
const signed = (scope = 'checkpoints:submit', principalKind = 'service') => planeToken({
  sub: SERVICE, principalKind, scope,
});
async function send(token?: string, body = '{}', enabled = true, method = 'POST') {
  const request = new Request(`https://api.test${path}`, { method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    ...(method === 'POST' ? { body } : {}),
  });
  const match = path.match(/^\/v1\/boards\/([^/]+)\/(.*)$/);
  if (!match) throw new Error('bad fixture path');
  return boards({ request, path, url: new URL(request.url),
    env: planeEnv(enabled ? { PROPOSED_CHECKPOINT_SOURCE: 'true' } : {}),
  }, match);
}

it('keeps the proposed source endpoint disabled without explicit deployment configuration', () => withOrgPlane(async () => {
  const response = await send(await signed(), '{}', false);
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: { code: 'CHECKPOINT_SOURCE_DISABLED' } });
}));

it('requires an issuer-verified service and exact submit scope before reading the source body', () => withOrgPlane(async () => {
  expect((await send()).status).toBe(401);
  for (const kind of ['human', 'agent']) expect((await send(await signed('checkpoints:submit', kind))).status).toBe(401);
  for (const scope of ['checkpoints:read', 'checkpoints:*', 'run claim', ''])
    expect((await send(await signed(scope))).status).toBe(403);
}));

it('bounds actual source bytes independently of content-length before reaching a board', () => withOrgPlane(async () => {
  const response = await send(await signed(), ' '.repeat(65537));
  expect(response.status).toBe(413);
  expect(await response.json()).toEqual({ error: { code: 'CHECKPOINT_SOURCE_TOO_LARGE' } });
}));

it('owns the source path for every method without falling back to agent or human dispatch', () => withOrgPlane(async () => {
  expect((await send(await signed(), '', true, 'DELETE')).status).toBe(405);
}));
