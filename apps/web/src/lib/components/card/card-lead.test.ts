import { describe, expect, it } from 'vitest';
import { cardLead, moodFor, moodWord } from './card-lead';

const card = (over: Record<string, unknown> = {}) =>
  ({ state: 'submitted', delegateAgentId: null, needsHuman: undefined, overBudget: false, stateSince: '2026-10-11T10:00:00Z', ...over }) as never;
const said = (body: string, ts: string) => ({ type: 'response', body, ts });

describe('cardLead: the agent speaks first', () => {
  it('a pending question is the lead, in the agent’s own words', () => {
    const l = cardLead({ card: card({ state: 'input-required' }), elicitation: { question: ' May I run the tests? ', agentId: 'agt_r', createdAt: '2026-10-11T11:00:00Z' } as never });
    expect(l).toEqual({ kind: 'question', needsYou: true, agentId: 'agt_r', sentence: 'May I run the tests?', source: 'question', at: '2026-10-11T11:00:00Z' });
  });

  it('a question wins over a gate', () => {
    const l = cardLead({ card: card(), gate: { summary: 'Ready' } as never, elicitation: { question: 'Q?', agentId: 'agt_r', createdAt: 'x' } as never });
    expect(l.kind).toBe('question');
  });

  it('a gate leads with its summary, else the latest thing the agent said', () => {
    expect(cardLead({ card: card({ delegateAgentId: 'agt_r' }), gate: { summary: 'Draft ready for review.' } as never }).sentence).toBe('Draft ready for review.');
    const l = cardLead({ card: card(), gate: { summary: null } as never, activities: [said('old', '2026-10-11T09:00:00Z'), said('newest', '2026-10-11T12:00:00Z'), { type: 'action', body: 'tool', ts: '2026-10-11T13:00:00Z' }] });
    expect(l).toMatchObject({ kind: 'review', needsYou: true, sentence: 'newest', source: 'narrative' });
  });

  it('a stopped card leads with needsHuman.detail', () => {
    const l = cardLead({ card: card({ state: 'input-required', needsHuman: { reason: 'repeated-failure', detail: 'Handoff refused twice: no commit.' } }) });
    expect(l).toMatchObject({ kind: 'stopped', needsYou: true, sentence: 'Handoff refused twice: no commit.', source: 'needs-human' });
  });

  it('a failed card leads with the failure reason', () => {
    expect(cardLead({ card: card({ state: 'failed' }), failureReason: 'Tests did not pass.' })).toMatchObject({ kind: 'failed', needsYou: true, sentence: 'Tests did not pass.', source: 'failure' });
  });

  it('over budget needs you; working, done and idle do not', () => {
    expect(cardLead({ card: card({ overBudget: true }) })).toMatchObject({ kind: 'budget', needsYou: true });
    expect(cardLead({ card: card({ state: 'working' }) })).toMatchObject({ kind: 'working', needsYou: false });
    expect(cardLead({ card: card({ state: 'completed' }) })).toMatchObject({ kind: 'done', needsYou: false });
    expect(cardLead({ card: card() })).toMatchObject({ kind: 'idle', needsYou: false, sentence: null, source: 'none' });
  });

  it('blank words are no words', () => {
    expect(cardLead({ card: card({ state: 'working' }), activities: [said('   ', '2026-10-11T12:00:00Z')] }).sentence).toBeNull();
  });

  it('moods follow the kind', () => {
    expect(moodFor('review', true)).toBe('needs');
    expect(moodFor('working', true)).toBe('working');
    expect(moodFor('done', false)).toBe('done');
    expect(moodFor('idle', true)).toBe('thinking');
    expect(moodFor('idle', false)).toBe('resting');
    expect(moodWord('needs')).toBe('needs you');
  });
});
