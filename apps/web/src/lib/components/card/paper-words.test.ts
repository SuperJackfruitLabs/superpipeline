// apps/web/src/lib/components/card/paper-words.test.ts
import { describe, expect, it } from 'vitest';
import {
  firstName, numberWord, paperAttempt, paperByline, paperCostLine, paperDateline, paperDeck, paperKicker, paperLinked, paperLogRow,
  paperLogTime, paperProvenance, paperReplySub, paperRole, reTitle, roman,
  PAPER_CAPTIONS, PAPER_HINT, PAPER_LABELS, digestPaper, paperArchivedLine, paperAttachedSummary, paperAttemptLine, paperBack, paperBriefSummary,
  paperCellLine, paperCorrespondenceSummary, paperDoneLine, paperDoneStatus, paperDrawerProvenance, paperHappenedSummary, paperRestoreNote,
  paperStateWord, paperWaitingSummary, paperWhen, resumeOptionLabel, signatureLine,
} from './paper-words';
import { ACTIVITIES_4605, ATTEMPTS_4605, CARD_4605, NOW, TZ } from './testing/card-4605';

describe('Paper words (4605)', () => {
  it('dateline, numerals, number words', () => {
    expect(paperDateline(NOW, 'noon', TZ)).toBe('Sunday 11 October · in full daylight');
    expect([1, 2, 4, 7, 9, 12].map(roman)).toEqual(['I', 'II', 'IV', 'VII', 'IX', 'XII']);
    expect([2, 10, 11].map(numberWord)).toEqual(['two', 'ten', '11']);
    expect(firstName('Ira Mehta')).toBe('Ira');
  });
  it('the head', () => {
    expect(reTitle(CARD_4605.title, false)).toBe('Re: Diagnose Melissa and Anna Supermessage silence — trace actual failing hop');
    expect(reTitle('P4 exit test', true)).toBe('Re: approval. P4 exit test');
    expect(paperKicker(true, null, 66.15, 'page')).toBe('A letter that needs your reply · 2 days');
    expect(paperKicker(true, null, 66.15, 'drawer')).toBe('A letter that needs a reply');
    expect(paperKicker(false, '2026-10-09T05:30:00Z', 1, 'page', TZ)).toBe('Archived on 9 October');
    expect(paperKicker(false, null, 1, 'page')).toBeNull();
    expect(paperDeck('stopped', 'error-eric', 'Reproduce', 2)).toBe('error-eric stopped in Reproduce after two attempts and has written to you. The brief, the record and the correspondence are enclosed below.');
    expect(paperReplySub(2)).toBe('I stopped after two attempts. Send me back with what changed.');
    expect(paperReplySub(1)).toBe('I stopped after one attempt. Send me back with what changed.');
  });
  it('the byline', () => {
    expect(paperByline('Reproduce', 2, false)).toBe(' · agent for Reproduce, ran attempt 2 · Unclaimed now');
    expect(paperRole('Diagnostics', 2)).toBe('Diagnostics, attempt 2');
    expect(paperRole(null, 2)).toBe('agent, attempt 2');
  });
  it('the record', () => {
    expect(paperProvenance('super-chotu', true, true, 'From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output.', 'page'))
      .toBe('Asked by super-chotu, an agent allowed to dispatch the one working it. From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output.');
    expect(paperAttempt(14, 0, 'stopped', null)).toBe('14 events, no errors · stopped');
    expect(paperAttempt(9, 0, 'sent back', '12:11')).toBe('9 events, no errors · sent back at 12:11');
    expect(paperAttempt(3, 1, 'failed', null)).toBe('3 events, 1 error · failed');
    const first = ACTIVITIES_4605.find((a) => a.runId === 'run_fx_4605_2' && a.seq === 1)!;
    const stop = ACTIVITIES_4605.find((a) => a.runId === 'run_fx_4605_2' && a.seq === 14)!;
    expect(paperLogRow(first)).toBe('Started Rework run on this card session; read prior persisted evidence first.');
    expect(paperLogRow(stop)).toBe('Stopped. Blocked. Waiting on you; the reason is shown at the top of this card.');
    expect(paperLogTime(first.ts, false, TZ)).toBe('18:50');
    expect(paperLogTime(stop.ts, true, TZ)).toBe('19:41 · Thu 8 Oct');
    expect(paperLinked({ links: 0, children: 0, openChildren: 0, refs: 5, related: 0 })).toBe('no related cards · no sub-tasks (0 open of 0) · 5 references · no related prior work');
    expect(paperCostLine(null, ATTEMPTS_4605)).toBe('No estimate yet · attempt 1, $0.00 · attempt 2, $0.00');
  });
});

describe('Paper words for the drawer and the gallery', () => {
  const NOWISO = '2026-10-11T08:21:00Z';
  it('the back link names the board and the light', () => {
    expect(paperBack('Developer Experience', 'noon')).toBe('Developer Experience · in full daylight');
    expect(paperBack('Developer Experience', 'night')).toBe('Developer Experience · after dark');
  });
  it('letters are dated like letters', () => {
    expect(paperWhen('2026-10-08T14:11:45Z', NOWISO, TZ)).toBe('Thursday 8 October, 19:41');
    expect(paperWhen('2026-10-11T07:18:00Z', NOWISO, TZ)).toBe('Today, 12:48');
    expect(paperWhen('2026-10-10T19:00:00Z', NOWISO, TZ)).toBe('Today, 00:30');
  });
  it('the state word ages a wait and never shows a raw state', () => {
    expect(paperStateWord({ archived: false, needsYou: true, state: 'input-required', ageHours: 66.15 })).toBe('Waiting on you · 2 days');
    expect(paperStateWord({ archived: true, needsYou: true, state: 'input-required', ageHours: 1 })).toBe('Archived');
    expect(paperStateWord({ archived: false, needsYou: false, state: 'working', ageHours: 1 })).toBe('Working');
    expect(paperStateWord({ archived: false, needsYou: false, state: 'completed', ageHours: 1 })).toBe('Done');
  });
  it('the signature and the resume options', () => {
    expect(signatureLine('Diagnostics', 2, 'Thursday 8 October, 19:41')).toBe('Diagnostics, attempt 2 · Thursday 8 October, 19:41');
    expect(signatureLine(null, 1, null)).toBe('agent, attempt 1');
    expect(resumeOptionLabel({ n: 1, name: 'Reported', current: false })).toBe('1 · Reported');
    expect(resumeOptionLabel({ n: 2, name: 'Reproduce', current: true })).toBe('2 · Reproduce (this stage)');
  });
  it('enclosure summaries', () => {
    expect(paperBriefSummary({ criteria: 5, rows: 10, planSteps: 0, project: true })).toBe('5 things to prove · 10 details · project');
    expect(paperBriefSummary({ criteria: 1, rows: 1, planSteps: 3, project: false })).toBe('1 thing to prove · 1 detail · plan · no project');
    expect(paperHappenedSummary({ runs: 2, decisions: 0, costUsd: 0 })).toBe('2 runs · no decisions · $0.00');
    expect(paperHappenedSummary({ runs: 1, decisions: 1, costUsd: 1.5 })).toBe('1 run · 1 decision · $1.50');
    expect(paperWaitingSummary({ links: 0, subtasks: 0, open: 0 })).toBe('no links · no sub-tasks');
    expect(paperWaitingSummary({ links: 2, subtasks: 3, open: 1 })).toBe('2 links · 1 of 3 sub-tasks open');
    expect(paperAttachedSummary({ refs: 5, related: 0, delivery: false })).toBe('5 references · no related prior work · no delivery');
    expect(paperCorrespondenceSummary(0)).toBe('No letters yet');
    expect(paperCorrespondenceSummary(3)).toBe('3 letters');
  });
  it('provenance and attempt lines', () => {
    expect(paperDrawerProvenance({ queuedByName: 'super-chotu', byAgent: true, covers: true, handoff: 'From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output.' }))
      .toBe('Asked by super-chotu (an agent, allowed to dispatch the one working it). From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output.');
    expect(paperAttemptLine({ n: 2, agent: 'error-eric', events: 14, word: 'stopped', endedAt: '2026-10-08T14:11:43Z', newest: true }, TZ)).toEqual({ head: 'Attempt 2', rest: ' · error-eric · 14 events · stopped at 19:41 Thu 8 Oct' });
    expect(paperAttemptLine({ n: 1, agent: 'error-eric', events: 9, word: 'sent back', endedAt: '2026-10-08T06:41:00Z', newest: false }, TZ)).toEqual({ head: 'Attempt 1', rest: ' · error-eric · 9 events · sent back' });
  });
  it('gallery lines', () => {
    expect(paperCellLine({ board: 'Research & Intelligence', i: 4, n: 6, stage: 'Recommendation', kind: 'review' })).toBe('Research & Intelligence · Stage 5 of 6, Recommendation · Awaiting your review');
    expect(paperCellLine({ board: 'Guild', i: 2, n: 5, stage: 'Build', kind: 'question' })).toBe('Guild · Stage 3 of 5, Build · A question');
    expect(paperArchivedLine({ board: 'Marketing', i: 2, n: 8, stage: 'Messaging approval', owner: 'Ira Mehta' })).toBe('Marketing · Was at stage 3 of 8, Messaging approval · Owner Ira Mehta');
    expect(paperRestoreNote('Messaging approval')).toBe('Back to the board at Messaging approval.');
    expect(paperDoneLine({ board: 'Agent Onboarding', stage: 'Resident', priority: 2, owner: 'Ira Mehta' })).toBe('Agent Onboarding · Stage Resident · Priority P2 · Owner Ira Mehta');
    expect(paperDoneStatus('2026-10-08T13:56:34.688Z', 5, NOWISO, TZ)).toBe('Thursday 8 October, 19:26 · after 5 attempts');
    expect(digestPaper('sha256:9f3ac2e1d07109285773f2418680752df16dbb42e26181bf657d331db98fcb84')).toBe('sha256:9f3ac2e1…');
  });
  it('copy constants', () => {
    expect(PAPER_HINT).toEqual({ approve: 'Move the card on as it is.', changes: 'Needs a note; it threads into the next attempt.', reject: 'Stop here.' });
    expect(PAPER_CAPTIONS).toEqual({ gate: 'With nothing picked: “Pick a decision first.”', question: 'With no answer: “Type an answer first.”' });
    expect(PAPER_LABELS).toHaveLength(6);
  });
});
