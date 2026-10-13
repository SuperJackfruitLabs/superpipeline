// apps/web/src/lib/components/workspace/NeedsYouTab.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';

const api = vi.hoisted(() => ({ listAttention: vi.fn(), resumeCard: vi.fn(), getAgents: vi.fn(), getCapabilities: vi.fn(), listLabels: vi.fn(), getMembers: vi.fn() }));
vi.mock('$lib/api', () => api);
vi.mock('$lib/stores/app.svelte', () => ({ app: { markBusy: <T,>(p: Promise<T>) => p } }));
import NeedsYouTab from './NeedsYouTab.svelte';

const DX = 'brd_134a0ddb6d434478';
const stale = (cardId: string, title: string, detail: string, ageHours: number) => ({
  boardId: DX, boardName: 'Developer Experience', cardId, title, ownerUserId: 'usr_b19776fac3c94df4', stageKey: 'fix', stageName: 'Fix', state: 'input-required',
  why: { kind: 'needs-human', reason: 'blocked', detail }, summary: null, since: '2026-10-09T22:50:00Z', ageHours, next: '',
});
const LONG = 'A'.repeat(60) + ' is the first sentence. ' + 'B'.repeat(200);

beforeEach(() => {
  for (const f of Object.values(api)) f.mockReset();
  api.listAttention.mockResolvedValue({ cards: [stale('card_a', 'Rotate the keys', LONG, 40), stale('card_b', 'Renew the cert', 'the cert expired', 30)], boardsUnanswered: 0 });
  for (const f of [api.getAgents, api.getCapabilities, api.listLabels, api.getMembers]) f.mockResolvedValue([]);
});
afterEach(cleanup);

describe('NeedsYouTab', () => {
  it('opens one resume form at a time, focuses it, and keeps the draft on Cancel', async () => {
    render(NeedsYouTab, {});
    const [first, second] = await screen.findAllByRole('button', { name: 'Resume' });
    await fireEvent.click(first!);
    const note = await screen.findByLabelText('Note for the agent');
    expect(document.activeElement).toBe(note);
    await fireEvent.input(note, { target: { value: 'Unsealed it.' } });
    await fireEvent.click(second!);
    expect(screen.getAllByRole('form', { name: 'Resume this card' })).toHaveLength(1);
    await fireEvent.click(first!);
    expect((screen.getByLabelText('Note for the agent') as HTMLTextAreaElement).value).toBe('Unsealed it.');
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('Note for the agent')).toBeNull();
  });
  it('shows the whole reason on Show all and folds it on Show less', async () => {
    render(NeedsYouTab, {});
    expect(await screen.findByText(`${'A'.repeat(60)} is the first sentence…`, { exact: false })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Show all' }));
    expect(screen.getByText(LONG, { exact: false })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Show less' }).getAttribute('aria-expanded')).toBe('true');
  });
  it('says plainly when nothing waits, with a neutral zero', async () => {
    api.listAttention.mockResolvedValue({ cards: [], boardsUnanswered: 0 });
    const { container } = render(NeedsYouTab, {});
    expect(await screen.findByText('Nothing on any board is waiting on you.')).toBeTruthy();
    expect(container.querySelector('.count-signal')).toBeNull();
    expect(container.querySelector('.count')!.textContent).toBe('0');
  });
  it('says which boards did not answer', async () => {
    api.listAttention.mockResolvedValue({ cards: [stale('card_b', 'Renew the cert', 'the cert expired', 30)], boardsUnanswered: 1 });
    render(NeedsYouTab, {});
    expect(await screen.findByText('Oldest first. 1 board did not answer.')).toBeTruthy();
    expect(screen.getByText('1 board did not answer; this list may be incomplete.')).toBeTruthy();
  });
});
