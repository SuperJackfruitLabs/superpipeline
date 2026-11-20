// apps/web/src/lib/components/board/board-words.test.ts
import { describe, expect, it } from 'vitest';
import { DX, DX_IDS, ME, RELEASES, boardCtx } from '$lib/test/fixture-boards';
import { buildBoardModel } from './board-model';
import { emptyHint, emptyLedeHtml, emptyTags, emptyWho } from './board-words';
import { attentionLine, dueLong, dueShort, laneMore, laneWho, moreLabelsTitle, personInitials, tileWho } from './board-words';

const m = buildBoardModel(DX, DX.cards, boardCtx());
const by = (id: string) => m.cards.find((s) => s.id === id)!;

describe('dates', () => {
  it('prints due dates the way the boards do', () => {
    expect(dueShort('2026-10-06')).toBe('6 Oct');
    expect(dueLong('2026-10-06')).toBe('6 October');
    expect(dueLong('2026-10-05')).toBe('5 October');
  });
});

describe('board page words', () => {
  it('a folded lane says how many more, and how many of them want you', () => {
    expect(laneMore(6, 0)).toBe('Show 6 more');
    expect(laneMore(6, 1)).toBe('Show 6 more · 1 wants you');
    expect(laneMore(6, 2)).toBe('Show 6 more · 2 want you');
  });
  it('initials are the first letters of the first two words', () => {
    expect(personInitials('Rakesh Gangwar')).toBe('RG');
    expect(personInitials('sam')).toBe('S');
  });
  it('who is on each tile', () => {
    expect(tileWho(by(DX_IDS.c63ac))).toEqual({ kind: 'person', name: 'Rakesh Gangwar', initials: 'RG', text: 'With you', note: '· no agent works this stage' });
    expect(tileWho(by(DX_IDS.c4605))).toEqual({ kind: 'agent', name: 'error-eric', mood: 'needs', note: '· needs you' });
    expect(tileWho(by(DX_IDS.cf83f))).toEqual({ kind: 'plain', text: 'Unclaimed · starts when unblocked' });
    expect(tileWho(by(DX_IDS.c9ed9))).toEqual({ kind: 'done', text: 'Shipped' });
  });
  it('who works each lane', () => {
    expect(m.stages.map(laneWho)).toEqual([
      'a person works this', 'error-eric works this', 'tester-tim works this', '2 agents work this', '3 agents work this', 'a person decides', 'done',
    ]);
  });
  it('the attention line', () => {
    expect(attentionLine(3)).toBe('3 cards want you here.');
    expect(attentionLine(1)).toBe('1 card wants you here.');
    expect(attentionLine(0)).toBe('Nothing here needs you.');
  });
  it('the more-labels title', () => expect(moreLabelsTitle(2)).toBe('2 more labels'));
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
