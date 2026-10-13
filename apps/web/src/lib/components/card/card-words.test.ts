// apps/web/src/lib/components/card/card-words.test.ts
import { describe, expect, it } from 'vitest';
import {
  agentRole, archivedReason, archivedTitle, askedByTitle, attemptsLine, briefMeta, briefSummary, costSummary, criteriaCount,
  doneLine, emptyNoteCaption, emptyNoteError, factItems, gateConflictSentence, grantLine, handoffLine, initials, linksSummary,
  loadingBars, loadingNote, noteHint, ownerChip, pageSmall, planNone, planProgress, projectLine, provenanceLine, relatedLine,
  replySub, restoreNote, RESUME_PLACEHOLDER, subtasksLine, talkSummary, unclaimedChip, usd, whatHappenedSummary,
} from './card-words';
import { cardLead } from './card-lead';
import { ATTEMPTS_4605, CARD_4605, STAGES_DX, TZ } from './testing/card-4605';

const names = (id: string) => ({ agt_fx_error_eric: 'error-eric' } as Record<string, string>)[id] ?? id;

describe('people and provenance', () => {
  it('chips', () => {
    expect(unclaimedChip({ delegateName: null, lastAgentName: 'error-eric', attemptCount: 2 })).toBe('Unclaimed · error-eric ran attempt 2');
    expect(unclaimedChip({ delegateName: 'coder-kai', lastAgentName: 'error-eric', attemptCount: 2 })).toBe('coder-kai · working it');
    expect(unclaimedChip({ delegateName: null, lastAgentName: null, attemptCount: 0 })).toBe('Unclaimed');
    expect(ownerChip('Rakesh Gangwar')).toBe('Owner · Rakesh Gangwar');
    expect(initials('Rakesh Gangwar')).toBe('RG');
    expect(initials('super-chotu')).toBe('S');
    expect(askedByTitle('super-chotu', true, 32)).toBe('super-chotu, an agent, with dispatch authority on this board');
    expect(askedByTitle('Rakesh Gangwar', false, 32)).toBeNull();
  });
  it('provenance and grant sentences', () => {
    expect(provenanceLine({ queuedByName: 'super-chotu', byAgent: true, covers: true }, null)).toBe('Asked by super-chotu (an agent, allowed to dispatch the one working it). Unclaimed now.');
    expect(provenanceLine({ queuedByName: 'Rakesh Gangwar', byAgent: false, covers: null }, 'error-eric')).toBe('Asked by Rakesh Gangwar (a person). error-eric is working it.');
    expect(grantLine('super-chotu', 'Rakesh Gangwar', 32)).toBe('Queued by super-chotu on Rakesh Gangwar\'s grant · 32 agents may be dispatched.');
    expect(grantLine('super-chotu', 'Rakesh Gangwar', 1)).toBe('Queued by super-chotu on Rakesh Gangwar\'s grant · 1 agent may be dispatched.');
  });
  it('roles on the page', () => {
    expect(agentRole({ stageName: 'Reproduce', attempt: 2, delegated: false })).toBe('Agent for Reproduce · ran attempt 2 · Unclaimed now');
    expect(agentRole({ stageName: 'Reproduce', attempt: 2, delegated: true })).toBe('Agent for Reproduce · ran attempt 2 · working it now');
    expect(pageSmall(cardLead({ card: CARD_4605 }), 'error-eric')).toBe('error-eric is waiting for your reply');
  });
});

describe('facts, brief, plan, project', () => {
  it('fact list', () => {
    expect(factItems({ card: CARD_4605, stageName: 'Reproduce', ageHours: 66.15, labelNames: [], projectName: null, tz: TZ })).toEqual([
      { term: 'Priority', value: 'P3' }, { term: 'Due', value: 'none' }, { term: 'Labels', value: 'none' },
      { term: 'In Reproduce for', value: '2 days' }, { term: 'Attempt', value: '2' },
    ]);
    expect(factItems({ card: CARD_4605, stageName: 'Reproduce', ageHours: 66.15, labelNames: [], projectName: 'Marketing & Community — Melissa and Anna onboarding', tz: TZ }).at(-1))
      .toEqual({ term: 'Project', value: 'Marketing & Community — Melissa and Anna onboarding' });
    expect(factItems({ card: { ...CARD_4605, priority: 0, attemptCount: 1, dueAt: '2026-10-20' }, stageName: 'Reproduce', ageHours: 5.2, labelNames: ['bug'], projectName: null, tz: TZ }))
      .toEqual([{ term: 'Priority', value: 'none' }, { term: 'Due', value: '20 Oct' }, { term: 'Labels', value: 'bug' }, { term: 'In Reproduce for', value: '5 hours' }]);
  });
  it('brief words', () => {
    expect(briefMeta(true, 5, false)).toBe('Description and 5 criteria · Show');
    expect(briefMeta(true, 5, true)).toBe('Description and 5 criteria · Hide');
    expect(briefMeta(false, 1, false)).toBe('1 criterion · Show');
    expect(briefSummary(10, false, true, 'drawer')).toBe('Details · 10 fields, project');
    expect(briefSummary(10, true, true, 'drawer')).toBe('Details · 10 fields, plan, project');
    expect(briefSummary(10, false, true, 'page')).toBe('10 details');
    expect(briefSummary(10, false, true, 'phone')).toBe('10 fields');
    expect(criteriaCount(5)).toBe('5 acceptance criteria');
    expect(criteriaCount(1)).toBe('1 acceptance criterion');
  });
  it('plan and project', () => {
    expect(planNone('error-eric')).toBe('error-eric did not post a plan for this card.');
    expect(planNone('')).toBe('The agent did not post a plan for this card.');
    expect(planProgress(3, 4)).toBe('3 / 4 steps · 75%');
    expect(projectLine('Marketing & Community — Melissa and Anna onboarding', null)).toBe('Marketing & Community — Melissa and Anna onboarding · no milestone');
  });
});

describe('what happened, links, cost, talk', () => {
  it('summaries', () => {
    expect(whatHappenedSummary(2, 0)).toBe('2 runs · no decisions yet');
    expect(whatHappenedSummary(1, 1)).toBe('1 run · 1 decision');
    expect(linksSummary({ links: 0, children: 0, openChildren: 0, refs: 5, related: 0 }, 'drawer')).toBe('no links · no sub-tasks · 5 references · no related work');
    expect(linksSummary({ links: 0, children: 0, openChildren: 0, refs: 5, related: 0 }, 'page')).toBe('5 references');
    expect(linksSummary({ links: 2, children: 3, openChildren: 1, refs: 1, related: 2 }, 'drawer')).toBe('2 links · 1 of 3 sub-tasks open · 1 reference · 2 related');
    expect(subtasksLine(0, 0)).toBe('0 open of 0');
    expect(costSummary(0, null, null)).toBe('$0.00 · no estimate · no delivery');
    expect(costSummary(1.5, 4, 'manual')).toBe('$1.50 · est. $4.00 · manual delivery');
    expect(usd(0)).toBe('$0.00');
    expect(talkSummary(0)).toBe('No comments yet');
    expect(talkSummary(2)).toBe('2 comments');
    expect(relatedLine('absent', 0)).toBe('No related prior work found in Superlibrary.');
    expect(relatedLine('ok', 0)).toBe('No related prior work found in Superlibrary.');
    expect(relatedLine('unavailable', 0)).toBe('Related prior work could not be loaded from Superlibrary.');
  });
  it('the handoff fallback and the attempts line (4605)', () => {
    expect(handoffLine({ handoff: null, stageIndex: 1, stages: STAGES_DX, queuedByName: 'super-chotu', createdAt: CARD_4605.createdAt, tz: TZ }))
      .toBe('From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output.');
    expect(handoffLine({ handoff: null, stageIndex: 0, stages: STAGES_DX, queuedByName: 'super-chotu', createdAt: CARD_4605.createdAt, tz: TZ }))
      .toBe('Queued by super-chotu on 8 Oct with the brief above.');
    expect(handoffLine({ handoff: { summary: 'Root cause found.' }, stageIndex: 2, stages: STAGES_DX, queuedByName: 'super-chotu', createdAt: CARD_4605.createdAt, tz: TZ }))
      .toBe('Handoff from Reproduce: “Root cause found.”');
    expect(attemptsLine(ATTEMPTS_4605, names)).toBe('Attempts: 1 · error-eric · $0.00 · sent back; 2 · error-eric · $0.00 · stopped');
  });
});

describe('reply, archive, done, gate, loading', () => {
  it('reply words', () => {
    expect(replySub(CARD_4605, 'error-eric')).toBe('Stopped after 2 attempts. Tell error-eric what to do differently.');
    expect(replySub({ ...CARD_4605, needsHuman: { reason: 'repeated-failure', failureCount: 3 } }, 'error-eric')).toBe('Failed 3 times; the board stopped retrying. Tell error-eric what to do differently.');
    expect(replySub({ ...CARD_4605, needsHuman: { reason: 'not-authorised' } }, 'error-eric')).toBe('Not dispatched: nobody with permission asked for it. Say who should pick it up.');
    expect(noteHint(0)).toBe('Needed before you send. 0 / 8000');
    expect(emptyNoteError('error-eric')).toBe('Add a note for error-eric first.');
    expect(emptyNoteCaption('error-eric')).toBe('Pressing it with no note says “Add a note for error-eric first.”');
    expect(RESUME_PLACEHOLDER).toBe('For example: what you checked, and what the agent should look at next.');
  });
  it('archived', () => {
    expect(archivedTitle('2026-10-09T05:30:00Z', TZ)).toBe('Archived 9 Oct');
    const cancelled = [{ status: 'cancelled', resolvedAt: '2026-10-09T05:30:03Z' }];
    expect(archivedReason('2026-10-09T05:30:00Z', cancelled)).toBe('Its pending review was cancelled when the card was archived.');
    expect(archivedReason('2026-10-09T05:30:00Z', [{ status: 'cancelled', resolvedAt: '2026-10-09T05:31:00Z' }])).toBe('It is off the board. Restore puts it back.');
    expect(restoreNote('Messaging approval')).toBe('Puts it back on the board at Messaging approval.');
  });
  it('done, gate conflict, loading', () => {
    expect(doneLine('Resident', '2026-10-08T13:56:34.688Z', 5, new Date('2026-10-11T08:21:00Z'), TZ)).toBe('Reached Resident on Thu 8 Oct, 19:26 · 5 attempts');
    expect(gateConflictSentence({ decidedBy: 'usr_b19776fac3c94df4', decidedAt: '2026-10-11T07:32:00Z', via: 'matrix' }, 'Rakesh Gangwar', TZ))
      .toBe('This gate was already decided from Matrix by Rakesh Gangwar at 13:02.');
    expect(gateConflictSentence({ decidedBy: 'x', decidedAt: '2026-10-11T07:32:00Z', via: 'web' }, 'Pat', TZ)).toBe('This gate was already decided from the web app by Pat at 13:02.');
    expect(loadingNote('error-eric')).toBe('Loading what error-eric said and the card’s history…');
    expect(loadingBars(7, 1)).toEqual([1, 2.8, 1, 1, 1]);
    expect(loadingBars(3, 0)).toEqual([2.8, 1, 1]);
  });
});
