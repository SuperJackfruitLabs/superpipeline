// apps/web/src/lib/components/settings/board-settings-view.svelte.test.ts
// @vitest-environment jsdom
/**
 * Board settings follow the Settings composition: one page head, tabs with counts (Stages, Schedules,
 * Labels, Spending caps, GitHub, Name and profiles), tables and fact lists, one action per section. The old
 * BoardSettings.svelte tests (pristine open, an unsaved change counted, a rule saved on blur) are
 * kept here as behaviour, now reached through their tab.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { VIBES } from '@superjackfruitlabs/vibekit-ui';
import type * as Api from '$lib/api';

vi.hoisted(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }),
  });
});

/** Every API mock's type: what it is called with is read back with toHaveBeenCalledWith. */
type Fn = (...args: never[]) => unknown;
const api = vi.hoisted(() => ({
  patchStage: vi.fn<Fn>(), setStages: vi.fn<Fn>(), renameBoard: vi.fn<Fn>(), setGithubConfig: vi.fn<Fn>(), getProfiles: vi.fn<Fn>(), createProfile: vi.fn<Fn>(),
  getSchedules: vi.fn<Fn>(), createSchedule: vi.fn<Fn>(), updateSchedule: vi.fn<Fn>(), deleteSchedule: vi.fn<Fn>(),
  listLabels: vi.fn<Fn>(), createLabel: vi.fn<Fn>(), updateLabel: vi.fn<Fn>(), deleteLabel: vi.fn<Fn>(), getAgents: vi.fn<Fn>(), getCapabilities: vi.fn<Fn>(), getMembers: vi.fn<Fn>(),
}));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof Api>()), ...api }));
vi.mock('$lib/stores/app.svelte', () => ({ app: { agents: [], markBusy: <T,>(p: Promise<T>) => p, board: null, boards: [] } }));
import BoardSettingsView from './BoardSettingsView.svelte';
import { DX_STAGES } from './settings-fixture';
import { DX_BOARD } from '$lib/test/dx-snapshot';
import { SLOW_COPY, SLOW_MS } from '$lib/loading';
import type { BoardSnapshot, Label } from '$lib/api';
import { BOARD_SETTINGS_TABS } from './settings-words';
import { parityTree, primaryActionsPerRow, rawMachineText, repeatedParagraphs } from '$lib/composition/guards';
import { renderInVibes, type VibeRoots } from '$lib/composition/render-vibes';

const LABELS: Label[] = [
  { id: 'lbl_a', tenantId: 'tnt_vibes', name: 'agentpod', colour: '#3a6fc8', origin: 'declared', createdAt: '2026-10-01T00:00:00Z' },
  { id: 'lbl_b', tenantId: 'tnt_vibes', name: 'baseline', colour: '#9a9a9a', origin: 'inferred', createdAt: '2026-10-01T00:00:00Z' },
  { id: 'lbl_c', tenantId: 'tnt_vibes', name: 'unused-here', colour: '#9a9a9a', origin: 'declared', createdAt: '2026-10-01T00:00:00Z' },
];
// The Developer Experience board: agentpod on two of its cards, baseline on one; a $50 board cap.
const board: BoardSnapshot = {
  ...DX_BOARD, stages: DX_STAGES,
  cards: DX_BOARD.cards.map((c, i) => ({ ...c, labels: i === 0 ? ['lbl_a', 'lbl_b'] : i === 1 ? ['lbl_a'] : [] })),
  usage: { ...DX_BOARD.usage, budgetUsd: 50 },
  github: { issueTrigger: false, webhookConfigured: false, triggerGrantCount: null, webhookUrl: 'https://app.superpipeline.dev/v1/boards/brd_134a0ddb6d434478/webhooks/github?tenant=tnt_vibes' },
};
const SCHEDULE = { id: 'sch_1', title: 'Weekly dependency check', rule: 'weekly on mon at 09:00', timezone: 'Asia/Kolkata', stageKey: 'reproduce', enabled: true, nextFireAt: null, lastFiredAt: null, createdBy: 'Ira Mehta', skipCount: 0 };
/** The value, or a failed test saying what was missing. */
const need = <T,>(x: T | null | undefined, what = 'element'): T => { if (x === null || x === undefined) throw new Error(`no ${what}`); return x; };
const settle = async () => { for (let i = 0; i < 4; i++) { await tick(); await new Promise((r) => setTimeout(r, 0)); } };
const openTab = async (name: RegExp) => {
  const tab = screen.getByRole('tab', { name });
  await fireEvent.pointerDown(tab, { button: 0, pointerType: 'mouse' });
  await fireEvent.mouseDown(tab, { button: 0 });
  await fireEvent.click(tab);
  await settle();
};

let roots: VibeRoots | null = null;
beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-10-11T08:19:00Z'), shouldAdvanceTime: true });
  for (const f of Object.values(api)) f.mockReset();
  api.getProfiles.mockResolvedValue([]);
  api.getSchedules.mockResolvedValue([SCHEDULE]);
  api.listLabels.mockResolvedValue(LABELS);
  api.getAgents.mockResolvedValue([]);
  api.getCapabilities.mockResolvedValue([]);
  api.getMembers.mockResolvedValue([]);
  api.patchStage.mockResolvedValue(new Response('{}', { status: 200 }));
});
afterEach(() => { roots?.unmount(); roots = null; cleanup(); vi.useRealTimers(); });

describe('BoardSettingsView in every vibe', () => {
  for (const { id } of BOARD_SETTINGS_TABS) {
    it(`${id}: renders the same accessibility tree in all four vibes outside the signature`, async () => {
      roots = await renderInVibes(BoardSettingsView, { board, onChanged: () => {}, initial: id });
      await settle();
      const day = parityTree(roots.daylight);
      for (const v of VIBES) {
        expect(parityTree(roots[v]), `${v} ${id}`).toBe(day);
        expect(primaryActionsPerRow(roots[v]), `${v} ${id}: one primary per row`).toEqual([]);
        expect(rawMachineText(roots[v]), `${v} ${id}: no raw ids`).toEqual([]);
        expect(repeatedParagraphs(roots[v]), `${v} ${id}: nothing said twice`).toEqual([]);
        expect(roots[v].querySelectorAll('[data-signature]'), `${v}: one signature slot`).toHaveLength(1);
      }
    });
  }
});

describe('BoardSettingsView', () => {
  it('one page head, then tabs with counts', async () => {
    render(BoardSettingsView, { board, onChanged: () => {} });
    await settle();
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Developer Experience']);
    expect(screen.getByRole('link', { name: /Back to the board/ }).getAttribute('href')).toBe('/b/brd_134a0ddb6d434478');
    const tabs = within(screen.getByRole('tablist', { name: 'Board settings' })).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Stages7 (7)', 'Schedules1 (1)', 'Labels2 (2)', 'Spending caps', 'GitHub', 'Name and profiles']);
  });

  it('opens pristine, with the payload URL from the snapshot', async () => {
    render(BoardSettingsView, { board, onChanged: () => {} });
    await settle();
    expect(screen.getByRole('button', { name: 'Save pipeline' })).toHaveProperty('disabled', true);
    await openTab(/^GitHub/);
    expect(screen.getByLabelText('Payload URL')).toHaveProperty('value', 'https://app.superpipeline.dev/v1/boards/brd_134a0ddb6d434478/webhooks/github?tenant=tnt_vibes');
    await openTab(/^Name and profiles/);
    expect(screen.getByRole('button', { name: 'Rename' })).toHaveProperty('disabled', true);
  });

  it('counts an unsaved change', async () => {
    render(BoardSettingsView, { board, onChanged: () => {} });
    await fireEvent.input(need(document.getElementById('st-wip-fix'), 'WIP field'), { target: { value: '2' } });
    expect(screen.getByText('1 unsaved change')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save pipeline' })).toHaveProperty('disabled', false);
  });

  it('saves a rule on blur and says how long ago, as the clock moves', async () => {
    const onChanged = vi.fn<() => void>();
    render(BoardSettingsView, { board, onChanged });
    const rule = need(document.querySelector<HTMLTextAreaElement>('#st-rule-reproduce'), 'rule');
    await fireEvent.input(rule, { target: { value: `${rule.value} x` } });
    await fireEvent.blur(rule);
    expect(api.patchStage).toHaveBeenCalledWith('brd_134a0ddb6d434478', 'reproduce', { instructions: expect.stringMatching(/coincidence\. x$/) });
    expect(await screen.findByText('Rule saved · just now')).toBeTruthy();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(screen.getByText('Rule saved · 2 min ago')).toBeTruthy();
    expect(onChanged).toHaveBeenCalled();
  });

  it('schedules are a table with Pause and Remove; New schedule opens the form', async () => {
    render(BoardSettingsView, { board, onChanged: () => {}, initial: 'schedules' });
    await settle();
    const table = screen.getByRole('table', { name: 'Recurring cards' });
    const row = need(within(table).getAllByRole('row')[1], 'row');
    expect(row.textContent).toMatch(/Weekly dependency check/);
    expect(within(row).getAllByRole('button').map((b) => b.textContent?.trim())).toEqual(['Pause', 'Remove']);
    expect(within(row).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Pause Weekly dependency check', 'Remove Weekly dependency check']);
    expect(screen.queryByLabelText('Card title')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'New schedule' }));
    expect(screen.getByLabelText('Card title')).toBeTruthy();
  });

  it('a schedules read that fails says so, never "No recurring cards"', async () => {
    api.getSchedules.mockRejectedValue(new Error('down'));
    render(BoardSettingsView, { board, onChanged: () => {}, initial: 'schedules' });
    await settle();
    expect(screen.getByText("Couldn't load the schedules.")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/No recurring cards/);
    expect(screen.queryByRole('table', { name: 'Recurring cards' })).toBeNull();
    // Try again reads once more; an empty answer is then a real "none".
    api.getSchedules.mockResolvedValue([]);
    await fireEvent.click(screen.getByRole('button', { name: /^Try again/ }));
    await settle();
    expect(api.getSchedules).toHaveBeenCalledTimes(2);
    expect(document.body.textContent).toMatch(/No recurring cards on this board yet/);
  });

  it('a slow schedules read says so after 8 s, with Try again', async () => {
    api.getSchedules.mockImplementation(() => new Promise<never>(() => {}));
    render(BoardSettingsView, { board, onChanged: () => {}, initial: 'schedules' });
    await vi.advanceTimersByTimeAsync(SLOW_MS);
    expect(document.body.textContent).toContain(SLOW_COPY);
    expect(screen.getAllByRole('button', { name: /^Try again/ }).length).toBeGreaterThan(0);
  });

  it("the board's own labels: only those its cards carry, counted on this board", async () => {
    render(BoardSettingsView, { board, onChanged: () => {}, initial: 'labels' });
    await settle();
    const table = screen.getByRole('table', { name: 'Labels' });
    const rows = within(table).getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell').map((c) => c.textContent?.replace(/\s+/g, ' ').trim()));
    expect(rows).toEqual([['agentpod', 'you', '2 cards', 'Remove'], ['baseline', 'inferred', '1 card', 'Remove']]);
    expect(screen.queryByRole('button', { name: 'New label' })).toBeNull();
  });

  it('caps are facts, changed in Spend', async () => {
    render(BoardSettingsView, { board, onChanged: () => {}, initial: 'caps' });
    await settle();
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getAllByRole('definition').map((d) => d.textContent?.trim())).toEqual(['$50.00', 'No cap']);
    expect(within(panel).getByRole('link', { name: 'Change caps in Spend' }).getAttribute('href')).toBe('/b/brd_134a0ddb6d434478/operate/telemetry');
  });
});
