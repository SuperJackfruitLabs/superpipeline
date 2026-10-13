// apps/web/src/lib/components/board/board-words.test.ts
import { describe, expect, it } from 'vitest';
import { DX, DX_IDS, ME, NOW_MS, ONBOARDING, RELEASES, boardCtx } from '$lib/test/fixture-boards';
import { buildBoardModel } from './board-model';
import { emptyHint, emptyLedeHtml, emptyTags, emptyWho } from './board-words';
import { paperBy, paperFacts, paperKicker, paperQuote, paperReply, paperSection, pipelineParts } from './board-words';
import { quietAction, quietBlocks, quietFacts, quietLede, quietMeta, quietStageRow, quietSub } from './board-words';
import { daysOverdue, dlCols, dueLong, dueShort, greetingLine, needsAction, peekEyebrow, personInitials, stripLabel, stripOwner, tileAction, tileWho } from './board-words';

const m = buildBoardModel(DX, DX.cards, boardCtx());
const by = (id: string) => m.cards.find((s) => s.id === id)!;
const stage = (key: string) => m.stages.find((s) => s.key === key)!;

describe('dates', () => {
  it('prints due dates the way the boards do', () => {
    expect(dueShort('2026-10-06')).toBe('6 Oct');
    expect(dueLong('2026-10-06')).toBe('6 October');
    expect(dueLong('2026-10-05')).toBe('5 October');
  });
  it('counts whole days overdue', () => expect(daysOverdue('2026-10-06', NOW_MS)).toBe(5));
});

describe('Daylight words', () => {
  it('greets with the needs count', () => {
    expect(greetingLine('noon', 'Rakesh', 4)).toBe('Good afternoon, Rakesh. 4 cards want you.');
    expect(greetingLine('noon', 'Rakesh', 1)).toBe('Good afternoon, Rakesh. 1 card wants you.');
    expect(greetingLine('noon', 'Rakesh', 0)).toBe('Good afternoon, Rakesh. Nothing needs you.');
  });
  it('omits the name when none is known', () => {
    expect(greetingLine('noon', '', 0)).toBe('Good afternoon. Nothing needs you.');
  });
  it('initials are the first letters of the first two words', () => {
    expect(personInitials('Rakesh Gangwar')).toBe('RG');
    expect(personInitials('sam')).toBe('S');
  });
  it('the peek eyebrow', () => expect(peekEyebrow(by(DX_IDS.c58f8))).toBe('Peek · Failing test · 33h in this stage'));
  it('who is on each tile', () => {
    expect(tileWho(by(DX_IDS.c63ac))).toEqual({ kind: 'person', name: 'Rakesh Gangwar', initials: 'RG', text: 'With you', note: '· no agent works this stage' });
    expect(tileWho(by(DX_IDS.c4605))).toEqual({ kind: 'agent', name: 'error-eric', mood: 'needs', note: '· needs you' });
    expect(tileWho(by(DX_IDS.cf83f))).toEqual({ kind: 'plain', text: 'Unclaimed · starts when unblocked' });
    expect(tileWho(by(DX_IDS.c9ed9))).toEqual({ kind: 'done', text: 'Shipped' });
  });
  it('the one action a tile offers', () => {
    expect(tileAction(by(DX_IDS.c63ac))).toEqual({ label: 'Move to another stage', does: 'move' });
    expect(tileAction(by(DX_IDS.c58f8))).toEqual({ label: 'Resume', does: 'open' });
    expect(tileAction(by(DX_IDS.cf83f))).toBeNull();
    expect(tileAction(by(DX_IDS.c9ed9))).toBeNull();
    expect(needsAction('question')).toEqual({ label: 'Answer', does: 'open' });
    expect(needsAction('review')).toEqual({ label: 'Review', does: 'open' });
  });
  it('the grid: the fullest lane is wider, empty stages collapse to 60px', () => {
    expect(dlCols(m.stages, {})).toBe('minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.15fr) minmax(0, 1fr) 60px 60px minmax(0, 1fr)');
    expect(dlCols(m.stages, { integrate: true })).toBe('minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.15fr) minmax(0, 1fr) minmax(0, 1fr) 60px minmax(0, 1fr)');
  });
  it('strips', () => {
    expect(stripLabel(stage('integrate'))).toBe('Integrate, no cards. integration or api or testing · 3 agents. Expand stage');
    expect(stripLabel(stage('signed-off'))).toBe('Signed off, no cards. a person · approval, approval gate. Expand stage');
    expect(stripOwner(stage('integrate'))).toBe('3 agents');
    expect(stripOwner(stage('signed-off'))).toBe('a person');
    expect(stripOwner(stage('reproduce'))).toBeNull();
  });
});


describe('Paper words', () => {
  it('the needs kicker', () => {
    expect(paperKicker(4)).toEqual({ text: 'Waiting on you · 4 letters', live: true, none: null });
    expect(paperKicker(1)).toEqual({ text: 'Waiting on you · 1 letter', live: true, none: null });
    expect(paperKicker(0)).toEqual({ text: 'Waiting on you', live: false, none: 'Nothing waits on you.' });
    expect(paperSection('Coming up', 2, 'Nothing is coming up.')).toEqual({ text: 'Coming up · 2', none: null });
    expect(paperSection('In progress', 0, 'Nothing in progress.')).toEqual({ text: 'In progress', none: 'Nothing in progress.' });
  });
  it('quotes: the instruction for an unowned stage, the agent verbatim otherwise', () => {
    expect(paperQuote(by(DX_IDS.c63ac))).toBe('No agent works this stage and no review is asked for here, so it will sit forever. Move it to a stage someone works.');
    expect(paperQuote(by(DX_IDS.c1dfc))).toBe('this stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit');
    expect(paperQuote(by(DX_IDS.cf83f))).toBeNull();
  });
  it('the by-line', () => {
    expect(paperBy(by(DX_IDS.c63ac), 'Shipped')).toEqual({ mark: 'person', name: 'Rakesh Gangwar', initials: 'RG', em: 'With you', rest: '· Reported · 2d' });
    expect(paperBy(by(DX_IDS.c58f8), 'Shipped')).toEqual({ mark: 'agent', name: 'tester-tim', mood: 'needs', em: 'tester-tim', rest: '· Failing test · 33h · attempt 1' });
    expect(paperBy(by(DX_IDS.c1dfc), 'Shipped')).toMatchObject({ em: 'coder-kai', rest: '· Fix · 33h · 5 attempts' });
    expect(paperBy(by(DX_IDS.c4605), 'Shipped')).toMatchObject({ em: 'error-eric', rest: '· Reproduce · 2d · 2 attempts' });
    expect(paperBy(by(DX_IDS.cf83f), 'Shipped')).toEqual({ mark: 'none', em: 'Unclaimed', rest: '· Failing test · starts when unblocked' });
    expect(paperBy(by(DX_IDS.c9ed9), 'Shipped')).toEqual({ mark: 'check', em: 'Shipped', rest: '· Shipped' });
  });
  it('the facts line', () => {
    expect(paperFacts(by(DX_IDS.c63ac))).toEqual([{ text: 'P1' }, { text: 'clean-room · evidence-required · superpipeline · +1' }, { text: 'asked by super-chotu' }, { text: 'Overdue · due 6 Oct', cls: 'due' }]);
    expect(paperFacts(by(DX_IDS.c58f8))).toEqual([{ text: 'P2' }, { text: 'Deterministic X publisher red-test evidence', cls: 'ref' }, { text: 'asked by super-chotu' }]);
    expect(paperFacts(by(DX_IDS.c1dfc))).toEqual([{ text: 'test(api): pin manual delivery reminder', cls: 'ref' }]);
    expect(paperFacts(by(DX_IDS.cf83f))).toEqual([{ text: 'P2' }, { text: 'Blocked', icon: 'blocked' }, { text: 'asked by super-chotu' }]);
    expect(paperFacts(by(DX_IDS.c481f))).toEqual([{ text: 'Blocked', icon: 'blocked' }]);
    expect(paperFacts(by(DX_IDS.c9ed9))).toEqual([{ text: 'P2' }, { text: 'test(api): pin immutable approval subject binding', cls: 'ref' }]);
  });
  it('the reply button', () => {
    expect(paperReply(by(DX_IDS.c63ac))).toEqual({ label: 'Move to a stage someone works', does: 'move' });
    expect(paperReply(by(DX_IDS.c4605))).toEqual({ label: 'Resume', does: 'open' });
    expect(paperReply(by(DX_IDS.c9ed9))).toBeNull();
  });
  it('the pipeline, read left to right', () => {
    expect(m.stages.map(pipelineParts)).toEqual([
      { n: '1 card', extra: ['a person'] },
      { n: '1 card', extra: ['diagnostics · error-eric'] },
      { n: '3 cards', extra: ['2 blocked', 'testing · tester-tim'] },
      { n: '1 card', extra: ['code · 2 agents'] },
      { n: 'empty', extra: ['integration or api or testing · 3 agents'] },
      { n: 'empty', extra: ['approval gate', 'a person · approval'] },
      { n: '1 card', extra: ['a person'] },
    ]);
  });
});


describe('Quiet words', () => {
  const onb = buildBoardModel(ONBOARDING, ONBOARDING.cards, boardCtx());
  const ob = (id: string) => onb.cards.find((s) => s.id === id)!;
  it('header', () => {
    expect(quietSub(20, 0)).toBe('Superpipeline · 20 cards');
    expect(quietSub(7, 4)).toBe('Superpipeline · 7 cards · 4 need your decision');
    expect(quietLede(onb)).toBe('Nothing needs you. All 20 cards are done.');
    expect(quietLede(m)).toBe('4 cards need your decision.');
  });
  it('groups: empties before the first full group fold into one list, later empties stand alone', () => {
    const blocks = quietBlocks(onb);
    expect(blocks.map((b) => (b.kind === 'zero' ? `zero:${b.aria}:${b.labels.join('|')}` : `group:${b.label}:${b.total}:${b.shown.length}`))).toEqual([
      'zero:Empty groups:Needs your decision|In progress|Waiting to start',
      'group:Done:20:5',
      'zero:Closed:Closed',
    ]);
    const done = blocks[1]!;
    expect(done.kind === 'group' && done.shown.map((s) => s.title)).toEqual([
      'Run and record the clean-room SuperPipeline operator journey',
      'Onboard Message Melissa — marketing and messaging',
      'Onboard Audience Anna — community and feedback',
      'Onboard Artistic Lyra',
      'Onboard Chaos Charlie',
    ]);
    expect(done.kind === 'group' && done.moreLabel).toBe('Show all 20 done cards');
  });
  it('item meta and facts', () => {
    expect(quietMeta(ob('card_9d48db2717044b69'))).toBe('Ran by onboarding-olivia · Resident · done 20 hours ago');
    expect(quietMeta(ob('card_f180b1627c594b41'))).toBe('Ran by onboarding-olivia · Resident · done 2 days ago');
    expect(quietMeta(ob('card_94266a0d5c984dc8'))).toBe('Ran by onboarding-olivia · Resident · done 9 days ago');
    expect(quietFacts(ob('card_9d48db2717044b69'))).toBe('Done. Priority 1. Labels: clean-room, evidence-required, superpipeline and 1 more. Reference: Clean-room SuperPipeline operator journey — attempt 6 evidence. Due 5 October. 10 attempts.');
    expect(quietFacts(ob('card_f180b1627c594b41'))).toBe('Done. Priority 2. Blocked by another card. Reference: Message Melissa — pinned Sketchbook persona. Asked by super-chotu. 5 attempts.');
    expect(quietFacts(ob('card_94266a0d5c984dc8'))).toBe('Done. 5 attempts.');
    expect(quietMeta(by(DX_IDS.c4605))).toBe('error-eric · Reproduce · 2 days');
    expect(quietMeta(by(DX_IDS.cf83f))).toBe('Not picked up yet · Failing test');
    expect(quietAction(by(DX_IDS.c4605))).toEqual({ label: 'Resume', does: 'open' });
    expect(quietAction(by(DX_IDS.c63ac))).toBeNull();
  });
  it('the stages table', () => {
    expect(onb.stages.map(quietStageRow)).toEqual([
      { name: 'Requested', cards: '0 (empty)', who: 'a person', gate: '—' },
      { name: 'Drafted', cards: '0 (empty)', who: 'onboarding · onboarding-olivia', gate: '—' },
      { name: 'Provisioned', cards: '0 (empty)', who: 'onboarding · onboarding-olivia', gate: '—' },
      { name: 'Portrait', cards: '0 (empty)', who: 'design · artistic-lyra', gate: '—' },
      { name: 'Credentialed', cards: '0 (empty)', who: 'a person', gate: 'Approval gate' },
      { name: 'Proving', cards: '0 (empty)', who: 'claim-check or analysis · 2 agents', gate: '—' },
      { name: 'Resident', cards: '20', who: 'a person', gate: 'Approval gate' },
    ]);
    expect(quietStageRow(stage('test')).cards).toBe('3, 2 blocked');
  });
});

describe('empty-board words', () => {
  const rel = buildBoardModel(RELEASES, RELEASES.cards, boardCtx());
  it('the lede: **x** becomes <b>x</b>, everything else is escaped', () => {
    expect(emptyLedeHtml(RELEASES.intro, 5)).toBe('It takes a release from <b>proposal to production</b> in five stages. <b>devops-dave</b> stages it, <b>vulnerability-victor</b> checks it, and <b>you</b> give the go or no-go before it is released.');
    expect(emptyLedeHtml({ lede: '<script>x</script> **a & b**', composeHint: '' }, 2)).toBe('&lt;script&gt;x&lt;/script&gt; <b>a &amp; b</b>');
    expect(emptyLedeHtml(undefined, 5)).toBe('This board has five stages.');
  });
  it('the compose hint, with its fallback', () => {
    expect(emptyHint(RELEASES.intro)).toBe('Say what you want released in a sentence; an agent drafts the brief.');
    expect(emptyHint(undefined)).toBe('Say what you want in a sentence; an agent drafts the brief.');
  });
  it('who works each step', () => {
    expect(rel.stages.map((st) => emptyWho(st, ME))).toEqual([
      { kind: 'initials', text: 'P', label: 'A person', name: 'a person' },
      { kind: 'face', face: 'devops-dave', name: 'devops-dave' },
      { kind: 'face', face: 'vulnerability-victor', name: 'vulnerability-victor' },
      { kind: 'initials', text: 'RG', label: 'Rakesh Gangwar', name: 'you decide' },
      { kind: 'initials', text: 'P', label: 'A person', name: 'a person' },
    ]);
  });
  it('the tags', () => {
    expect(rel.stages.map((st, i) => emptyTags(st, rel.stageDefs[i]!))).toEqual([
      [{ text: 'empty', g: false }],
      [{ text: 'release', g: false }, { text: 'empty', g: false }],
      [{ text: 'security-review', g: false }, { text: 'empty', g: false }],
      [{ text: 'Approval gate', g: true }, { text: 'limit 1', g: false }, { text: 'empty', g: false }],
      [{ text: 'empty', g: false }],
    ]);
  });
});
