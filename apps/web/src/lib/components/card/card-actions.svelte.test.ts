// @vitest-environment jsdom
/**
 * What a person can do from the card besides deciding (composition contract §11.3, "Dropped:
 * nothing"): add a sub-task, attach a reference, step back out of an opened panel, close with Esc,
 * and the busy forms of Resume, Comment and Answer (they keep focus and their label, and say so).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import type * as Api from '$lib/api';
import type * as Library from '$lib/superlibrary';
import type { BoardSnapshot, Card, Elicitation, Reference } from '$lib/api';
import { fakeApi, fakeApp } from './testing/fakes';
import { mountModel } from './testing/mount-model.svelte';
import { ACTIVITIES_4605, BOARD_DX, CARD_4605 } from './testing/card-4605';
import type { CardModel } from './card-model.svelte';
import CardView from './CardView.svelte';

vi.mock('$lib/stores/app.svelte', async () => ({ app: (await import('./testing/fakes')).fakeApp }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof Api>()), ...(await import('./testing/fakes')).fakeApi }));
vi.mock('$lib/superlibrary', async (orig) => ({ ...(await orig<typeof Library>()), relatedForCard: vi.fn<() => Promise<never[]>>(async () => []) }));
vi.mock('$app/navigation', () => ({ goto: vi.fn<() => Promise<void>>() }));

const BOARD = fakeApp.board;
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-11T08:21:00.000Z')); });
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  fakeApp.board = BOARD;
  fakeApp.refresh.mockImplementation(async () => {});
  fakeApi.getCardActivities.mockImplementation(async () => ({ activities: ACTIVITIES_4605, handoff: null, gates: [] }));
});

async function loaded(): Promise<{ model: CardModel; dispose: () => void }> {
  const m = mountModel();
  await vi.waitFor(() => expect(m.model.detailLoaded).toBe(true));
  return m;
}
const props = (model: CardModel, onClose = vi.fn<() => void>()) => ({ model, surface: 'drawer' as const, gate: model.gateBinding, question: model.questionBinding, pageHref: model.pageHref, boardHref: model.boardHref, onClose });
/** The element `selector` finds under `root`; a test that needs it fails here if it is missing. */
function need(selector: string, root: ParentNode = document): HTMLElement {
  const el = root.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`nothing matches ${selector}`);
  return el;
}
const facts = () => need('[data-block="facts"]');
const state = () => need('[data-block="state"]');
/** Held: aria-disabled but enabled (so it keeps focus), its label unchanged, and its own form's status says `words`. */
function expectHeld(button: HTMLElement, label: string, words: string): void {
  expect(button.getAttribute('aria-disabled')).toBe('true');
  expect(button.hasAttribute('disabled')).toBe(false);
  expect(button.textContent?.trim()).toBe(label);
  button.focus();
  expect(document.activeElement).toBe(button);
  const own = button.closest('form, [data-section]');
  expect([...(own?.querySelectorAll('[role="status"]') ?? [])].map((s) => s.textContent)).toContain(words);
}
const child: Card = { ...CARD_4605, id: 'card_child_0001', title: 'Trace Anna’s hop', parentCardId: CARD_4605.id };
const TRACE: Reference = { id: 'ref_new', cardId: CARD_4605.id, url: 'https://example.com/trace', title: 'The trace', provider: 'link', sourceType: 'link', addedBy: 'user' };
const ASK: Elicitation = { id: 'eli_1', cardId: CARD_4605.id, runId: 'run_fx_4605_2', stageKey: 'reproduce', agentId: 'agt_fx_error_eric', question: 'Which repos first?', signal: 'question', status: 'pending', options: [{ name: 'forge', title: 'Forge-primary first' }], answer: null, createdAt: '2026-10-11T07:00:00Z' };
/** A live board the fake refresh can change, so what the card shows follows it. */
function liveBoard(): BoardSnapshot {
  const board = $state<BoardSnapshot>({ ...BOARD_DX, cards: [CARD_4605], references: [] });
  fakeApp.board = board;
  return board;
}

describe('sub-tasks', () => {
  it('the row is always there with Add a sub-task; it opens the composer in place, Add splits the card, and the new sub-task appears', async () => {
    const board = liveBoard();
    fakeApi.splitCard.mockClear();
    fakeApp.refresh.mockImplementation(async () => {
      board.cards.push(child);
    });
    const { model, dispose } = await loaded();
    render(CardView, props(model));
    const row = need('[data-section="subtasks"]', facts());
    expect(row.hidden).toBe(false);
    expect(row.textContent).toContain('none');
    await fireEvent.click(within(row).getByRole('button', { name: 'Add a sub-task' }));
    await tick();
    const input = within(row).getByLabelText('New sub-task title');
    expect(document.activeElement).toBe(input);
    await fireEvent.input(input, { target: { value: 'Trace Anna’s hop' } });
    await fireEvent.click(within(row).getByRole('button', { name: 'Add' }));
    await vi.waitFor(() => expect(fakeApi.splitCard).toHaveBeenCalledWith(BOARD_DX.boardId, CARD_4605.id, ['Trace Anna’s hop']));
    await vi.waitFor(() => expect(within(row).getByRole('button', { name: 'Trace Anna’s hop' })).toBeTruthy());
    dispose();
  });
  it('Cancel closes the composer and puts focus back on Add a sub-task', async () => {
    const { model, dispose } = await loaded();
    render(CardView, props(model));
    const row = need('[data-section="subtasks"]', facts());
    await fireEvent.click(within(row).getByRole('button', { name: 'Add a sub-task' }));
    await fireEvent.click(within(row).getByRole('button', { name: 'Cancel' }));
    await tick();
    expect(within(row).queryByLabelText('New sub-task title')).toBeNull();
    expect(document.activeElement).toBe(within(row).getByRole('button', { name: 'Add a sub-task' }));
    dispose();
  });
});

describe('references', () => {
  it('the row is always there with Attach a link; Add attaches it and it appears', async () => {
    const board = liveBoard();
    fakeApi.addReference.mockClear();
    fakeApp.refresh.mockImplementation(async () => {
      board.references.push(TRACE);
    });
    const { model, dispose } = await loaded();
    render(CardView, props(model));
    const row = need('[data-section="references"]', facts());
    expect(row.hidden).toBe(false);
    expect(row.textContent).toContain('none');
    await fireEvent.click(within(row).getByRole('button', { name: 'Attach a link' }));
    await tick();
    const input = within(row).getByLabelText('Attach a link or Superlibrary item');
    expect(document.activeElement).toBe(input);
    await fireEvent.input(input, { target: { value: 'https://example.com/trace' } });
    await fireEvent.click(within(row).getByRole('button', { name: 'Add' }));
    await vi.waitFor(() => expect(fakeApi.addReference).toHaveBeenCalledWith(BOARD_DX.boardId, CARD_4605.id, { url: 'https://example.com/trace' }));
    await vi.waitFor(() => expect(within(row).getByRole('link', { name: 'The trace' })).toBeTruthy());
    dispose();
  });
});

describe('a way back from a panel', () => {
  it('Cancel returns to the sentence and focuses the verb that opened the panel', async () => {
    const { model, dispose } = await loaded();
    render(CardView, props(model));
    await fireEvent.click(within(state()).getByRole('button', { name: 'Resume' }));
    await tick();
    expect(state().querySelector('form[data-row="resume"]')).toBeTruthy();
    await fireEvent.click(within(state()).getByRole('button', { name: 'Cancel' }));
    await tick();
    expect(state().querySelector('form[data-row="resume"]')).toBeNull();
    expect(state().querySelector('[data-section="status"]')?.textContent).toMatch(/^error-eric stopped in Reproduce/);
    expect(document.activeElement).toBe(within(state()).getByRole('button', { name: 'Resume' }));
    dispose();
  });
});

describe('Esc', () => {
  it('closes the card through onClose; a key something inside already took does not', async () => {
    const { model, dispose } = await loaded();
    const onClose = vi.fn<() => void>();
    render(CardView, props(model, onClose));
    const edit = screen.getByRole('button', { name: 'Edit card' });
    const taken = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    taken.preventDefault();
    edit.dispatchEvent(taken);
    expect(onClose).not.toHaveBeenCalled();
    await fireEvent.keyDown(edit, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    dispose();
  });
});

describe('busy controls keep focus and their label, and say so', () => {
  it('Resume: an empty note focuses the field; while it sends, the button holds', async () => {
    let settle!: (r: Response) => void;
    fakeApi.resumeCard.mockReset().mockReturnValue(new Promise<Response>((r) => (settle = r)));
    const { model, dispose } = await loaded();
    render(CardView, props(model));
    await fireEvent.click(within(state()).getByRole('button', { name: 'Resume' }));
    await tick();
    const note = within(state()).getByLabelText('Note for the next attempt');
    note.blur();
    await fireEvent.click(within(state()).getByRole('button', { name: 'Resume' }));
    expect(document.activeElement, 'the empty note takes focus').toBe(note);
    await fireEvent.input(note, { target: { value: 'Unsealed it.' } });
    await fireEvent.click(within(state()).getByRole('button', { name: 'Resume' }));
    await tick();
    try {
      expectHeld(within(state()).getByRole('button', { name: 'Resume' }), 'Resume', 'Sending…');
    } finally { settle(new Response('{}', { status: 200 })); }
    await tick();
    fakeApi.resumeCard.mockReset().mockImplementation(async () => new Response('{}', { status: 200 }));
    dispose();
  });

  it('Comment: while it posts, the button holds', async () => {
    let settle!: (r: Response) => void;
    fakeApi.postComment.mockReset().mockReturnValue(new Promise<Response>((r) => (settle = r)));
    const { model, dispose } = await loaded();
    render(CardView, props(model));
    const comments = need('[data-section="comments"]');
    await fireEvent.input(within(comments).getByLabelText('Add a comment'), { target: { value: 'Looked at it.' } });
    await fireEvent.click(within(comments).getByRole('button', { name: 'Comment' }));
    await tick();
    try {
      const button = within(comments).getByRole('button', { name: 'Comment' });
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expectHeld(button, 'Comment', 'Posting…');
    } finally { settle(new Response('{}', { status: 201 })); }
    await tick();
    fakeApi.postComment.mockReset().mockImplementation(async () => new Response('{}', { status: 201 }));
    dispose();
  });

  it('Answer: while it sends, the button holds', async () => {
    fakeApp.board = { ...BOARD_DX, elicitations: [ASK] };
    let settle!: (r: Response) => void;
    fakeApi.answerElicitation.mockReset().mockReturnValue(new Promise<Response>((r) => (settle = r)));
    const { model, dispose } = await loaded();
    render(CardView, props(model));
    await fireEvent.click(within(state()).getByRole('button', { name: 'Answer' }));
    await tick();
    await fireEvent.click(within(state()).getByRole('radio', { name: /^Forge-primary first/ }));
    await fireEvent.click(within(state()).getByRole('button', { name: 'Answer' }));
    await tick();
    try {
      const button = within(state()).getByRole('button', { name: 'Answer' });
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expectHeld(button, 'Answer', 'Sending…');
    } finally { settle(new Response('{}', { status: 200 })); }
    await tick();
    fakeApi.answerElicitation.mockReset().mockImplementation(async () => new Response('{}', { status: 200 }));
    dispose();
  });
});
