// @vitest-environment jsdom
/**
 * Studio's card is a dashboard (spec §5.2): a header with the numbers and the stage track, a
 * readout of what the agent needs, Spec/Log/Links/Talk/Cost tabs, and a command bar that stays in
 * view at the end of the scrolling body.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import CardStudio from './CardStudio.svelte';
import { CARD_SECTION_KEYS, type CardCounts, type CardLayoutProps, type CardSections } from './types';
import type { CardLead } from '../card-lead';

// jsdom has no ResizeObserver; the body pads by the bars' measured height with one.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;

afterEach(() => cleanup());

const sections = Object.fromEntries(
  CARD_SECTION_KEYS.map((k) => [k, createRawSnippet(() => ({ render: () => `<p>SECTION-${k}</p>` }))]),
) as unknown as CardSections;

const lead = (over: Partial<CardLead> = {}): CardLead => ({
  kind: 'stopped', needsYou: true, agentId: 'agt_r', sentence: 'Handoff refused twice.', source: 'needs-human', at: '2026-10-11T09:30:00Z', ...over,
});
const counts: CardCounts = { criteria: 3, planSteps: 2, specFields: 1, runs: 4, links: 2, children: 3, openChildren: 1, decisions: 0, refs: 5, attempts: 1, deliveryActive: false };

const props = (extra: Partial<CardLayoutProps> = {}): CardLayoutProps => ({
  card: { id: 'crd_abcd1234', title: 'Fix the thing', attemptCount: 2, state: 'stuck', costUsd: 1.5 } as never,
  vibe: 'studio', phase: 'noon', boardName: 'Board', personName: 'Pat',
  stages: [{ key: 'a', name: 'Todo' }, { key: 'b', name: 'Doing' }, { key: 'c', name: 'Done' }] as never, stageIndex: 1, stageName: 'Doing', ageHours: 3, lead: lead(),
  agent: { id: 'agt_r', name: 'Sample agent', iconUrl: null, mood: 'needs' },
  sections, counts, editing: false, gate: null, question: null, ...extra,
});

const before = (a: string | Element, b: string | Element) => {
  const A = typeof a === 'string' ? screen.getByText(a) : a, B = typeof b === 'string' ? screen.getByText(b) : b;
  return !!(A.compareDocumentPosition(B) & Node.DOCUMENT_POSITION_FOLLOWING);
};
const panel = (name: string) => document.getElementById(screen.getByRole('tab', { name }).getAttribute('aria-controls')!)!;
const inside = (tab: string, keys: string[]) => keys.forEach((k) => expect(panel(tab).contains(screen.getByText(`SECTION-${k}`)), k).toBe(true));

describe('CardStudio', () => {
  it('has the header bar, the title and the readout', () => {
    render(CardStudio, props());
    expect(screen.getByText('‹ Board / 1234')).toBeTruthy();
    expect(screen.getByText(/^\d\d:\d\d FULL DAYLIGHT|^\d\d:\d\d .+/).textContent).toMatch(/^\d\d:\d\d \S/);
    const h = screen.getByRole('heading', { level: 2 });
    expect(h.id).toBe('drawer-title');
    expect(h.textContent).toBe('Fix the thing');
    const readout = document.querySelector('.readout')!;
    expect(readout.textContent).toContain('Sample agent');
    expect(readout.textContent).toContain('Handoff refused twice.');
  });

  it('shows the six numbers', () => {
    render(CardStudio, props());
    const tiles = [...document.querySelectorAll('[aria-label="Card numbers"] > *')].map((e) => e.textContent!.replace(/\s+/g, ' ').trim());
    expect(tiles).toEqual(['stage 2/3', 'attempts 2', 'stuck for 3h', 'cost $1.50', 'blocks 2', 'sub-tasks 1/3']);
  });

  it('draws the stage track', () => {
    render(CardStudio, props());
    expect(screen.getByLabelText('Stages')).toBeTruthy();
  });

  it('has five tabs with their counts, Spec first', () => {
    render(CardStudio, props());
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Spec', 'Log 4', 'Links 10', 'Talk', 'Cost']);
    expect(screen.getByRole('tab', { name: 'Spec' }).getAttribute('aria-selected')).toBe('true');
  });

  it('puts each section in its tab', () => {
    render(CardStudio, props());
    inside('Spec', ['description', 'criteria', 'plan', 'details', 'project', 'facts']);
    inside('Log 4', ['activity', 'decisions', 'handoff', 'attempts']);
    inside('Links 10', ['links', 'subtasks', 'references', 'related']);
    inside('Talk', ['comments']);
    inside('Cost', ['cost', 'delivery']);
  });

  it('keeps every section in the DOM exactly once, hidden or not', () => {
    render(CardStudio, props());
    for (const k of CARD_SECTION_KEYS.filter((k) => k !== 'editForm')) expect(screen.getAllByText(`SECTION-${k}`)).toHaveLength(1);
    expect(panel('Cost').hidden).toBe(true);
  });

  it('puts the status row and the edit button above the tabs, and the card actions after them', () => {
    render(CardStudio, props());
    const tablist = screen.getByRole('tablist');
    expect(before('SECTION-status', tablist)).toBe(true);
    expect(before('SECTION-editButton', tablist)).toBe(true);
    expect(before(panel('Cost'), 'SECTION-cardActions')).toBe(true);
  });

  it('puts the error first in the body and the resume bar last', () => {
    render(CardStudio, props());
    expect(before('SECTION-error', screen.getByRole('tablist'))).toBe(true);
    expect(before('SECTION-cardActions', 'SECTION-resume')).toBe(true);
  });

  it('puts the question command bar after the tabs and the actions', () => {
    const question = { model: { text: '', error: null, answering: false, send: () => {} }, elicitation: { id: 'eli_1', agentId: 'agt_r', question: 'Run?', signal: 'question', options: [{ name: 'y', title: 'Yes' }] }, agent: { id: 'agt_r', name: 'Sample agent', iconUrl: null, mood: 'needs' } } as never;
    const { container } = render(CardStudio, props({ question }));
    const bar = container.querySelector('.command-bar')!;
    expect(bar.compareDocumentPosition(screen.getByText('SECTION-cardActions')) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(bar.compareDocumentPosition(screen.getByText('SECTION-resume')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('the command bar has no overflow or transform ancestor between it and the scrolling body', () => {
    const question = { model: { text: '', error: null, answering: false, send: () => {} }, elicitation: { id: 'eli_1', agentId: 'agt_r', question: 'Run?', signal: 'question', options: [{ name: 'y', title: 'Yes' }] }, agent: { id: 'agt_r', name: 'Sample agent', iconUrl: null, mood: 'needs' } } as never;
    const { container } = render(CardStudio, props({ question }));
    const scroller = container.querySelector('.overflow-y-auto.flex-1')!;
    for (let e = container.querySelector('.command-bar')!.parentElement; e && e !== scroller; e = e.parentElement) {
      expect(e.className, e.tagName).not.toMatch(/\boverflow|\btransform|\btranslate/);
    }
    expect(scroller.contains(container.querySelector('.command-bar'))).toBe(true);
    expect((scroller as HTMLElement).style.scrollPaddingBottom).toMatch(/^\d+px$/);
  });

  it('swaps the title for the edit form while editing', async () => {
    render(CardStudio, props({ editing: true }));
    expect(screen.getAllByText('SECTION-editForm')).toHaveLength(1);
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
  });

  it('caps the header so a long reason cannot push the body off a phone', () => {
    const { container } = render(CardStudio, props());
    const head = container.querySelector('[aria-label="Card summary"]')!;
    expect(head.className).toMatch(/max-h-\[40dvh\]/);
    expect(head.className).toMatch(/overflow-y-auto/);
    expect(head.getAttribute('tabindex')).toBe('0');
  });

  it('leaves room for the close button', () => {
    const { container } = render(CardStudio, props());
    expect(container.querySelector('.pr-12, .pr-14')).toBeTruthy();
  });

  it('switches tabs', async () => {
    render(CardStudio, props());
    await fireEvent.click(screen.getByRole('tab', { name: 'Talk' }));
    expect(panel('Talk').hidden).toBe(false);
    expect(panel('Spec').hidden).toBe(true);
  });
});

describe('CardStudio gate and question frames', () => {
  const gate = { boardId: 'b', gate: { id: 'gat_1', cardId: 'c', status: 'pending', options: [], approvalSubject: { id: 'sub_1', digest: 'sha256:3f9ac21e77aa', schema: 's', revision: 4, canonical: { post: 'Hello' } } }, error: null, onResponse: async () => true } as never;
  it('shows the heading, lead and approval subject above the tabs, and only the bar after them', () => {
    const { container } = render(CardStudio, props({ gate }));
    const tablist = screen.getByRole('tablist');
    for (const t of [screen.getByText(/awaiting your review/), screen.getByText(/Immutable approval subject/), screen.getByRole('region', { name: /canonical JSON/ })]) {
      expect(!!(t.compareDocumentPosition(tablist) & Node.DOCUMENT_POSITION_FOLLOWING), t.textContent!).toBe(true);
    }
    const bar = container.querySelector('.command-bar')!;
    expect(!!(tablist.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(bar.contains(screen.getByRole('button', { name: 'Approve' }))).toBe(true);
    expect(container.querySelector('.command-bar')!.parentElement!.contains(screen.getByText('SECTION-resume'))).toBe(true);
  });
  it('shows the question above the tabs', () => {
    const question = { model: { text: '', error: null, answering: false, send: () => {} }, elicitation: { id: 'eli_1', agentId: 'agt_r', question: 'Shall I run the tests?', signal: 'question', options: [{ name: 'y', title: 'Yes' }] }, agent: { id: 'agt_r', name: 'Sample agent', iconUrl: null, mood: 'needs' } } as never;
    render(CardStudio, props({ question }));
    expect(!!(screen.getByText('Shall I run the tests?').compareDocumentPosition(screen.getByRole('tablist')) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });
  it('in the resume state the bar caps its height and scrolls on its own', () => {
    const { container } = render(CardStudio, props());
    const bar = container.querySelector('.resume-bar')!;
    expect(bar.className).toMatch(/max-h-\[35dvh\]/);
    expect(bar.className).toMatch(/overflow-y-auto/);
    expect(bar.parentElement!.className).toMatch(/\bsticky\b/);
    expect(bar.contains(screen.getByText('SECTION-resume'))).toBe(true);
  });
});
