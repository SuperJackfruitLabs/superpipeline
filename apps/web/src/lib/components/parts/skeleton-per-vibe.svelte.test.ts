// apps/web/src/lib/components/parts/skeleton-per-vibe.svelte.test.ts
// @vitest-environment jsdom
// The loading walk (e2e/loading.spec.ts) checks every surface in Daylight, but only Inbox, board, card page and Projects
// in Paper, Studio and Quiet. This holds the rest: each vibe's Crew and Settings tabs wait on the shared skeleton in
// aria-busy (never an empty list), and app.css draws that skeleton in each vibe's own way.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';

const never = () => new Promise<never>(() => {});
const api = vi.hoisted(() => ({
  getAgents: vi.fn(), getCapabilities: vi.fn(), getMembers: vi.fn(), listLabels: vi.fn(), listAttention: vi.fn(),
}));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...api }));
vi.mock('$lib/stores/app.svelte', () => ({ app: { markBusy: <T,>(p: Promise<T>) => p, boardId: null, board: null, boards: [], user: { userId: 'usr_ira' } } }));

import { WORKSPACE_TABS } from '$lib/layouts';

const VIBES = ['daylight', 'paper', 'studio', 'quiet'] as const;
const TABS = ['agents', 'people', 'capabilities', 'labels'] as const;

beforeEach(() => { for (const f of Object.values(api)) f.mockImplementation(never); });
afterEach(cleanup);

describe('Crew and Settings wait on the shared skeleton in every vibe', () => {
  for (const vibe of VIBES) {
    for (const tab of TABS) {
      it(`${vibe} ${tab}: aria-busy skeleton, no empty words`, () => {
        const { container } = render(WORKSPACE_TABS[vibe][tab], { props: { vibe } as never });
        expect(container.querySelector('[data-skeleton][aria-busy="true"]'), `${vibe} ${tab}`).not.toBeNull();
        expect(container.textContent ?? '').not.toMatch(/No (agents|people|capabilities|labels) yet/);
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
