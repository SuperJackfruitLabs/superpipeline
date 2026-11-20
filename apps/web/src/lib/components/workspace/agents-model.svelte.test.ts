// @vitest-environment jsdom
/**
 * A Crew or Settings list that waits says so: a skeleton from 150 ms, "the server is slow" with Try again
 * from 8 s, and a failed read says it failed (contract rule 11: a skeleton is never the resting state).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, SKELETON_DELAY_MS, SLOW_MS } from '$lib/loading';

import type * as Api from '$lib/api';

const api = vi.hoisted(() => ({
  getAgents: vi.fn<typeof Api.getAgents>(), getCapabilities: vi.fn<typeof Api.getCapabilities>(),
  getWorkspace: vi.fn<typeof Api.getWorkspace>(), getForgeHost: vi.fn<typeof Api.getForgeHost>(),
}));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof Api>()), ...api }));

import { AgentsModel } from './agents-model.svelte';
import { ConnectionsModel } from './connections-model.svelte';
import { crewLists } from './workspace-counts.svelte';

beforeEach(() => {
  vi.useFakeTimers();
  crewLists.clear();
  api.getAgents.mockReset();
  api.getCapabilities.mockReset().mockResolvedValue([]);
});
afterEach(() => { vi.useRealTimers(); });

describe('AgentsModel load', () => {
  it('shows slow copy after SLOW_MS and failed copy on rejection', async () => {
    api.getAgents.mockReturnValue(new Promise(() => {}));
    const hanging = new AgentsModel();
    void hanging.refresh();
    await vi.advanceTimersByTimeAsync(0);
    expect(hanging.load.phase).toBe('idle');
    await vi.advanceTimersByTimeAsync(SKELETON_DELAY_MS);
    expect(hanging.load.phase).toBe('skeleton');
    await vi.advanceTimersByTimeAsync(SLOW_MS - SKELETON_DELAY_MS);
    expect(hanging.load.phase).toBe('slow');

    api.getAgents.mockRejectedValue(new ApiError('getAgents', 500));
    const failing = new AgentsModel();
    await failing.refresh();
    await vi.advanceTimersByTimeAsync(0);
    expect(failing.load.phase).toBe('failed');

    const calls = api.getAgents.mock.calls.length;
    api.getAgents.mockResolvedValue([]);
    await failing.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(api.getAgents.mock.calls.length).toBe(calls + 1);
    expect(failing.load.phase).toBe('ready');
  });
});

describe('a list once read', () => {
  it('stays ready when a later read fails or waits', async () => {
    api.getAgents.mockResolvedValue([]);
    const m = new AgentsModel();
    await m.refresh();
    api.getAgents.mockRejectedValue(new ApiError('getAgents', 500));
    await m.refresh();
    api.getAgents.mockReturnValue(new Promise(() => {}));
    void m.refresh();
    await vi.advanceTimersByTimeAsync(SLOW_MS);
    expect([m.load.phase, m.agents]).toEqual(['ready', []]);
  });
});

describe('ConnectionsModel load', () => {
  it('a workspace read that never answered is failed, not "Not linked"; Try again reads it again', async () => {
    api.getAgents.mockResolvedValue([]);
    api.getForgeHost.mockResolvedValue(null);
    api.getWorkspace.mockRejectedValue(new TypeError('Failed to fetch'));
    const m = new ConnectionsModel();
    await m.refresh();
    expect(m.load.phase).toBe('failed');
    api.getWorkspace.mockResolvedValue(null);
    await m.retry();
    expect([m.load.phase, m.workspace]).toEqual(['ready', null]);
  });
});
