// apps/web/src/lib/components/workspace/agents-model.svelte.ts
import { tick } from 'svelte';
import { capabilityTag } from '@superpipeline/contract';
import {
  getAgents, getCapabilities, createAgent, updateAgent, deleteAgent, issueAgentToken, revokeAgentToken, setAgentPrincipal,
  type AgentScope, type AgentSummary, type CapabilityRecord,
} from '$lib/api';
import { app } from '$lib/stores/app.svelte';
import { workspaceCounts } from './workspace-counts.svelte';

export interface MintedToken { agentName: string; token: string; scopes?: AgentScope[] }
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export class AgentsModel {
  agents = $state<AgentSummary[] | null>(null);
  capabilities = $state<CapabilityRecord[]>([]);
  loadError = $state<string | null>(null);
  error = $state<string | null>(null);
  minted = $state<MintedToken | null>(null);
  copied = $state(false);

  editingId = $state<string | null>(null);
  editName = $state('');
  editCaps = $state<string[]>([]);
  editConcurrency = $state(1);
  editIcon = $state('');
  editNewCap = $state('');
  saving = $state(false);

  newName = $state('');
  newCaps = $state<string[]>([]);
  newCap = $state('');
  minting = $state(false);

  /** Agents whose token list is expanded past the first two. */
  allTokens = $state<string[]>([]);

  canCreate = $derived(!this.minting && this.newName.trim() !== '' && this.newCaps.length > 0);

  async refresh(): Promise<void> {
    const load = Promise.all([getAgents(), getCapabilities().catch(() => [] as CapabilityRecord[])]);
    app.markBusy(load);
    try {
      [this.agents, this.capabilities] = await load;
      this.loadError = null;
    } catch (e) {
      this.loadError = message(e);
    }
  }

  private async changed(): Promise<void> {
    // Awaited, so a mutation's counts settle under the same busy mark as its list.
    await Promise.all([this.refresh(), workspaceCounts.refresh()]);
  }

  async startEdit(a: AgentSummary): Promise<void> {
    this.editingId = a.id;
    this.editName = a.name;
    this.editCaps = [...a.capabilities];
    this.editConcurrency = a.concurrency ?? 1;
    this.editIcon = a.iconUrl ?? '';
    this.editNewCap = '';
    this.error = null;
    await tick();
    document.getElementById('ed-name')?.focus();
  }

  async saveEdit(): Promise<void> {
    if (!this.editingId || this.editName.trim() === '') return;
    this.saving = true;
    this.error = null;
    try {
      const res = await updateAgent(this.editingId, {
        name: this.editName.trim(), capabilities: [...this.editCaps], concurrency: this.editConcurrency,
        iconUrl: this.editIcon.trim() === '' ? null : this.editIcon.trim(),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        this.error = body?.error ?? `Saving failed (${res.status})`;
        return;
      }
      this.editingId = null;
      await this.changed();
    } finally {
      this.saving = false;
    }
  }

  async onDelete(a: AgentSummary): Promise<void> {
    const loses = [
      a.tokenIds.length > 0 ? `${a.tokenIds.length} active token${a.tokenIds.length === 1 ? '' : 's'}` : null,
      a.externalId ? 'its link to AgentPod' : null,
    ].filter(Boolean);
    const detail = loses.length > 0 ? ` This also deletes ${loses.join(' and ')}.` : '';
    if (!confirm(`Delete ${a.name}?${detail} This cannot be undone.`)) return;
    if ((await deleteAgent(a.id)).ok) await this.changed();
  }

  onIssue(a: AgentSummary, scopes?: AgentScope[]): Promise<void> {
    // Busy from the click, not from the reply: data-ready must not read true while the token is in flight.
    return app.markBusy(this.#issue(a, scopes));
  }

  async #issue(a: AgentSummary, scopes?: AgentScope[]): Promise<void> {
    this.error = null;
    try {
      const t = await issueAgentToken(a.id, scopes);
      this.minted = { agentName: a.name, token: t.token, scopes: t.scopes ?? scopes };
      this.copied = false;
      await this.refresh();
    } catch (e) {
      this.error = message(e);
    }
  }

  async onRevoke(a: AgentSummary, tokenId: string): Promise<void> {
    if (!confirm('Revoke this token? The agent loses access immediately, and this cannot be undone.')) return;
    if ((await revokeAgentToken(a.id, tokenId)).ok) await this.refresh();
  }

  async onUnlink(a: AgentSummary): Promise<void> {
    if ((await setAgentPrincipal(a.id, null)).ok) await this.refresh();
  }

  async mint(): Promise<void> {
    if (!this.canCreate) return;
    this.minting = true;
    this.error = null;
    try {
      const t = await createAgent(this.newName.trim(), [...this.newCaps]);
      this.minted = { agentName: t.agent.name, token: t.token };
      this.copied = false;
      this.newName = '';
      this.newCaps = [];
      await this.changed();
    } catch (e) {
      this.error = message(e);
    } finally {
      this.minting = false;
    }
  }

  async copyToken(): Promise<void> {
    if (!this.minted) return;
    await navigator.clipboard?.writeText(this.minted.token);
    this.copied = true;
    setTimeout(() => (this.copied = false), 2000);
  }

  /** Enter in "Add a capability": the typed key, normalised, joins the selection pressed. */
  static addTyped(selected: string[], typed: string): string[] {
    const key = capabilityTag(typed);
    return key === '' || selected.includes(key) ? selected : [...selected, key];
  }
}
