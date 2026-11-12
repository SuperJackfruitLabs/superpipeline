/**
 * A stage's `placement`: what a station must have to work it, for a placement service to filter
 * on (charter 2026-11-13, AgentPod owns the capability catalog). Advice only: it is stored, read
 * back on the board, validated on both writes, and never checked on a claim.
 */
import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { Stage } from '@superpipeline/contract';
import type { BoardInit } from '../src/board/board-do';
import { cleanPlacement, placementError } from '../src/board/placement';

const PIPE: BoardInit['stages'] = [
  { key: 'todo', name: 'To do', order: 0 },
  { key: 'doing', name: 'Doing', order: 1, ownerKind: 'capability', owner: 'research' },
  { key: 'done', name: 'Done', order: 2 },
];
const NEEDS = { isolation: 'sandbox' as const, tools: ['cli:stk'], credentials: ['forge:github'], models: ['gpt-5'] };


describe('placement: shape and spelling', () => {
  it('accepts the four fields and refuses anything else', () => {
    expect(placementError(NEEDS, 'p')).toBeNull();
    expect(placementError({}, 'p')).toBeNull();
    expect(placementError([], 'p')).toMatch(/object/);
    expect(placementError({ gpu: true }, 'p')).toMatch(/unknown fields: gpu/);
    expect(placementError({ isolation: 'vm' }, 'p')).toMatch(/isolation/);
    expect(placementError({ tools: 'cli:stk' }, 'p')).toMatch(/tools must be a list/);
    expect(placementError({ tools: [' '] }, 'p')).toMatch(/tools must be a list/);
    expect(placementError({ credentials: Array.from({ length: 21 }, (_, i) => `c${i}`) }, 'p')).toMatch(/at most 20/);
  });

  it('trims, drops duplicates and empty lists, and a placement stating nothing is none', () => {
    expect(cleanPlacement({ tools: [' cli:stk', 'cli:stk'], models: [] })).toEqual({ tools: ['cli:stk'] });
    expect(cleanPlacement({})).toBeNull();
    expect(cleanPlacement({ isolation: 'host' })).toEqual({ isolation: 'host' });
  });

  it('the contract describes the same field', () => {
    const parsed = Stage.safeParse({ key: 'k', name: 'K', order: 0, ownerKind: 'human', placement: NEEDS });
    expect(parsed.success).toBe(true);
    expect(Stage.safeParse({ key: 'k', name: 'K', order: 0, ownerKind: 'human', placement: { gpu: true } }).success).toBe(false);
  });
});

/** A field of a JSON answer, or undefined: reads an answer without asserting its type. */
function at(value: unknown, ...path: Array<string | number>): unknown {
  let v = value;
  for (const k of path) v = typeof v === 'object' && v !== null ? Reflect.get(v, k) : undefined;
  return v;
}

describe('REST: placement through the routes', () => {
  const dev = { 'X-Tenant-Id': 'tnt_patch_placement', 'Content-Type': 'application/json' };
  const call = (path: string, method: string, body?: unknown) =>
    SELF.fetch(`https://api.test${path}`, { method, headers: dev, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const doingOf = async (id: string): Promise<unknown> => {
    const stages = at(await (await call(`/v1/boards/${id}`, 'GET')).json(), 'stages');
    return Array.isArray(stages) ? stages.find((s) => at(s, 'key') === 'doing') : undefined;
  };

  it('sets it with a patch and the board read returns it', async () => {
    const id = String(at(await (await call('/v1/boards', 'POST', { name: 'PL', stages: PIPE })).json(), 'boardId'));
    expect((await call(`/v1/boards/${id}/stages/doing`, 'PATCH', { placement: NEEDS })).status).toBe(200);
    expect(at(await doingOf(id), 'placement')).toEqual(NEEDS);
  });

  it('refuses a malformed one on both writes, and stores nothing', async () => {
    const id = String(at(await (await call('/v1/boards', 'POST', { name: 'PB', stages: PIPE })).json(), 'boardId'));
    expect((await call(`/v1/boards/${id}/stages/doing`, 'PATCH', { placement: { isolation: 'vm' } })).status).toBe(400);
    const replaced = await call(`/v1/boards/${id}/stages`, 'PUT', { stages: PIPE.map((s) => ({ ...s, placement: { tools: 'cli:stk' } })) });
    expect(replaced.status).toBe(400);
    expect(at(await doingOf(id), 'placement')).toBeUndefined();
  });
});
