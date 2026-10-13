// apps/web/src/lib/components/workspace/capabilities-model.svelte.ts
import { getAgents, getCapabilities, createCapability, updateCapability, deleteCapability, addImplication, removeImplication, type AgentSummary, type CapabilityRecord } from '$lib/api';
import { app } from '$lib/stores/app.svelte';
import { holdersOf, orphanNote, unstaffedNote, type CapNote } from './capability-notes';
import { workspaceCounts } from './workspace-counts.svelte';

export class CapabilitiesModel {
  capabilities = $state<CapabilityRecord[] | null>(null);
  agents = $state<AgentSummary[]>([]);
  error = $state<string | null>(null);
  newKey = $state('');
  similar = $state<string[]>([]);
  implyingFor = $state<string | null>(null);
  implyTo = $state('');

  rows: CapabilityRecord[] = $derived(this.capabilities ? [...this.capabilities].sort((a, b) => a.key.localeCompare(b.key)) : []);
  notes: CapNote[] = $derived([
    ...this.rows.filter((c) => c.boardCount === 0 && c.agentCount > 0).map((c) => orphanNote(c, holdersOf(c, this.agents).map((a) => a.name), app.boardId)),
    ...this.rows.filter((c) => c.agentCount === 0 && c.boardCount > 0).map(unstaffedNote),
  ]);

  async refresh(): Promise<void> {
    const load = Promise.all([getCapabilities(), getAgents().catch(() => [] as AgentSummary[])]);
    app.markBusy(load);
    try { [this.capabilities, this.agents] = await load; } catch (e) { this.error = e instanceof Error ? e.message : String(e); this.capabilities ??= []; }
  }

  private async bodyError(res: Response, fallback: string): Promise<string> {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    return body?.error ?? `${fallback} (${res.status})`;
  }

  async add(): Promise<void> {
    const key = this.newKey.trim();
    if (key === '') return;
    this.error = null;
    this.similar = [];
    const res = await createCapability({ key });
    const body = (await res.clone().json().catch(() => null)) as { similar?: string[] } | null;
    if (!res.ok) { this.error = await this.bodyError(res, 'Adding failed'); return; }
    this.similar = body?.similar ?? [];
    this.newKey = '';
    await this.refresh();
    await workspaceCounts.refresh();
  }

  startImply(key: string): void { this.implyingFor = key; this.implyTo = ''; }

  async imply(from: string): Promise<void> {
    const to = this.implyTo.trim();
    if (to === '') return;
    this.error = null;
    const res = await addImplication(from, to);
    if (!res.ok) { this.error = await this.bodyError(res, 'Could not record that'); return; }
    this.implyingFor = null;
    this.implyTo = '';
    await this.refresh();
  }

  async unimply(from: string, to: string): Promise<void> { await removeImplication(from, to); await this.refresh(); }

  async describe(c: CapabilityRecord, description: string): Promise<void> {
    if (description.trim() === (c.description ?? '')) return;
    await updateCapability(c.id, { description: description.trim() });
    await this.refresh();
  }

  async remove(c: CapabilityRecord): Promise<void> {
    this.error = null;
    const res = await deleteCapability(c.id);
    if (!res.ok) this.error = await this.bodyError(res, 'Removing failed');
    await this.refresh();
    await workspaceCounts.refresh();
  }
}
