// @vitest-environment jsdom
/**
 * The card's repository picker on a bench stage whose cards choose: the fact says the card will
 * wait for a person, the picker ticks repositories from the stage's allowlist and names the start
 * repository when it must, the save sends the whole choice, a refusal is shown as the board said
 * it, and the open picker is the same in every vibe.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { VIBES } from '@superjackfruitlabs/vibekit-ui';
import { parityTree } from '$lib/composition/guards';
import { renderInVibes } from '$lib/composition/render-vibes';
import { fakeApi, fakeApp } from './testing/fakes';
import { mountModel } from './testing/mount-model.svelte';
import { BOARD_DX, CARD_4605, STAGES_DX } from './testing/card-4605';
import CardView from './CardView.svelte';

vi.mock('$lib/stores/app.svelte', async () => ({ app: (await import('./testing/fakes')).fakeApp }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...(await import('./testing/fakes')).fakeApi }));
vi.mock('$lib/superlibrary', async (orig) => ({ ...(await orig<typeof import('$lib/superlibrary')>()), relatedForCard: vi.fn(async () => []) }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
beforeAll(() => {
  window.matchMedia ??= vi.fn().mockImplementation((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
});

const BOARD = fakeApp.board;
const policy = { repositories: [{ name: 'api' }, { name: 'app' }, { name: 'docs' }], checkpointRepository: 'app' };
function choosing(card: Partial<typeof CARD_4605> = {}): void {
  const current = { ...CARD_4605, ...card };
  fakeApp.board = { ...BOARD_DX, cards: [current], stages: STAGES_DX.map((s) => (s.key === CARD_4605.currentStageKey ? { ...s, cardCheckpointPolicy: policy } : s)) };
}
afterEach(() => {
  cleanup();
  fakeApp.board = BOARD;
  fakeApi.updateCard.mockReset();
  fakeApi.updateCard.mockImplementation(async () => new Response('{}', { status: 200 }));
});
async function loaded() {
  const m = mountModel({ surface: 'drawer' });
  await vi.waitFor(() => expect(m.model.detailLoaded).toBe(true));
  return m;
}
const props = (model: ReturnType<typeof mountModel>['model']) => ({ model, surface: 'drawer' as const, gate: model.gateBinding, question: model.questionBinding, pageHref: model.pageHref, boardHref: model.boardHref, onClose: vi.fn() });
const section = () => document.querySelector<HTMLElement>('[data-section="repositories"]')!;

describe('choosing a card\'s repositories', () => {
  it('a board with no choosing stage shows nothing new', async () => {
    const { model, dispose } = await loaded();
    render(CardView, props(model));
    expect(document.querySelector('[data-section="repositories"]')).toBeNull();
    dispose();
  });

  it('says the card waits for a person, and saves the repositories ticked', async () => {
    choosing();
    const { model, dispose } = await loaded();
    render(CardView, props(model));
    expect(section().textContent).toContain('Waits for a person: choose the repositories this card works in');
    await fireEvent.click(within(section()).getByRole('button', { name: 'Choose repositories' }));
    await fireEvent.click(within(section()).getByRole('checkbox', { name: 'api' }));
    await fireEvent.click(within(section()).getByRole('button', { name: 'Save' }));
    expect(fakeApi.updateCard).toHaveBeenCalledWith(BOARD_DX.boardId, CARD_4605.id, { repositories: ['api'] });
    dispose();
  });

  it('asks where the work starts when two are ticked without the stage\'s start repository', async () => {
    choosing();
    const { model, dispose } = await loaded();
    render(CardView, props(model));
    await fireEvent.click(within(section()).getByRole('button', { name: 'Choose repositories' }));
    await fireEvent.click(within(section()).getByRole('checkbox', { name: 'api' }));
    await fireEvent.click(within(section()).getByRole('checkbox', { name: 'docs' }));
    expect(within(section()).getByRole('status').textContent).toBe('Name the repository the work starts in.');
    expect(within(section()).getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(true);
    await fireEvent.change(within(section()).getByLabelText('Work starts in'), { target: { value: 'docs' } });
    await tick();
    await fireEvent.click(within(section()).getByRole('button', { name: 'Save' }));
    expect(fakeApi.updateCard).toHaveBeenCalledWith(BOARD_DX.boardId, CARD_4605.id, { repositories: ['api', 'docs'], primaryRepository: 'docs' });
    dispose();
  });

  it('shows the board\'s refusal as it came', async () => {
    choosing({ repositories: ['api', 'app'] });
    fakeApi.updateCard.mockImplementation(async () => Response.json({ error: { code: 'REPOSITORY_CHOICE_REFUSED', message: "this card's repositories are fixed: its bench exists. Make a new card to work in other repositories" } }, { status: 409 }));
    const { model, dispose } = await loaded();
    render(CardView, props(model));
    expect(section().textContent).toContain('api, app · starts in app');
    await fireEvent.click(within(section()).getByRole('button', { name: 'Change repositories' }));
    await fireEvent.click(within(section()).getByRole('checkbox', { name: 'app' }));
    await fireEvent.click(within(section()).getByRole('button', { name: 'Save' }));
    await vi.waitFor(() => expect(screen.getByRole('alert').textContent).toContain('its bench exists'));
    dispose();
  });

  it('the open picker is the same in every vibe', async () => {
    choosing();
    const { model, dispose } = await loaded();
    model.repositories.open();
    const roots = await renderInVibes(CardView, props(model));
    try {
      const trees = Object.fromEntries(VIBES.map((v) => [v, parityTree(roots[v])]));
      for (const v of VIBES) {
        expect(trees[v], `${v} against daylight`).toBe(trees.daylight);
        expect(roots[v].querySelectorAll('[data-repositories-form] input[type="checkbox"]'), v).toHaveLength(3);
      }
    } finally {
      roots.unmount();
      dispose();
    }
  });
});
