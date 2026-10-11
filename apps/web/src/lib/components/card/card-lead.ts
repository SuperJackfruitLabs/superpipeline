/**
 * What the agent needs, in its own words, first (vibekit spec: "The agent speaks first").
 *
 * Pure, and fed only what the caller has: the board snapshot gives the question, the gate and
 * needsHuman; the drawer adds the activities and the latest failure reason. The sentence is the
 * agent's text, trimmed, never rewritten. When there is none, layouts show the kind's fallback
 * from copy.ts in the vibe's words.
 */
import type { Mood } from '@superjackfruit/vibekit';
import type { Card, Elicitation, Gate } from '$lib/api';

export type LeadKind = 'question' | 'review' | 'stopped' | 'failed' | 'budget' | 'working' | 'done' | 'idle';
export interface CardLead {
  kind: LeadKind;
  needsYou: boolean;
  agentId: string | null;
  sentence: string | null;
  source: 'question' | 'gate' | 'needs-human' | 'failure' | 'narrative' | 'none';
  at: string | null;
}
export interface LeadInput {
  card: Pick<Card, 'state' | 'delegateAgentId' | 'needsHuman' | 'overBudget' | 'stateSince'>;
  gate?: Pick<Gate, 'summary'> | null;
  elicitation?: Pick<Elicitation, 'question' | 'agentId' | 'createdAt'> | null;
  activities?: ReadonlyArray<{ type: string; body?: string | null; ts: string }>;
  failureReason?: string | null;
}

const clean = (s: string | null | undefined): string | null => {
  const t = s?.trim();
  return t ? t : null;
};

function latestSaid(acts: LeadInput['activities']): { body: string; ts: string } | null {
  let best: { body: string; ts: string } | null = null;
  for (const a of acts ?? []) {
    const body = a.type === 'response' ? clean(a.body) : null;
    if (body && (!best || a.ts > best.ts)) best = { body, ts: a.ts };
  }
  return best;
}

export function cardLead(i: LeadInput): CardLead {
  const { card } = i;
  const agentId = card.delegateAgentId ?? null;
  const said = latestSaid(i.activities);
  const told = (kind: LeadKind, needsYou: boolean, own: string | null, ownSource: CardLead['source']): CardLead =>
    own
      ? { kind, needsYou, agentId, sentence: own, source: ownSource, at: card.stateSince ?? null }
      : { kind, needsYou, agentId, sentence: said?.body ?? null, source: said ? 'narrative' : 'none', at: said?.ts ?? card.stateSince ?? null };

  if (i.elicitation) {
    return { kind: 'question', needsYou: true, agentId: i.elicitation.agentId, sentence: clean(i.elicitation.question), source: 'question', at: i.elicitation.createdAt };
  }
  if (i.gate) return told('review', true, clean(i.gate.summary), 'gate');
  if (card.state === 'failed') return told('failed', true, clean(i.failureReason), 'failure');
  if (card.state === 'input-required') return told('stopped', true, clean(card.needsHuman?.detail), 'needs-human');
  if (card.overBudget) return told('budget', true, null, 'none');
  if (card.state === 'working') return told('working', false, null, 'none');
  if (card.state === 'completed') return told('done', false, null, 'none');
  return told('idle', false, null, 'none');
}

export function moodFor(kind: LeadKind, claimed: boolean): Mood {
  if (kind === 'working') return 'working';
  if (kind === 'done') return 'done';
  if (kind === 'idle') return claimed ? 'thinking' : 'resting';
  return 'needs';
}

export const moodWord = (m: Mood): string => (m === 'needs' ? 'needs you' : m);
