// apps/web/src/lib/components/card/names-in-drawer.svelte.test.ts
// @vitest-environment jsdom
/** Names, not ids or emails, in the drawer and page (O12, O13): comment authors and the letter's salutation. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
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
import { paperSalutation } from './paper-words';

vi.mock('$lib/stores/app.svelte', async () => ({ app: (await import('./testing/fakes')).fakeApp }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...(await import('./testing/fakes')).fakeApi }));
vi.mock('$lib/superlibrary', async (orig) => ({ ...(await orig<typeof import('$lib/superlibrary')>()), relatedForCard: vi.fn(async () => []) }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
const at = '2026-10-10T08:00:00.000Z';
const comment = (id: string, author: { kind: 'human' | 'agent'; id: string; name: string | null }, body: string) => ({ id, cardId: 'card_05823a57e8224605', author, body, createdAt: at, editedAt: null, deletedAt: null });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-11T08:21:00.000Z'));
  fakeApi.getComments.mockImplementation(async () => [
    comment('cmt_1', { kind: 'agent', id: 'agt_fx_error_eric', name: null }, 'From a known agent.'),
    comment('cmt_2', { kind: 'agent', id: 'agt_738c00000000aaaa', name: null }, 'From an agent nobody can name.'),
    comment('cmt_3', { kind: 'human', id: 'usr_b19776fac3c94df4', name: null }, 'From a member.'),
  ] as never);
});
afterEach(() => { cleanup(); vi.useRealTimers(); fakeApi.getComments.mockImplementation(async () => []); });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LAYOUTS: Array<[string, Component<any>, 'drawer' | 'page', string]> = [
  ['Daylight drawer', CardDaylight, 'drawer', 'daylight'], ['Paper drawer', CardPaper, 'drawer', 'paper'],
  ['Quiet drawer', CardQuiet, 'drawer', 'quiet'], ['Studio drawer', CardStudio, 'drawer', 'studio'],
  ['Daylight page', CardPageDaylight, 'page', 'daylight'], ['Paper page', CardPagePaper, 'page', 'paper'],
  ['Quiet page', CardPageQuiet, 'page', 'quiet'], ['Studio page', CardPageStudio, 'page', 'studio'],
];

describe.each(LAYOUTS)('%s: comment authors', (_n, C, surface, vibe) => {
  it('names the author from the roster, never an id', async () => {
    const { model, dispose } = mountModel({ surface });
    await vi.waitFor(() => expect(model.detailLoaded).toBe(true));
    render(C, { model, vibe, phase: 'noon', personName: 'Ira Mehta', gate: model.gateBinding, question: model.questionBinding, pageHref: model.pageHref, boardHref: model.boardHref, onClose: vi.fn() });
    await vi.waitFor(() => expect(model.comments.comments).toHaveLength(3));
    const tab = [...document.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent?.startsWith('Talk'));
    if (tab) tab.click();
    await vi.waitFor(() => expect(document.body.textContent).toContain('From a known agent.'));
    const text = document.body.textContent!;
    expect(text).not.toMatch(/agt_|usr_/);
    expect(text).toMatch(/error-eric:? From a known agent\./);
    expect(text).toMatch(/An agent:? From an agent nobody can name\./);
    expect(text).toMatch(/Rakesh Gangwar:? From a member\./);
    dispose();
  });
});

describe('paperSalutation', () => {
  it('uses the first name; never an email; Hello when no name is known', () => {
    expect(paperSalutation('Ira Mehta')).toBe('Dear Ira,');
    expect(paperSalutation('ira@vibes-fixture.invalid')).toBe('Hello,');
    expect(paperSalutation('there')).toBe('Hello,');
    expect(paperSalutation('')).toBe('Hello,');
    expect(paperSalutation(null)).toBe('Hello,');
  });
});
