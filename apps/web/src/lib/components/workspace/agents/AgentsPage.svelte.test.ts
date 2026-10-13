// apps/web/src/lib/components/workspace/agents/AgentsPage.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';

const api = vi.hoisted(() => ({
  getAgents: vi.fn(), getCapabilities: vi.fn(), createAgent: vi.fn(), updateAgent: vi.fn(), deleteAgent: vi.fn(),
  issueAgentToken: vi.fn(), revokeAgentToken: vi.fn(), setAgentPrincipal: vi.fn(),
  listAttention: vi.fn(), listLabels: vi.fn(), getMembers: vi.fn(),
}));
vi.mock('$lib/api', () => api);
vi.mock('$lib/stores/app.svelte', () => ({ app: { markBusy: <T,>(p: Promise<T>) => p, boardId: null, board: null } }));

import AgentsPage from './AgentsPage.svelte';

const agent = (name: string) => ({ id: `agt_${name}`, name, capabilities: ['research'], externalId: 'prn_x', externalSource: 'agentpod', iconUrl: null, concurrency: 1, tokenIds: ['tok_a', 'tok_b'], role: null, claimedCount: 0, workingCount: 0 });

beforeEach(() => {
  for (const f of Object.values(api)) f.mockReset();
  api.getCapabilities.mockResolvedValue([]);
  api.listAttention.mockResolvedValue({ cards: [], boardsUnanswered: 0 });
  api.listLabels.mockResolvedValue([]);
  api.getMembers.mockResolvedValue([]);
});
afterEach(cleanup);

describe('AgentsPage', () => {
  it('says it is loading, then says what failed and offers to try again', async () => {
    let fail!: (e: Error) => void;
    api.getAgents.mockReturnValue(new Promise((_, reject) => { fail = reject; }));
    render(AgentsPage, { vibe: 'daylight' });
    expect(screen.getByRole('heading', { name: 'Agents' })).toBeTruthy();
    expect(screen.getByText('Loading agents…')).toBeTruthy();
    fail(new Error('agents 503'));
    expect(await screen.findByText('Could not load the agents: agents 503')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
  it('explains an empty workspace', async () => {
    api.getAgents.mockResolvedValue([]);
    render(AgentsPage, { vibe: 'daylight' });
    expect(await screen.findByRole('heading', { name: '0 agents' })).toBeTruthy();
    expect(screen.getByText("No agents yet. Create one below — you'll get a token to point an AI agent at this workspace.")).toBeTruthy();
  });
  it('keeps one action menu open at a time and closes it on Escape, back on its summary', async () => {
    api.getAgents.mockResolvedValue([agent('research-ray'), agent('writer-quill')]);
    const { container } = render(AgentsPage, { vibe: 'daylight' });
    await screen.findByText('research-ray');
    const [a, b] = [...container.querySelectorAll<HTMLDetailsElement>('details.menu')];
    a!.open = true; a!.dispatchEvent(new Event('toggle'));
    b!.open = true; b!.dispatchEvent(new Event('toggle'));
    await Promise.resolve();
    expect(a!.open).toBe(false);
    await fireEvent.keyDown(b!, { key: 'Escape' });
    expect(b!.open).toBe(false);
    expect(document.activeElement).toBe(b!.querySelector('summary'));
  });
  it('enables Create agent only with a name and a capability', async () => {
    api.getAgents.mockResolvedValue([]);
    api.getCapabilities.mockResolvedValue([{ id: 'cap_research', key: 'research', name: 'research', description: null, tags: [], examples: [], origin: 'declared', externalId: null, externalSource: null, inputModes: [], outputModes: [], agentCount: 1, boardCount: 1 }]);
    render(AgentsPage, { vibe: 'daylight' });
    const create = (await screen.findByRole('button', { name: 'Create agent and issue token' })) as HTMLButtonElement;
    expect(create.disabled).toBe(true);
    await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'tester-tim' } });
    expect(create.disabled).toBe(true);
    await fireEvent.click(screen.getByRole('button', { name: 'research' }));
    expect(create.disabled).toBe(false);
  });
});
