// @vitest-environment jsdom
/** A Crew or Settings list that fails to load is failed (Try again), never an empty list or the raw error (loading-audit L6). */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/loading';

const api = vi.hoisted(() => ({ getMembers: vi.fn(), listLabels: vi.fn(), getCapabilities: vi.fn(), getAgents: vi.fn() }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...api }));

import { PeopleModel } from './people-model.svelte';
import { LabelsModel } from './labels-model.svelte';
import { CapabilitiesModel } from './capabilities-model.svelte';

beforeEach(() => {
  api.getMembers.mockRejectedValue(new ApiError('getMembers', 500));
  api.listLabels.mockRejectedValue(new ApiError('listLabels', 500));
  api.getCapabilities.mockRejectedValue(new ApiError('getCapabilities', 500));
  api.getAgents.mockResolvedValue([]);
});

describe('crew lists that fail', () => {
  it('people: failed, the list stays unknown (not empty), no raw error', async () => {
    const m = new PeopleModel();
    await m.refresh();
    expect([m.failed, m.members, m.error]).toEqual([true, null, null]);
    api.getMembers.mockResolvedValue([]);
    await m.refresh();
    expect([m.failed, m.members]).toEqual([false, []]);
  });
  it('labels: failed, not "No labels yet"', async () => {
    const m = new LabelsModel();
    await m.refresh();
    expect([m.failed, m.labels, m.error]).toEqual([true, null, null]);
  });
  it('capabilities: failed, not an empty list', async () => {
    const m = new CapabilitiesModel();
    await m.refresh();
    expect([m.failed, m.capabilities, m.error]).toEqual([true, null, null]);
  });
});
