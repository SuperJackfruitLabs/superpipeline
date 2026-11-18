// apps/web/src/lib/components/parts/skeleton-per-vibe.svelte.test.ts
// @vitest-environment jsdom
// The loading walk (e2e/loading.spec.ts) checks every surface in Daylight, but only Inbox, board, card page and Projects
// in Paper, Studio and Quiet. This holds the rest: each vibe's Crew and Settings tabs wait on the shared skeleton in
// aria-busy (never an empty list), and app.css draws that skeleton in each vibe's own way.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import type * as Api from '$lib/api';

const never = () => new Promise<never>(() => {});
const api = vi.hoisted(() => ({
  getAgents: vi.fn(), getCapabilities: vi.fn(), getMembers: vi.fn(), listLabels: vi.fn(), listAttention: vi.fn(),
  getWorkspace: vi.fn<typeof Api.getWorkspace>(), getForgeHost: vi.fn<typeof Api.getForgeHost>(),
}));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...api }));
vi.mock('$lib/stores/app.svelte', () => ({ app: { markBusy: <T,>(p: Promise<T>) => p, boardId: null, board: null, boards: [], user: { userId: 'usr_ira' } } }));

import { WORKSPACE_TABS } from '$lib/layouts';
import SettingsView from '$lib/components/settings/SettingsView.svelte';
import VibeFrame from '$lib/composition/VibeFrame.svelte';
import { SLOW_COPY, SLOW_MS, TRY_AGAIN } from '$lib/loading';

const VIBES = ['daylight', 'paper', 'studio', 'quiet'] as const;
const TABS = ['agents', 'people', 'capabilities', 'labels'] as const;

type Tab = (typeof TABS)[number] | 'connections';
// Labels and Connections are Settings tabs (SettingsView, one composition in every vibe), rendered in each vibe's root.
const renderTab = (vibe: (typeof VIBES)[number], tab: Tab) =>
  tab === 'labels' || tab === 'connections'
    ? render(VibeFrame, { props: { vibe, component: SettingsView, props: { initial: tab } } })
    : render(WORKSPACE_TABS[vibe][tab], { props: { vibe } as never });

beforeEach(() => { for (const f of Object.values(api)) f.mockImplementation(never); });
afterEach(cleanup);

describe('Crew and Settings wait on the shared skeleton in every vibe', () => {
  for (const vibe of VIBES) {
    for (const tab of TABS) {
      it(`${vibe} ${tab}: aria-busy skeleton, no empty words`, () => {
        const { container } = renderTab(vibe, tab);
        expect(container.querySelector('[data-skeleton][aria-busy="true"]'), `${vibe} ${tab}`).not.toBeNull();
        expect(container.textContent ?? '').not.toMatch(/No (agents|people|capabilities|labels) yet/);
      });
    }
  }
});

// Contract rule 11: a wait does not rest on bars. From 8 s each tab, Settings' Connections too, says the
// server is slow and offers Try again, which reads the list once more.
describe('Crew and Settings say when a wait has gone on, in every vibe', () => {
  afterEach(() => { vi.useRealTimers(); });
  for (const vibe of VIBES) {
    for (const tab of [...TABS, 'connections'] satisfies Tab[]) {
      it(`${vibe} ${tab}: slow copy and Try again after ${SLOW_MS} ms`, async () => {
        vi.useFakeTimers();
        const read = tab === 'agents' ? api.getAgents : tab === 'people' ? api.getMembers : tab === 'capabilities' ? api.getCapabilities : tab === 'labels' ? api.listLabels : api.getWorkspace;
        const { container, getByRole } = renderTab(vibe, tab);
        await vi.advanceTimersByTimeAsync(SLOW_MS - 1);
        expect(container.textContent ?? '').not.toContain(SLOW_COPY);
        await vi.advanceTimersByTimeAsync(1);
        expect(container.textContent ?? '', `${vibe} ${tab}`).toContain(SLOW_COPY);
        const before = read.mock.calls.length;
        getByRole('button', { name: TRY_AGAIN }).click();
        await vi.advanceTimersByTimeAsync(0);
        expect(read.mock.calls.length).toBe(before + 1);
      });
    }
  }
});

describe('app.css draws the skeleton per vibe', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/app.css'), 'utf8');
  it('Paper ruled lines, Studio blocks with LOADING, Quiet the word only', () => {
    expect(css).toMatch(/\[data-vibe='paper'\]\) \.sp-skeleton \.vk-skeleton \{[^}]*border-bottom/);
    expect(css).toMatch(/\[data-vibe='studio'\]\) \.sp-skeleton__word--studio \{ display: block/);
    expect(css).toMatch(/\[data-vibe='quiet'\]\) \.sp-skeleton \.vk-skeleton, [^{]*\{ display: none/);
    expect(css).toMatch(/\[data-vibe='quiet'\]\) \.sp-skeleton__word--quiet \{ display: block/);
  });
});
