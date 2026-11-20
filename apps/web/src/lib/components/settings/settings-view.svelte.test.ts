// apps/web/src/lib/components/settings/settings-view.svelte.test.ts
// @vitest-environment jsdom
/**
 * Settings, one composition in every vibe (composition contract, Settings): one page head, the
 * sections as tabs with counts (Labels 20, Connections 2, Appearance, Account), labels as a compact
 * table renamed in place, connections as rows with a state label and Manage, appearance and account
 * as facts with one action each.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { VIBES } from '@superjackfruitlabs/vibekit-ui';
import type * as Api from '$lib/api';

// jsdom has no matchMedia; vibekit's DataTable asks it for the phone width. A desktop window.
vi.hoisted(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }),
  });
});

/** Every API mock's type: what it is called with is read back with toHaveBeenCalledWith. */
type Fn = (...args: never[]) => unknown;
const api = vi.hoisted(() => ({
  listLabels: vi.fn<Fn>(), createLabel: vi.fn<Fn>(), updateLabel: vi.fn<Fn>(), deleteLabel: vi.fn<Fn>(),
  getWorkspace: vi.fn<Fn>(), setWorkspaceFleet: vi.fn<Fn>(), getForgeHost: vi.fn<Fn>(), setForgeHost: vi.fn<Fn>(), getHubPrincipals: vi.fn<Fn>(),
  getAgents: vi.fn<Fn>(), getCapabilities: vi.fn<Fn>(), createAgent: vi.fn<Fn>(), getMembers: vi.fn<Fn>(),
}));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof Api>()), ...api }));
vi.mock('$lib/hub-token', () => ({ hubStatus: async () => ({ configured: false }), beginHubAuthorization: async () => {} }));
vi.mock('$lib/stores/app.svelte', async () => {
  const { LABEL_CARDS } = await import('./settings-fixture');
  return { app: { markBusy: <T,>(p: Promise<T>) => p, boardId: 'brd_rl_devex', board: { boardId: 'brd_rl_devex', name: 'Developer Experience', cards: LABEL_CARDS }, user: { userId: 'usr_rl_owner', name: 'Ira Mehta' }, boards: [] } };
});

import SettingsView from './SettingsView.svelte';
import { parityTree, primaryActionsPerRow, rawMachineText, repeatedParagraphs } from '$lib/composition/guards';
import { renderInVibes, type VibeRoots } from '$lib/composition/render-vibes';
import { SETTINGS_TABS } from './settings-words';
import { LABELS } from './settings-fixture';

/** The value, or a failed test saying what was missing. */
const need = <T,>(x: T | null | undefined, what = 'element'): T => { if (x === null || x === undefined) throw new Error(`no ${what}`); return x; };
const settle = async () => { for (let i = 0; i < 4; i++) { await tick(); await new Promise((r) => setTimeout(r, 0)); } };
const ok = () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });

let roots: VibeRoots | null = null;
beforeEach(() => {
  for (const f of Object.values(api)) f.mockReset();
  api.listLabels.mockResolvedValue(LABELS);
  api.updateLabel.mockResolvedValue(ok());
  api.deleteLabel.mockResolvedValue(ok());
  api.createLabel.mockResolvedValue(ok());
  api.getWorkspace.mockResolvedValue({ id: 'tnt_realistic', name: 'Realistic', externalId: 'fleet_realistic' });
  api.getForgeHost.mockResolvedValue('forge.example.com');
  api.getAgents.mockResolvedValue([]);
  api.getCapabilities.mockResolvedValue([]);
  api.getMembers.mockResolvedValue([]);
});
afterEach(() => { roots?.unmount(); roots = null; cleanup(); });

describe('SettingsView in every vibe', () => {
  for (const { id } of SETTINGS_TABS) {
    it(`${id}: renders the same accessibility tree in all four vibes outside the signature`, async () => {
      roots = await renderInVibes(SettingsView, { initial: id });
      await settle();
      const day = parityTree(roots.daylight);
      expect(day).toContain(id === 'labels' ? 'agentpod' : id === 'connections' ? 'Forge' : id === 'appearance' ? 'Vibe' : 'Sign out');
      for (const v of VIBES) {
        expect(parityTree(roots[v]), `${v} ${id}`).toBe(day);
        expect(primaryActionsPerRow(roots[v]), `${v} ${id}: one primary per row`).toEqual([]);
        expect(rawMachineText(roots[v]), `${v} ${id}: no raw ids`).toEqual([]);
        expect(repeatedParagraphs(roots[v]), `${v} ${id}: nothing said twice`).toEqual([]);
        expect(roots[v].querySelectorAll('[data-signature]'), `${v}: one signature slot`).toHaveLength(1);
      }
      const head = (v: (typeof VIBES)[number]) => need(roots)[v].querySelector('[data-signature]')?.textContent;
      for (const v of VIBES) expect(head(v)).toBe(head('daylight'));
    });
  }
});

describe('SettingsView', () => {
  it('one page head, then the sections as tabs with counts', async () => {
    render(SettingsView, {});
    await settle();
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Settings']);
    const tabs = within(screen.getByRole('tablist', { name: 'Settings' })).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Labels20 (20)', 'Connections2 (2)', 'Appearance', 'Account']);
    expect(need(tabs[0]).getAttribute('aria-selected')).toBe('true');
  });

  it('labels are a table with name, origin, used-on and remove, not inputs', async () => {
    render(SettingsView, { initial: 'labels' });
    await settle();
    const table = screen.getByRole('table', { name: 'Labels' });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent?.trim())).toEqual(['Label', 'Origin', 'Used on', 'Actions']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(6);
    // The resting table holds no text field at all: names are words, renamed on click.
    expect(within(table).queryAllByRole('textbox')).toEqual([]);
    expect(table.querySelectorAll('input:not([type="color"]), textarea')).toHaveLength(0);
    const cellsOf = (name: string) => within(need(rows.find((r) => r.textContent?.includes(name)), name)).getAllByRole('cell').map((c) => c.textContent?.replace(/\s+/g, ' ').trim());
    expect(cellsOf('agentpod')).toEqual(['agentpod', 'you', '3 cards', 'Remove']);
    expect(cellsOf('accounts')).toEqual(['accounts', 'you', '1 card', 'Remove']);
    expect(cellsOf('baseline')).toEqual(['baseline', 'inferred', '0 cards', 'Remove']);
    expect(within(table).getByRole('button', { name: 'Remove label agentpod' })).toBeTruthy();
    expect(within(table).getByRole('button', { name: 'Colour of agentpod' })).toBeTruthy();
    // Where the counts come from is said once, above the table.
    expect(screen.getByText(/Use counts are for Developer Experience/)).toBeTruthy();
    // Paged: six, then the other fourteen.
    await fireEvent.click(screen.getByRole('button', { name: /^Show 14 more/ }));
    await settle();
    expect(within(screen.getByRole('table', { name: 'Labels' })).getAllByRole('row')).toHaveLength(21);
    expect(screen.queryByRole('button', { name: /^Show \d+ more/ })).toBeNull();
    // The button is gone; focus is on the first new row, not lost to the page (M6).
    expect(screen.getByRole('table', { name: 'Labels' }).querySelectorAll('tr[data-row]')[6]?.contains(document.activeElement)).toBe(true);
    // New label is the section's one action; it opens the form.
    await fireEvent.click(screen.getByRole('button', { name: /^New label/ }));
    await fireEvent.input(screen.getByLabelText('New label name'), { target: { value: 'triage' } });
    await fireEvent.submit(screen.getByRole('form', { name: 'New label' }));
    await settle();
    expect(api.createLabel).toHaveBeenCalledWith({ name: 'triage', colour: expect.any(String) });
  });

  it('renaming happens in place and saves on blur', async () => {
    render(SettingsView, { initial: 'labels' });
    await settle();
    await fireEvent.click(screen.getByRole('button', { name: 'Rename agentpod' }));
    await tick();
    const field = screen.getByRole('textbox', { name: 'Name of agentpod' });
    expect(field).toHaveProperty('value', 'agentpod');
    expect(document.activeElement).toBe(field);
    // Only that one cell turned into a field.
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    await fireEvent.input(field, { target: { value: 'agent-pod' } });
    await fireEvent.blur(field);
    await settle();
    expect(api.updateLabel).toHaveBeenCalledWith('lbl_01', { name: 'agent-pod' });
    expect(screen.queryByRole('textbox', { name: 'Name of agentpod' })).toBeNull();

    // Escape cancels: nothing is sent and the name is words again.
    api.updateLabel.mockClear();
    await fireEvent.click(screen.getByRole('button', { name: 'Rename docs' }));
    await tick();
    const docs = screen.getByRole('textbox', { name: 'Name of docs' });
    await fireEvent.input(docs, { target: { value: 'handbook' } });
    await fireEvent.keyDown(docs, { key: 'Escape' });
    await settle();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(api.updateLabel).not.toHaveBeenCalled();

    // Enter saves too.
    await fireEvent.click(screen.getByRole('button', { name: 'Rename ci' }));
    await tick();
    const ci = screen.getByRole('textbox', { name: 'Name of ci' });
    await fireEvent.input(ci, { target: { value: 'continuous-integration' } });
    await fireEvent.keyDown(ci, { key: 'Enter' });
    await settle();
    expect(api.updateLabel).toHaveBeenCalledWith('lbl_03', { name: 'continuous-integration' });
    // The field is gone and focus is back on the label's name, not on the page.
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(document.activeElement?.id).toBe('lb-name-lbl_03');
  });

  it('removes a label after asking', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(SettingsView, { initial: 'labels' });
    await settle();
    await fireEvent.click(screen.getByRole('button', { name: 'Remove label estate' }));
    await settle();
    expect(api.deleteLabel).toHaveBeenCalledWith('lbl_05');
  });

  it('connections are rows with a state label', async () => {
    render(SettingsView, { initial: 'connections' });
    await settle();
    const rows = [...document.querySelectorAll<HTMLElement>('[data-row]')];
    expect(rows.map((r) => r.getAttribute('data-row'))).toEqual(['Forge', 'AgentPod']);
    for (const r of rows) {
      expect(r.querySelector('.vk-statelabel'), `${r.dataset.row} has a state label`).not.toBeNull();
      expect(within(r).getAllByRole('button').map((b) => b.textContent?.trim())).toEqual(['Manage']);
    }
    expect(need(rows[0]).textContent).toMatch(/Connected/);
    expect(need(rows[0]).textContent).toMatch(/forge\.example\.com/);
    expect(need(rows[1]).textContent).toMatch(/Linked/);
    // Manage opens the row's editor; the forge host saves from there.
    api.setForgeHost.mockResolvedValue(ok());
    await fireEvent.click(within(need(rows[0])).getByRole('button', { name: 'Manage' }));
    await tick();
    expect(within(need(rows[0])).getByRole('button', { name: 'Manage' }).getAttribute('aria-expanded')).toBe('true');
    const host = screen.getByLabelText('Forge host');
    expect(host).toHaveProperty('value', 'forge.example.com');
    await fireEvent.input(host, { target: { value: 'git.example.com' } });
    await fireEvent.submit(need(host.closest('form'), 'form'));
    await settle();
    expect(api.setForgeHost).toHaveBeenCalledWith('git.example.com');
  });

  it('a forge that is not set and a fleet not linked say so', async () => {
    api.getForgeHost.mockResolvedValue(null);
    api.getWorkspace.mockResolvedValue({ id: 'tnt_realistic', name: 'Realistic', externalId: null });
    render(SettingsView, { initial: 'connections' });
    await settle();
    const rows = [...document.querySelectorAll<HTMLElement>('[data-row]')];
    expect(need(rows[0]).textContent).toMatch(/Not set/);
    expect(need(rows[1]).textContent).toMatch(/Not linked/);
  });

  it('appearance and account are facts with one action each', async () => {
    render(SettingsView, { initial: 'appearance' });
    await settle();
    let panel = screen.getByRole('tabpanel');
    expect(within(panel).getAllByRole('term').map((t) => t.textContent)).toEqual(['Vibe', 'Theme', 'Accent']);
    expect(within(panel).getAllByRole('button').map((b) => b.textContent?.trim())).toEqual(['Open Appearance']);
    cleanup();
    render(SettingsView, { initial: 'account' });
    await settle();
    panel = screen.getByRole('tabpanel');
    expect(panel.textContent).toMatch(/Signed in as Ira Mehta\./);
    expect(within(panel).getAllByRole('button').map((b) => b.textContent?.trim())).toEqual(['Sign out']);
  });

  it('a labels read that fails says so with Try again, never "No labels yet"', async () => {
    api.listLabels.mockRejectedValue(new Error('down'));
    render(SettingsView, { initial: 'labels' });
    await settle();
    expect(screen.getByText("Couldn't load labels.")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/No labels yet/);
  });

  it('switching tabs tells the route, so the hash follows', async () => {
    const ontab = vi.fn<(t: string) => void>();
    render(SettingsView, { initial: 'labels', ontab });
    await settle();
    const tab = screen.getByRole('tab', { name: /^Connections/ });
    await fireEvent.pointerDown(tab, { button: 0, pointerType: 'mouse' });
    await fireEvent.mouseDown(tab, { button: 0 });
    await fireEvent.click(tab);
    await settle();
    expect(ontab).toHaveBeenCalledWith('connections');
  });
});
