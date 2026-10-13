// apps/web/src/lib/components/board/studio/studio-prose.test.ts
import { describe, expect, it } from 'vitest';
import { DX, DX_IDS, ONBOARDING, boardCtx } from '$lib/test/fixture-boards';
import { buildBoardModel } from '../board-model';
import {
  heroH1, heroSentence, multiples, multiplesAria, noteText, panelAction, panelHeading, panelText, quickFilters,
  rampAria, rowAgent, rowState, shareBar, studioFigures, studioNotes,
} from './studio-prose';

const m = buildBoardModel(DX, DX.cards, boardCtx());
const by = (id: string) => m.ordered.find((s) => s.id === id)!;
const names = m.stages.map((s) => s.name);

describe('the hero', () => {
  it('h1', () => {
    expect(heroH1(m)).toEqual({ sr: '4 ', text: 'of 7 cards are waiting on a person' });
    expect(heroH1(buildBoardModel(ONBOARDING, ONBOARDING.cards, boardCtx()))).toEqual({ sr: null, text: 'None of the 20 cards is waiting on a person' });
  });
  it('the footnoted sentence (corrected clause 2)', () => {
    expect(heroSentence(m)).toEqual([
      { text: 'One sits in a stage nobody works and is five days overdue;', fn: 1 },
      { text: ' one stopped in Failing test on its first try;', fn: 2 },
      { text: ' one stopped in Fix after five tries;', fn: 3 },
      { text: ' one stopped in Reproduce after two tries.', fn: 4 },
      { text: ' Two more are queued behind a blocker,', fn: 5 },
      { text: ' and one has shipped.', fn: 6 },
    ]);
  });
});

describe('figures, multiples, share bar', () => {
  it('01 the board in figures', () => {
    expect(studioFigures(m)).toEqual([
      { value: '7', label: 'Cards', sig: false, zero: false, fn: null },
      { value: '4', label: 'Need you', sig: true, zero: false, fn: null },
      { value: '0', label: 'Working', sig: false, zero: true, fn: null },
      { value: '$0.00', label: 'Spend this week', sig: false, zero: true, fn: 7 },
      { value: '0', label: 'Over budget', sig: false, zero: true, fn: null },
      { value: '1', label: 'Overdue', sig: false, zero: false, fn: null },
    ]);
  });
  it('02 the seven aria labels, verbatim', () => {
    expect(m.stages.map(multiplesAria)).toEqual([
      'Stage 1, Reported: 1 card, waiting on you. Worked by a person',
      'Stage 2, Reproduce: 1 card, waiting on you. Worked by error-eric',
      'Stage 3, Failing test: 3 cards, 1 waiting on you, 2 blocked. Worked by tester-tim',
      'Stage 4, Fix: 1 card, waiting on you. Code, 2 agents',
      'Stage 5, Integrate: 0 cards. Integration or api or testing, 3 agents',
      'Stage 6, Signed off: 0 cards. Approval gate, a person',
      'Stage 7, Shipped: 1 card, done. A person',
    ]);
  });
  it('02 notes, bands and gates', () => {
    const mul = multiples(m);
    expect(mul.map((x) => x.note)).toEqual([
      { text: 'Overdue since 6 Oct', fn: 1 },
      { text: 'Stopped after 2 tries', fn: 4 },
      { text: '2 blocked, 1 stopped', fn: 2 },
      { text: 'Stopped after 5 tries', fn: 3 },
      { text: 'Empty', fn: null },
      { text: 'Empty', fn: null },
      { text: 'Done', fn: 6 },
    ]);
    expect(mul.map((x) => x.band)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7']);
    expect(mul.map((x) => x.gate)).toEqual([null, null, null, null, null, 'Gate · approval', null]);
    expect(mul.map((x) => x.zero)).toEqual([false, false, false, false, true, true, false]);
    expect(mul[2]!.units).toEqual(['needs', 'blocked', 'blocked']);
  });
  it('03 the share bar', () => {
    expect(shareBar(m)).toEqual({
      cols: '4fr 2fr 1fr',
      aria: '4 waiting on you, 2 queued and blocked, 1 done',
      parts: [
        { n: 4, label: 'waiting on you', signal: true, bar: 'needs' },
        { n: 2, label: 'queued, blocked', signal: false, bar: 'blocked' },
        { n: 1, label: 'done', signal: false, bar: 'done' },
      ],
    });
  });
});

describe('the table', () => {
  it('ramp labels say stopped only for a stopped needs card', () => {
    expect(rampAria(by(DX_IDS.c63ac), names)).toBe('Stage 1 of 7: Reported. Stages: Reported, Reproduce, Failing test, Fix, Integrate, Signed off, Shipped');
    expect(rampAria(by(DX_IDS.c58f8), names)).toBe('Stage 3 of 7: Failing test, stopped. Stages: Reported, Reproduce, Failing test, Fix, Integrate, Signed off, Shipped');
    expect(rampAria(by(DX_IDS.cf83f), names)).toBe('Stage 3 of 7: Failing test. Stages: Reported, Reproduce, Failing test, Fix, Integrate, Signed off, Shipped');
  });
  it('state and agent cells', () => {
    expect(m.ordered.map((s) => rowState(s).label)).toEqual(['Waiting on you', 'Waiting on you', 'Waiting on you', 'Waiting on you', 'Queued · blocked', 'Queued · blocked', 'Done']);
    expect(rowAgent(by(DX_IDS.c63ac))).toEqual({ kind: 'person', name: 'Rakesh Gangwar', initials: 'RG', text: 'You', me: true });
    expect(rowAgent(by(DX_IDS.c1dfc))).toEqual({ kind: 'agent', name: 'coder-kai', mood: 'needs' });
    expect(rowAgent(by(DX_IDS.cf83f))).toEqual({ kind: 'text', text: 'Unclaimed' });
    expect(rowAgent(by(DX_IDS.c9ed9))).toEqual({ kind: 'text', text: 'Shipped' });
  });
  it('quick filter counts', () => {
    expect(quickFilters(m)).toEqual([
      { key: 'all', label: 'All', n: 7, sig: false },
      { key: 'needs', label: 'Need you', n: 4, sig: true },
      { key: 'working', label: 'Working', n: 0, sig: false },
      { key: 'queued', label: 'Queued', n: 2, sig: false },
      { key: 'done', label: 'Done', n: 1, sig: false },
    ]);
  });
});

describe('notes and the panel', () => {
  it('notes 1–7, as the reference prints them', () => {
    expect(studioNotes(m).map((x) => [x.n, noteText(x.parts)])).toEqual([
      [1, 'Card 01 is yours, in Reported. It was due on <i>6 October</i>. No agent works this stage and no review is asked for here, so it will sit until it is moved.'],
      [2, 'Card 02 stopped on tester-tim’s first try, 33 hours ago: it needs a writable Forge URL for agentpod.'],
      [3, 'Card 03 stopped in Fix after five tries: missing commit ×2.'],
      [4, 'Card 04 stopped in Reproduce after two tries: no fresh DM event to trace; needs one per agent.'],
      [5, 'Cards 05 and 06 are queued in Failing test behind another card. Nobody has claimed them; each starts on its own when unblocked.'],
      [6, 'Shipped, nothing to do: <i>Build immutable approval subjects and digest-bound gates.</i>'],
      [7, 'No card has spent anything yet: every card’s cost reads <i>—</i>.'],
    ]);
  });
  it('panel heading', () => {
    expect(panelHeading(4)).toEqual({ kick: 'Needs you now · 4', h2: 'Four cards are waiting for a decision', p: 'Each one says what it needs. Answer here, or open the card for the whole story.' });
    expect(panelHeading(1).h2).toBe('One card is waiting for a decision');
    expect(panelHeading(0)).toEqual({ kick: 'Needs you now · 0', h2: 'Nothing is waiting for a decision', p: null });
  });
  it('panel text and actions', () => {
    expect(m.needs.map(panelText)).toEqual([
      'No agent works this stage and no review is asked for here, so it will sit forever. Move it to a stage someone works.',
      'Stopped. Needs a writable Forge URL for agentpod.',
      'Stopped. Missing commit ×2.',
      'Stopped. No fresh DM event to trace; needs one per agent.',
    ]);
    expect(m.needs.map((s) => panelAction(s).label)).toEqual(['Move it', 'Read why and resume', 'Read why and resume', 'Read why and resume']);
  });
});
