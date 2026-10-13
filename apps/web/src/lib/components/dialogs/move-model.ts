// apps/web/src/lib/components/dialogs/move-model.ts
import type { Mood } from '@superjackfruit/vibekit';
import type { AgentSummary, Stage } from '$lib/api';
import { ageLabel } from '$lib/age';
import { pickupSentence, soleAgent } from './who-picks-up';

/** The next stage, or the previous one when the card is in the last. */
export function initialPick(stages: Stage[], hereKey: string): string | null {
  const ordered = [...stages].sort((a, b) => a.order - b.order);
  const i = ordered.findIndex((s) => s.key === hereKey);
  return ordered[i + 1]?.key ?? ordered[i - 1]?.key ?? null;
}

export function stageCountText(count: number, blocked: number): string {
  return (count === 0 ? 'Empty' : `${count} card${count === 1 ? '' : 's'}`) + (blocked > 0 ? ` · ${blocked} blocked` : '');
}

export function dirLabel(i: number, here: number): 'back' | 'forward' | '' {
  return i < here ? 'back' : i > here ? 'forward' : '';
}

/** "tester-tim stopped 33h ago": what the card is doing now (ages follow F §A.2 through ageLabel). */
export function moveNowLead(x: { kind: string; ageHours: number | null; agentName: string | null }): string {
  const who = x.agentName ?? 'The agent';
  switch (x.kind) {
    case 'stopped': return `${who} stopped ${ageLabel(x.ageHours) ?? 'a while'} ago`;
    case 'working': return `${who} is working`;
    case 'question': return `${who} asked a question`;
    case 'review': return 'waiting for your review';
    case 'done': return 'Done';
    default: return 'Queued';
  }
}

export function moveThen(pick: Stage, stages: Stage[], agents: AgentSummary[]): string {
  return `In ${pick.name}: ${pickupSentence(pick, stages, agents)}`;
}

export function primaryLabel(pickName: string, pending: boolean): string {
  return pending ? 'Moving…' : `Move to ${pickName}`;
}

/** A 20px face beside a stage owned by one agent: the moved card's mood when it is that card's agent, else resting. */
export function ownerFace(stage: Stage, agents: AgentSummary[], moved: { agentId: string | null; mood: Mood }): { id: string; name: string; mood: Mood } | null {
  const a = soleAgent(stage, agents);
  return a ? { id: a.id, name: a.name, mood: a.id === moved.agentId ? moved.mood : 'resting' } : null;
}
