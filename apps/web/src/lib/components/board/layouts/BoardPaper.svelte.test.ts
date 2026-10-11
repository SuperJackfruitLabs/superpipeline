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

import BoardPaper from './BoardPaper.svelte';
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
  return { summaries, stages, attention: [], phase: 'noon', vibe: 'paper', boardName: 'Launch', cardCount: 11, onCompose: vi.fn(), ...over } as never;
}

describe('BoardPaper', () => {
  it('has a masthead with the board, the light and the count', () => {
    render(BoardPaper, props());
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Launch');
    expect(document.body.textContent).toContain('in full daylight');
    expect(screen.getByText('Superpipeline · 11 cards')).toBeTruthy();
  });

  it('puts letters first: the lead in quotes, who, how long, and the tile action', async () => {
    render(BoardPaper, props());
    expect(screen.getByRole('heading', { level: 2, name: /Waiting on you · 2 letters/ })).toBeTruthy();
    const review = screen.getByRole('article', { name: /Review me/ });
    expect(within(review).getByText('“Ready to ship.”')).toBeTruthy();
    expect(within(review).getByText(/^Sample agent$/)).toBeTruthy();
    expect(within(review).getByText('5h')).toBeTruthy();
    const open = within(review).getByRole('button', { name: openLabel({ title: 'Review me', stageName: 'Build' }) });
    await fireEvent.click(open);
    await fireEvent.click(within(review).getByRole('button', { name: '⚑ Review' }));
    expect(openCard).toHaveBeenCalledTimes(2);
    const ask = screen.getByRole('article', { name: /Answer me/ });
    expect(within(ask).getByRole('button', { name: '⚑ Answer Sample agent' })).toBeTruthy();
    expect(within(ask).getByRole('button', { name: /Move Answer me to another stage/ })).toBeTruthy();
  });

  it('says so when nothing waits', () => {
    const p = props();
    (p as { summaries: unknown[] }).summaries = [];
    render(BoardPaper, p);
    expect(screen.getByText('Nothing waits on you.')).toBeTruthy();
    expect(screen.getByText('Nothing in progress.')).toBeTruthy();
    expect(screen.getByText('Nothing coming up.')).toBeTruthy();
  });

  it('lists in progress and coming up with facts, stage, agent and the move control', () => {
    render(BoardPaper, props());
    for (const [heading, title, agentName] of [['In progress', 'Busy one', 'Sample agent'], ['Coming up', 'Later one', 'nobody']]) {
      expect(screen.getByRole('heading', { level: 2, name: heading })).toBeTruthy();
      const a = screen.getByRole('article', { name: new RegExp(title) });
      expect(within(a).getByText(agentName, { selector: 'em' })).toBeTruthy();
      expect(a.textContent).toContain('Build');
      expect(a.querySelector('.card-facts')).toBeTruthy();
      expect(within(a).getByRole('button', { name: new RegExp(`Move ${title}`) })).toBeTruthy();
    }
    expect(within(screen.getByRole('article', { name: /Busy one/ })).getByText('Agent working')).toBeTruthy();
  });

  it('keeps the move control visible, not hover-only, and its host positioned', () => {
    render(BoardPaper, props());
    const a = screen.getByRole('article', { name: /Busy one/ });
    const btn = within(a).getByRole('button', { name: /Move Busy one/ });
    expect(btn.className).not.toContain('opacity-0');
    expect(a.className).toContain('relative');
  });

  it('shows five shipped, the rest and the closed behind labelled disclosures', () => {
    render(BoardPaper, props());
    const shipped = screen.getByRole('heading', { level: 2, name: 'Shipped' }).closest('section')!;
    const details = shipped.querySelectorAll('details');
    expect(details).toHaveLength(2);
    const [rest, closed] = [...details];
    expect(rest.querySelector('summary')!.textContent).toBe('Show all 6 shipped');
    expect(closed.querySelector('summary')!.textContent).toBe('Show 1 closed');
    // five outside the disclosure, the oldest inside it
    const outside = [...shipped.querySelectorAll('article')].filter((a) => !a.closest('details')).map((a) => a.querySelector('h3')!.textContent);
    expect(outside.filter((t) => t!.startsWith('Shipped'))).toEqual(['Shipped 6', 'Shipped 5', 'Shipped 4', 'Shipped 3', 'Shipped 2']);
    expect(rest.querySelector('article')!.textContent).toContain('Shipped 1');
    expect(closed.querySelector('article')!.textContent).toContain('Dropped one');
    expect(closed.querySelector('article')!.textContent).toContain('archived');
  });

  it('omits the disclosures when there is nothing extra', () => {
    const p = props();
    (p as { summaries: unknown[] }).summaries = (p as { summaries: Array<{ urgency: string; title: string }> }).summaries.filter((s) => s.urgency !== 'closed' && s.title !== 'Shipped 1');
    render(BoardPaper, p);
    expect(document.querySelector('details')).toBeNull();
  });

  it('ends with the pipeline and a way to write a card', async () => {
    const p = props();
    render(BoardPaper, p);
    expect(screen.getByRole('heading', { level: 2, name: 'The pipeline' })).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Stages' }).textContent).toContain('Plan');
    await fireEvent.click(screen.getByRole('button', { name: 'Write a new card' }));
    expect((p as { onCompose: ReturnType<typeof vi.fn> }).onCompose).toHaveBeenCalledOnce();
  });

  it('says the light for each phase', () => {
    render(BoardPaper, props({ phase: 'night' }));
    expect(document.body.textContent).toContain('in lamplight');
  });
});
