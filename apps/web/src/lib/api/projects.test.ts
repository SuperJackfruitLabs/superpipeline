import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listProjects, getProject, createProject, updateProject, deleteProject, createMilestone, deleteMilestone, getProjectRollup } from './projects';
import { forgetHubToken } from '../hub-token';

beforeEach(() => {
  vi.restoreAllMocks();
  // `hubToken()` caches across calls by design; a token left over from one test
  // would let the next one pass without ever asking for authority.
  forgetHubToken();
});

/**
 * Task 18's project routes, and Task 19's rollup — Task 20's client. Envelopes read off
 * `apps/api/src/index.ts` directly (see the table in `task-20-brief.md`), not guessed: `{
 * projects }`, `{ project, milestones }`, `{ project }`, `{ milestone }`, 204/no-body deletes, and
 * the rollup's own `{ rollup }`.
 */
describe('listProjects', () => {
  it('reads the workspace project list', async () => {
    const project = { id: 'prj_1', tenantId: 't1', name: 'Launch', description: null, targetDate: null, state: 'active', health: null, leadUserId: null, createdAt: '2026-01-01', updatedAt: null };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ projects: [project] }), { status: 200 })));

    expect(await listProjects()).toEqual([project]);
  });

  it('throws when the read is refused, so a failure is never drawn as "No projects yet"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    await expect(listProjects()).rejects.toMatchObject({ status: 500, message: 'listProjects failed (500)' });
  });
});

describe('getProject failures', () => {
  it('answers null only when the project is not there (404), and throws on a server failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    expect(await getProject('prj_1')).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })));
    await expect(getProject('prj_1')).rejects.toMatchObject({ status: 503 });
  });
});

describe('getProject', () => {
  it('reads one project with its milestones, already in sortOrder', async () => {
    const project = { id: 'prj_1', tenantId: 't1', name: 'Launch', description: null, targetDate: null, state: 'active', health: null, leadUserId: null, createdAt: '2026-01-01', updatedAt: null };
    const milestones = [
      { id: 'mil_2', projectId: 'prj_1', tenantId: 't1', name: 'Beta', targetDate: null, sortOrder: 1, createdAt: '2026-01-02' },
      { id: 'mil_1', projectId: 'prj_1', tenantId: 't1', name: 'Alpha', targetDate: null, sortOrder: 0, createdAt: '2026-01-01' },
    ];
    const fetchSpy = vi.fn(async (url: string) => {
      expect(url).toBe('/v1/projects/prj_1');
      return new Response(JSON.stringify({ project, milestones }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchSpy);

    expect(await getProject('prj_1')).toEqual({ project, milestones });
  });

  it('answers null for a 404 — a stale project id is a normal state, not a thrown error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'project not found' }), { status: 404 })));
    expect(await getProject('prj_gone')).toBeNull();
  });
});

describe('createProject', () => {
  it('POSTs the project fields to /v1/projects', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ project: {} }), { status: 201 }));
    vi.stubGlobal('fetch', fetchSpy);

    await createProject({ name: 'Launch', targetDate: '2026-12-01' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/v1/projects');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ name: 'Launch', targetDate: '2026-12-01' });
  });

  it('surfaces the server\'s own name-collision refusal so the form can show it verbatim', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'a project named "Launch" already exists in this workspace' }), { status: 409 })),
    );

    const res = await createProject({ name: 'Launch' });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('a project named "Launch" already exists in this workspace');
  });
});

describe('updateProject', () => {
  it('PATCHes only the given fields to the project route', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ project: {} }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    await updateProject('prj_1', { state: 'paused', health: 'at-risk' });

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/v1/projects/prj_1');
    expect(init?.method).toBe('PATCH');
    expect(JSON.parse(init?.body as string)).toEqual({ state: 'paused', health: 'at-risk' });
  });
});

describe('deleteProject', () => {
  it('DELETEs the project', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchSpy);

    await deleteProject('prj_1');

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/v1/projects/prj_1');
    expect(init?.method).toBe('DELETE');
  });
});

describe('createMilestone', () => {
  it('POSTs the milestone fields to the project\'s milestones route', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ milestone: {} }), { status: 201 }));
    vi.stubGlobal('fetch', fetchSpy);

    await createMilestone('prj_1', { name: 'Beta', sortOrder: 1 });

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/v1/projects/prj_1/milestones');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ name: 'Beta', sortOrder: 1 });
  });
});

describe('deleteMilestone', () => {
  it('DELETEs against /v1/milestones/:id, not the project route', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchSpy);

    await deleteMilestone('mil_1');

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/v1/milestones/mil_1');
    expect(init?.method).toBe('DELETE');
  });
});

/**
 * Task 19's `GET /v1/projects/:id/rollup`. `partial`/`boardsUnanswered` are asserted explicitly,
 * not swallowed by a loose `toMatchObject` — dropping them in the wrapper is exactly the failure
 * mode the brief calls out as fatal to the honesty contract.
 */
describe('getProjectRollup', () => {
  it('reads the rollup, carrying partial and boardsUnanswered through untouched', async () => {
    const rollup = {
      projectId: 'prj_1',
      cardsTotal: 10,
      cardsDone: 4,
      cardsOverdue: 1,
      costUsd: 12.5,
      computedAt: '2026-10-01T14:32:00.000Z',
      partial: true,
      boardsUnanswered: 1,
    };
    const fetchSpy = vi.fn(async (url: string) => {
      expect(url).toBe('/v1/projects/prj_1/rollup');
      return new Response(JSON.stringify({ rollup }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchSpy);

    expect(await getProjectRollup('prj_1')).toEqual(rollup);
  });

  it('throws on failure rather than inventing a zeroed or falsely-complete rollup', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    await expect(getProjectRollup('prj_1')).rejects.toThrow('getProjectRollup failed (500)');
  });
});
