// @vitest-environment jsdom
/**
 * Daylight's card is a conversation (spec §5.2): the agent's words come first, the brief is a
 * labelled disclosure, and every section is still there exactly once.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import CardDaylight from './CardDaylight.svelte';
import { CARD_SECTION_KEYS, type CardLayoutProps, type CardSections } from './types';
import type { CardLead } from '../card-lead';

afterEach(() => cleanup());

const sections = Object.fromEntries(
  CARD_SECTION_KEYS.map((k) => [k, createRawSnippet(() => ({ render: () => `<p>SECTION-${k}</p>` }))]),
) as unknown as CardSections;

const lead = (over: Partial<CardLead> = {}): CardLead => ({
  kind: 'stopped', needsYou: true, agentId: 'agt_r', sentence: 'Handoff refused twice.', source: 'needs-human', at: null, ...over,
});

const props = (l: CardLead, extra: Partial<CardLayoutProps> = {}): CardLayoutProps => ({
  card: { id: 'crd_1', title: 'Fix the thing' } as never,
  vibe: 'daylight', phase: 'noon', boardName: 'Board', personName: 'Pat',
  stages: [{ key: 'a', name: 'Todo' }, { key: 'b', name: 'Doing' }, { key: 'c', name: 'Done' }] as never,
  stageIndex: 1, stageName: 'Doing', ageHours: null, lead: l,
  agent: { id: 'agt_r', name: 'Sample agent', iconUrl: null, mood: 'needs' },
  sections, counts: {} as never, editing: false, gate: null, question: null, ...extra,
});

const before = (a: string, b: string) => {
  const A = screen.getByText(a), B = screen.getByText(b);
  return !!(A.compareDocumentPosition(B) & Node.DOCUMENT_POSITION_FOLLOWING);
};

describe('CardDaylight', () => {
  it('has the title, a labelled stage track, status and facts in the header', () => {
    render(CardDaylight, props(lead()));
    const h = screen.getByRole('heading', { level: 2, name: 'Fix the thing' });
    expect(h.id).toBe('drawer-title');
    expect(screen.getByRole('list', { name: 'Stages' })).toBeTruthy();
    expect(screen.getByText('SECTION-status')).toBeTruthy();
    expect(screen.getByText('SECTION-facts')).toBeTruthy();
  });

  it('puts the agent before the resume control and folds the brief when it needs you', () => {
    render(CardDaylight, props(lead()));
    expect(screen.getByText('Sample agent · needs you')).toBeTruthy();
    expect(screen.getByText('Handoff refused twice.')).toBeTruthy();
    expect(before('Sample agent · needs you', 'SECTION-resume')).toBe(true);
    expect(before('Handoff refused twice.', 'SECTION-resume')).toBe(true);
    const brief = screen.getByRole('button', { name: /What Sample agent was asked/ });
    expect(brief.getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById(brief.getAttribute('aria-controls')!)!.hidden).toBe(true);
  });

  it('opens the brief and labels the bubble with just the name while the agent works', () => {
    render(CardDaylight, props(lead({ kind: 'working', needsYou: false, sentence: 'On it.' })));
    expect(screen.getByRole('button', { name: /What Sample agent was asked/ }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Sample agent')).toBeTruthy();
    expect(screen.queryByText(/needs you/)).toBeNull();
  });

  it('puts the error first in the body', () => {
    render(CardDaylight, props(lead()));
    const brief = screen.getByRole('button', { name: /What Sample agent was asked/ });
    expect(screen.getByText('SECTION-error').compareDocumentPosition(brief) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders every section exactly once', () => {
    render(CardDaylight, props(lead()));
    for (const k of CARD_SECTION_KEYS.filter((k) => k !== 'editForm')) expect(screen.getAllByText(`SECTION-${k}`)).toHaveLength(1);
    expect(screen.queryByText('SECTION-editForm')).toBeNull();
  });

  it('swaps the header for the edit form while editing', () => {
    render(CardDaylight, props(lead(), { editing: true }));
    expect(screen.getAllByText('SECTION-editForm')).toHaveLength(1);
    expect(screen.queryByText('SECTION-editButton')).toBeNull();
  });
});
