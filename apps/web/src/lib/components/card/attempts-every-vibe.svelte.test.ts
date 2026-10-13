// apps/web/src/lib/components/card/attempts-every-vibe.svelte.test.ts
// @vitest-environment jsdom
/**
 * Every attempt, in every vibe, drawer and page: it expands (a button with aria-expanded), shows its
 * own timeline, toggles its own tool calls (Show ↔ Hide, per attempt), and each tool call opens its
 * details (O4, O11, O15).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { Component } from 'svelte';
import CardDaylight from './layouts/CardDaylight.svelte';
import CardPaper from './layouts/CardPaper.svelte';
import CardQuiet from './layouts/CardQuiet.svelte';
import CardStudio from './layouts/CardStudio.svelte';
import CardPageDaylight from './page/CardPageDaylight.svelte';
import CardPagePaper from './page/CardPagePaper.svelte';
import CardPageQuiet from './page/CardPageQuiet.svelte';
import CardPageStudio from './page/CardPageStudio.svelte';
import { fakeApi } from './testing/fakes';
import { mountModel } from './testing/mount-model.svelte';
import { ACTIVITIES_4605 } from './testing/card-4605';

vi.mock('$lib/stores/app.svelte', async () => ({ app: (await import('./testing/fakes')).fakeApp }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...(await import('./testing/fakes')).fakeApi }));
vi.mock('$lib/superlibrary', async (orig) => ({ ...(await orig<typeof import('$lib/superlibrary')>()), relatedForCard: vi.fn(async () => []) }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-11T08:21:00.000Z'));
  // Run 1's first tool call carries a parameter and a result, as a real read_file does.
  const acts = ACTIVITIES_4605.map((a) => (a.runId === 'run_fx_4605_1' && a.seq === 2 ? { ...a, parameter: { path: 'apps/hub/src/inbound.ts' }, result: { lines: 408 } } : a));
  fakeApi.getCardActivities.mockImplementation(async () => ({ activities: acts, handoff: null, gates: [] }) as never);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

/** The last flag: the newest attempt opens on arrival. Quiet's drawer keeps every attempt to one sentence until asked. */
const LAYOUTS: Array<[string, Component<any>, 'drawer' | 'page', string, boolean]> = [
  ['Daylight drawer', CardDaylight, 'drawer', 'daylight', true],
  ['Paper drawer', CardPaper, 'drawer', 'paper', true],
  ['Quiet drawer', CardQuiet, 'drawer', 'quiet', false],
  ['Studio drawer', CardStudio, 'drawer', 'studio', true],
  ['Daylight page', CardPageDaylight, 'page', 'daylight', true],
  ['Paper page', CardPagePaper, 'page', 'paper', true],
  ['Quiet page', CardPageQuiet, 'page', 'quiet', true],
  ['Studio page', CardPageStudio, 'page', 'studio', true],
];

async function mount(C: Component<any>, surface: 'drawer' | 'page', vibe: string) {
  const { model, dispose } = mountModel({ surface });
  await vi.waitFor(() => expect(model.detailLoaded).toBe(true));
  const r = render(C, { model, vibe, phase: 'noon', personName: 'Ira Mehta', gate: model.gateBinding, question: model.questionBinding, pageHref: model.pageHref, boardHref: model.boardHref, onClose: vi.fn() } as never);
  // Studio's drawer keeps the log behind a tab.
  const log = [...document.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent?.startsWith('Log'));
  if (log) await fireEvent.click(log);
  return { model, dispose, ...r };
}

/** The attempt's head button, its body (what aria-controls names; absent while closed), and its tool-call toggle. */
const head = (run: string) => document.querySelector<HTMLButtonElement>(`button[aria-expanded][data-attempt-head="${run}"]`)!;
const body = (run: string) => document.getElementById(head(run).getAttribute('aria-controls')!);
const text = (run: string) => body(run)?.textContent ?? '';
const toggle = (run: string) => document.querySelector<HTMLButtonElement>(`button[data-attempt-tools="${run}"]`)!;
const ONE = 'run_fx_4605_1';
const TWO = 'run_fx_4605_2';

describe.each(LAYOUTS)('%s: every attempt', (_n, C, surface, vibe, newestOpen) => {
  it('expands, shows its own timeline and tool calls, and each call opens its details', async () => {
    const { dispose } = await mount(C, surface, vibe);
    expect(head(ONE), 'attempt 1 has a head').toBeTruthy();
    expect(head(TWO), 'attempt 2 has a head').toBeTruthy();
    expect(head(TWO).getAttribute('aria-expanded'), 'the newest attempt opens').toBe(String(newestOpen));
    expect(head(ONE).getAttribute('aria-expanded'), 'an older attempt starts closed').toBe('false');
    expect(text(ONE)).not.toContain('The board refused completion');

    await fireEvent.click(head(ONE));
    expect(head(ONE).getAttribute('aria-expanded')).toBe('true');
    expect(text(ONE), 'its own timeline').toContain('The board refused completion');
    expect(text(ONE)).not.toContain('Tool call 1');

    expect(toggle(ONE).textContent!.trim()).toMatch(/^Show tool calls/);
    await fireEvent.click(toggle(ONE));
    expect(toggle(ONE).textContent!.trim()).toMatch(/^Hide tool calls/);
    expect(toggle(ONE).getAttribute('aria-pressed')).toBe('true');
    expect(text(ONE)).toContain('Tool call 1');
    if (newestOpen) expect(toggle(TWO).textContent!.trim(), 'the toggle is per attempt').toMatch(/^Show tool calls/);
    else expect(document.querySelector(`button[data-attempt-tools="${TWO}"]`)?.textContent?.trim() ?? 'Show tool calls', 'the toggle is per attempt').toMatch(/^Show tool calls/);

    const det = body(ONE)!.querySelector('details summary');
    expect(det?.textContent).toBe('Details');
    await fireEvent.click(det!);
    expect(body(ONE)!.querySelector('[data-testid="raw-json"]')!.textContent).toContain('apps/hub/src/inbound.ts');

    await fireEvent.click(toggle(ONE));
    expect(text(ONE)).not.toContain('Tool call 1');
    await fireEvent.click(head(ONE));
    expect(head(ONE).getAttribute('aria-expanded')).toBe('false');
    expect(text(ONE)).not.toContain('The board refused completion');
    dispose();
  });
});
