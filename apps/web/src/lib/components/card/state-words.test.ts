// apps/web/src/lib/components/card/state-words.test.ts
import { describe, expect, it } from 'vitest';
import { attemptWord, eventSentence, eventVerb, pillTone, STOP_SENTENCE, stateWord, stopLine, stripAria, stripKind, trackStatus, waitingWord } from './state-words';
import { cardLead } from './card-lead';
import { ACTIVITIES_4605, ATTEMPTS_4605, CARD_4605, STAGES_DX } from './testing/card-4605';

const lead4605 = cardLead({ card: CARD_4605 });
const AGE_4605 = (Date.parse('2026-10-11T08:21:00Z') - Date.parse(CARD_4605.stateSince!)) / 3_600_000;

describe('state words', () => {
  it('4605 waits on you, for two days on desktop', () => {
    expect(stateWord(CARD_4605, lead4605)).toBe('Waiting on you');
    expect(waitingWord(CARD_4605, lead4605, AGE_4605, 'desktop')).toBe('Waiting on you · 2 days');
    expect(waitingWord(CARD_4605, lead4605, AGE_4605, 'phone')).toBe('Waiting on you');
    expect(pillTone(CARD_4605, lead4605)).toBe('needs');
  });
  it('an archived card says Archived and carries no signal', () => {
    const c = { ...CARD_4605, archivedAt: '2026-10-09T05:30:00Z' };
    expect(stateWord(c, lead4605)).toBe('Archived');
    expect(waitingWord(c, lead4605, AGE_4605, 'desktop')).toBe('Archived');
    expect(pillTone(c, lead4605)).toBe('off');
    expect(stripKind(lead4605, true)).toBe('archived');
  });
  it('other states name the state, never the raw value', () => {
    const idle = cardLead({ card: { ...CARD_4605, state: 'submitted', needsHuman: undefined } });
    expect(stateWord({ ...CARD_4605, state: 'submitted' }, idle)).toBe('Queued');
    const done = cardLead({ card: { ...CARD_4605, state: 'completed', needsHuman: undefined } });
    expect(stateWord({ ...CARD_4605, state: 'completed' }, done)).toBe('Done');
    expect(pillTone({ ...CARD_4605, state: 'completed' }, done)).toBe('done');
  });
});

describe('strip aria and the stop line', () => {
  it('drawer, cell and phone forms', () => {
    expect(stripAria(1, 7, 'Reproduce', 'stopped', 'drawer')).toBe('Stages: stage 2 of 7, Reproduce, stopped');
    expect(stripAria(1, 7, 'Reproduce', 'stopped', 'phone')).toBe('Stage 2 of 7, Reproduce, stopped here');
    expect(stripAria(4, 6, 'Recommendation', 'review', 'cell')).toBe('Stage 5 of 6, Recommendation, awaiting review');
    expect(stripAria(2, 5, 'Build', 'question', 'cell')).toBe('Stage 3 of 5, Build, question pending');
    expect(stripAria(2, 8, 'Messaging approval', 'archived', 'cell')).toBe('Stopped at stage 3 of 8, Messaging approval, archived');
  });
  it('says the verb, where, and what comes next', () => {
    expect(stopLine(lead4605, 1, STAGES_DX)).toBe('Stopped in stage 2 of 7. Next: Failing test.');
    expect(stopLine(lead4605, 6, STAGES_DX)).toBe('Stopped in stage 7 of 7.');
  });
});

describe('attempts and events', () => {
  it('derives sent back from a refused completion (plan ruling)', () => {
    expect(ATTEMPTS_4605.map(attemptWord)).toEqual(['sent back', 'stopped']);
    expect(attemptWord({ ...ATTEMPTS_4605[0]!, completion: { ok: true } })).toBe('done');
    expect(attemptWord({ ...ATTEMPTS_4605[0]!, outcome: 'failed', completion: null })).toBe('failed');
    expect(attemptWord({ ...ATTEMPTS_4605[0]!, outcome: null, completion: null })).toBe('working');
  });
  it('names an event by its action, its stop signal, or its type', () => {
    const run1 = ACTIVITIES_4605.find((a) => a.runId === 'run_fx_4605_1' && a.seq === 1)!;
    const first = ACTIVITIES_4605.find((a) => a.runId === 'run_fx_4605_2' && a.seq === 1)!;
    const stop = ACTIVITIES_4605.find((a) => a.runId === 'run_fx_4605_2' && a.seq === 14)!;
    expect([eventVerb(run1), eventVerb(first), eventVerb(stop)]).toEqual(['Sent back', 'Started', 'Stopped']);
    expect(eventVerb({ ...first, action: null, type: 'prompt' })).toBe('You said');
    expect(eventSentence(stop)).toBe(STOP_SENTENCE);
    expect(STOP_SENTENCE).toBe('Blocked. Waiting on you; the reason is shown at the top of this card.');
    expect(eventSentence(first)).toBe('Rework run on this card session; read prior persisted evidence first.');
  });
});

describe('trackStatus: the card page track word for vibekit StageTrack status', () => {
  it('keeps every failed-and-stopped kind as stopped, so the page words stay the same', () => {
    for (const k of ['stopped', 'failed', 'budget'] as const) expect(trackStatus(k)).toBe('stopped');
  });
  it('maps the calm and asking kinds to their own status', () => {
    expect(trackStatus('review')).toBe('review');
    expect(trackStatus('question')).toBe('question');
    expect(trackStatus('working')).toBe('working');
    expect(trackStatus('idle')).toBe('queued');
    expect(trackStatus('done')).toBe('done');
    expect(trackStatus('archived')).toBe('archived');
  });
});
