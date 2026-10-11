// @vitest-environment jsdom
/**
 * Quiet's card is one plain page (spec §5.2): a way back, the title, one meta line, the decision,
 * then every fact under its own heading in a fixed order. No disclosure is added by the layout.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import CardQuiet from './CardQuiet.svelte';
import { CARD_SECTION_KEYS, type CardCounts, type CardLayoutProps, type CardSections } from './types';
import type { CardLead } from '../card-lead';

const closeCard = vi.hoisted(() => vi.fn());
vi.mock('$lib/stores/app.svelte', () => ({ app: { closeCard } }));

afterEach(() => { cleanup(); closeCard.mockReset(); });

const sections = Object.fromEntries(
  CARD_SECTION_KEYS.map((k) => [k, createRawSnippet(() => ({ render: () => `<p>SECTION-${k}</p>` }))]),
) as unknown as CardSections;

const lead = (over: Partial<CardLead> = {}): CardLead => ({
  kind: 'stopped', needsYou: true, agentId: 'agt_r', sentence: 'Handoff refused twice.', source: 'needs-human', at: null, ...over,
});

const props = (l: CardLead, extra: Partial<CardLayoutProps> = {}): CardLayoutProps => ({
  card: { id: 'crd_1', title: 'Fix the thing', state: 'stopped' } as never,
  vibe: 'quiet', phase: 'noon', boardName: 'Board', personName: 'Pat',
  stages: [{ key: 'a', name: 'Todo' }, { key: 'b', name: 'Doing' }, { key: 'c', name: 'Done' }] as never,
  stageIndex: 1, stageName: 'Doing', ageHours: 3, lead: l,
  agent: { id: 'agt_r', name: 'Sample agent', iconUrl: null, mood: 'needs' },
  sections, counts: {} as never, editing: false, gate: null, question: null, ...extra,
});

const before = (a: string | Element, b: string | Element) => {
  const A = typeof a === 'string' ? screen.getByText(a) : a, B = typeof b === 'string' ? screen.getByText(b) : b;
  return !!(A.compareDocumentPosition(B) & Node.DOCUMENT_POSITION_FOLLOWING);
};
const h3 = (name: string) => screen.getByRole('heading', { level: 3, name });
const sectionOf = (name: string) => h3(name).closest('section')!;

describe('CardQuiet', () => {
  it('has a way back that closes the drawer, the title and the meta line', async () => {
    render(CardQuiet, props(lead()));
    await fireEvent.click(screen.getByRole('button', { name: '← Board board' }));
    expect(closeCard).toHaveBeenCalledOnce();
    const h = screen.getByRole('heading', { level: 2 });
    expect(h.id).toBe('drawer-title');
    expect(h.textContent).toBe('Fix the thing');
    expect(screen.getByText('Stage 2 of 3: Doing · Agent: Sample agent · stopped 3h ago')).toBeTruthy();
  });

  it('omits the age when it is unknown', () => {
    render(CardQuiet, props(lead(), { ageHours: null }));
    expect(screen.getByText('Stage 2 of 3: Doing · Agent: Sample agent · stopped')).toBeTruthy();
  });

  it('puts the error first, then the decision before every heading', () => {
    render(CardQuiet, props(lead()));
    expect(before('SECTION-error', 'Handoff refused twice.')).toBe(true);
    expect(before('Handoff refused twice.', h3('Details'))).toBe(true);
    expect(before('SECTION-resume', h3('Details'))).toBe(true);
  });

  it('wraps a stopped card in a fieldset around the lead and the resume snippet', () => {
    render(CardQuiet, props(lead()));
    const group = screen.getByRole('group', { name: 'Your decision is needed' });
    expect(group.tagName).toBe('FIELDSET');
    expect(group.contains(screen.getByText('Handoff refused twice.'))).toBe(true);
    expect(group.contains(screen.getByText('SECTION-resume'))).toBe(true);
  });

  it('has no fieldset when nothing needs you, but still shows the lead and resume once', () => {
    const { container } = render(CardQuiet, props(lead({ kind: 'working', needsYou: false })));
    expect(container.querySelector('fieldset')).toBeNull();
    expect(screen.getByText('Handoff refused twice.')).toBeTruthy();
    expect(screen.getAllByText('SECTION-resume')).toHaveLength(1);
  });

  it('has the headings in order, each holding its snippets', () => {
    render(CardQuiet, props(lead()));
    const order: [string, string[]][] = [
      ['Details', ['status', 'facts', 'details', 'editButton']],
      ['Description', ['description']],
      ['Acceptance criteria', ['criteria']],
      ['Plan', ['plan']],
      ['History', ['activity']],
      ['Decisions', ['decisions']],
      ['Comments', ['comments']],
      ['Links', ['links']],
      ['Sub-tasks', ['subtasks']],
      ['Project', ['project']],
      ['Handoff', ['handoff']],
      ['Cost', ['cost']],
      ['Attempts', ['attempts']],
      ['Delivery', ['delivery']],
      ['References', ['references']],
      ['Related prior work', ['related']],
      ['Card actions', ['cardActions']],
    ];
    order.forEach(([name, keys], i) => {
      keys.forEach((k) => expect(sectionOf(name).contains(screen.getByText(`SECTION-${k}`)), `${name}/${k}`).toBe(true));
      if (i > 0) expect(before(h3(order[i - 1][0]), h3(name)), name).toBe(true);
    });
  });

  it('keeps every section exactly once and adds no disclosure', () => {
    const { container } = render(CardQuiet, props(lead()));
    for (const k of CARD_SECTION_KEYS.filter((k) => k !== 'editForm')) expect(screen.getAllByText(`SECTION-${k}`), k).toHaveLength(1);
    expect(container.querySelector('details')).toBeNull();
  });

  it('shows the edit form while editing, the title kept for the dialog’s name but visually hidden', () => {
    render(CardQuiet, props(lead(), { editing: true }));
    expect(screen.getAllByText('SECTION-editForm')).toHaveLength(1);
    const h = screen.getByRole('heading', { level: 2 });
    expect(h.id).toBe('drawer-title');
    expect(h.classList.contains('sr-only')).toBe(true);
  });

  const EMPTY: CardCounts = { criteria: 0, planSteps: 0, specFields: 0, runs: 0, links: 0, children: 0, openChildren: 0, decisions: 0, refs: 0, attempts: 0, deliveryActive: false, description: false, handoff: false, cost: false };
  const FULL: CardCounts = { criteria: 2, planSteps: 3, specFields: 1, runs: 2, links: 1, children: 1, openChildren: 1, decisions: 1, refs: 1, attempts: 2, deliveryActive: true, description: true, handoff: true, cost: true };
  const SAYS_NONE = ['Description', 'Acceptance criteria', 'Plan', 'Decisions', 'Handoff', 'Cost', 'Attempts', 'Delivery'];

  it('says "None." under every heading whose section is empty, and keeps the heading', () => {
    render(CardQuiet, props(lead(), { counts: EMPTY }));
    for (const name of SAYS_NONE) expect(sectionOf(name).textContent, name).toContain('None.');
    // Sections that carry their own empty state or controls say nothing extra.
    for (const name of ['Details', 'History', 'Comments', 'Links', 'Sub-tasks', 'Project', 'References', 'Card actions']) expect(sectionOf(name).textContent, name).not.toContain('None.');
  });

  it('says nothing extra when the sections hold something', () => {
    const { container } = render(CardQuiet, props(lead(), { counts: FULL }));
    expect(container.textContent).not.toContain('None.');
  });

  it('counts a single attempt as one, not none', () => {
    render(CardQuiet, props(lead(), { counts: { ...EMPTY, attempts: 1 } }));
    expect(sectionOf('Attempts').textContent).toContain('One attempt.');
  });

  it('is one 640px column and leaves room for the close button', () => {
    const { container } = render(CardQuiet, props(lead()));
    expect(container.querySelector('.max-w-\\[640px\\]')).toBeTruthy();
    expect(container.querySelector('.pr-12, .pr-14')).toBeTruthy();
  });
});
