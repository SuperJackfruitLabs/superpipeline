// @vitest-environment jsdom
/** A Crew tab opens on the list it last read, never a skeleton under a count the pills already show. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ getMembers: vi.fn(), getCapabilities: vi.fn(), getAgents: vi.fn() }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...api }));

import { AgentsModel } from './agents-model.svelte';
import { CapabilitiesModel } from './capabilities-model.svelte';
import { PeopleModel } from './people-model.svelte';
import { crewLists, workspaceCounts } from './workspace-counts.svelte';

const agent = (id: string) => ({ id, name: id, role: null, claimedCount: 0, workingCount: 0, capabilities: ['research'], externalId: null, externalSource: null, iconUrl: null, concurrency: 1, tokenIds: [] });
const cap = (key: string) => ({ id: `cap_${key}`, key, name: key, description: null, agentCount: 1, boardCount: 1, implies: [] });
const never = () => new Promise<never>(() => {});

beforeEach(() => {
  crewLists.clear();
  api.getAgents.mockResolvedValue([agent('a1'), agent('a2')]);
  api.getCapabilities.mockResolvedValue([cap('research')]);
  api.getMembers.mockResolvedValue([{ userId: 'usr_1', role: 'owner', name: 'Ira Mehta' }]);
});

describe('Crew tabs open on what the counts already know', () => {
  it('after the pills loaded, a new Agents tab has its rows while its own refresh is still out', async () => {
    await workspaceCounts.refresh();
    expect(workspaceCounts.value.agents).toBe(2);
    api.getAgents.mockImplementation(never);
    api.getCapabilities.mockImplementation(never);
    const m = new AgentsModel();
    void m.refresh();
    expect(m.agents?.map((a) => a.id)).toEqual(['a1', 'a2']);
  });
  it('switching Agents -> People -> Capabilities -> Agents never goes back to unknown', async () => {
    const first = new AgentsModel();
    await first.refresh();
    api.getAgents.mockImplementation(never);
    api.getCapabilities.mockImplementation(never);
    api.getMembers.mockImplementation(never);
    const caps = new CapabilitiesModel();
    void caps.refresh();
    expect(caps.capabilities?.map((c) => c.key)).toEqual(['research']);
    const again = new AgentsModel();
    void again.refresh();
    expect(again.agents).not.toBeNull();
  });
  it('people open on the members the pills read', async () => {
    await workspaceCounts.refresh();
    api.getMembers.mockImplementation(never);
    const p = new PeopleModel();
    void p.refresh();
    expect(p.members).toHaveLength(1);
  });
  it('a refresh replaces the remembered list with the server answer', async () => {
    await new AgentsModel().refresh();
    api.getAgents.mockResolvedValue([agent('a3')]);
    const m = new AgentsModel();
    await m.refresh();
    expect(m.agents?.map((a) => a.id)).toEqual(['a3']);
    expect(new AgentsModel().agents?.map((a) => a.id)).toEqual(['a3']);
  });
});
