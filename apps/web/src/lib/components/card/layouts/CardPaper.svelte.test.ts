// apps/web/src/lib/components/card/layouts/CardPaper.svelte.test.ts
// @vitest-environment jsdom
/** The Paper drawer: a letter on a sheet. The agent writes first, the reply follows, five enclosures. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import CardPaper from './CardPaper.svelte';
import { fakeApi } from '../testing/fakes';
import { mountModel } from '../testing/mount-model.svelte';

vi.mock('$lib/stores/app.svelte', async () => ({ app: (await import('../testing/fakes')).fakeApp }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...(await import('../testing/fakes')).fakeApi }));
vi.mock('$lib/superlibrary', async (orig) => ({ ...(await orig<typeof import('$lib/superlibrary')>()), relatedForCard: vi.fn(async () => []) }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
// The fixture world's clock (e2e/pixel/screens.ts DEFAULT_CLOCK): 4605 has waited 2 days.
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-11T08:21:00.000Z')); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

/** An element's child texts, one space apart. */
const words = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

async function mount() {
  const { model, dispose } = mountModel();
  await vi.waitFor(() => expect(model.detailLoaded).toBe(true));
  const onClose = vi.fn();
  const r = render(CardPaper, { model, vibe: 'paper', phase: 'noon', personName: 'Ira Mehta', gate: model.gateBinding, question: model.questionBinding, pageHref: model.pageHref, onClose });
  return { model, dispose, onClose, ...r };
}

describe('CardPaper (4605)', () => {
  it('heads the sheet with the way back, the kicker, the Re: title and the way out', async () => {
    const { onClose, dispose } = await mount();
    const dialog = screen.getByRole('dialog', { name: 'Re: Diagnose Melissa and Anna Supermessage silence — trace actual failing hop' });
    expect(dialog.classList.contains('vk-drawer'), 'the frame is vibekit’s Drawer').toBe(true);
    expect(document.querySelector('.vk-overlay--stacked .vk-overlay__head'), 'the stacked head').toBeTruthy();
    expect(within(dialog).getByText('A letter that needs a reply').getAttribute('data-tone'), 'a reply is needed now').toBe('needs');
    const open = screen.getByRole('link', { name: 'Open in new window' });
    expect(open.className).toContain('vk-button--tool');
    expect(open.getAttribute('href')).toBe('/b/brd_134a0ddb6d434478/c/card_05823a57e8224605/page');
    expect(open.getAttribute('target')).toBe('_blank');
    await fireEvent.click(screen.getByRole('link', { name: /Developer Experience · in full daylight/ }));
    expect(onClose, 'the way back closes the drawer').toHaveBeenCalledTimes(1);
    await fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    dispose();
  });
  it('says where the card stands in two small-caps lines', async () => {
    const { dispose } = await mount();
    expect(words(document.querySelector('[data-section="status"]')!)).toBe('Waiting on you · 2 days Stage 2 of 7, Reproduce Next: Failing test Attempt 2');
    const facts = words(document.querySelector('[data-section="facts"]')!);
    expect(facts).toContain('Asked by super-chotu, an agent');
    expect(facts).toContain('Unclaimed');
    expect(facts).toContain('Priority P3 No due date No labels');
    expect(screen.getByRole('button', { name: 'Copy card id 4605' })).toBeTruthy();
    expect(document.querySelector('[data-section="status"] .sig'), 'signal colour only while a reply is needed').toBeTruthy();
    dispose();
  });
  it('the agent writes first: Dear, the words with their ids, the signature with a mood ring', async () => {
    const { dispose } = await mount();
    expect(screen.getByText('Dear Ira,')).toBeTruthy();
    expect(document.querySelectorAll('.pcd-voice .pcd-id')).toHaveLength(4);
    expect(screen.getByText('agent, attempt 2 · Thursday 8 October, 19:41'), 'the agent has no role in the fixture').toBeTruthy();
    expect(document.querySelector('.pcd-sign .vk-face')!.classList.contains('vk-face--mood'), 'the agent needs you').toBe(true);
    expect(screen.getByRole('button', { name: /Copy session id/ })).toBeTruthy();
    dispose();
  });
  it('the reply follows the letter: resume at the current stage, a note, and the caption', async () => {
    const { dispose } = await mount();
    const form = document.querySelector('form[data-section="resume"]')!;
    expect(within(form as HTMLElement).getByText('Your reply')).toBeTruthy();
    expect(screen.getByText('I stopped after two attempts. Send me back with what changed.')).toBeTruthy();
    const at = screen.getByLabelText('Resume at stage') as HTMLSelectElement;
    expect([...at.options].map((o) => o.textContent)).toEqual(['1 · Reported', '2 · Reproduce (this stage)']);
    expect(at.value, 'resume defaults to the card’s current stage').toBe('reproduce');
    expect(document.querySelector('#pcd-note')!.closest('.vk-field'), 'the note is vibekit Field').toBeTruthy();
    expect(screen.getByText('With no note: “Add a note for error-eric first.”')).toBeTruthy();
    expect(document.querySelector('.pcd-letter')!.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    dispose();
  });
  it('an empty note is a field error that names the agent, focused, with no request', async () => {
    const { dispose } = await mount();
    await fireEvent.click(screen.getByRole('button', { name: 'Send back to work' }));
    expect(screen.getByText('Add a note for error-eric first.')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('What changed, or what should the agent do differently? It reads this.'));
    dispose();
  });
  it('five enclosures, each with its summary; the brief and the correspondence are open', async () => {
    const { dispose } = await mount();
    const encs = [...document.querySelectorAll<HTMLDetailsElement>('details.pcd-enc')];
    expect(encs.map((d) => [...d.querySelector('summary')!.children].slice(0, 2).map((c) => c.textContent).join(' '))).toEqual([
      'The brief 5 things to prove · 10 details · project',
      'What happened 2 runs · no decisions · $0.00',
      'Who is waiting no links · no sub-tasks',
      'Attached 5 references · no related prior work · no delivery',
      'Correspondence No letters yet',
    ]);
    expect(encs.map((d) => d.open)).toEqual([true, false, false, false, true]);
    await fireEvent.click(encs[1]!.querySelector('summary')!);
    dispose();
  });
  it('the brief: groups, Show more on the five long values, the evidence pointer', async () => {
    const { dispose } = await mount();
    expect([...document.querySelectorAll('.pcd-groups > div > .pcd-sc')].map((h) => h.textContent)).toEqual(['What to do', 'Who it is about', 'Background', 'Rules', 'Where work goes']);
    const more = screen.getAllByRole('button', { name: 'Show more' });
    expect(more).toHaveLength(5);
    expect(screen.getByText('5 items, listed under Things to prove.')).toBeTruthy();
    await fireEvent.click(more[0]!);
    expect(more[0]!.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('error-eric did not post a plan for this card.')).toBeTruthy();
    expect(screen.getByText(/Project: Marketing & Community — Melissa and Anna onboarding · no milestone/)).toBeTruthy();
    dispose();
  });
  it('what happened: provenance, the attempts newest first, the stop row says why without repeating it', async () => {
    const { dispose } = await mount();
    expect(screen.getByText(/Asked by super-chotu \(an agent/)).toBeTruthy();
    const attempts = [...document.querySelectorAll('[data-section="attempts"] > p')].map(words);
    expect(attempts).toEqual(['Attempt 2 · error-eric · 14 events · stopped at 19:41 Thu 8 Oct', 'Attempt 1 · error-eric · 9 events · sent back']);
    expect(words(document.querySelector('.pcd-log .stop')!)).toContain('Stopped. Blocked. Waiting on you; the reason is shown at the top of this card.');
    expect(screen.getByText('Cost $0.00, no estimate yet.')).toBeTruthy();
    expect(screen.getByText('Decisions: none yet.')).toBeTruthy();
    dispose();
  });
  it('references name their source; the foot has Edit, Archive and an ink-outlined Delete', async () => {
    const { dispose } = await mount();
    expect(screen.getByText('github · agentpod · inbound.ts lines 379–786')).toBeTruthy();
    expect(screen.getByText('No related prior work found in Superlibrary.')).toBeTruthy();
    expect(screen.getByText('Nothing blocks this card and it blocks nothing.')).toBeTruthy();
    const foot = document.querySelector('[data-section="cardActions"]') as HTMLElement;
    expect(within(foot).getByRole('button', { name: /Edit card/ })).toBeTruthy();
    expect(within(foot).getByRole('button', { name: /Archive card/ })).toBeTruthy();
    expect(within(foot).getByRole('button', { name: 'Delete card' }).className).toContain('vk-button--danger');
    dispose();
  });
  it('editing swaps in the edit form; the dialog keeps its name', async () => {
    const { model, dispose } = await mount();
    await fireEvent.click(screen.getByRole('button', { name: /Edit card/ }));
    expect(model.edit.editing).toBe(true);
    expect(screen.getByRole('dialog', { name: /Re: Diagnose Melissa and Anna/ })).toBeTruthy();
    expect(screen.getByPlaceholderText('Title')).toBeTruthy();
    dispose();
  });

  // Busy keeps the pressed button enabled and focused (aria-disabled, clicks ignored); a status says it; the label stays.
  it('resume: Send back to work keeps focus and its label while sending, and says Sending…', async () => {
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
    expect(send.textContent?.trim()).toBe('Send back to work');
    expect(screen.getAllByRole('status').map((s) => s.textContent)).toContain('Sending…');
    await fireEvent.click(send);
    expect(fakeApi.resumeCard).toHaveBeenCalledTimes(1);
    settle(new Response('{}', { status: 200 }));
    dispose();
  });
  it('comment: Comment keeps focus and its label while posting, and says Posting…', async () => {
    const { dispose } = await mount();
    let settle!: (r: Response) => void;
    fakeApi.postComment.mockClear().mockImplementationOnce(() => new Promise<Response>((r) => (settle = r)));
    await fireEvent.input(screen.getByLabelText('Write to whoever works this card. The agent reads it.'), { target: { value: 'hello' } });
    const post = screen.getByRole('button', { name: 'Comment' }) as HTMLButtonElement;
    post.focus();
    await fireEvent.click(post);
    await vi.waitFor(() => expect(post.getAttribute('aria-disabled')).toBe('true'));
    expect(post.disabled).toBe(false);
    expect(document.activeElement).toBe(post);
    expect(post.textContent?.trim()).toBe('Comment');
    expect(screen.getAllByRole('status').map((s) => s.textContent)).toContain('Posting…');
    await fireEvent.click(post);
    expect(fakeApi.postComment).toHaveBeenCalledTimes(1);
    settle(new Response('{}', { status: 201 }));
    dispose();
  });
  it('opens with focus on the sheet itself (vibekit Drawer autofocus on .pcd), not on its first control', async () => {
    const { dispose } = await mount();
    await vi.waitFor(() => expect((document.activeElement as HTMLElement | null)?.classList.contains('pcd')).toBe(true));
    expect(document.activeElement!.closest('.vk-drawer')).toBeTruthy();
    dispose();
  });
});
