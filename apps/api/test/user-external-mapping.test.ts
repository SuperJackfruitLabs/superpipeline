import { env } from 'cloudflare:test';
import { beforeAll, describe, it, expect } from 'vitest';
import { setupCatalog } from './helpers/catalog';
import { upsertUserByEmail, setUserExternalMapping, findUserByExternal } from '../src/db/catalog';

beforeAll(setupCatalog);

/**
 * Mirrors `tenant-external-mapping.test.ts`'s harness: `setupCatalog` runs the real migrations
 * (including 0008) against the test D1, so the CHECK and UNIQUE index this suite exercises are
 * byte-identical to what ships.
 *
 * `external_id` is the issuer's SUBJECT id — a hub token's `sub`, which today is a Better Auth
 * user id rather than a `prn_…` principal id (the hub's jwt plugin overwrites `sub` with
 * `session.user.id` after building the payload). The literals below are shaped like the real
 * thing for that reason.
 */
describe('user external mapping', () => {
  it('is both-or-neither', async () => {
    const user = await upsertUserByEmail(env.DB, { email: 'a@example.com', name: 'A' });
    await expect(
      env.DB.prepare(`UPDATE users SET external_id = '68jYD9VOCmXlPhIY' WHERE id = ?`).bind(user.id).run(),
    ).rejects.toThrow();
  });

  it('finds a user by their issuer subject id', async () => {
    const user = await upsertUserByEmail(env.DB, { email: 'a@example.com', name: 'A' });
    await setUserExternalMapping(env.DB, user.id, { externalId: '68jYD9VOCmXlPhIY', externalSource: 'agentpod' });
    const found = await findUserByExternal(env.DB, 'agentpod', '68jYD9VOCmXlPhIY');
    expect(found?.id).toBe(user.id);
  });

  it('refuses to give one issuer subject two users', async () => {
    const a = await upsertUserByEmail(env.DB, { email: 'a@example.com', name: 'A' });
    const b = await upsertUserByEmail(env.DB, { email: 'b@example.com', name: 'B' });
    await setUserExternalMapping(env.DB, a.id, { externalId: '68jYD9VOCmXlPhIY', externalSource: 'agentpod' });
    await expect(
      setUserExternalMapping(env.DB, b.id, { externalId: '68jYD9VOCmXlPhIY', externalSource: 'agentpod' }),
    ).rejects.toThrow();
  });
});
