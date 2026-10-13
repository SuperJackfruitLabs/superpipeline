// apps/web/src/lib/components/card/layouts/CardQuiet.svelte.test.ts
// @vitest-environment jsdom
/** The Quiet drawer: one signal-edged fieldset, then plain sections in two columns. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import CardQuiet from './CardQuiet.svelte';
import { fakeApi } from '../testing/fakes';
import { mountModel } from '../testing/mount-model.svelte';

vi.mock('$lib/stores/app.svelte', async () => ({ app: (await import('../testing/fakes')).fakeApp }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...(await import('../testing/fakes')).fakeApi }));
vi.mock('$lib/superlibrary', async (orig) => ({ ...(await orig<typeof import('$lib/superlibrary')>()), relatedForCard: vi.fn(async () => []) }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-11T08:21:00.000Z')); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const words = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

async function mount() {
  const { model, dispose } = mountModel();
  await vi.waitFor(() => expect(model.detailLoaded).toBe(true));
  const onClose = vi.fn();
  const r = render(CardQuiet, { model, vibe: 'quiet', phase: 'noon', personName: 'Ira Mehta', gate: model.gateBinding, question: model.questionBinding, pageHref: model.pageHref, onClose });
  return { model, dispose, onClose, ...r };
}

describe('CardQuiet (4605)', () => {
  it('heads the drawer: way back, Open, the title and the meta sentence', async () => {
    const { onClose, dispose } = await mount();
    const dialog = screen.getByRole('dialog', { name: 'Diagnose Melissa and Anna Supermessage silence — trace actual failing hop' });
    expect(dialog.classList.contains('vk-drawer'), 'the frame is vibekit’s Drawer').toBe(true);
    expect(within(dialog).getByText('Stage 2 of 7: Reproduce · Agent: none holding it (error-eric ran attempt 2) · Waiting on you for 2 days')).toBeTruthy();
    const open = screen.getByRole('link', { name: 'Open in new window' });
    expect(open.className).toContain('vk-button--tool');
    expect(open.getAttribute('href')).toBe('/b/brd_134a0ddb6d434478/c/card_05823a57e8224605/page');
    await fireEvent.click(screen.getByRole('link', { name: '← Developer Experience board' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    dispose();
  });
  it('the decision fieldset says who stopped, what they wrote, and asks for the reply', async () => {
    const { dispose } = await mount();
    const set = document.querySelector('fieldset[data-section="resume"]') as HTMLElement;
    expect(within(set).getByText('Your decision is needed')).toBeTruthy();
    expect(within(set).getByText('error-eric stopped on Thursday 8 October at 19:41 and wrote:')).toBeTruthy();
    expect(set.querySelectorAll('.qcd-said .qcd-id')).toHaveLength(1);
    const at = screen.getByLabelText('Resume at stage') as HTMLSelectElement;
    expect([...at.options].map((o) => o.textContent)).toEqual(['Stage 1: Reported', 'Stage 2: Reproduce (this stage)']);
    expect(at.value, 'resume defaults to the card’s current stage').toBe('reproduce');
    expect(screen.getByText('You must write a note before sending. Up to 8000 characters.')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Send back to work' }));
    expect(screen.getByText('Add a note for error-eric first.')).toBeTruthy();
    dispose();
  });
  it('plain sections: details, brief, history, comments, links, the rest', async () => {
    const { dispose } = await mount();
    expect([...document.querySelectorAll('.qcd-sec > h3')].map((h) => h.textContent)).toEqual([
      'Details', 'Description', 'Acceptance criteria', 'Plan', 'Brief details (10)', 'History (2 runs)', 'Decisions', 'Comments', 'Links (0)',
      'Sub-tasks, Project, Cost, Delivery', 'References and related prior work', 'Card actions',
    ]);
    const who = [...document.querySelectorAll('[data-section="status"] > *')].map(words).join(' | ');
    expect(who).toContain('None holding it.');
    expect(who).toContain('super-chotu, an agent allowed to dispatch the one working it');
    expect(screen.getAllByRole('button', { name: 'Show more' })).toHaveLength(5);
    expect(screen.getByText('Nothing blocks this card and it blocks nothing.')).toBeTruthy();
    expect(screen.getByText('github · agentpod · inbound.ts lines 379–786')).toBeTruthy();
    dispose();
  });
  it('card actions: Archive, and an ink-outlined Delete', async () => {
    const { dispose } = await mount();
    const foot = document.querySelector('[data-section="cardActions"]') as HTMLElement;
    expect(within(foot).getByRole('button', { name: 'Archive card' })).toBeTruthy();
    expect(within(foot).getByRole('button', { name: 'Delete card' }).className).toContain('vk-button--quiet');
    dispose();
  });
  it('editing swaps in the edit form; the dialog keeps its name', async () => {
    const { model, dispose } = await mount();
    await fireEvent.click(screen.getByRole('button', { name: 'Edit card' }));
    expect(model.edit.editing).toBe(true);
    expect(screen.getByRole('dialog', { name: /Diagnose Melissa and Anna/ })).toBeTruthy();
    dispose();
  });
  it('resume keeps focus and its label while sending, and says Sending…', async () => {
    const { dispose } = await mount();
    let settle!: (r: Response) => void;
    fakeApi.resumeCard.mockImplementationOnce(() => new Promise<Response>((r) => (settle = r)));
    await fireEvent.input(screen.getByLabelText('What changed, or what should the agent do differently? It reads this.'), { target: { value: 'look at the bridge' } });
    const send = screen.getByRole('button', { name: 'Send back to work' }) as HTMLButtonElement;
    send.focus();
    await fireEvent.click(send);
    await vi.waitFor(() => expect(send.getAttribute('aria-disabled')).toBe('true'));
    expect(send.disabled).toBe(false);
    expect(document.activeElement).toBe(send);
    expect(screen.getAllByRole('status').map((s) => s.textContent)).toContain('Sending…');
    await fireEvent.click(send);
    expect(fakeApi.resumeCard).toHaveBeenCalledTimes(1);
    settle(new Response('{}', { status: 200 }));
    dispose();
  });
  it('comment keeps focus and its label while posting, and says Posting…', async () => {
    const { dispose } = await mount();
    let settle!: (r: Response) => void;
    fakeApi.postComment.mockClear().mockImplementationOnce(() => new Promise<Response>((r) => (settle = r)));
    await fireEvent.input(screen.getByLabelText('Add a comment'), { target: { value: 'hello' } });
    const post = screen.getByRole('button', { name: 'Comment' }) as HTMLButtonElement;
    post.focus();
    await fireEvent.click(post);
    await vi.waitFor(() => expect(post.getAttribute('aria-disabled')).toBe('true'));
    expect(document.activeElement).toBe(post);
    expect(screen.getAllByRole('status').map((s) => s.textContent)).toContain('Posting…');
    settle(new Response('{}', { status: 201 }));
    dispose();
  });
  it('opens inside the drawer (vibekit focuses its first control; the pixel step blurs it)', async () => {
    const { dispose } = await mount();
    await vi.waitFor(() => expect(document.activeElement!.closest('.vk-drawer')).toBeTruthy());
    dispose();
  });
});
