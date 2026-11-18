// apps/web/src/lib/components/workspace/crew-new-agent.svelte.test.ts
// @vitest-environment jsdom
// Crew's Agents tab (CrewView): what loading, an empty workspace and the New agent dialog do.
// Rewritten from the AgentsPage tests when the Agents tab became one table in every vibe.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';

const api = vi.hoisted(() => ({
  getAgents: vi.fn(), getCapabilities: vi.fn(), createAgent: vi.fn(), updateAgent: vi.fn(), deleteAgent: vi.fn(),
  issueAgentToken: vi.fn(), revokeAgentToken: vi.fn(), setAgentPrincipal: vi.fn(),
  listAttention: vi.fn(), listLabels: vi.fn(), getMembers: vi.fn(),
}));
vi.mock('$lib/api', () => api);
// jsdom has no matchMedia; vibekit's DataTable asks it for the phone width.
vi.hoisted(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string): MediaQueryList => ({ matches: false, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false }),
  });
});
vi.mock('$lib/stores/app.svelte', () => ({ app: { markBusy: <T,>(p: Promise<T>) => p, boardId: null, board: null } }));

import CrewView from './CrewView.svelte';
import { crewLists } from './workspace-counts.svelte';
import { viewport } from '$lib/viewport.svelte';


const cap = (key: string) => ({ id: `cap_${key}`, key, name: key, description: null, tags: [], examples: [], origin: 'declared', externalId: null, externalSource: null, inputModes: [], outputModes: [], agentCount: 1, boardCount: 1 });

// The tab's own New button shows where the masthead has none (a phone, Quiet); these tests drive it.
beforeEach(() => {
  viewport.phone = true;
  crewLists.clear();
  for (const f of Object.values(api)) f.mockReset();
  api.getCapabilities.mockResolvedValue([]);
  api.listAttention.mockResolvedValue({ cards: [], boardsUnanswered: 0 });
  api.listLabels.mockResolvedValue([]);
  api.getMembers.mockResolvedValue([]);
});
afterEach(() => { cleanup(); viewport.phone = false; });

/** An empty phone tab offers New agent twice (the head and the empty sentence); either opens the dialog. */
const firstNewAgent = async (): Promise<HTMLElement> => {
  const [b] = await screen.findAllByRole('button', { name: 'New agent' });
  if (!b) throw new Error('no New agent button');
  return b;
};

describe('Crew · Agents', () => {
  it('says it is loading, then says what failed and offers to try again', async () => {
    let fail!: (e: Error) => void;
    api.getAgents.mockReturnValue(new Promise((_, reject) => { fail = reject; }));
    render(CrewView, { tab: 'agents' });
    expect(document.querySelector('[aria-busy="true"][data-skeleton]')).not.toBeNull();
    expect(document.body.textContent).not.toMatch(/No agents yet|0 agents/);
    fail(new Error('getAgents failed (503)'));
    expect(await screen.findByText("Couldn't load the agents.")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/failed \(503\)/);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
  it('explains an empty workspace', async () => {
    api.getAgents.mockResolvedValue([]);
    render(CrewView, { tab: 'agents' });
    expect(await screen.findByText('No agents yet. An agent gets a token to reach this workspace and claims cards at the stages that ask for its capabilities.')).toBeTruthy();
    expect(screen.queryByRole('table'), 'no empty table under the sentence').toBeNull();
  });
  it('enables Create agent only with a name and a capability, in the New agent dialog', async () => {
    api.getAgents.mockResolvedValue([]);
    api.getCapabilities.mockResolvedValue([cap('research')]);
    render(CrewView, { tab: 'agents' });
    expect(screen.queryByRole('button', { name: 'Create agent and issue token' }), 'no inline form under the list').toBeNull();
    await fireEvent.click(await firstNewAgent());
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
    render(CrewView, { tab: 'agents' });
    await fireEvent.click(await firstNewAgent());
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
    render(CrewView, { tab: 'agents' });
    await fireEvent.click(await firstNewAgent());
    const dialog = await screen.findByRole('dialog', { name: 'New agent' });
    await fireEvent.input(within(dialog).getByLabelText('Name'), { target: { value: 'tester-tim' } });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'research' }));
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Create agent and issue token' }));
    expect((await within(dialog).findByRole('alert')).textContent).toBe('name is taken');
    expect(screen.getByRole('dialog', { name: 'New agent' })).toBeTruthy();
  });
});
