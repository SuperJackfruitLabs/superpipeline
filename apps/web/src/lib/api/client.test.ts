import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setUnauthorizedHandler } from './client';
import { getBoard } from './boards';
import { resolveGate } from './gates';
import { listProjects, deleteProject } from './projects';
import { forgetHubToken } from '../hub-token';

beforeEach(() => {
  vi.restoreAllMocks();
  // `hubToken()` caches across calls by design; a token left over from one test
  // would let the next one pass without ever asking for authority.
  forgetHubToken();
});

describe('an expired session is noticed, rather than presenting as a dead board', () => {
  beforeEach(() => setUnauthorizedHandler(() => {}));

  it('a 401 on the board read fires the handler', async () => {
    // `authState` is decided once at init and never revisited, so without this a session that
    // expires while a tab is open leaves the app certain it is signed in while every request
    // fails — a board that stopped updating and buttons that do nothing, saying nothing.
    let fired = 0;
    setUnauthorizedHandler(() => { fired++; });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 401 })));

    await expect(getBoard('brd_1')).rejects.toThrow();
    expect(fired).toBe(1);
  });

  it('a 401 on a gate decision fires it too — that is the click a person actually makes', async () => {
    let fired = 0;
    setUnauthorizedHandler(() => { fired++; });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 401 })));

    const res = await resolveGate('brd_1', 'gate_1', 'reject');
    expect(res.status).toBe(401);
    expect(fired).toBe(1);
  });

  it('an ordinary refusal is not mistaken for a lost session', async () => {
    // 409 GATE_NOT_PENDING is a real answer about the gate, not about who you are.
    let fired = 0;
    setUnauthorizedHandler(() => { fired++; });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'gate is already resolved' } }), { status: 409 })));

    const res = await resolveGate('brd_1', 'gate_1', 'reject');
    expect(res.status).toBe(409);
    expect(fired).toBe(0);
  });

  it('a success fires nothing', async () => {
    let fired = 0;
    setUnauthorizedHandler(() => { fired++; });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ card: {} }), { status: 200 })));

    await resolveGate('brd_1', 'gate_1', 'approve');
    expect(fired).toBe(0);
  });
});

describe('request timeout', () => {
  it('aborts a read that never answers, and never a write', async () => {
    const seen: (AbortSignal | undefined | null)[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init?: RequestInit) => { seen.push(init?.signal); return new Response(JSON.stringify({ projects: [] }), { status: 200 }); }));
    await listProjects();
    await deleteProject('prj_1');
    expect(seen[0]).toBeInstanceOf(AbortSignal);
    expect(seen[1]).toBeUndefined();
  });
});
