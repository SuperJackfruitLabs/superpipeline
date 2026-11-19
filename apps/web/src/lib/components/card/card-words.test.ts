// apps/web/src/lib/components/card/card-words.test.ts
import { describe, expect, it } from 'vitest';
import {
  attemptsLine, cardCrumb, cardFacts, costFact, countWords, criterionKey, emptyNoteError, factItems, gateAsk, gateChoiceWords, gateConflictSentence,
  handoffLine, historyMeta, initials, labelName, noteHint, planProgress, producedMeta, producedTitle, projectLine, questionLead, relatedLine,
  RESUME_PLACEHOLDER, signingMeta, stateSentence, subtasksLine, trackWho, unclaimedChip, usd, type StateSentenceInput,
} from './card-words';
import { ATTEMPTS_4605, CARD_4605, STAGES_DX, TZ } from './testing/card-4605';

const names = (id: string) => ({ agt_fx_error_eric: 'error-eric' } as Record<string, string>)[id] ?? id;

describe('people and provenance', () => {
  it('chips', () => {
    expect(unclaimedChip({ delegateName: null, lastAgentName: 'error-eric', attemptCount: 2 })).toBe('Unclaimed · error-eric ran attempt 2');
    expect(unclaimedChip({ delegateName: 'coder-kai', lastAgentName: 'error-eric', attemptCount: 2 })).toBe('coder-kai · working it');
    expect(unclaimedChip({ delegateName: null, lastAgentName: null, attemptCount: 0 })).toBe('Unclaimed');
    expect(initials('Rakesh Gangwar')).toBe('RG');
    expect(initials('super-chotu')).toBe('S');
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
  it('plan and project', () => {
    expect(planProgress(3, 4)).toBe('3 / 4 steps · 75%');
    expect(projectLine('Marketing & Community — Melissa and Anna onboarding', null)).toBe('Marketing & Community — Melissa and Anna onboarding · no milestone');
  });
});

describe('what happened, links, cost, talk', () => {
  it('summaries', () => {
    expect(subtasksLine(0, 0)).toBe('0 open of 0');
    expect(usd(0)).toBe('$0.00');
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

describe('reply and gate', () => {
  it('reply words', () => {
    expect(noteHint(0)).toBe('Needed before you send. 0 / 8000');
    expect(emptyNoteError('error-eric')).toBe('Add a note for error-eric first.');
    expect(RESUME_PLACEHOLDER).toBe('For example: what you checked, and what the agent should look at next.');
  });
  it('gate conflict', () => {
    expect(gateConflictSentence({ decidedBy: 'usr_b19776fac3c94df4', decidedAt: '2026-10-11T07:32:00Z', via: 'matrix' }, 'Rakesh Gangwar', TZ))
      .toBe('This gate was already decided from Matrix by Rakesh Gangwar at 13:02.');
    expect(gateConflictSentence({ decidedBy: 'x', decidedAt: '2026-10-11T07:32:00Z', via: 'web' }, 'Pat', TZ)).toBe('This gate was already decided from the web app by Pat at 13:02.');
  });
});

const base: StateSentenceInput = { kind: 'stopped', archivedAt: null, stage: 'Reproduce', ageHours: 66, agent: 'error-eric', attempt: 2, produced: 0, reason: null, nextStage: 'Failing test', since: '2026-10-08T14:11:45Z', resumable: true, tz: TZ };
describe('the state sentence (composition contract §7 "Card" 3)', () => {
  it('says where, for how long, what is wanted, who did what last, and the verb that answers it', () => {
    expect(stateSentence({ ...base, kind: 'review', produced: 1 })).toEqual({ text: 'Waiting for your review in Reproduce for 2 days. error-eric finished attempt 2 and produced one document.', needsWord: 'Review' });
    expect(stateSentence({ ...base, kind: 'question', ageHours: 3 })).toEqual({ text: 'Waiting for your answer in Reproduce for 3 hours. error-eric asked a question and holds the card until you reply.', needsWord: 'Answer' });
    expect(stateSentence({ ...base, reason: 'The tests failed twice.' })).toEqual({ text: 'error-eric stopped in Reproduce after attempt 2: The tests failed twice. It will read your note before it tries again.', needsWord: 'Resume' });
    expect(stateSentence({ ...base, kind: 'failed', resumable: false })).toEqual({ text: 'error-eric failed in Reproduce after attempt 2.', needsWord: null });
    expect(stateSentence({ ...base, kind: 'budget' }).text).toBe('error-eric stopped at the spending cap in Reproduce after attempt 2. It will read your note before it tries again.');
    expect(stateSentence({ ...base, kind: 'working', ageHours: 2 })).toEqual({ text: 'error-eric is working on it in Reproduce for 2 hours. Nothing to do yet.', needsWord: null });
    expect(stateSentence({ ...base, kind: 'done', produced: 1, since: '2026-11-14T10:00:00Z' })).toEqual({ text: 'Shipped by error-eric on 14 November. Nothing to do. What it produced is below.', needsWord: null });
    expect(stateSentence({ ...base, kind: 'done', agent: '' }).text).toBe('Shipped on 8 October. Nothing to do.');
    expect(stateSentence({ ...base, kind: 'idle', agent: '' })).toEqual({ text: 'Waiting in Reproduce for 2 days. Nobody has picked it up.', needsWord: null });
    expect(stateSentence({ ...base, archivedAt: '2026-10-02T10:00:00Z' })).toEqual({ text: 'Archived on 2 October. Agents cannot claim it and it is off the board. Restore it to bring it back to Reproduce.', needsWord: 'Restore' });
    expect(stateSentence({ ...base, kind: 'review', agent: '' }).text).toMatch(/^Waiting for your review in Reproduce for 2 days\. An agent finished attempt 2\.$/);
  });
});

describe('the panels', () => {
  it('the decision panel asks, says when, and what approving does', () => {
    expect(gateAsk({ agent: 'keeper-karen', attempt: 5, ageHours: 10, produced: 1, nextStage: 'Done' })).toEqual({ lead: 'keeper-karen asks you to approve attempt 5.', rest: 'It finished 10 hours ago and produced one document. Approving moves the card to Done.' });
    expect(gateAsk({ agent: '', attempt: 1, ageHours: 0.2, produced: 0, nextStage: null })).toEqual({ lead: 'An agent asks you to approve attempt 1.', rest: 'It finished under an hour ago.' });
    expect(gateChoiceWords('changes', 'request_changes', 'Building')).toBe('Send it back to Building with a note the agent will read.');
    expect(gateChoiceWords('approve', 'approve_manual', null)).toBe('You post the approved text yourself.');
    expect(gateChoiceWords('reject', 'reject', null)).toBe('Stop the card here.');
    expect(signingMeta('sha256:3f9a', 2)).toBe('sha256 · two fields');
    expect(questionLead('scout-sam', false)).toBe('scout-sam asks:');
    expect(questionLead('', true)).toBe('The agent needs you to sign in:');
  });
});

describe('facts, produced, history', () => {
  it('facts in words, never ids', () => {
    expect(cardFacts({ owner: 'Rakesh', priority: 1, labels: ['estate', 'release'], dueAt: null, attempts: 5, askedBy: 'Rakesh', tz: TZ })).toEqual([
      { term: 'Owner', value: 'Rakesh' }, { term: 'Priority', value: 'P1' }, { term: 'Labels', value: 'estate, release' }, { term: 'Due', value: 'none' },
      { term: 'Attempt', value: '5' }, { term: 'Asked by', value: 'Rakesh' },
    ]);
    expect(cardFacts({ owner: '', priority: 0, labels: [], dueAt: '2026-10-20', attempts: 0, askedBy: '', tz: TZ }).map((f) => f.value)).toEqual(['nobody', 'none', 'none', '20 October', 'none yet']);
    expect(labelName({ id: 'lbl_x', name: 'lbl_x' })).toBe('a removed label');
    expect(labelName({ id: 'lbl_x', name: 'estate' })).toBe('estate');
    expect(costFact(1.5, 4)).toBe('$1.50 of $4.00 estimated');
    expect(costFact(1.5, null)).toBe('$1.50');
  });
  it('what was produced', () => {
    expect(producedTitle(5)).toBe('What attempt 5 produced');
    expect(producedTitle(0)).toBe('What it must produce');
    expect(producedMeta(1, 3)).toBe('one document · three criteria');
    expect(producedMeta(0, 1)).toBe('one criterion');
    expect(criterionKey(0)).toBe('AC-01');
    expect(countWords(12, 'entry', 'entries')).toBe('12 entries');
  });
  it('history meta, the crumb and the track line', () => {
    const now = Date.parse('2026-10-11T08:21:00Z');
    expect(historyMeta(12, '2026-10-10T22:21:00Z', now)).toBe('12 entries · last 10 hours ago');
    expect(historyMeta(1, null, now)).toBe('1 entry');
    expect(cardCrumb('Planning & Roadmap', 'Approved', '4854')).toBe('Planning & Roadmap · Approved · card 4854');
    expect(trackWho(true, 'keeper-karen', 10)).toBe('you · 10 h');
    expect(trackWho(false, 'builder-bo', 2.5)).toBe('builder-bo · 2 h');
    expect(trackWho(false, '', null)).toBe('');
  });
});
