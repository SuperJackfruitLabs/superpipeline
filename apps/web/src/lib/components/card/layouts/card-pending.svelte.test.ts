// @vitest-environment jsdom
/** Before a card's comments and log arrive, no layout says "No comments yet", "No letters yet" or "no estimate yet" (loading-audit L9). */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import { CARD_LAYOUTS } from '$lib/layouts';
import { fakeApi } from '../testing/fakes';
import { mountModel } from '../testing/mount-model.svelte';

vi.mock('$lib/stores/app.svelte', async () => ({ app: (await import('../testing/fakes')).fakeApp }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...(await import('../testing/fakes')).fakeApi }));
vi.mock('$lib/superlibrary', async (orig) => ({ ...(await orig<typeof import('$lib/superlibrary')>()), relatedForCard: vi.fn(async () => []) }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-11T08:21:00.000Z')); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const VIBES = ['daylight', 'paper', 'studio', 'quiet'] as const;

describe('a card whose comments and log are still on their way', () => {
  for (const v of VIBES) {
    it(`${v}: says it is loading, never that there is nothing`, async () => {
      const never = new Promise<never>(() => {});
      fakeApi.getComments.mockReturnValueOnce(never);
      const { model, dispose } = mountModel({ holdDetail: true });
      render(CARD_LAYOUTS[v].drawer, { model, vibe: v, phase: 'noon', personName: 'Ira', gate: null, question: null, pageHref: model.pageHref, onClose: () => {} });
      const text = document.body.textContent ?? '';
      expect(text).not.toMatch(/No comments yet|No letters yet|no estimate yet/i);
      dispose();
    });
  }
});
