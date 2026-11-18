// apps/web/src/lib/components/workspace/agent-status.ts
import type { Mood } from '@superjackfruitlabs/vibekit-ui';
import type { AgentScope, AgentSummary, CapabilityRecord } from '$lib/api';

export interface AgentStatus { mood: Mood; line: string }

export function agentStatus(a: Pick<AgentSummary, 'claimedCount' | 'workingCount'>): AgentStatus {
  if (a.workingCount > 0) return { mood: 'working', line: `Working · ${a.claimedCount} claimed` };
  if (a.claimedCount > 0) return { mood: 'thinking', line: `Holding ${a.claimedCount} ${a.claimedCount === 1 ? 'card' : 'cards'}` };
  return { mood: 'resting', line: 'Resting · nothing claimed' };
}

/** Needs you: it holds a card it is not working, which waits on a person (a question or a review). */
export type AgentState = 'needs' | 'working' | 'resting';
export function agentState(a: Pick<AgentSummary, 'claimedCount' | 'workingCount'>): AgentState {
  if (a.claimedCount > a.workingCount) return 'needs';
  return a.workingCount > 0 ? 'working' : 'resting';
}
const STATE_MOOD: Record<AgentState, Mood> = { needs: 'needs', working: 'working', resting: 'resting' };
export const agentMood = (a: Pick<AgentSummary, 'claimedCount' | 'workingCount'>): Mood => STATE_MOOD[agentState(a)];

/** The agents table's cells: what it works, where it comes from, when it was last seen. */
export const agentWorks = (a: Pick<AgentSummary, 'capabilities'>): string => (a.capabilities.length > 0 ? a.capabilities.join(', ') : 'Nothing yet');
export const agentFrom = (a: Pick<AgentSummary, 'externalId'>): string => (a.externalId ? 'AgentPod' : 'This workspace');
/** The API records no last-seen time yet: an agent at work is seen now, any other is not recorded. */
export const agentSeen = (a: Pick<AgentSummary, 'workingCount'>): string => (a.workingCount > 0 ? 'Now' : 'Not recorded');

export function agentsPanelMeta(agents: AgentSummary[]): string {
  const n = agents.length;
  const k = agents.filter((a) => a.externalId !== null).length;
  const linked = k === n ? 'All linked to AgentPod' : k === 0 ? 'None linked to AgentPod' : `${k} of ${n} linked to AgentPod`;
  const w = agents.filter((a) => a.workingCount > 0).length;
  return `${linked} · ${w === 0 ? 'none working right now' : `${w} working right now`}`;
}

export const agentsHeading = (n: number) => `${n} ${n === 1 ? 'agent' : 'agents'}`;
export const tokensLabel = (n: number) => `${n} ${n === 1 ? 'token' : 'tokens'}`;
export const tokensInUse = (n: number) => (n === 0 ? 'No tokens in use' : `${n} ${n === 1 ? 'token' : 'tokens'} in use`);

/** The menu lists two tokens, then "and N more · show all N". */
export function moreTokens(n: number): { more: string; link: string } | null {
  return n > 2 ? { more: `and ${n - 2} more · `, link: `show all ${n}` } : null;
}

export function bannerTitle(name: string, scopes?: AgentScope[]): string {
  return scopes && !scopes.includes('claim') ? `${name}'s run-only token.` : `${name}'s token.`;
}

/** Registry order (the API returns created order, A–Z in the fixture), then keys typed in, in the order added. */
export function chipKeys(registry: CapabilityRecord[], selected: string[]): string[] {
  const keys = registry.map((c) => c.key);
  return [...keys, ...selected.filter((k) => !keys.includes(k))];
}

/** No board stage asks for it (or nobody defined it): an agent holding only this claims nothing. */
export function isUnusedCap(key: string, registry: CapabilityRecord[]): boolean {
  const rec = registry.find((c) => c.key === key);
  return !rec || rec.boardCount === 0;
}
