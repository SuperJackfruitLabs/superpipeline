// apps/web/src/lib/components/card/layouts/CardDaylight.svelte.test.ts
// @vitest-environment jsdom
/** The Daylight drawer: the agent first, the reply, five sections, every section once. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import CardDaylight from './CardDaylight.svelte';
import { fakeApi } from '../testing/fakes';
import { mountModel } from '../testing/mount-model.svelte';

vi.mock('$lib/stores/app.svelte', async () => ({ app: (await import('../testing/fakes')).fakeApp }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...(await import('../testing/fakes')).fakeApi }));
vi.mock('$lib/superlibrary', async (orig) => ({ ...(await orig<typeof import('$lib/superlibrary')>()), relatedForCard: vi.fn(async () => []) }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
// The fixture world's clock (e2e/pixel/screens.ts DEFAULT_CLOCK): 4605 has waited 2 days.
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-11T08:21:00.000Z')); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

/** An element's child texts, one space apart (the reference sets no whitespace between them; CSS gaps do). */
const words = (el: Element) => [...el.children].map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ');

async function mount() {
  const { model, dispose } = mountModel();
  await vi.waitFor(() => expect(model.detailLoaded).toBe(true));
  const onClose = vi.fn();
  const r = render(CardDaylight, { model, vibe: 'daylight', phase: 'noon', personName: 'Rakesh', gate: model.gateBinding, question: model.questionBinding, pageHref: model.pageHref, onClose });
  return { model, dispose, onClose, ...r };
}

describe('CardDaylight (4605)', () => {
  it('heads the drawer with the board, the stage, the title and the way out', async () => {
    const { onClose, dispose } = await mount();
    const dialog = screen.getByRole('dialog', { name: 'Diagnose Melissa and Anna Supermessage silence — trace actual failing hop' });
    expect(dialog.classList.contains('vk-drawer'), 'the frame is vibekit’s Drawer').toBe(true);
    expect(within(dialog).getByText('Developer Experience · Reproduce')).toBeTruthy();
    const open = screen.getByRole('link', { name: 'Open in new window' });
    expect(open.getAttribute('href')).toBe('/b/brd_134a0ddb6d434478/c/card_05823a57e8224605/page');
    expect(open.getAttribute('target')).toBe('_blank');
    expect(open.getAttribute('rel')).toBe('noopener');
    await fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
    dispose();
  });
  it('wears vibekit 0.0.5\'s card head: stacked, a needs eyebrow, the tool Open, Edit beside the title, the mood ring', async () => {
    const { dispose } = await mount();
    const dialog = screen.getByRole('dialog');
    expect(document.querySelector('.vk-overlay--stacked .vk-overlay__head'), 'the stacked head').toBeTruthy();
    expect(within(dialog).getByText('Developer Experience · Reproduce').getAttribute('data-tone'), 'the agent needs you now').toBe('needs');
    expect(screen.getByRole('link', { name: 'Open in new window' }).className).toContain('vk-button--tool');
    expect(screen.getByRole('button', { name: 'Edit card' }).closest('.vk-overlay__aside'), 'Edit sits beside the title').toBeTruthy();
    expect(document.querySelector('.dd-msg .vk-face')!.classList.contains('vk-face--mood'), 'the agent wears the mood ring (SP-Card-Daylight .dl-msg)').toBe(true);
    expect(document.querySelector('#dd-note')!.closest('.vk-field'), 'the note is vibekit Field').toBeTruthy();
    dispose();
  });
  it('says where the card stands, in words', async () => {
    const { dispose } = await mount();
    const container = document.body;
    expect(screen.getByRole('list', { name: 'Stages: stage 2 of 7, Reproduce, stopped' })).toBeTruthy();
    expect(screen.getByText('Stopped in stage 2 of 7. Next: Failing test.')).toBeTruthy();
    const pill = screen.getByText('Waiting on you · 2 days').closest('.vk-statelabel');
    expect(pill, 'the state pill is vibekit’s StateLabel').toBeTruthy();
    expect(screen.getByText('Unclaimed · error-eric ran attempt 2')).toBeTruthy();
    expect(screen.getByText('Owner · Rakesh Gangwar')).toBeTruthy();
    expect(screen.getByText('Asked by super-chotu').closest('[title]')!.getAttribute('title')).toBe('super-chotu, an agent, with dispatch authority on this board');
    expect(words(container.querySelector('.dd-facts')!)).toContain('Priority P3 Due none Labels none In Reproduce for 2 days Attempt 2');
    expect(screen.getByRole('button', { name: 'Copy card id 4605' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /assign to me/i }), 'the viewer owns 4605').toBeNull();
    dispose();
  });
  it('folds the brief while the agent needs you, and the reply follows the agent', async () => {
    const { dispose } = await mount();
    const container = document.body;
    const pinned = container.querySelector('details.dd-pinned') as HTMLDetailsElement;
    expect(pinned.open).toBe(false);
    expect(within(pinned).getByText('Description and 5 criteria · Show')).toBeTruthy();
    expect(screen.getByText('error-eric · needs you')).toBeTruthy();
    expect(container.querySelectorAll('.dd-say .dd-id')).toHaveLength(4);
    expect(screen.getByRole('button', { name: /Copy session id/ })).toBeTruthy();
    expect(screen.getByText('Stopped after 2 attempts. Tell error-eric what to do differently.')).toBeTruthy();
    const at = screen.getByLabelText('Resume at stage') as HTMLSelectElement;
    expect([...at.options].map((o) => o.textContent)).toEqual(['1 · Reported', '2 · Reproduce (this stage)']);
    const note = screen.getByLabelText('What changed, or what should the agent do differently? It reads this.') as HTMLTextAreaElement;
    expect(note.placeholder).toBe('For example: what you checked, and what the agent should look at next.');
    expect(screen.getByText('Needed before you send. 0 / 8000')).toBeTruthy();
    dispose();
  });
  it('an empty note is a field error that names the agent, focused, with no request', async () => {
    const { dispose } = await mount();
    await fireEvent.click(screen.getByRole('button', { name: /Send back to work/ }));
    expect(screen.getByText('Add a note for error-eric first.')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('What changed, or what should the agent do differently? It reads this.'));
    dispose();
  });
  it('summarises the five sections; only The brief is open', async () => {
    const { dispose } = await mount();
    const container = document.body;
    const secs = [...container.querySelectorAll<HTMLDetailsElement>('details.dd-sec')];
    expect(secs.map((d) => words(d.querySelector('summary')!))).toEqual([
      'The brief Details · 10 fields, project',
      'What happened 2 runs · no decisions yet',
      'Links and references no links · no sub-tasks · 5 references · no related work',
      'Talk No comments yet',
      'Cost and delivery $0.00 · no estimate · no delivery',
    ]);
    expect(secs.map((d) => d.open)).toEqual([true, false, false, false, false]);
    dispose();
  });
  it('the brief: groups, Show more on the five long values, required evidence', async () => {
    const { dispose } = await mount();
    const container = document.body;
    expect([...container.querySelectorAll('.dd-group h4')].map((h) => h.textContent)).toEqual(['What to do', 'Who it is about', 'Background', 'Rules', 'Where work goes']);
    const more = screen.getAllByRole('button', { name: 'Show more' });
    expect(more).toHaveLength(5);
    expect(screen.getByText('5 items, listed under Acceptance criteria.')).toBeTruthy();
    await fireEvent.click(more[0]!);
    expect(more[0]!.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText(/This continuation is only shown after Show more\./)).toBeTruthy();
    expect(screen.getByText('error-eric did not post a plan for this card.')).toBeTruthy();
    expect(screen.getByText('Marketing & Community — Melissa and Anna onboarding · no milestone')).toBeTruthy();
    dispose();
  });
  it('what happened: newest run first and open, the stop row says why without repeating it', async () => {
    const { dispose } = await mount();
    const container = document.body;
    const runs = [...container.querySelectorAll<HTMLElement>('div.dd-run')];
    expect(runs.map((r) => words(r.querySelector('button[data-attempt-head]')!))).toEqual([
      'Reproduce · error-eric stopped attempt 2 14 events · 0 errors',
      'Reproduce · error-eric sent back attempt 1 9 events · 0 errors',
    ]);
    expect(runs.map((r) => r.querySelector('button[data-attempt-head]')!.getAttribute('aria-expanded'))).toEqual(['true', 'false']);
    expect(runs[0]!.querySelector('.stop')!.textContent).toBe('Stopped Blocked. Waiting on you; the reason is shown at the top of this card.');
    expect(screen.getByText('From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output.')).toBeTruthy();
    expect(screen.getByText('Attempts: 1 · error-eric · $0.00 · sent back; 2 · error-eric · $0.00 · stopped')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Show tool calls' }));
    expect(runs[0]!.querySelectorAll('.dd-ev > li')).toHaveLength(14);
    expect(screen.getByRole('button', { name: 'Hide tool calls' })).toBeTruthy();
    dispose();
  });
  it('references name their source; the foot has Archive and an ink-outlined Delete', async () => {
    const { dispose } = await mount();
    const container = document.body;
    expect(screen.getByText('· github · agentpod · inbound.ts lines 379–786')).toBeTruthy();
    expect(screen.getByText('No related prior work found in Superlibrary.')).toBeTruthy();
    expect(screen.getByText('Nothing blocks this card and it blocks nothing.')).toBeTruthy();
    const foot = container.querySelector('.dd-foot')!;
    expect(within(foot as HTMLElement).getByRole('button', { name: /Archive card/ })).toBeTruthy();
    expect(within(foot as HTMLElement).getByRole('button', { name: /Delete card/ }).className).toContain('vk-button--quiet');
    dispose();
  });
  it('editing swaps in the edit form; the dialog keeps its name', async () => {
    const { model, dispose } = await mount();
    await fireEvent.click(screen.getByRole('button', { name: 'Edit card' }));
    expect(model.edit.editing).toBe(true);
    expect(screen.getByRole('dialog', { name: /Diagnose Melissa and Anna/ })).toBeTruthy();
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
    await fireEvent.input(screen.getByLabelText('Add a comment'), { target: { value: 'hello' } });
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
  it('opens with focus on the card itself (vibekit Drawer autofocus on .dd-card), not on its first tool', async () => {
    const { dispose } = await mount();
    await vi.waitFor(() => expect((document.activeElement as HTMLElement | null)?.classList.contains('dd-card')).toBe(true));
    expect(document.activeElement!.closest('.vk-drawer')).toBeTruthy();
    dispose();
  });
});
