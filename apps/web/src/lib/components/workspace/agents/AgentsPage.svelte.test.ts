// apps/web/src/lib/components/workspace/agents/AgentsPage.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';

const api = vi.hoisted(() => ({
  getAgents: vi.fn(), getCapabilities: vi.fn(), createAgent: vi.fn(), updateAgent: vi.fn(), deleteAgent: vi.fn(),
  issueAgentToken: vi.fn(), revokeAgentToken: vi.fn(), setAgentPrincipal: vi.fn(),
  listAttention: vi.fn(), listLabels: vi.fn(), getMembers: vi.fn(),
}));
vi.mock('$lib/api', () => api);
vi.mock('$lib/stores/app.svelte', () => ({ app: { markBusy: <T,>(p: Promise<T>) => p, boardId: null, board: null } }));

import AgentsPage from './AgentsPage.svelte';

const agent = (name: string) => ({ id: `agt_${name}`, name, capabilities: ['research'], externalId: 'prn_x', externalSource: 'agentpod', iconUrl: null, concurrency: 1, tokenIds: ['tok_a', 'tok_b'], role: null, claimedCount: 0, workingCount: 0 });

const cap = (key: string) => ({ id: `cap_${key}`, key, name: key, description: null, tags: [], examples: [], origin: 'declared', externalId: null, externalSource: null, inputModes: [], outputModes: [], agentCount: 1, boardCount: 1 });

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
    expect(document.querySelector('[aria-busy="true"][data-skeleton]')).not.toBeNull();
    expect(document.body.textContent).not.toMatch(/No agents yet|0 agents/);
    fail(new Error('getAgents failed (503)'));
    expect(await screen.findByText("Couldn't load the agents.")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/failed \(503\)/);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
  it('explains an empty workspace', async () => {
    api.getAgents.mockResolvedValue([]);
    render(AgentsPage, { vibe: 'daylight' });
    expect(await screen.findByRole('heading', { name: '0 agents' })).toBeTruthy();
    expect(screen.getByText("No agents yet. Create one with New agent — you'll get a token to point an AI agent at this workspace.")).toBeTruthy();
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
  it('enables Create agent only with a name and a capability, in the New agent dialog', async () => {
    api.getAgents.mockResolvedValue([]);
    api.getCapabilities.mockResolvedValue([cap('research')]);
    render(AgentsPage, { vibe: 'daylight' });
    expect(screen.queryByRole('button', { name: 'Create agent and issue token' }), 'no inline form under the list').toBeNull();
    await fireEvent.click(await screen.findByRole('button', { name: 'New agent' }));
    const dialog = await screen.findByRole('dialog', { name: 'New agent' });
    const create = within(dialog).getByRole('button', { name: 'Create agent and issue token' }) as HTMLButtonElement;
    expect(create.disabled).toBe(true);
    await fireEvent.input(within(dialog).getByLabelText('Name'), { target: { value: 'tester-tim' } });
    expect(create.disabled).toBe(true);
    await fireEvent.click(within(dialog).getByRole('button', { name: 'research' }));
    expect(create.disabled).toBe(false);
  });
  it('creates from the dialog with cards at once and a picture, closes it, and shows the token once', async () => {
    api.getAgents.mockResolvedValue([]);
    api.getCapabilities.mockResolvedValue([cap('research')]);
    api.createAgent.mockResolvedValue({ agent: { id: 'agt_t', name: 'tester-tim', capabilities: ['research'] }, token: 'spa_once', tokenId: 'tok_1' });
    api.updateAgent.mockResolvedValue(new Response('{}', { status: 200 }));
    render(AgentsPage, { vibe: 'daylight' });
    await fireEvent.click(await screen.findByRole('button', { name: 'New agent' }));
    const dialog = await screen.findByRole('dialog', { name: 'New agent' });
    await fireEvent.input(within(dialog).getByLabelText('Name'), { target: { value: 'tester-tim' } });
    await fireEvent.input(within(dialog).getByLabelText('Cards at once'), { target: { value: '3' } });
    await fireEvent.input(within(dialog).getByLabelText('Picture (optional)'), { target: { value: 'https://example.invalid/t.png' } });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'research' }));
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Create agent and issue token' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New agent' })).toBeNull());
    expect(api.createAgent).toHaveBeenCalledWith('tester-tim', ['research'], undefined, { concurrency: 3 });
    expect(api.updateAgent).toHaveBeenCalledWith('agt_t', { iconUrl: 'https://example.invalid/t.png' });
    expect(screen.getByLabelText('New token for tester-tim').textContent).toBe('spa_once');
  });
  it('keeps the dialog open and says why when the create is refused', async () => {
    api.getAgents.mockResolvedValue([]);
    api.getCapabilities.mockResolvedValue([cap('research')]);
    api.createAgent.mockRejectedValue(new Error('name is taken'));
    render(AgentsPage, { vibe: 'daylight' });
    await fireEvent.click(await screen.findByRole('button', { name: 'New agent' }));
    const dialog = await screen.findByRole('dialog', { name: 'New agent' });
    await fireEvent.input(within(dialog).getByLabelText('Name'), { target: { value: 'tester-tim' } });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'research' }));
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Create agent and issue token' }));
    expect((await within(dialog).findByRole('alert')).textContent).toBe('name is taken');
    expect(screen.getByRole('dialog', { name: 'New agent' })).toBeTruthy();
  });
});
