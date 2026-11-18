// apps/web/src/lib/components/workspace/crew-view.svelte.test.ts
// @vitest-environment jsdom
/**
 * Crew, one composition in every vibe (composition contract, Crew): a page head with a one-line lede
 * and one help link, tabs with counts, one table per tab, "Show N more", the footer line, and real
 * loading states. Every function the old panels had stays reachable, under each row's actions menu.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { VIBES } from '@superjackfruitlabs/vibekit-ui';

// jsdom has no matchMedia; vibekit's DataTable asks it for the phone width. A desktop window.
vi.hoisted(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string): MediaQueryList => ({ matches: false, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false }),
  });
});

type ApiFn = (...args: unknown[]) => Promise<unknown>;
const api = vi.hoisted(() => ({
  getAgents: vi.fn<ApiFn>(), getCapabilities: vi.fn<ApiFn>(), getMembers: vi.fn<ApiFn>(),
  createAgent: vi.fn<ApiFn>(), updateAgent: vi.fn<ApiFn>(), deleteAgent: vi.fn<ApiFn>(), issueAgentToken: vi.fn<ApiFn>(), revokeAgentToken: vi.fn<ApiFn>(), setAgentPrincipal: vi.fn<ApiFn>(),
  addMember: vi.fn<ApiFn>(), setMemberRole: vi.fn<ApiFn>(), removeMember: vi.fn<ApiFn>(),
  createCapability: vi.fn<ApiFn>(), updateCapability: vi.fn<ApiFn>(), deleteCapability: vi.fn<ApiFn>(), addImplication: vi.fn<ApiFn>(), removeImplication: vi.fn<ApiFn>(),
}));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof Api>()), ...api }));
vi.mock('$lib/stores/app.svelte', () => ({ app: { markBusy: <T,>(p: Promise<T>) => p, attention: [], boardId: null, board: null, user: { userId: 'usr_ira' } } }));

import CrewView from './CrewView.svelte';
import { app } from '$lib/stores/app.svelte';
import { crewLists, workspaceCounts, CREW_TAB_IDS } from './workspace-counts.svelte';
import { parityTree, primaryActionsPerRow, rawMachineText, repeatedParagraphs } from '$lib/composition/guards';
import { renderInVibes, type VibeRoots } from '$lib/composition/render-vibes';
import { realisticWorkspace } from '$lib/fixtures/realistic';
import { ApiError, SLOW_COPY, SLOW_MS, TRY_AGAIN } from '$lib/loading';
import type * as Api from '$lib/api';
import type { AgentSummary, CapabilityRecord, Member, StaleCard } from '$lib/api';

const AGENTS = realisticWorkspace().agents;
const cap = (key: string, over: Partial<CapabilityRecord> = {}): CapabilityRecord => ({
  id: `cap_${key}`, key, name: key, description: null, tags: [], examples: [], origin: 'declared', externalId: null, externalSource: null,
  inputModes: [], outputModes: [], agentCount: 1, boardCount: 1, ...over,
});
const CAPS = [
  cap('planning', { description: 'Shapes a goal into a plan with steps and a test for done.' }), cap('analysis'), cap('diagnostics'), cap('testing'),
  cap('code', { implies: ['analysis'] }), cap('integration'), cap('writing'), cap('marketing', { origin: 'inferred' }),
  cap('research', { agentCount: 0, boardCount: 0 }),
];
const MEMBERS: Member[] = [
  { userId: 'usr_ira', email: 'ira@vibes-fixture.invalid', name: 'Ira Mehta', role: 'owner', createdAt: '2026-09-01T00:00:00Z' },
  { userId: 'usr_dev', email: 'dev@vibes-fixture.invalid', name: 'Dev Rao', role: 'member', createdAt: '2026-09-02T00:00:00Z' },
];
const settle = async () => { for (let i = 0; i < 4; i++) { await tick(); await new Promise((r) => setTimeout(r, 0)); } };
const never = () => new Promise<never>(() => {});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const openMenu = async (name: string) => {
  // A menu a radio choice left open stays open (vibekit keeps it for the next choice).
  const find = () => document.querySelector<HTMLElement>(`[role="menu"][aria-label="${name}"]`);
  if (!find()) await fireEvent.keyDown(screen.getByRole('button', { name }), { key: 'Enter' });
  await tick();
  const menu = find();
  if (!menu) throw new Error(`no menu ${name}`);
  return menu;
};

/** The one element a query must find (a test fails, rather than reading undefined). */
function one<T>(x: T | null | undefined, what: string): T {
  if (x === null || x === undefined) throw new Error(`missing: ${what}`);
  return x;
}
const item = (menu: HTMLElement, role: string, words: string): HTMLElement => {
  const found = [...menu.querySelectorAll<HTMLElement>(`[role="${role}"]`)].find((e) => e.textContent?.trim() === words);
  if (!found) throw new Error(`no ${role} "${words}"`);
  return found;
};

let roots: VibeRoots | null = null;
beforeEach(() => {
  crewLists.clear();
  for (const f of Object.values(api)) f.mockReset();
  api.getAgents.mockResolvedValue(AGENTS);
  api.getCapabilities.mockResolvedValue(CAPS);
  api.getMembers.mockResolvedValue(MEMBERS);
  workspaceCounts.value = { agents: AGENTS.length, capabilities: CAPS.length, people: MEMBERS.length };
});
afterEach(() => { roots?.unmount(); roots = null; cleanup(); vi.useRealTimers(); });

describe('CrewView in every vibe', () => {
  for (const tab of CREW_TAB_IDS) {
    it(`${tab}: renders the same accessibility tree in all four vibes outside the signature`, async () => {
      roots = await renderInVibes(CrewView, { tab });
      await settle();
      const day = parityTree(roots.daylight);
      expect(day).toContain(tab === 'agents' ? 'strategy-sam' : tab === 'people' ? 'Ira Mehta' : 'planning');
      for (const v of VIBES) {
        expect(parityTree(roots[v]), `${v} ${tab}`).toBe(day);
        expect(primaryActionsPerRow(roots[v]), `${v} ${tab}: one primary per row`).toEqual([]);
        expect(rawMachineText(roots[v]), `${v} ${tab}: no raw ids`).toEqual([]);
        expect(repeatedParagraphs(roots[v]), `${v} ${tab}: nothing said twice`).toEqual([]);
        expect(roots[v].querySelectorAll('[data-signature]'), `${v}: one signature slot`).toHaveLength(1);
      }
      // The signature changes the look of the head, never its words.
      const r = roots;
      const head = (v: (typeof VIBES)[number]) => one(r[v].querySelector('[data-signature]'), 'signature').textContent;
      for (const v of VIBES) expect(head(v)).toBe(head('daylight'));
    });
  }
});

describe('CrewView', () => {
  it('no legend row; help is one link', async () => {
    const { container } = render(CrewView, { tab: 'agents' });
    await settle();
    expect(container.querySelector('.legend')).toBeNull();
    expect(container.textContent).not.toMatch(/Linked to AgentPod —|access keys it uses|edit, issue or revoke/);
    const help = screen.getAllByRole('link', { name: /how agents pick cards/i });
    expect(help).toHaveLength(1);
    const link = one(help[0], 'help link');
    expect(link.getAttribute('href')).toBe('https://docs.superpipeline.dev/use/agents/');
    expect(screen.getByRole('heading', { level: 1, name: 'Crew' })).toBeTruthy();
    // One lede line under the title: the help link sits in it.
    expect(link.closest('p')?.textContent).toMatch(/^The agents who claim cards on your boards/);
  });

  it('the tabs are Agents, People and Capabilities, as links with their counts', async () => {
    render(CrewView, { tab: 'people' });
    const nav = screen.getByRole('navigation', { name: 'Crew' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((a) => a.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Agents8 (8)', 'People2 (2)', 'Capabilities9 (9)']);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/crew/agents', '/crew/people', '/crew/capabilities']);
    expect(links.map((a) => a.getAttribute('aria-current'))).toEqual([null, 'page', null]);
  });

  it('the agents table has who, works, from, last seen and an actions menu', async () => {
    render(CrewView, { tab: 'agents' });
    await settle();
    const table = screen.getByRole('table', { name: 'Agents' });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent?.trim())).toEqual(['Agent', 'Works', 'From', 'Last seen', 'Actions']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(AGENTS.length);
    const sam = one(rows.find((r) => r.textContent?.includes('strategy-sam')), 'strategy-sam');
    const cells = within(sam).getAllByRole('cell');
    expect(one(cells[0], 'who').querySelector('.vk-face'), 'a face beside the name').not.toBeNull();
    expect(cells.slice(0, 4).map((c) => c.textContent?.trim())).toEqual(['strategy-sam', 'planning', 'AgentPod', 'Now']);
    const trigger = within(one(cells[4], 'actions')).getByRole('button', { name: 'Actions for strategy-sam' });
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    // Tokens and links live under the actions, not on the row.
    expect(sam.textContent).not.toMatch(/token|Linked/);
  });

  it('every agent function is under its actions menu: edit, issue, run-only, unlink, revoke, delete', async () => {
    api.issueAgentToken.mockResolvedValue({ token: 'spa_once', tokenId: 'tok_2' });
    api.setAgentPrincipal.mockResolvedValue(json({}));
    api.revokeAgentToken.mockResolvedValue(json({}));
    api.deleteAgent.mockResolvedValue(json({}));
    api.updateAgent.mockResolvedValue(json({}));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(CrewView, { tab: 'agents' });
    await settle();
    let menu = await openMenu('Actions for strategy-sam');
    expect(within(menu).getAllByRole('menuitem').map((i) => i.textContent?.trim())).toEqual(
      ['Edit agent', 'Issue a token', 'Issue a run-only token', 'Unlink from AgentPod', 'Revoke token 1', 'Delete agent…']);
    expect(within(menu).getByText('1 token in use')).toBeTruthy();

    await fireEvent.click(within(menu).getByRole('menuitem', { name: 'Issue a run-only token' }));
    await settle();
    expect(api.issueAgentToken).toHaveBeenCalledWith('agt_rl_strategy_sam', ['run']);
    expect(screen.getByLabelText('New token for strategy-sam').textContent).toBe('spa_once');

    menu = await openMenu('Actions for strategy-sam');
    await fireEvent.click(within(menu).getByRole('menuitem', { name: 'Unlink from AgentPod' }));
    await settle();
    expect(api.setAgentPrincipal).toHaveBeenCalledWith('agt_rl_strategy_sam', null);

    menu = await openMenu('Actions for strategy-sam');
    await fireEvent.click(within(menu).getByRole('menuitem', { name: 'Revoke token 1' }));
    await settle();
    expect(api.revokeAgentToken).toHaveBeenCalledWith('agt_rl_strategy_sam', 'tok_fx_strategy_sam_1');

    menu = await openMenu('Actions for strategy-sam');
    await fireEvent.click(within(menu).getByRole('menuitem', { name: 'Delete agent…' }));
    await settle();
    expect(api.deleteAgent).toHaveBeenCalledWith('agt_rl_strategy_sam');

    // Edit opens its form in place of the resting table's row; Save sends it.
    menu = await openMenu('Actions for coder-kai');
    await fireEvent.click(within(menu).getByRole('menuitem', { name: 'Edit agent' }));
    await settle();
    const form = screen.getByRole('form', { name: 'Edit coder-kai' });
    await fireEvent.input(within(form).getByLabelText('Name'), { target: { value: 'coder-kim' } });
    await fireEvent.submit(form);
    await settle();
    expect(api.updateAgent).toHaveBeenCalledWith('agt_rl_coder_kai', expect.objectContaining({ name: 'coder-kim', capabilities: ['code'] }));
  });

  it('closes an actions menu on Escape and puts focus back on its button', async () => {
    render(CrewView, { tab: 'agents' });
    await settle();
    const trigger = screen.getByRole('button', { name: 'Actions for coder-kai' });
    trigger.focus();
    await openMenu('Actions for coder-kai');
    await fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await settle();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('shows ten rows, then Show N more', async () => {
    const many: AgentSummary[] = Array.from({ length: 14 }, (_, i) => ({ ...one(AGENTS[0], 'agent'), id: `agt_n${i}`, name: `agent-${String(i).padStart(2, '0')}` }));
    api.getAgents.mockResolvedValue(many);
    render(CrewView, { tab: 'agents' });
    await settle();
    const table = screen.getByRole('table', { name: 'Agents' });
    expect(within(table).getAllByRole('row').slice(1)).toHaveLength(10);
    await fireEvent.click(screen.getByRole('button', { name: /^Show 4 more/ }));
    await settle();
    expect(within(table).getAllByRole('row').slice(1)).toHaveLength(14);
    expect(screen.queryByRole('button', { name: /^Show \d+ more/ })).toBeNull();
  });

  it('the footer line says how many agents, how many need you and how many rest', async () => {
    // strategy-sam works one card; with nothing on the attention list he is working, not waiting on you.
    const { container } = render(CrewView, { tab: 'agents' });
    await settle();
    expect(container.querySelector('.crew-foot')?.textContent).toBe('8 agents · 1 working · 7 resting');
    cleanup();
    // The attention list names him on a question: he needs you, his row carries the edge and comes first.
    const asked: StaleCard = {
      boardId: 'brd_rl_planning', boardName: 'Planning & Roadmap', cardId: 'card_rl_planning_002', title: 'Pricing page', ownerUserId: 'usr_ira',
      agentId: 'agt_rl_strategy_sam', stageKey: 'shape', stageName: 'Shape', state: 'input-required',
      why: { kind: 'needs-human', reason: 'question' }, summary: null, since: '2026-11-18T00:00:00Z', ageHours: 1, next: '',
    };
    app.attention = [asked];
    try {
      const again = render(CrewView, { tab: 'agents' });
      await settle();
      expect(again.container.querySelector('.crew-foot')?.textContent).toBe('8 agents · 1 needs you · 7 resting');
      const first = again.container.querySelector('tbody tr');
      expect(first?.getAttribute('data-needs')).toBe('true');
      expect(first?.textContent).toContain('strategy-sam');
    } finally {
      app.attention = [];
    }
  });

  it('an empty tab says so in a sentence with the one action that fills it', async () => {
    api.getAgents.mockResolvedValue([]);
    api.getCapabilities.mockResolvedValue([]);
    for (const [tab, words, action] of [
      ['agents', /^No agents yet\./, 'New agent'],
      ['capabilities', /^No capabilities yet\./, 'New capability'],
    ] as const) {
      render(CrewView, { tab });
      await settle();
      expect(screen.getByText(words)).toBeTruthy();
      await fireEvent.click(screen.getByRole('button', { name: action }));
      expect(await screen.findByRole('dialog', { name: action })).toBeTruthy();
      cleanup();
    }
  });

  it('people: role and remove live under the menu; the last owner keeps the role', async () => {
    api.setMemberRole.mockResolvedValue(json({}));
    api.removeMember.mockResolvedValue(json({}));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(CrewView, { tab: 'people' });
    await settle();
    const table = screen.getByRole('table', { name: 'People' });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent?.trim())).toEqual(['Person', 'Email', 'Role', 'Actions']);
    expect(within(table).queryByRole('combobox'), 'no select in the resting row').toBeNull();
    let menu = await openMenu('Actions for Dev Rao');
    await fireEvent.click(within(menu).getByRole('menuitemradio', { name: 'Admin' }));
    await settle();
    expect(api.setMemberRole).toHaveBeenCalledWith('usr_dev', 'admin');
    menu = await openMenu('Actions for Dev Rao');
    // jsdom: the menu a radio choice left open is re-drawn with the new list, and testing-library then
    // cannot name its items (a browser shows them: data-state stays open); find them by their words.
    await fireEvent.click(item(menu, 'menuitem', 'Remove from workspace…'));
    await settle();
    expect(api.removeMember).toHaveBeenCalledWith('usr_dev');
    menu = await openMenu('Actions for Ira Mehta');
    expect(item(menu, 'menuitemradio', 'Member').getAttribute('aria-disabled')).toBe('true');
    expect(item(menu, 'menuitem', 'Remove from workspace…').getAttribute('aria-disabled')).toBe('true');
  });

  it('capabilities: describe, imply, stop implying and remove live under the menu', async () => {
    api.updateCapability.mockResolvedValue(json({}));
    api.addImplication.mockResolvedValue(json({}));
    api.removeImplication.mockResolvedValue(json({}));
    api.deleteCapability.mockResolvedValue(json({}));
    render(CrewView, { tab: 'capabilities' });
    await settle();
    const table = screen.getByRole('table', { name: 'Capabilities' });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent?.trim())).toEqual(['Capability', 'Description', 'Held by', 'Asked for by', 'Actions']);
    expect(within(table).queryByRole('textbox'), 'no inline form in the resting rows').toBeNull();

    let menu = await openMenu('Actions for planning');
    await fireEvent.click(within(menu).getByRole('menuitem', { name: 'Edit description' }));
    await settle();
    const desc = screen.getByLabelText('Description of planning');
    expect(desc.tagName).toBe('TEXTAREA');
    expect(desc).toHaveProperty('value', 'Shapes a goal into a plan with steps and a test for done.');
    await fireEvent.input(desc, { target: { value: 'Plans.' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await settle();
    expect(api.updateCapability).toHaveBeenCalledWith('cap_planning', { description: 'Plans.' });

    menu = await openMenu('Actions for code');
    await fireEvent.click(within(menu).getByRole('menuitem', { name: 'Stop implying analysis' }));
    await settle();
    expect(api.removeImplication).toHaveBeenCalledWith('code', 'analysis');

    menu = await openMenu('Actions for code');
    await fireEvent.click(within(menu).getByRole('menuitem', { name: 'Add an implied capability' }));
    await settle();
    await fireEvent.input(screen.getByLabelText('code implies'), { target: { value: 'testing' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await settle();
    expect(api.addImplication).toHaveBeenCalledWith('code', 'testing');

    menu = await openMenu('Actions for research');
    await fireEvent.click(within(menu).getByRole('menuitem', { name: 'Remove research' }));
    await settle();
    expect(api.deleteCapability).toHaveBeenCalledWith('cap_research');
  });
});

describe('loading, slow and failed states render per rule 11', () => {
  const READ = { agents: api.getAgents, people: api.getMembers, capabilities: api.getCapabilities } as const;
  const WHAT = { agents: "Couldn't load the agents.", people: "Couldn't load people.", capabilities: "Couldn't load capabilities." } as const;
  for (const tab of CREW_TAB_IDS) {
    it(`${tab}: skeleton, then slow with Try again, then failed with Try again, then the table`, async () => {
      vi.useFakeTimers();
      for (const f of Object.values(READ)) f.mockImplementation(never);
      const { container } = render(CrewView, { tab });
      expect(container.querySelector('[data-skeleton][aria-busy="true"]'), 'the skeleton holds the space').not.toBeNull();
      expect(container.textContent).not.toMatch(/No (agents|people|capabilities) yet/);
      await vi.advanceTimersByTimeAsync(SLOW_MS - 1);
      expect(container.textContent).not.toContain(SLOW_COPY);
      await vi.advanceTimersByTimeAsync(1);
      expect(container.textContent).toContain(SLOW_COPY);
      // Try again reads once more; this time the read fails, and the tab says it could not load.
      READ[tab].mockRejectedValue(new ApiError('read', 503));
      const before = READ[tab].mock.calls.length;
      screen.getByRole('button', { name: TRY_AGAIN }).click();
      await vi.advanceTimersByTimeAsync(0);
      expect(READ[tab].mock.calls.length).toBe(before + 1);
      expect(container.querySelector('[data-failed]')?.textContent).toContain(WHAT[tab]);
      expect(container.textContent).not.toMatch(/503|Error:/);
      // Try again from the failure, and the list arrives.
      READ.agents.mockResolvedValue(AGENTS);
      READ.people.mockResolvedValue(MEMBERS);
      READ.capabilities.mockResolvedValue(CAPS);
      screen.getByRole('button', { name: TRY_AGAIN }).click();
      await vi.advanceTimersByTimeAsync(0);
      vi.useRealTimers();
      await waitFor(() => expect(container.querySelector('table')).not.toBeNull());
      expect(container.querySelector('[data-skeleton], [data-failed]')).toBeNull();
    });
  }
});
