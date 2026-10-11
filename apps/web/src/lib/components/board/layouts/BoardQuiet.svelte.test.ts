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
      board: { stages: [{ key: 'b', name: 'Build', order: 1 }, { key: 'a', name: 'Plan', order: 0 }] },
    },
  };
});
vi.mock('$lib/stores/app.svelte', () => ({ app: store }));

import BoardQuiet from './BoardQuiet.svelte';
import { openLabel } from '../open-label';

beforeEach(() => openCard.mockClear());
afterEach(cleanup);

const agent = { id: 'agt_r', name: 'Sample agent', iconUrl: null };
const lead = (kind: string, sentence: string | null) => ({ kind, needsYou: kind !== 'working', sentence });
let n = 0;
const card = (urgency: string, over: Record<string, unknown> = {}) => {
  n += 1;
  const title = (over.title as string | undefined) ?? `Card ${n}`;
  return {
    card: { id: `crd_${n}`, title, currentStageKey: 'b' },
    id: `crd_${n}`, title: `Card ${n}`, stageName: 'Build', urgency, archived: false,
    priority: 0, live: false, blocked: null, children: null, labels: [], moreLabels: 0, firstRef: null,
    delegate: agent, queuedBy: null, cost: 0, overBudget: false, cardCap: null, costPct: null, dueAt: null, overdue: false,
    gatePending: false, questionFrom: null, lead: lead('working', null), mood: 'working', stateSince: `2026-10-0${n % 9 + 1}T00:00:00Z`, ageHours: 5,
    ...over,
  };
};

const stages = [
  { key: 'a', name: 'Plan', order: 0, count: 1, wipLimit: null, atLimit: false, blocked: 0, gate: false, manager: false, owner: { label: 'Sample agent', undeclared: false, declaredBy: [], caveat: '' }, empty: false },
] as never;

function props(over: Record<string, unknown> = {}) {
  n = 0;
  const summaries = [
    card('needs', { title: 'Review me', gatePending: true, lead: lead('review', 'Ready to ship.') }),
    card('needs', { title: 'Answer me', questionFrom: 'Sample agent', lead: lead('question', 'Which colour?') }),
    card('working', { title: 'Busy one', live: true }),
    card('queued', { title: 'Later one', delegate: null }),
    ...[1, 2, 3, 4, 5, 6].map((i) => card('done', { title: `Shipped ${i}`, stateSince: `2026-10-0${i}T00:00:00Z` })),
    card('closed', { title: 'Dropped one', archived: true }),
  ];
  return { summaries, stages, attention: [], phase: 'noon', vibe: 'quiet', boardName: 'Launch', cardCount: 11, onCompose: vi.fn(), ...over } as never;
}

describe('BoardQuiet', () => {
  it('has the board name, the count and a compose button', async () => {
    const p = props();
    render(BoardQuiet, p);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Launch');
    expect(screen.getByText('Superpipeline · 11 cards')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Write a new card' }));
    expect((p as { onCompose: ReturnType<typeof vi.fn> }).onCompose).toHaveBeenCalledOnce();
  });

  it('groups by urgency in order, with counts', () => {
    render(BoardQuiet, props());
    const h = screen.getAllByRole('heading', { level: 2 }).map((e) => e.textContent);
    expect(h).toEqual(['Needs your decision (2)', 'In progress (1)', 'Waiting to start (1)', 'Done (6)', 'Closed (1)', 'Stages']);
  });

  it('says None. for an empty group', () => {
    const p = props();
    (p as { summaries: unknown[] }).summaries = [];
    render(BoardQuiet, p);
    expect(screen.getAllByText('None.')).toHaveLength(5);
  });

  it('gives each item a title, a meta line, facts, an action and a move control', async () => {
    render(BoardQuiet, props());
    const busy = screen.getByRole('listitem', { name: /Busy one/ });
    expect(busy.textContent).toContain('Sample agent · Build · 5h');
    expect(busy.querySelector('.card-facts')!.getAttribute('data-tone')).toBe('text');
    expect(within(busy).getByText('Agent working')).toBeTruthy();
    expect(within(busy).getByRole('button', { name: /Move Busy one/ })).toBeTruthy();
    await fireEvent.click(within(busy).getByRole('button', { name: 'Open Busy one' }));
    expect(openCard).toHaveBeenCalledOnce();
    expect(screen.getByRole('listitem', { name: /Later one/ }).textContent).toContain('nobody · Build');
  });

  it('keeps the shared action names for a gate and a question, with plain visible words', async () => {
    render(BoardQuiet, props());
    const review = screen.getByRole('listitem', { name: /Review me/ });
    const decide = within(review).getByRole('button', { name: '⚑ Review' });
    expect(decide.textContent).toBe('Review');
    await fireEvent.click(decide);
    const ask = screen.getByRole('listitem', { name: /Answer me/ });
    const answer = within(ask).getByRole('button', { name: '⚑ Answer Sample agent' });
    expect(answer.textContent).toBe('Answer');
    await fireEvent.click(answer);
    expect(openCard).toHaveBeenCalledTimes(2);
    expect(within(review).getByRole('button', { name: openLabel({ title: 'Review me', stageName: 'Build' }) })).toBeTruthy();
  });

  it('every action’s accessible name contains its visible word (WCAG 2.5.3 label in name)', () => {
    render(BoardQuiet, props());
    const actions = screen.getAllByRole('button').filter((b) => b.getAttribute('aria-label') && !b.hasAttribute('data-card-open') && !/^Move /.test(b.getAttribute('aria-label')!));
    expect(actions.length).toBeGreaterThan(2);
    for (const b of actions) expect(b.getAttribute('aria-label')!.toLowerCase(), b.textContent!).toContain(b.textContent!.trim().toLowerCase());
  });

  it('marks needs-you items with a signal rule, and only those', () => {
    render(BoardQuiet, props());
    expect(screen.getByRole('listitem', { name: /Review me/ }).className).toContain('border-l-[5px]');
    // Only the left rule is signal; the item's bottom rule stays the line colour.
    expect(screen.getByRole('listitem', { name: /Review me/ }).className.split(/\s+/)).toContain('border-l-signal');
    expect(screen.getByRole('listitem', { name: /Review me/ }).className.split(/\s+/)).not.toContain('border-signal');
    expect(screen.getByRole('listitem', { name: /Busy one/ }).className).not.toContain('border-l-[5px]');
  });

  it('prints no agent name twice in one item, and draws no face', () => {
    render(BoardQuiet, props());
    const ask = screen.getByRole('listitem', { name: /Answer me/ });
    expect(ask.textContent!.split('Sample agent')).toHaveLength(2);
    expect(ask.querySelector('img, svg, [role="img"]')).toBeNull();
  });

  it('keeps the move control visible and its host positioned', () => {
    render(BoardQuiet, props());
    const a = screen.getByRole('listitem', { name: /Busy one/ });
    expect(within(a).getByRole('button', { name: /Move Busy one/ }).className).not.toContain('opacity-0');
    expect(a.className).toContain('relative');
  });

  it('shows archived closed cards and ends with the stages table', () => {
    render(BoardQuiet, props());
    expect(screen.getByRole('listitem', { name: /Dropped one/ }).textContent).toContain('archived');
    const t = screen.getByRole('table', { name: 'Stages' });
    expect(t.textContent).toContain('Plan');
    expect(screen.getByRole('heading', { level: 2, name: 'Stages' }).compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
