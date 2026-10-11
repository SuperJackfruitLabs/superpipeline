// @vitest-environment jsdom
/**
 * Paper's card is a letter from the agent (spec §5.2): the reply comes first, and the brief, the
 * history, the waiting work, the attachments and the correspondence are labelled enclosures.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import CardPaper from './CardPaper.svelte';
import { CARD_SECTION_KEYS, type CardCounts, type CardLayoutProps, type CardSections } from './types';
import type { CardLead } from '../card-lead';

afterEach(() => cleanup());

const sections = Object.fromEntries(
  CARD_SECTION_KEYS.map((k) => [k, createRawSnippet(() => ({ render: () => `<p>SECTION-${k}</p>` }))]),
) as unknown as CardSections;

const lead = (over: Partial<CardLead> = {}): CardLead => ({
  kind: 'stopped', needsYou: true, agentId: 'agt_r', sentence: 'Handoff refused twice.', source: 'needs-human', at: '2026-10-11T09:30:00Z', ...over,
});
const counts: CardCounts = { criteria: 3, planSteps: 2, specFields: 1, runs: 4, links: 2, children: 1, openChildren: 1, decisions: 0, refs: 5, attempts: 1, deliveryActive: false };

const props = (l: CardLead, extra: Partial<CardLayoutProps> = {}): CardLayoutProps => ({
  card: { id: 'crd_1', title: 'Fix the thing' } as never,
  vibe: 'paper', phase: 'noon', boardName: 'Board', personName: 'Pat',
  stages: [{ key: 'a', name: 'Todo' }] as never, stageIndex: 0, stageName: 'Todo', ageHours: null, lead: l,
  agent: { id: 'agt_r', name: 'Sample agent', iconUrl: null, mood: 'needs' },
  sections, counts, editing: false, gate: null, question: null, ...extra,
});

const before = (a: string | Element, b: string | Element) => {
  const A = typeof a === 'string' ? screen.getByText(a) : a, B = typeof b === 'string' ? screen.getByText(b) : b;
  return !!(A.compareDocumentPosition(B) & Node.DOCUMENT_POSITION_FOLLOWING);
};
const summary = (re: RegExp) => screen.getByText(re).closest('summary')!;
const detailsOf = (re: RegExp) => summary(re).parentElement as HTMLDetailsElement;

describe('CardPaper', () => {
  it('writes the letter in order: error, eyebrow, title, salutation, lead, signature, status, facts, reply', () => {
    render(CardPaper, props(lead()));
    const h = screen.getByRole('heading', { level: 2 });
    expect(h.id).toBe('drawer-title');
    expect(h.textContent).toBe('Re: Fix the thing');
    expect(screen.getByText('● A letter that needs a reply')).toBeTruthy();
    expect(before('SECTION-error', 'Dear Pat,')).toBe(true);
    expect(before('Dear Pat,', 'Handoff refused twice.')).toBe(true);
    expect(before('Handoff refused twice.', screen.getByText(/delegate/))).toBe(true);
    expect(before(screen.getByText(/delegate/), 'SECTION-status')).toBe(true);
    expect(before('SECTION-status', 'SECTION-facts')).toBe(true);
    expect(before('SECTION-facts', 'SECTION-resume')).toBe(true);
    expect(before('SECTION-resume', summary(/The brief/))).toBe(true);
    expect(screen.getByText(/Sample agent/, { selector: 'b' })).toBeTruthy();
    expect(screen.getByText(/delegate/).querySelector('time')).toBeTruthy();
    expect(screen.getByText(/in full daylight/)).toBeTruthy();
  });

  it('has the five enclosures with their counts', () => {
    render(CardPaper, props(lead()));
    expect(screen.getByText('The brief · 3 things to prove')).toBeTruthy();
    expect(screen.getByText('What happened · 4 runs')).toBeTruthy();
    expect(screen.getByText('Who is waiting · 3')).toBeTruthy();
    expect(screen.getByText('Attached · 5')).toBeTruthy();
    expect(screen.getByText('Correspondence')).toBeTruthy();
    expect(screen.getAllByText('Correspondence').length).toBe(1);
  });

  it('opens Correspondence always, the brief only when nothing needs you, Attached while delivering', () => {
    render(CardPaper, props(lead()));
    expect(detailsOf(/Correspondence/).open).toBe(true);
    expect(detailsOf(/The brief/).open).toBe(false);
    expect(detailsOf(/What happened/).open).toBe(false);
    expect(detailsOf(/Attached/).open).toBe(false);
    cleanup();
    render(CardPaper, props(lead({ kind: 'working', needsYou: false }), { counts: { ...counts, deliveryActive: true } }));
    expect(detailsOf(/The brief/).open).toBe(true);
    expect(detailsOf(/Attached/).open).toBe(true);
    expect(screen.queryByText('● A letter that needs a reply')).toBeNull();
  });

  it('keeps every section exactly once, and the edit and card actions last', () => {
    render(CardPaper, props(lead()));
    for (const k of CARD_SECTION_KEYS.filter((k) => k !== 'editForm')) expect(screen.getAllByText(`SECTION-${k}`)).toHaveLength(1);
    expect(screen.queryByText('SECTION-editForm')).toBeNull();
    expect(before('SECTION-comments', 'SECTION-editButton')).toBe(true);
    expect(before('SECTION-editButton', 'SECTION-cardActions')).toBe(true);
  });

  it('places each section in its enclosure', () => {
    render(CardPaper, props(lead()));
    const inside = (re: RegExp, keys: string[]) => keys.forEach((k) => expect(detailsOf(re).contains(screen.getByText(`SECTION-${k}`)), k).toBe(true));
    inside(/The brief/, ['description', 'criteria', 'plan', 'details', 'project']);
    inside(/What happened/, ['activity', 'decisions', 'handoff', 'attempts', 'cost']);
    inside(/Who is waiting/, ['links', 'subtasks']);
    inside(/Attached/, ['references', 'related', 'delivery']);
    inside(/Correspondence/, ['comments']);
  });

  it('swaps the title for the edit form while editing', () => {
    render(CardPaper, props(lead(), { editing: true }));
    expect(screen.getAllByText('SECTION-editForm')).toHaveLength(1);
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
  });

  it('leaves room for the close button', () => {
    const { container } = render(CardPaper, props(lead()));
    expect(container.querySelector('.pr-12, .pr-14')).toBeTruthy();
  });
});
