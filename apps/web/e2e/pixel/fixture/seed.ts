// apps/web/e2e/pixel/fixture/seed.ts
import type { APIRequestContext } from '@playwright/test';
import { BASE_WORLD } from './world';

import { PORTS } from '../../../scripts/ports';
export const API = PORTS.apiUrl;
export const FIXTURE_TENANT = 'tnt_vibes';
export const FIXTURE_USER = 'usr_b19776fac3c94df4';
let seeded = false;

/** One world: seeded once per run, and again only after a screen that writes (resolve, resume) asks for it. */
export async function seedWorld(request: APIRequestContext, opts: { force?: boolean } = {}): Promise<void> {
  if (seeded && !opts.force) return;
  const res = await request.post(`${API}/v1/dev/fixture`, { data: BASE_WORLD, headers: { 'Content-Type': 'application/json' } });
  if (!res.ok()) throw new Error(`fixture import failed: ${res.status()} ${await res.text()}`);
  seeded = true;
}
