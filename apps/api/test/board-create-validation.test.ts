import { env, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';

/**
 * `POST /v1/boards` answers a malformed body with 400, not 500.
 *
 * Found by sending `{"name": "…", "template": "software"}` — a reasonable guess, since every
 * client offers templates — against production. The route asserted its body's type and validated
 * nothing, so `stages` arrived `undefined`, reached `[...board.stages]` inside the Durable Object,
 * and came back as **HTTP 500 `board.stages is not iterable`**: a server error for a client
 * mistake, phrased in terms of a field the caller never typed.
 *
 * The checks stop at shape. What a valid pipeline IS stays the board's decision — it normalises
 * owners and routing on the way in — and a route that re-implemented that would eventually refuse
 * something the board accepts.
 */

const TENANT = 'tnt_board_create_validation';

beforeAll(async () => {
  await env.DB.prepare(`INSERT OR IGNORE INTO tenants (id, slug, name) VALUES (?, ?, 'Validation')`)
    .bind(TENANT, `slug-${TENANT}`)
    .run();
});

async function create(body: unknown): Promise<Response> {
  return SELF.fetch('https://api.test/v1/boards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT, 'X-User-Id': 'usr_validation' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /v1/boards on a body it cannot use', () => {
  it('refuses the request that produced the 500, and names the real problem', async () => {
    // The exact body that broke it. The message must talk about `stages`, which is what is
    // missing — not about `board.stages`, which is an internal the caller cannot act on.
    const res = await create({ name: 'Guild Operations', template: 'software' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: { message?: string } };
    expect(body.error?.message).toMatch(/stages/);
    expect(body.error?.message).toMatch(/template/);
  });

  it('refuses a missing name', async () => {
    const res = await create({ stages: [{ key: 'a', name: 'A', order: 0 }] });
    expect(res.status).toBe(400);
  });

  it('refuses a blank name, not only an absent one', async () => {
    const res = await create({ name: '   ', stages: [{ key: 'a', name: 'A', order: 0 }] });
    expect(res.status).toBe(400);
  });

  it('refuses an empty stages array', async () => {
    // A board with no lanes is not a board, and the DO would store one happily.
    const res = await create({ name: 'Empty', stages: [] });
    expect(res.status).toBe(400);
  });

  it('refuses stages that are not objects with a key', async () => {
    const res = await create({ name: 'Wrong', stages: ['backlog', 'done'] });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error?: { message?: string } }).error?.message).toMatch(/key/);
  });

  it('refuses a body that is not JSON at all, rather than throwing', async () => {
    const res = await create('not json');
    expect(res.status).toBe(400);
  });

  it('still creates a board from a well-formed body', async () => {
    // The guard rejects nothing it should accept — without this the tests above pass for a route
    // that refuses everything.
    const res = await create({
      name: 'Valid',
      stages: [
        { key: 'todo', name: 'To do', order: 0 },
        { key: 'done', name: 'Done', order: 1 },
      ],
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { boardId?: string };
    expect(body.boardId).toMatch(/^brd_/);
  });
});
