// apps/web/src/lib/components/card/page/CardPageDaylight.svelte.test.ts
// @vitest-environment jsdom
/** Daylight's card page: the window bar, the head, three columns, the foot. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import CardPageDaylight from './CardPageDaylight.svelte';
import { mountModel } from '../testing/mount-model.svelte';
import { USER } from '../testing/card-4605';

vi.mock('$lib/stores/app.svelte', async () => ({ app: (await import('../testing/fakes')).fakeApp }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...(await import('../testing/fakes')).fakeApi, logout: vi.fn(async () => {}) }));
vi.mock('$lib/superlibrary', async (orig) => ({ ...(await orig<typeof import('$lib/superlibrary')>()), relatedForCard: vi.fn(async () => []) }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
// The fixture world's clock (e2e/pixel/screens.ts DEFAULT_CLOCK): 4605 has waited 2 days.
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-11T08:21:00.000Z')); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

/** The page is drawn for the signed-in person; the fixture's user is the card's owner. */
const PERSON = 'Ira Mehta';
const OWNER = USER.name!;
const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
/** An element's child texts, one space apart (the reference sets no whitespace between them; CSS gaps do). */
const words = (el: Element) => [...el.children].map(text).filter(Boolean).join(' ');

async function mount() {
  const { model, dispose } = mountModel({ surface: 'page' });
  await vi.waitFor(() => expect(model.detailLoaded).toBe(true));
  const r = render(CardPageDaylight, { model, vibe: 'daylight', phase: 'noon', personName: PERSON, gate: model.gateBinding, question: model.questionBinding, pageHref: model.pageHref, boardHref: model.boardHref });
  return { model, dispose, ...r };
}

/** A track step's drawn words: vibekit's hidden status words removed. */
const drawn = (li: Element) => { const c = li.cloneNode(true) as Element; c.querySelectorAll('.vk-visually-hidden').forEach((n) => n.remove()); return c.textContent!.trim(); };

describe('CardPageDaylight (4605)', () => {
  it('the window bar: home, the board, the card id, copy link, appearance, account', async () => {
    const { dispose } = await mount();
    const bar = screen.getByRole('navigation', { name: 'Card window' });
    expect(within(bar).getByRole('link', { name: 'Superpipeline home' }).getAttribute('href')).toBe('/');
    expect(within(bar).getByRole('link', { name: /Developer Experience board/ }).getAttribute('href')).toBe('/b/brd_134a0ddb6d434478');
    expect(within(bar).getByText('card 4605')).toBeTruthy();
    expect(within(bar).getByRole('button', { name: 'Appearance: Daylight, noon sky' })).toBeTruthy();
    const account = within(bar).getByRole('button', { name: `Account, ${PERSON}. Menu has Sign out` });
    expect(account.textContent).toBe('IM');
    expect(account.getAttribute('aria-haspopup')).toBe('menu');
    expect(within(bar).getByRole('button', { name: /Copy link to this card/ })).toBeTruthy();
    dispose();
  });
  it('the account menu has one item, Sign out, which signs out through the shared signOut', async () => {
    const { logout } = await import('$lib/api');
    const reload = vi.fn();
    const loc = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...loc, reload } });
    const { dispose } = await mount();
    await fireEvent.click(screen.getByRole('button', { name: `Account, ${PERSON}. Menu has Sign out` }));
    const items = screen.getAllByRole('menuitem');
    expect(items.map(text)).toEqual(['Sign out']);
    await fireEvent.click(items[0]!);
    await vi.waitFor(() => expect(reload).toHaveBeenCalled());
    expect(logout).toHaveBeenCalled();
    Object.defineProperty(window, 'location', { configurable: true, value: loc });
    dispose();
  });
  it('the head: from, title, the stage strip with words, people and facts', async () => {
    const { container, dispose } = await mount();
    expect(screen.getAllByRole('link', { name: 'Back to the board' })[0]!.getAttribute('href')).toBe('/b/brd_134a0ddb6d434478');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 }).id).toBe('card-title');
    const strip = screen.getByRole('list', { name: 'Stages: stage 2 of 7, Reproduce, stopped' });
    expect([...strip.querySelectorAll('.vk-stages__step')].map(drawn)).toEqual(['Reported', 'Reproduce · stopped', 'Failing test', 'Fix', 'Integrate', 'Signed off', 'Shipped']);
    const people = screen.getByRole('complementary', { name: 'People on this card' });
    const rows = [...people.querySelectorAll('.dp-person')].map((p) => words(p.lastElementChild!));
    expect(rows).toEqual([
      'error-eric Agent for Reproduce · ran attempt 2 · Unclaimed now',
      `${OWNER} Owner · you`,
      'super-chotu Asked for this · an agent allowed to dispatch',
    ]);
    expect(within(people).getByText('Waiting on you · 2 days').closest('.vk-statelabel')).toBeTruthy();
    expect([...container.querySelector('.dp-facts')!.children].map(text)).toEqual(['Priority P3', 'Due none', 'Labels none', 'In Reproduce for 2 days', 'Attempt 2', 'Project Marketing & Community — Melissa and Anna onboarding']);
    dispose();
  });
  it('the conversation, the reply, the brief as the page prints it', async () => {
    const { dispose } = await mount();
    expect(screen.getByText('error-eric is waiting for your reply')).toBeTruthy();
    expect((screen.getByLabelText('What changed, or what should the agent do differently? It reads this.') as HTMLTextAreaElement).placeholder).toBe('For example: what you checked, and what the agent should look at next.');
    // Resume defaults to the card's current stage (ruling T20).
    expect((screen.getByLabelText('Resume at stage') as HTMLSelectElement).value).toBe('reproduce');
    expect(screen.getByText('5 acceptance criteria')).toBeTruthy();
    expect(screen.getByText('10 details')).toBeTruthy();
    expect(screen.getByText('5 items, listed under Things to prove.')).toBeTruthy();
    expect(screen.getAllByText('@agent_message-melissa:id.agentpod.dev · onboarding card')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Show more' })).toHaveLength(5);
    expect(screen.getByText('5 references')).toBeTruthy();
    expect(text(document.body)).toContain('SuperJackfruitLabs/atelier · private · policy');
    dispose();
  });
  it('what happened: attempts newest first, the closed one ends at 12:11, tool calls counted', async () => {
    const { container, dispose } = await mount();
    const runs = [...container.querySelectorAll<HTMLElement>('div.dp-run')];
    expect(runs.map((r) => words(r.querySelector('button[data-attempt-head]')!))).toEqual([
      'Attempt 2 · Reproduce stopped 14 events · 0 errors',
      'Attempt 1 · Reproduce sent back 9 events · 0 errors · 12:11',
    ]);
    expect([...runs[0]!.querySelectorAll('.dp-tl .t')].map((t) => t.textContent)).toEqual(['18:50', '19:41 Thu 8 Oct']);
    expect(screen.getByRole('button', { name: 'Show tool calls · 12 more events' })).toBeTruthy();
    expect(screen.getByText('From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output.')).toBeTruthy();
    const cost = container.querySelector('dl.dp-dl:not(.dp-dl--stack)')!;
    expect([...cost.querySelectorAll('dt')].map((d) => d.textContent)).toEqual(['Attempt 1', 'Attempt 2', 'Delivery']);
    expect([...cost.querySelectorAll('dd')].map((d) => d.textContent)).toEqual(['error-eric · $0.00 · sent back', 'error-eric · $0.00 · stopped', 'None approved on this card.']);
    dispose();
  });
  it('the foot: Edit, Archive, Delete (ink outline), and the way back', async () => {
    const { model, container, dispose } = await mount();
    const foot = container.querySelector('footer.dp-foot') as HTMLElement;
    expect(within(foot).getByRole('link', { name: 'Back to the board' }).getAttribute('href')).toBe('/b/brd_134a0ddb6d434478');
    // The reference's ink outline is vibekit's danger Button (surface, ink text, a 2px ink edge).
    expect(within(foot).getByRole('button', { name: /Delete card/ }).classList.contains('vk-button--danger')).toBe(true);
    await fireEvent.click(within(foot).getByRole('button', { name: /Edit card/ }));
    expect(model.edit.editing).toBe(true);
    dispose();
  });
});
