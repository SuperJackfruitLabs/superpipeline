// apps/web/src/lib/components/workspace/capabilities-model.svelte.ts
import { createCapability, updateCapability, deleteCapability, addImplication, removeImplication, type AgentSummary, type CapabilityRecord } from '$lib/api';
import { similarKeys } from '@superpipeline/contract';
import { app } from '$lib/stores/app.svelte';
import { loadState } from '$lib/loading.svelte';
import { holdersOf, orphanNote, unstaffedNote, type CapNote } from './capability-notes';
import { crewLists, workspaceCounts } from './workspace-counts.svelte';
import { errorText } from '$lib/api/error-text';

export class CapabilitiesModel {
  // Opens on the list this tab last read (crewLists), refreshed behind it.
  capabilities = $state<CapabilityRecord[] | null>(crewLists.capabilities);
  agents = $state<AgentSummary[]>(crewLists.agents ?? []);
  error = $state<string | null>(null);
  /** The list could not be read: the tab says so with Try again (never an empty list, never the raw error). */
  failed = $state(false);
  /** Where the list read stands: skeleton, slow (with Try again), failed or ready. */
  readonly load = loadState(() => ({ value: this.capabilities, failed: this.failed }));
  newKey = $state('');
  newDescription = $state('');
  /** The New capability dialog's own error. */
  createError = $state<string | null>(null);
  similar = $state<string[]>([]);
  /** The key the New capability dialog last created, so the table can show it. */
  lastAdded = $state<string | null>(null);
  implyingFor = $state<string | null>(null);
  implyTo = $state('');

  rows: CapabilityRecord[] = $derived(this.capabilities ? [...this.capabilities].sort((a, b) => a.key.localeCompare(b.key)) : []);
  notes: CapNote[] = $derived([
    ...this.rows.filter((c) => c.boardCount === 0 && c.agentCount > 0).map((c) => orphanNote(c, holdersOf(c, this.agents).map((a) => a.name), app.boardId)),
    ...this.rows.filter((c) => c.agentCount === 0 && c.boardCount > 0).map(unstaffedNote),
  ]);

  async refresh(): Promise<void> {
    const load = Promise.all([crewLists.readCapabilities(), crewLists.readAgents().catch(() => [] as AgentSummary[])]);
    void app.markBusy(load);
    this.failed = false;
    try { [this.capabilities, this.agents] = await load; } catch { this.failed = true; }
  }

  /** Try again: read the list once more. */
  retry(): Promise<void> { return this.refresh(); }

  private async bodyError(res: Response, fallback: string): Promise<string> {
    const body: unknown = await res.json().catch(() => null);
    return errorText(body) ?? `${fallback} (${res.status})`;
  }

  /** Existing keys close to the name being typed: the same rule the server's hint uses. */
  typedSimilar: string[] = $derived(similarKeys(this.newKey, (this.capabilities ?? []).map((c) => c.key)));

  /** A blank New capability form, for each opening of the dialog. */
  resetNew(): void { this.newKey = ''; this.newDescription = ''; this.createError = null; }

  /** Creates the capability; true when it exists, so the dialog may close. */
  async add(): Promise<boolean> {
    const key = this.newKey.trim();
    if (key === '') { this.createError = 'A name is required.'; return false; }
    this.createError = null;
    this.similar = [];
    const description = this.newDescription.trim();
    const res = await createCapability(description === '' ? { key } : { key, description });
    const body = (await res.clone().json().catch(() => null)) as { similar?: string[] } | null;
    if (!res.ok) { this.createError = await this.bodyError(res, 'Adding failed'); return false; }
    this.similar = body?.similar ?? [];
    this.lastAdded = key;
    this.newKey = '';
    this.newDescription = '';
    await this.refresh();
    await workspaceCounts.refresh();
    return true;
  }

  /** The capability whose description is open for editing (from its actions menu), and the text in it. */
  describing = $state<string | null>(null);
  describeText = $state('');

  startDescribe(c: CapabilityRecord): void { this.implyingFor = null; this.describing = c.key; this.describeText = c.description ?? ''; }

  async saveDescribe(): Promise<void> {
    const c = this.capabilities?.find((x) => x.key === this.describing);
    if (!c) return;
    await this.describe(c, this.describeText);
    this.describing = null;
  }

  startImply(key: string): void { this.describing = null; this.implyingFor = key; this.implyTo = ''; }

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
