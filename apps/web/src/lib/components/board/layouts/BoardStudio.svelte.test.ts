// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';

const { openCard, store } = vi.hoisted(() => {
  const openCard = vi.fn();
  return {
    openCard,
    store: {
      openCard,
      moveCard: vi.fn(async () => {}),
      error: '',
      board: {
        stages: [{ key: 'b', name: 'Build', order: 1 }, { key: 'a', name: 'Plan', order: 0 }],
        usage: { totalCostUsd: 7.5, estimatedCostUsd: 0, budgetUsd: null, cardUsdCap: null, overBudget: false },
      },
    },
  };
});
vi.mock('$lib/stores/app.svelte', () => ({ app: store }));

import BoardStudio from './BoardStudio.svelte';
import { openLabel } from '../open-label';

beforeEach(() => {
  openCard.mockClear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 11, 12, 0, 0));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const agent = { id: 'agt_r', name: 'Sample agent', iconUrl: null };
const lead = (kind: string, sentence: string | null) => ({ kind, needsYou: kind !== 'working', sentence });
let n = 0;
const card = (urgency: string, over: Record<string, unknown> = {}) => {
  n += 1;
  const title = (over.title as string | undefined) ?? `Card ${n}`;
  return {
    card: { id: `crd_${n}`, title, currentStageKey: 'b' },
    id: `crd_${n}`, title, stageName: 'Build', stageIndex: 1, stageCount: 2, state: 'queued', urgency, archived: false,
    priority: 0, live: false, blocked: null, children: null, labels: [], moreLabels: 0, firstRef: null,
    delegate: agent, queuedBy: null, cost: 0, overBudget: false, cardCap: null, costPct: null, dueAt: null, overdue: false,
    gatePending: false, questionFrom: null, attention: null, lead: lead('working', null), mood: 'working', attemptCount: 0,
    stateSince: `2026-10-0${n % 9 + 1}T00:00:00Z`, ageHours: 5,
    ...over,
  };
};

const stages = [
  { key: 'a', name: 'Plan', order: 0, count: 1, wipLimit: null, atLimit: false, blocked: 0, gate: false, manager: false, owner: { label: 'Sample agent', undeclared: false, declaredBy: [], caveat: '' }, empty: false },
  { key: 'b', name: 'Build', order: 1, count: 3, wipLimit: 3, atLimit: true, blocked: 0, gate: false, manager: false, owner: { label: 'Sample agent', undeclared: false, declaredBy: [], caveat: '' }, empty: false },
] as never;

function props(over: Record<string, unknown> = {}) {
  n = 0;
  const summaries = [
    card('needs', { title: 'Review me', gatePending: true, ageHours: 6, lead: lead('review', 'Ready to ship.'), attention: { instruction: 'Approve or send it back.' }, attemptCount: 2, cost: 1.25, overBudget: true, dueAt: '2026-10-01', overdue: true }),
    card('needs', { title: 'Answer me', questionFrom: 'Sample agent', lead: lead('question', 'Which colour?'), attention: { instruction: 'Answer the question.' } }),
    card('working', { title: 'Busy one', live: true, state: 'working', stageIndex: 0 }),
    card('queued', { title: 'Later one', delegate: null }),
    ...[1, 2, 3, 4, 5, 6].map((i) => card('done', { title: `Shipped ${i}`, state: 'completed' })),
    card('closed', { title: 'Dropped one', archived: true, state: 'canceled' }),
  ];
  return { summaries, stages, attention: [], phase: 'noon', vibe: 'studio', boardName: 'Launch', cardCount: 11, onCompose: vi.fn(), ...over } as never;
}

const rows = () => within(screen.getByRole('table', { name: 'Cards' })).getAllByRole('row').slice(1);

describe('BoardStudio', () => {
  it('has a top bar: the board, the product chip and the readout', () => {
    render(BoardStudio, props());
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Launch');
    expect(screen.getByText('SUPERPIPELINE')).toBeTruthy();
    expect(screen.getByText('12:00 MIDDAY')).toBeTruthy();
  });

  it('filters by urgency with counts and aria-pressed (Idle is queued, Done includes closed)', async () => {
    render(BoardStudio, props());
    const names = ['All 11', 'Needs 2', 'Working 1', 'Idle 1', 'Done 7'];
    for (const nm of names) expect(screen.getByRole('button', { name: nm })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'All 11' }).getAttribute('aria-pressed')).toBe('true');
    expect(rows()).toHaveLength(11);
    await fireEvent.click(screen.getByRole('button', { name: 'Needs 2' }));
    expect(screen.getByRole('button', { name: 'Needs 2' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'All 11' }).getAttribute('aria-pressed')).toBe('false');
    expect(rows()).toHaveLength(2);
    await fireEvent.click(screen.getByRole('button', { name: 'Done 7' }));
    expect(rows()).toHaveLength(7);
    await fireEvent.click(screen.getByRole('button', { name: 'Idle 1' }));
    expect(rows()).toHaveLength(1);
  });

  it('shows the metric tiles', () => {
    render(BoardStudio, props());
    const m = screen.getByRole('group', { name: 'Board numbers' });
    const pair = (label: string) => within(m).getByText(label).parentElement!.textContent;
    expect(pair('cards')).toBe('11cards');
    expect(pair('needs you')).toBe('2needs you');
    expect(pair('working')).toBe('1working');
    expect(pair('spend 7d')).toBe('$7.50spend 7d');
    expect(pair('over budget')).toBe('1over budget');
    expect(pair('overdue')).toBe('1overdue');
  });

  it('has a stage strip', () => {
    render(BoardStudio, props());
    const strip = screen.getByRole('list', { name: 'Stages' });
    expect(strip.textContent).toContain('Plan');
    expect(strip.textContent).toContain('3/3');
  });

  it('is a table with a caption and the ten column headers', () => {
    render(BoardStudio, props());
    const t = screen.getByRole('table', { name: 'Cards' });
    expect(t.querySelector('caption')!.textContent).toBe('Cards');
    expect(within(t).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Status', 'Card', 'Agent', 'Stage', 'Attempts', 'Age', 'Next', 'Cost', 'Due', 'Move']);
    // the header row is visually hidden, never removed
    expect(t.querySelector('thead')!.className).toContain('sr-only');
  });

  it('gives every row each cell, labelled for the phone view', () => {
    render(BoardStudio, props());
    const r = rows()[0];
    const cells = within(r).getAllByRole('cell');
    expect(cells.map((c) => c.getAttribute('data-label'))).toEqual(['Status', 'Card', 'Agent', 'Stage', 'Attempts', 'Age', 'Next', 'Cost', 'Due', 'Move']);
  });

  it('draws a status light that says its state in words, and blinks only for needs', () => {
    render(BoardStudio, props());
    const [needs, , working, queued, done] = rows();
    const led = (r: HTMLElement) => r.querySelector('td[data-label="Status"] .status-led')!;
    expect(led(needs).getAttribute('data-mood')).toBe('needs');
    expect(led(needs).getAttribute('data-blink')).toBe('true');
    expect(within(needs).getByText('Needs you')).toBeTruthy();
    expect(led(working).getAttribute('data-mood')).toBe('working');
    expect(led(working).getAttribute('data-blink')).toBe('false');
    expect(within(working).getByText('Working')).toBeTruthy();
    expect(led(queued).getAttribute('data-mood')).toBe('resting');
    expect(within(queued).getByText('Idle')).toBeTruthy();
    expect(led(done).getAttribute('data-mood')).toBe('done');
    expect(within(done).getByText('Done')).toBeTruthy();
    expect(within(rows()[10]).getByText('Closed')).toBeTruthy();
  });

  it('opens the card from its title, with facts under it', async () => {
    render(BoardStudio, props());
    const r = rows()[0];
    const open = within(r).getByRole('button', { name: openLabel({ title: 'Review me', stageName: 'Build' }) });
    await fireEvent.click(open);
    expect(openCard).toHaveBeenCalledWith('crd_1');
    expect(r.querySelector('.card-facts')).toBeTruthy();
    expect(r.querySelector('.card-facts')!.getAttribute('data-tone')).toBe('chips');
  });

  it('names the agent with a light face, or says nobody', () => {
    render(BoardStudio, props());
    expect(within(rows()[0]).getByText('Sample agent', { selector: '.agent-name' })).toBeTruthy();
    expect(rows()[0].querySelector('.agent-face')!.getAttribute('data-variant')).toBe('light');
    expect(within(rows()[3]).getByText('nobody')).toBeTruthy();
  });

  it('draws a stage track per card, stopped when the card needs you', () => {
    render(BoardStudio, props());
    const track = rows()[0].querySelector('.vk-stages')!;
    expect(track).toBeTruthy();
    expect(track.querySelectorAll('li')).toHaveLength(2);
    expect(track.textContent).toMatch(/stopped|needs/i);
    expect(rows()[2].querySelector('.vk-stages')!.textContent).not.toMatch(/stopped/i);
  });

  it('shows attempts (signal at two or more), age, cost and due', () => {
    render(BoardStudio, props());
    const r = rows()[0];
    const cell = (l: string) => r.querySelector(`td[data-label="${l}"]`)! as HTMLElement;
    expect(cell('Attempts').textContent).toBe('2');
    expect(cell('Attempts').innerHTML).toContain('text-signal-text');
    expect(rows()[1].querySelector('td[data-label="Attempts"]')!.innerHTML).not.toContain('text-signal-text');
    expect(cell('Age').textContent).toBe('6h');
    expect(cell('Cost').textContent).toBe('$1.25');
    expect(cell('Cost').innerHTML).toContain('text-signal-text');
    expect(cell('Due').textContent).toContain('2026-10-01');
    expect(cell('Stage').textContent).toContain('Build');
  });

  it('says what is next: the instruction with its action, or auto with the state', async () => {
    render(BoardStudio, props());
    const review = rows()[0];
    expect(within(review).getByText('Approve or send it back.')).toBeTruthy();
    await fireEvent.click(within(review).getByRole('button', { name: '⚑ Review' }));
    expect(openCard).toHaveBeenCalledWith('crd_1');
    expect(within(rows()[1]).getByRole('button', { name: '⚑ Answer Sample agent' })).toBeTruthy();
    expect(rows()[2].querySelector('td[data-label="Next"]')!.textContent!.trim()).toBe('auto · working');
    expect(rows()[3].querySelector('td[data-label="Next"]')!.textContent!.trim()).toBe('auto · queued');
  });

  it('highlights needs rows', () => {
    render(BoardStudio, props());
    expect(rows()[0].className).toContain('bg-signal-wash');
    expect(rows()[2].className).not.toContain('bg-signal-wash');
  });

  it('keeps the move control visible inside a positioned cell', () => {
    render(BoardStudio, props());
    const r = rows()[2];
    const btn = within(r).getByRole('button', { name: /Move Busy one to another stage/ });
    expect(btn.className).not.toContain('opacity-0');
    expect(btn.closest('td')!.className).toContain('relative');
  });

  it('says so when a filter leaves no rows', async () => {
    render(BoardStudio, props({ summaries: [] }));
    expect(screen.getByText('No cards here.')).toBeTruthy();
  });
});
