// apps/web/src/lib/components/card/layouts/CardStudio.svelte.test.ts
// @vitest-environment jsdom
/** The Studio drawer: bar, figures, ramp, 01-03, and 04 as five tabs. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import CardStudio from './CardStudio.svelte';
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
  const r = render(CardStudio, { model, vibe: 'studio', phase: 'noon', personName: 'Ira Mehta', gate: model.gateBinding, question: model.questionBinding, pageHref: model.pageHref, onClose });
  return { model, dispose, onClose, ...r };
}

describe('CardStudio (4605)', () => {
  it('heads the drawer: way back, card id, clock, Open, title, kicker, Edit beside the title', async () => {
    const { onClose, dispose } = await mount();
    const dialog = screen.getByRole('dialog', { name: 'Diagnose Melissa and Anna Supermessage silence — trace actual failing hop' });
    expect(dialog.classList.contains('vk-drawer'), 'the frame is vibekit’s Drawer').toBe(true);
    expect(within(dialog).getByText(/Developer Experience · stage 02 Reproduce/).getAttribute('data-tone'), 'a person is needed now').toBe('needs');
    expect(screen.getByText('Card 4605')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy card id 4605' })).toBeTruthy();
    expect(screen.getByText('13:51 · midday')).toBeTruthy();
    const open = screen.getByRole('link', { name: 'Open in new window, Shift O' });
    expect(open.className).toContain('vk-button--tool');
    expect(open.getAttribute('href')).toBe('/b/brd_134a0ddb6d434478/c/card_05823a57e8224605/page');
    expect(screen.getByRole('button', { name: /^Edit/ }).closest('.vk-overlay__aside'), 'Edit sits beside the title').toBeTruthy();
    await fireEvent.click(screen.getByRole('link', { name: 'Developer Experience' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    dispose();
  });
  it('six figures, the ramp, and who and what', async () => {
    const { dispose } = await mount();
    const figs = [...document.querySelectorAll('.ar-figs > div')].map(words);
    expect(figs).toEqual(['2of 7Stage', '2Attempts', '2daysWaiting on you', '$0.00Cost · no estimate', '0Blocks', '0of 0Sub-tasks open']);
    expect(screen.getByRole('list', { name: 'Stages: stage 2 of 7, Reproduce, stopped' })).toBeTruthy();
    const who = [...document.querySelectorAll('.cd-who > *')].map(words).join(' ');
    expect(who).toContain('State Waiting on you');
    expect(who).toContain('Agent Unclaimed (error-eric ran attempt 2)');
    expect(who).toContain('Asked by super-chotu');
    expect(who).toContain('Priority P3 Due none Labels none');
    dispose();
  });
  it('01 says why it stopped, with the session id footnoted and copyable', async () => {
    const { dispose } = await mount();
    expect(screen.getByText('Why it stopped')).toBeTruthy();
    expect(screen.getByText('error-eric · Stopped · needs you')).toBeTruthy();
    expect(document.querySelectorAll('blockquote code')).toHaveLength(4);
    expect(document.querySelector('blockquote .fn')!.textContent).toBe('1');
    expect(screen.getAllByRole('button', { name: /Copy session id/ }).length).toBeGreaterThan(0);
    dispose();
  });
  it('03 is the reply: resume at the current stage, a note, the hint', async () => {
    const { dispose } = await mount();
    const at = screen.getByLabelText('Resume at stage') as HTMLSelectElement;
    expect([...at.options].map((o) => o.textContent)).toEqual(['01 Reported', '02 Reproduce (this stage)']);
    expect(at.value, 'resume defaults to the card’s current stage').toBe('reproduce');
    expect(screen.getByText('Note needed · 0/8000')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: /Send back to work/ }));
    expect(screen.getByText('Add a note for error-eric first.')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText(/Note to error-eric/));
    dispose();
  });
  it('04 has five tabs with counts; arrow keys move between them', async () => {
    const { dispose } = await mount();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map(words)).toEqual(['Spec 10', 'Log 2', 'Links 5', 'Talk 0', 'Cost $0.00']);
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
    expect(screen.getAllByRole('button', { name: 'Show more' })).toHaveLength(5);
    tabs[0]!.focus();
    await fireEvent.keyDown(tabs[0]!, { key: 'ArrowRight' });
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Latest run', { exact: false })).toBeTruthy();
    expect(screen.getByText(/Asked by super-chotu, an agent/)).toBeTruthy();
    await fireEvent.keyDown(tabs[1]!, { key: 'End' });
    expect(tabs[4]!.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Delivery: none approved on this card.')).toBeTruthy();
    dispose();
  });
  it('the foot has Archive and Delete as vibekit danger Button', async () => {
    const { dispose } = await mount();
    const foot = document.querySelector('[data-section="cardActions"]') as HTMLElement;
    expect(within(foot).getByRole('button', { name: /Archive card/ })).toBeTruthy();
    expect(within(foot).getByRole('button', { name: 'Delete card' }).className, 'vibekit’s danger Button, the ink outline').toContain('vk-button--danger');
    dispose();
  });
  it('editing swaps in the edit form; the dialog keeps its name', async () => {
    const { model, dispose } = await mount();
    await fireEvent.click(screen.getByRole('button', { name: /^Edit/ }));
    expect(model.edit.editing).toBe(true);
    expect(screen.getByRole('dialog', { name: /Diagnose Melissa and Anna/ })).toBeTruthy();
    expect(screen.getByPlaceholderText('Title')).toBeTruthy();
    dispose();
  });
  it('resume: Send back to work keeps focus and its label while sending', async () => {
    const { dispose } = await mount();
    let settle!: (r: Response) => void;
    fakeApi.resumeCard.mockImplementationOnce(() => new Promise<Response>((r) => (settle = r)));
    await fireEvent.input(screen.getByLabelText(/Note to error-eric/), { target: { value: 'look at the bridge' } });
    const send = screen.getByRole('button', { name: /Send back to work/ }) as HTMLButtonElement;
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
  it('opens inside the drawer (vibekit focuses its first control; the reference is drawn unfocused, so the pixel step blurs it)', async () => {
    const { dispose } = await mount();
    await vi.waitFor(() => expect(document.activeElement!.closest('.vk-drawer')).toBeTruthy());
    dispose();
  });
});
