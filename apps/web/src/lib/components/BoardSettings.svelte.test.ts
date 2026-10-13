// apps/web/src/lib/components/BoardSettings.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';

const api = vi.hoisted(() => ({
  patchStage: vi.fn(), setStages: vi.fn(), renameBoard: vi.fn(), setGithubConfig: vi.fn(), getProfiles: vi.fn(), createProfile: vi.fn(),
  getSchedules: vi.fn(), createSchedule: vi.fn(), updateSchedule: vi.fn(), deleteSchedule: vi.fn(),
}));
vi.mock('$lib/api', () => api);
vi.mock('$lib/stores/app.svelte', () => ({ app: { agents: [], markBusy: <T,>(p: Promise<T>) => p } }));
import BoardSettings from './BoardSettings.svelte';
import { DX_STAGES } from './settings/settings-fixture';

const board = {
  boardId: 'brd_134a0ddb6d434478', tenantId: 'tnt_vibes', name: 'Developer Experience', stages: DX_STAGES, cards: [], gates: [], elicitations: [], references: [],
  usage: { totalCostUsd: 0, estimatedCostUsd: 0, budgetUsd: null, cardUsdCap: null, overBudget: false },
  github: { issueTrigger: false, webhookConfigured: false, triggerGrantCount: null, webhookUrl: 'https://app.superpipeline.dev/v1/boards/brd_134a0ddb6d434478/webhooks/github?tenant=tnt_vibes' },
} as never;

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-10-11T08:19:00Z'), shouldAdvanceTime: true });
  for (const f of Object.values(api)) f.mockReset();
  api.getProfiles.mockResolvedValue([]);
  api.getSchedules.mockResolvedValue([]);
  api.patchStage.mockResolvedValue(new Response('{}', { status: 200 }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('BoardSettings', () => {
  it('opens pristine, with the payload URL from the snapshot', () => {
    render(BoardSettings, { board, vibe: 'daylight', onChanged: () => {} });
    expect((screen.getByRole('button', { name: 'Save pipeline' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('Payload URL') as HTMLInputElement).value).toBe('https://app.superpipeline.dev/v1/boards/brd_134a0ddb6d434478/webhooks/github?tenant=tnt_vibes');
    expect((screen.getByRole('button', { name: 'Rename' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('counts an unsaved change', async () => {
    render(BoardSettings, { board, vibe: 'daylight', onChanged: () => {} });
    await fireEvent.input(document.getElementById('st-wip-fix')!, { target: { value: '2' } });
    expect(screen.getByText('1 unsaved change')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Save pipeline' }) as HTMLButtonElement).disabled).toBe(false);
  });
  it('saves a rule on blur and says how long ago, as the clock moves', async () => {
    const onChanged = vi.fn();
    render(BoardSettings, { board, vibe: 'daylight', onChanged });
    const rule = document.getElementById('st-rule-reproduce') as HTMLTextAreaElement;
    await fireEvent.input(rule, { target: { value: `${rule.value} x` } });
    await fireEvent.blur(rule);
    expect(api.patchStage).toHaveBeenCalledWith('brd_134a0ddb6d434478', 'reproduce', { instructions: expect.stringMatching(/coincidence\. x$/) });
    expect(await screen.findByText('Rule saved · just now')).toBeTruthy();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(screen.getByText('Rule saved · 2 min ago')).toBeTruthy();
    expect(onChanged).toHaveBeenCalled();
  });
});
