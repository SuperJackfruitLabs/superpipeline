// apps/web/src/lib/components/workspace/workspace-counts.svelte.ts
import { getAgents, getCapabilities, getMembers } from '$lib/api';
import { app } from '$lib/stores/app.svelte';

/** Every tab component the workspace pages still draw (the dev review route draws the old set). */
export const WORKSPACE_TAB_IDS = ['needs-you', 'agents', 'capabilities', 'labels', 'people', 'connections'] as const;
export type WorkspaceTab = (typeof WORKSPACE_TAB_IDS)[number];
/** Crew (nav v2): Agents, People, Capabilities. Needs you is the Inbox; Labels and Connections are in Settings. */
export const CREW_TAB_IDS = ['agents', 'people', 'capabilities'] as const;
export type CrewTab = (typeof CREW_TAB_IDS)[number];
export interface WorkspaceCounts { agents: number | null; capabilities: number | null; people: number | null }
export interface WorkspaceTabItem { id: CrewTab; label: string; count: number | null }

type Settled = [PromiseSettledResult<unknown[]>, PromiseSettledResult<unknown[]>, PromiseSettledResult<unknown[]>];
const len = (r: PromiseSettledResult<unknown[]>) => (r.status === 'fulfilled' ? r.value.length : null);

/** A count that failed to load is null — the pill is left out, never shown as 0. */
export function countsFrom([agents, caps, people]: Settled): WorkspaceCounts {
  return { agents: len(agents), capabilities: len(caps), people: len(people) };
}

export function crewTabs(c: WorkspaceCounts): WorkspaceTabItem[] {
  return [
    { id: 'agents', label: 'Agents', count: c.agents },
    { id: 'people', label: 'People', count: c.people },
    { id: 'capabilities', label: 'Capabilities', count: c.capabilities },
  ];
}

class Counts {
  value = $state<WorkspaceCounts>({ agents: null, capabilities: null, people: null });
  async refresh(): Promise<void> {
    const all = Promise.allSettled([getAgents(), getCapabilities(), getMembers()]);
    app.markBusy(all);
    this.value = countsFrom((await all) as Settled);
  }
}
export const workspaceCounts = new Counts();
