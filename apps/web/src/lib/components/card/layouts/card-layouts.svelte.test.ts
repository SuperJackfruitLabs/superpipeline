// @vitest-environment jsdom
/**
 * What every card layout owes the drawer, whatever the vibe: a dialog name that survives editing,
 * the agent's sentence said once even with a gate pending, and whole sentences when nobody holds
 * the card.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import { createRawSnippet, type Component } from 'svelte';
import CardDaylight from './CardDaylight.svelte';
import CardPaper from './CardPaper.svelte';
import CardQuiet from './CardQuiet.svelte';
import CardStudio from './CardStudio.svelte';
import { CARD_SECTION_KEYS, type CardCounts, type CardLayoutProps, type CardSections } from './types';
import type { CardLead } from '../card-lead';

vi.mock('$lib/stores/app.svelte', () => ({ app: { closeCard: vi.fn() } }));
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;

afterEach(() => cleanup());

const LAYOUTS = { daylight: CardDaylight, paper: CardPaper, studio: CardStudio, quiet: CardQuiet } as const satisfies Record<string, Component<any>>;
const VIBES = Object.keys(LAYOUTS) as (keyof typeof LAYOUTS)[];

const sections = Object.fromEntries(
  CARD_SECTION_KEYS.map((k) => [k, createRawSnippet(() => ({ render: () => `<p>SECTION-${k}</p>` }))]),
) as unknown as CardSections;
const counts: CardCounts = { criteria: 0, planSteps: 0, specFields: 0, runs: 0, links: 0, children: 0, openChildren: 0, decisions: 0, refs: 0, attempts: 0, deliveryActive: false, description: false, handoff: false, cost: false };
const lead = (over: Partial<CardLead> = {}): CardLead => ({
  kind: 'review', needsYou: true, agentId: 'agt_r', sentence: 'Draft ready to ship.', source: 'gate', at: null, ...over,
});
const gate = {
  boardId: 'brd_1',
  gate: { id: 'gat_1', cardId: 'crd_1', status: 'pending', options: [{ name: 'approve', title: 'Approve' }], stageKey: 'review', producedBy: 'agt_r', approvalSubject: null },
  error: null,
  onResponse: async () => true,
} as never;

const props = (vibe: keyof typeof LAYOUTS, extra: Partial<CardLayoutProps> = {}): CardLayoutProps => ({
  card: { id: 'crd_abcd1234', title: 'Fix the thing', attemptCount: 1, state: 'queued', costUsd: 0, delegateAgentId: 'agt_r' } as never,
  vibe, phase: 'noon', boardName: 'Board', personName: 'Pat',
  stages: [{ key: 'a', name: 'Todo' }, { key: 'b', name: 'Doing' }] as never,
  stageIndex: 0, stageName: 'Todo', ageHours: null, lead: lead(),
  agent: { id: 'agt_r', name: 'Sample agent', iconUrl: null, mood: 'needs' },
  sections, counts, editing: false, gate: null, question: null, ...extra,
});

describe.each(VIBES)('%s card layout', (vibe) => {
  const C = LAYOUTS[vibe];

  it('keeps the dialog’s title in the page while editing, beside the edit form', () => {
    render(C, props(vibe, { editing: true }));
    const title = document.getElementById('drawer-title');
    expect(title).not.toBeNull();
    expect(title!.textContent).toContain('Fix the thing');
    expect(screen.getByText('SECTION-editForm')).toBeTruthy();
  });

  it('says the agent’s sentence once when a gate is pending', () => {
    const { container } = render(C, props(vibe, { gate }));
    expect(container.textContent!.split('Draft ready to ship.')).toHaveLength(2);
  });

  it('says a pending question once', () => {
    const q = 'Shall I run the tests?';
    const elicitation = { id: 'eli_1', agentId: 'agt_r', question: q, signal: 'question', options: [{ name: 'go', title: 'Go' }], createdAt: '2026-10-11T00:00:00Z' } as never;
    const question = { model: {}, elicitation, agent: { id: 'agt_r', name: 'Sample agent', iconUrl: null, mood: 'needs' } } as never;
    const { container } = render(C, props(vibe, { question, lead: lead({ kind: 'question', sentence: q, source: 'question' }) }));
    expect(container.textContent!.split(q)).toHaveLength(2);
  });

  it('writes whole sentences when nobody holds the card', () => {
    const { container } = render(C, props(vibe, {
      card: { id: 'crd_abcd1234', title: 'Fix the thing', attemptCount: 1, state: 'queued', costUsd: 0, delegateAgentId: null } as never,
      agent: { id: null, name: '', iconUrl: null, mood: 'resting' },
      lead: lead({ kind: 'idle', needsYou: false, agentId: null, sentence: null, source: 'none' }),
    }));
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/What\s+was asked|Agent:\s+·|·\s*delegate|\*\*/);
    for (const el of container.querySelectorAll('b, strong')) expect(el.textContent!.trim()).not.toBe('');
    expect(text).toMatch(/nobody|the agent/i);
  });

  it('names the agent, without calling it the delegate, when it produced the gate but holds nothing', () => {
    const { container } = render(C, props(vibe, {
      card: { id: 'crd_abcd1234', title: 'Fix the thing', attemptCount: 1, state: 'queued', costUsd: 0, delegateAgentId: null } as never,
      gate,
    }));
    expect(container.textContent).toContain('Sample agent');
    expect(container.textContent).not.toMatch(/· delegate/);
  });
});

describe('Studio’s readout', () => {
  it('says who and that a decision is needed, then the sentence', () => {
    render(CardStudio, props('studio', { gate }));
    const readout = document.querySelector('.readout')!;
    expect(readout.textContent!.replace(/\s+/g, ' ')).toMatch(/Sample agent · needs decision/i);
    expect(readout.textContent).toContain('Draft ready to ship.');
  });
  it('says the state when nothing is needed', () => {
    render(CardStudio, props('studio', { lead: lead({ kind: 'working', needsYou: false }), card: { id: 'crd_abcd1234', title: 'T', attemptCount: 1, state: 'working', costUsd: 0, delegateAgentId: 'agt_r' } as never }));
    expect(document.querySelector('.readout')!.textContent!.replace(/\s+/g, ' ')).toMatch(/Sample agent · working/i);
  });
});
