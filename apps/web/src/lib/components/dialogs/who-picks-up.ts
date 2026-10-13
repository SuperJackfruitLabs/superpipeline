// apps/web/src/lib/components/dialogs/who-picks-up.ts
/**
 * Who picks a card up in a stage, as the new-card composer and the Move dialog say it. Built on
 * `stageOwner()`: it reports who DECLARES a capability, never who can claim it.
 */
import type { AgentSummary, Stage } from '$lib/api';
import { stageOwner } from '$lib/components/board/stage-owner';

function requirement(stage: Stage): { caps: string[]; mode: 'all' | 'any' } {
  if (stage.requires?.all?.length) return { caps: stage.requires.all, mode: 'all' };
  if (stage.requires?.any?.length) return { caps: stage.requires.any, mode: 'any' };
  return { caps: stage.owner ? [stage.owner] : [], mode: 'any' };
}

/** "integration, api or testing" (any) · "code and review" (all). */
export function joinCaps(caps: string[], mode: 'all' | 'any'): string {
  if (caps.length <= 1) return caps.join('');
  return `${caps.slice(0, -1).join(', ')}${mode === 'all' ? ' and ' : ' or '}${caps[caps.length - 1]}`;
}

/** The one agent that alone works this stage: a stage pinned to an agent, or a capability one agent declares. */
export function soleAgent(stage: Stage, agents: AgentSummary[]): AgentSummary | null {
  if (stage.ownerKind === 'agent') return agents.find((a) => a.id === stage.owner) ?? null;
  const o = stageOwner(stage, agents);
  if (o.kind !== 'capability' || o.declaredBy.length !== 1) return null;
  return agents.find((a) => a.name === o.declaredBy[0]) ?? null;
}

/** The stage picker's option suffix: "a person", "approval gate", "error-eric", "2 agents". */
export function ownerShort(stage: Stage, agents: AgentSummary[]): string {
  const o = stageOwner(stage, agents);
  if (o.kind === 'human') return stage.gate === 'approval' ? 'approval gate' : 'a person';
  if (o.kind === 'agent') return o.label;
  const n = o.declaredBy.length;
  return n === 0 ? 'no agent yet' : n === 1 ? o.declaredBy[0]! : `${n} agents`;
}

/** The Move row's owner line: "diagnostics · error-eric", "code · 2 agents", "a person · approval". */
export function ownerLine(stage: Stage, agents: AgentSummary[]): string {
  const o = stageOwner(stage, agents);
  if (o.kind !== 'capability') return o.label;
  const n = o.declaredBy.length;
  return `${o.label} · ${n === 0 ? 'no agent yet' : n === 1 ? o.declaredBy[0] : `${n} agents`}`;
}

/** What happens to a card that lands here (D-13). */
export function pickupSentence(stage: Stage, stages: Stage[], agents: AgentSummary[]): string {
  const o = stageOwner(stage, agents);
  if (o.kind === 'human') {
    if (stage.gate === 'approval') return 'It waits here for a person to approve before it can ship.';
    const last = [...stages].sort((a, b) => a.order - b.order).at(-1);
    return last?.key === stage.key ? 'It lands with the finished work.' : 'A person picks it up here; no agent works this stage.';
  }
  if (o.kind === 'agent') return `${o.label} picks it up.`;
  const n = o.declaredBy.length;
  if (n === 0) return `No agent declares ${o.label} yet, so it waits here.`;
  if (n === 1) return `${o.declaredBy[0]} picks it up.`;
  const r = requirement(stage);
  return `One of the ${n} agents with ${joinCaps(r.caps, r.mode)} picks it up.`;
}

/** The composer foot, split so the stage name can be <strong>. */
export function dispatchFoot(stage: Stage, boardName: string, agents: AgentSummary[]): { before: string; stage: string; after: string } {
  const o = stageOwner(stage, agents);
  let where: string;
  if (o.kind === 'human') where = stage.gate === 'approval' ? 'a person approves it.' : 'a person picks it up.';
  else if (o.kind === 'agent') where = `${o.label} picks it up.`;
  else if (o.declaredBy.length === 0) where = `it waits: no agent declares ${o.label} yet.`;
  else if (o.declaredBy.length === 1) where = `${o.declaredBy[0]} picks it up.`;
  else { const r = requirement(stage); where = `one of the ${o.declaredBy.length} agents with ${joinCaps(r.caps, r.mode)} picks it up.`; }
  return { before: 'Goes to ', stage: stage.name, after: ` on ${boardName}, where ${where}` };
}
