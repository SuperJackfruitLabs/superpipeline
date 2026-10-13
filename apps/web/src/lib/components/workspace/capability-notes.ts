// apps/web/src/lib/components/workspace/capability-notes.ts
import type { AgentSummary, CapabilityRecord } from '$lib/api';
import { joinAnd } from '$lib/words';

export interface CapNote { key: string; text: string; link: { label: string; href: string }; tail: string }
export const INFERRED_TITLE = 'Nobody defined this — it turned up in use';

export const holdersOf = (c: CapabilityRecord, agents: AgentSummary[]) => agents.filter((a) => a.capabilities.includes(c.key));

export function orphanNote(c: CapabilityRecord, holders: string[], boardId: string | null): CapNote {
  return {
    key: c.key,
    text: `is held by ${joinAnd(holders)} but no board stage asks for it, so it lets ${holders.length === 1 ? 'that agent' : 'them'} claim nothing.`,
    link: { label: 'Add a stage that asks for it', href: boardId ? `/b/${boardId}/settings` : '/' },
    tail: ' or remove it.',
  };
}

export function unstaffedNote(c: CapabilityRecord): CapNote {
  const n = c.boardCount;
  return { key: c.key, text: `is asked for by ${n} ${n === 1 ? 'board' : 'boards'} but no agent holds it, so cards there wait for ever.`, link: { label: 'Give it to an agent', href: '/workspace/agents' }, tail: '.' };
}

export const capsHeading = (n: number) => `${n} ${n === 1 ? 'capability' : 'capabilities'}`;
export const agentCountText = (n: number) => (n === 0 ? 'No agent' : `${n} ${n === 1 ? 'agent' : 'agents'}`);
