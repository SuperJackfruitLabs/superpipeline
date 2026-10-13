// apps/web/src/lib/components/card/studio/studio-format.test.ts
import { describe, expect, it } from 'vitest';
import { commentsCount, cpKicker, figAge, linksSentence, outcomeWord, quoteWhen, runEnded, stageNo, statusItems, stoppedAfter, studioNoteHint, studioProvenance, usdShort, whereWord, archivedBanner, quoteHeader, restoreHint, shortDigest, studioClock, studioConflict, studioKicker, tabCounts } from './studio-format';
import { ATTEMPTS_4605, NOW, REFS_4605, TZ } from '../testing/card-4605';

describe('Studio formatters (4605)', () => {
  it('numbers', () => {
    expect([0, 1, 6].map(stageNo)).toEqual(['01', '02', '07']);
    expect(figAge(66.15)).toEqual({ value: '2', unit: 'days' });
    expect(figAge(33.9)).toEqual({ value: '33', unit: 'h' });
    expect(figAge(72)).toEqual({ value: '3', unit: 'days' });
    expect([usdShort(0), usdShort(1.5)]).toEqual(['$0', '$1.50']);
  });
  it('times', () => {
    expect(quoteWhen('2026-10-08T14:11:45Z', NOW, TZ)).toBe('Thu 8 Oct 19:41');
    expect(quoteWhen('2026-10-11T07:18:00Z', NOW, TZ)).toBe('12:48');
    expect(runEnded('2026-10-08T14:11:43Z', TZ)).toBe('Oct 8 19:41');
    expect(runEnded('2026-10-08T06:41:00Z', TZ)).toBe('Oct 8 12:11');
  });
  it('words', () => {
    expect(cpKicker('4605', 1, 'Reproduce')).toBe('Card 4605 · stage 02 Reproduce');
    expect(studioProvenance('super-chotu', true, true, false)).toBe('Asked by super-chotu, an agent allowed to dispatch the one working it. Unclaimed now.');
    expect(stoppedAfter(2)).toBe('stopped after 2 attempts');
    expect(studioNoteHint(0, 'error-eric', true)).toBe('Note needed · 0/8000 · with no note: “Add a note for error-eric first.”');
    expect(studioNoteHint(5, 'error-eric', false)).toBe('5/8000');
    expect(commentsCount(0)).toBe('0 comments');
    expect(linksSentence(0, 0, 0)).toBe('Sub-tasks 0 open of 0 · Related prior work: none. No related prior work found in Superlibrary.');
    expect(whereWord(REFS_4605[0]!.url)).toBe('GitHub');
    expect(ATTEMPTS_4605.map(outcomeWord)).toEqual(['Sent back', 'Stopped']);
    expect(statusItems({ shortId: '4605', i: 1, n: 7, stageName: 'Reproduce', needsYou: true, ageHours: 66.15, syncedAt: '2026-10-11T08:21:00Z', tz: TZ }))
      .toEqual([{ text: 'card 4605' }, { text: 'stage 2/7 Reproduce' }, { text: 'waiting on you 2d', signal: true }, { text: 'synced 13:51' }]);
  });
});

describe('Studio words for the drawer and the gallery', () => {
  it('the clock and the kicker', () => {
    expect(studioClock('2026-10-11T08:21:00Z', 'noon', TZ)).toEqual({ text: '13:51 · midday', aria: 'Local time 13:51, midday' });
    expect(studioClock('2026-10-11T08:21:00Z', 'golden', TZ).text).toBe('13:51 · golden hour');
    expect(studioKicker({ board: 'Developer Experience', i: 1, stage: 'Reproduce' })).toBe('Developer Experience · stage 02 Reproduce');
  });
  it('quotes, digests, banners', () => {
    expect(quoteHeader('research-ray', 'review')).toBe('research-ray · awaiting review');
    expect(quoteHeader('optimizer-ollie', 'question')).toBe('optimizer-ollie · question pending');
    expect(quoteHeader('error-eric', 'stopped')).toBe('error-eric · Stopped · needs you');
    expect(shortDigest('sha256:9f3ac2e1d07109285773f2418680752d')).toBe('sha256:9f3ac2e1…');
    expect(archivedBanner('2026-10-09T05:30:00Z', TZ)).toBe('Archived 9 Oct');
    expect(restoreHint(2, 'Messaging approval')).toBe('Returns it to 03 Messaging approval.');
    expect(studioConflict({ decidedBy: 'u', decidedAt: '2026-10-11T07:32:00Z', via: 'matrix' }, 'Ira Mehta', TZ)).toBe('already decided from Matrix by Ira Mehta at 13:02.');
  });
  it('tab counts', () => {
    expect(tabCounts({ rows: 10, runs: 2, links: 5, comments: 0, costUsd: 0 }).map((t) => `${t.label} ${t.count}`)).toEqual(['Spec 10', 'Log 2', 'Links 5', 'Talk 0', 'Cost $0.00']);
  });
});
