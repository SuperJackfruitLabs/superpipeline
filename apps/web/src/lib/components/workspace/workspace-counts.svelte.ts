// apps/web/src/lib/components/workspace/workspace-counts.svelte.ts
import { getAgents, getCapabilities, getMembers, listAttention, listLabels } from '$lib/api';
import { app } from '$lib/stores/app.svelte';

export const WORKSPACE_TAB_IDS = ['needs-you', 'agents', 'capabilities', 'labels', 'people', 'connections'] as const;
export type WorkspaceTab = (typeof WORKSPACE_TAB_IDS)[number];
export interface WorkspaceCounts { needsYou: number | null; agents: number | null; capabilities: number | null; labels: number | null; people: number | null }
export interface WorkspaceTabItem { id: WorkspaceTab; label: string; count: number | null; signal: boolean }

type Settled = [
  PromiseSettledResult<{ cards: unknown[] }>, PromiseSettledResult<unknown[]>, PromiseSettledResult<unknown[]>,
  PromiseSettledResult<unknown[]>, PromiseSettledResult<unknown[]>,
];
const len = (r: PromiseSettledResult<unknown[]>) => (r.status === 'fulfilled' ? r.value.length : null);

/** A count that failed to load is null — the pill is left out, never shown as 0. */
export function countsFrom([needs, agents, caps, labels, people]: Settled): WorkspaceCounts {
  return { needsYou: needs.status === 'fulfilled' ? needs.value.cards.length : null, agents: len(agents), capabilities: len(caps), labels: len(labels), people: len(people) };
}

export function workspaceTabs(c: WorkspaceCounts): WorkspaceTabItem[] {
  return [
    { id: 'needs-you', label: 'Needs you', count: c.needsYou !== null && c.needsYou > 0 ? c.needsYou : null, signal: true },
    { id: 'agents', label: 'Agents', count: c.agents, signal: false },
    { id: 'capabilities', label: 'Capabilities', count: c.capabilities, signal: false },
    { id: 'labels', label: 'Labels', count: c.labels, signal: false },
    { id: 'people', label: 'People', count: c.people, signal: false },
    { id: 'connections', label: 'Connections', count: null, signal: false },
  ];
}

class Counts {
  value = $state<WorkspaceCounts>({ needsYou: null, agents: null, capabilities: null, labels: null, people: null });
  async refresh(): Promise<void> {
    const all = Promise.allSettled([listAttention(), getAgents(), getCapabilities(), listLabels(), getMembers()]);
    app.markBusy(all);
    this.value = countsFrom((await all) as Settled);
  }
}
export const workspaceCounts = new Counts();
