// apps/web/src/lib/components/plan/filter-words.ts
/** The Filter dialog's choices, in words: a person's name and a state in plain language, never an id or a raw value. */
import type { AgentSummary, Member } from '$lib/api';
import { STATE_WORD } from '../card/paper-words';

/** `submitted` → "Queued", `input-required` → "Waiting on you". An unknown state is spelled out, never shown raw. */
export function stateLabel(state: string): string {
  return STATE_WORD[state] ?? (state.replace(/[-_]+/g, ' ').trim() || 'Queued');
}

/** A card owner by name (a member, or the agent behind a principal); "someone" when the workspace cannot name them. */
export function ownerLabel(userId: string, members: Member[], agents: AgentSummary[]): string {
  const m = members.find((x) => x.userId === userId);
  const name = m?.name?.trim();
  if (name) return name;
  const agent = agents.find((a) => !!a.externalId && a.externalId === userId)?.name?.trim();
  if (agent) return agent;
  return m?.email || 'someone';
}
