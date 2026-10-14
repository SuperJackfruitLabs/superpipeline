// apps/web/src/lib/components/workspace/workspace-counts.svelte.ts
import { getAgents, getCapabilities, getMembers, type AgentSummary, type CapabilityRecord, type Member } from '$lib/api';
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

/**
 * The last Crew lists this tab read, shared by the tab pills and the tab bodies. The pills used to
 * keep their counts across tab switches while each tab's model started again from nothing, so the
 * header said "32 agents" over a skeleton for as long as the list request took (seconds on a busy
 * workspace, and on every switch). A tab now opens on the list it last saw and refreshes behind it;
 * the pills and the tab bodies always agree.
 */
class CrewLists {
  agents = $state<AgentSummary[] | null>(null);
  capabilities = $state<CapabilityRecord[] | null>(null);
  members = $state<Member[] | null>(null);
  // Every read goes to the server (no sharing of an in-flight read: one that started before a change
  // would answer with the list from before it); the answer becomes the list a tab opens on next.
  #read<T>(fetch: () => Promise<T>, keep: (v: T) => void): Promise<T> {
    return fetch().then((v) => { keep(v); return v; });
  }
  readAgents(): Promise<AgentSummary[]> { return this.#read(getAgents, (v) => { this.agents = v; }); }
  readCapabilities(): Promise<CapabilityRecord[]> { return this.#read(getCapabilities, (v) => { this.capabilities = v; }); }
  readMembers(): Promise<Member[]> { return this.#read(getMembers, (v) => { this.members = v; }); }
  /** Tests only: forget every list. */
  clear(): void { this.agents = this.capabilities = this.members = null; }
}
export const crewLists = new CrewLists();

class Counts {
  value = $state<WorkspaceCounts>({ agents: null, capabilities: null, people: null });
  async refresh(): Promise<void> {
    const all = Promise.allSettled([crewLists.readAgents(), crewLists.readCapabilities(), crewLists.readMembers()]);
    app.markBusy(all);
    this.value = countsFrom((await all) as Settled);
  }
}
export const workspaceCounts = new Counts();
