import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSchedules, createSchedule, updateSchedule, deleteSchedule } from './schedules';
import { forgetHubToken } from '../hub-token';

beforeEach(() => {
  vi.restoreAllMocks();
  // `hubToken()` caches across calls by design; a token left over from one test
  // would let the next one pass without ever asking for authority.
  forgetHubToken();
});

/**
 * Task 10's client for `/v1/boards/:id/schedules[/:scheduleId]` (Task 8/9's recurrence, routed).
 */
describe('getSchedules', () => {
  it('reads a board\'s schedules', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            schedules: [
              { id: 'sch_1', enabled: true, title: 'Sweep', rule: 'daily at 09:00', timezone: 'UTC', overlap: 'skip', nextFireAt: '2026-10-01T09:00:00.000Z', lastFiredAt: null, lastCardId: null, skipCount: 0, priority: 0, labels: [], stageKey: null, spec: {} },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const schedules = await getSchedules('brd_1');
    expect(schedules).toHaveLength(1);
    expect(schedules[0]!.id).toBe('sch_1');
  });

  it('answers an empty list rather than throwing when the read is refused', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 401 })));
    expect(await getSchedules('brd_1')).toEqual([]);
  });
});

describe('createSchedule', () => {
  it('POSTs the schedule fields to the board\'s schedules route', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ schedule: {} }), { status: 201 }));
    vi.stubGlobal('fetch', fetchSpy);

    await createSchedule('brd_1', { title: 'Sweep', rule: 'daily at 09:00', timezone: 'UTC', overlap: 'skip' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/v1/boards/brd_1/schedules');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ title: 'Sweep', rule: 'daily at 09:00', timezone: 'UTC', overlap: 'skip' });
  });

  it('surfaces the server\'s own refusal so the form can show the parser\'s message verbatim', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: { message: 'the shortest interval is 5 minutes' } }), { status: 400 })),
    );

    const res = await createSchedule('brd_1', { title: 'x', rule: 'every 2 minutes', timezone: 'UTC', overlap: 'skip' });
    expect(res.ok).toBe(false);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe('the shortest interval is 5 minutes');
  });
});

describe('updateSchedule', () => {
  it('PATCHes enabled:false to pause a schedule', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ schedule: {} }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    await updateSchedule('brd_1', 'sch_1', { enabled: false });

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/v1/boards/brd_1/schedules/sch_1');
    expect(init?.method).toBe('PATCH');
    expect(JSON.parse(init?.body as string)).toEqual({ enabled: false });
  });
});

describe('deleteSchedule', () => {
  it('DELETEs the schedule', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchSpy);

    await deleteSchedule('brd_1', 'sch_1');

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/v1/boards/brd_1/schedules/sch_1');
    expect(init?.method).toBe('DELETE');
  });
});
