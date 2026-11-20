// apps/web/src/lib/components/inbox/inbox-groups.test.ts
import { describe, expect, it } from 'vitest';
import type { AttentionItem, AttentionKind } from '$lib/components/attention/attention';
import { itemsFromBoard } from '$lib/components/attention/attention';
import { realisticWorkspace, REALISTIC_NOW_MS } from '$lib/fixtures/realistic';
import { GROUP_OF, inboxGroups, inboxHeadline, rowOffer } from './inbox-groups';
import { GROUP_EXPLANATION } from './inbox-words';

const item = (kind: AttentionKind, n: number, extra: Partial<AttentionItem> = {}): AttentionItem => ({
  id: `${kind}:brd_${n % 3}:card_${n}`, kind, boardId: `brd_${n % 3}`, boardName: `Board ${n % 3}`, cardId: `card_${n}`,
  title: `Card ${n}`, stageKey: 'idea', stageName: 'Idea', headline: '', detail: null, instruction: '', actions: ['open'], ageHours: n, ...extra,
});

describe('inbox groups', () => {
  it('maps the nine kinds to five groups in a fixed order', () => {
    expect(GROUP_OF).toEqual({
      review: 'review', 'sub-tasks': 'review', question: 'answer',
      refused: 'resume', failed: 'resume', 'repeated-failure': 'resume', blocked: 'resume',
      budget: 'budget', 'no-owner': 'unclaimed',
    });
    const kinds: AttentionKind[] = ['no-owner', 'budget', 'blocked', 'question', 'sub-tasks', 'failed', 'review', 'refused', 'repeated-failure'];
    const groups = inboxGroups(kinds.map((k, i) => item(k, i)));
    expect(groups.map((g) => g.key)).toEqual(['review', 'answer', 'resume', 'budget', 'unclaimed']);
    expect(groups.map((g) => g.title)).toEqual(['Review', 'Answer', 'Resume a stopped agent', 'Over budget', 'Nobody works these stages']);
    expect(groups.map((g) => g.verb)).toEqual(['Review', 'Answer', 'Resume', 'Raise the cap', 'Move']);
    // Rows keep the order they were given in.
    expect(groups[0].items.map((i) => i.kind)).toEqual(['sub-tasks', 'review']);
    expect(groups[2].items.map((i) => i.kind)).toEqual(['blocked', 'failed', 'refused', 'repeated-failure']);
    expect(groups.find((g) => g.key === 'unclaimed')?.groupActions).toEqual(['move-all', 'staff']);
    expect(groups.find((g) => g.key === 'review')?.groupActions).toEqual([]);
    // Empty groups are left out; only the unclaimed group explains itself.
    const two = inboxGroups([item('no-owner', 1, { stageName: 'Idea' }), item('no-owner', 2, { stageName: 'Reported' }), item('question', 3)]);
    expect(two.map((g) => g.key)).toEqual(['answer', 'unclaimed']);
    expect(two[0].explanation).toBe(GROUP_EXPLANATION.answer);
    expect(two[1].explanation).toBe('These cards sit in Idea and Reported on 2 boards. No agent holds those stages and no review is asked for, so they will not move on their own.');
    expect(inboxGroups([])).toEqual([]);
  });
  it('the headline names the non-empty groups and pluralises', () => {
    // 18 cards: one review, one stopped agent and sixteen nobody works.
    const items = [item('review', 0), item('blocked', 1), ...Array.from({ length: 16 }, (_, i) => item('no-owner', 2 + i))];
    const groups = inboxGroups(items);
    expect(inboxHeadline(groups, 3, 0, 'Rakesh', 'daylight', 'night')).toEqual({
      h1: 'Working late, Rakesh? 18 cards want you.',
      lede: 'One review, one stopped agent, and 16 cards nobody is set up to work. Nothing is running.',
    });
    for (const vibe of ['paper', 'studio', 'quiet'] as const) {
      expect(inboxHeadline(groups, 3, 0, 'Rakesh', vibe, 'night').h1).toBe('18 cards want you.');
    }
    // No name: the greeting stands alone. Daytime reads the day's own greeting.
    expect(inboxHeadline(groups, 3, 2, null, 'daylight', 'morning')).toEqual({
      h1: 'Good morning. 18 cards want you.',
      lede: 'One review, one stopped agent, and 16 cards nobody is set up to work. Two running.',
    });
    // Singulars and two groups.
    expect(inboxHeadline(inboxGroups([item('question', 1), item('budget', 2)]), 1, 1, null, 'quiet').lede)
      .toBe('One question and one card over budget. One running.');
    expect(inboxHeadline(inboxGroups([item('question', 1), item('question', 2)]), 1, 0, null, 'quiet'))
      .toEqual({ h1: '2 cards want you.', lede: 'Two questions. Nothing is running.' });
    expect(inboxHeadline([], 3, 0, null, 'paper')).toEqual({ h1: 'Nothing needs you.', lede: 'Nothing is running.' });
    // The realistic workspace, read board by board: 18 cards across three boards.
    const ws = realisticWorkspace();
    const real = inboxGroups(ws.boards.flatMap((b) => itemsFromBoard(b, ws.agents, REALISTIC_NOW_MS)));
    expect(inboxHeadline(real, 3, 1, 'Rakesh', 'studio').h1).toBe('18 cards want you.');
    expect(inboxHeadline(real, 3, 1, 'Rakesh', 'studio').lede)
      .toBe('One review, one question, one stopped agent, one card over budget, and 14 cards nobody is set up to work. One running.');
  });
});

describe('rowOffer: the one verb a row draws and its keys act on', () => {
  it('opens on Review and Answer, resumes on Resume, raises the cap on Budget, moves an unclaimed card that can move', () => {
    expect(rowOffer('review', 0)).toBe('open');
    expect(rowOffer('answer', 3)).toBe('open');
    expect(rowOffer('resume', 3)).toBe('resume');
    expect(rowOffer('budget', 3)).toBe('cap');
    expect(rowOffer('unclaimed', 2)).toBe('move');
    expect(rowOffer('unclaimed', 0)).toBeNull();
  });
});
