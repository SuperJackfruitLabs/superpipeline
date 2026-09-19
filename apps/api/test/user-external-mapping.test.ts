import { env } from 'cloudflare:test';
import { beforeAll, describe, it, expect } from 'vitest';
import { setupCatalog } from './helpers/catalog';
import { upsertUserByEmail, setUserExternalMapping, findUserByExternal } from '../src/db/catalog';

beforeAll(setupCatalog);

/**
 * Mirrors `tenant-external-mapping.test.ts`'s harness: `setupCatalog` runs the real migrations
 * (including 0008) against the test D1, so the CHECK and UNIQUE index this suite exercises are
 * byte-identical to what ships.
 */
describe('user external mapping', () => {
  it('is both-or-neither', async () => {
    const user = await upsertUserByEmail(env.DB, { email: 'a@example.com', name: 'A' });
    await expect(
      env.DB.prepare(`UPDATE users SET external_id = 'prn_1' WHERE id = ?`).bind(user.id).run(),
    ).rejects.toThrow();
  });

  it('finds a user by their principal', async () => {
    const user = await upsertUserByEmail(env.DB, { email: 'a@example.com', name: 'A' });
    await setUserExternalMapping(env.DB, user.id, { externalId: 'prn_1', externalSource: 'agentpod' });
    const found = await findUserByExternal(env.DB, 'agentpod', 'prn_1');
    expect(found?.id).toBe(user.id);
  });

  it('refuses to give one principal two users', async () => {
    const a = await upsertUserByEmail(env.DB, { email: 'a@example.com', name: 'A' });
    const b = await upsertUserByEmail(env.DB, { email: 'b@example.com', name: 'B' });
    await setUserExternalMapping(env.DB, a.id, { externalId: 'prn_1', externalSource: 'agentpod' });
    await expect(
      setUserExternalMapping(env.DB, b.id, { externalId: 'prn_1', externalSource: 'agentpod' }),
    ).rejects.toThrow();
  });
});
