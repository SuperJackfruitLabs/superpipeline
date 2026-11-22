import { beforeAll, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import wranglerJsonc from '../wrangler.jsonc?raw';
import { boards } from '../src/routes/boards/entry';
import { setupCatalog } from './helpers/catalog';

beforeAll(setupCatalog);
it.each([
  ['POST', 'checkpoint-settlements'],
  ['GET', 'checkpoint'],
  ['DELETE', 'checkpoint'],
])('keeps proposed settlement %s %s disabled before caller or body processing', async (method, suffix) => {
  const path = `/v1/boards/brd_example/runs/run_example/${suffix}`;
  const request = new Request(`https://api.test${path}`, { method,
    ...(method === 'POST' ? { body: 'not JSON' } : {}),
  });
  const match = path.match(/^\/v1\/boards\/([^/]+)\/(.*)$/);
  if (!match) throw new Error('invalid fixture path');
  const response = await boards({ request, path, url: new URL(request.url), env }, match);
  expect(response.status).toBe(404);
  expect(await response.json()).toMatchObject({ error: { code: 'CHECKPOINT_SETTLEMENT_DISABLED', message: expect.any(String) } });
  const [production, environments] = wranglerJsonc.split('"env": {');
  expect(production).toContain('"PROPOSED_CHECKPOINT_SETTLEMENT": "true"');
  expect(environments).not.toContain('PROPOSED_CHECKPOINT_SETTLEMENT');
});
