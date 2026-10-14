// apps/web/src/lib/components/workspace/agents-model.svelte.ts
import { tick } from 'svelte';
import { capabilityTag } from '@superpipeline/contract';
import {
  getAgents, getCapabilities, createAgent, updateAgent, deleteAgent, issueAgentToken, revokeAgentToken, setAgentPrincipal,
  type AgentScope, type AgentSummary, type CapabilityRecord,
} from '$lib/api';
import { app } from '$lib/stores/app.svelte';
import { crewLists, workspaceCounts } from './workspace-counts.svelte';

export interface MintedToken { agentName: string; token: string; scopes?: AgentScope[] }
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export class AgentsModel {
  // Opens on the list this tab last read (crewLists), refreshed behind it: never a skeleton under a known count.
  agents = $state<AgentSummary[] | null>(crewLists.agents);
  capabilities = $state<CapabilityRecord[]>(crewLists.capabilities ?? []);
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
  /** Text, as the field holds it; a whole number of at least 1 is sent. */
  newConcurrency = $state('1');
  newIcon = $state('');
  minting = $state(false);
  /** The New agent dialog's own error, so it shows in the dialog rather than under the list. */
  createError = $state<string | null>(null);

  /** Agents whose token list is expanded past the first two. */
  allTokens = $state<string[]>([]);

  canCreate = $derived(!this.minting && this.newName.trim() !== '' && this.newCaps.length > 0);

  async refresh(): Promise<void> {
    const load = Promise.all([crewLists.readAgents(), crewLists.readCapabilities().catch(() => [] as CapabilityRecord[])]);
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

  /** A blank New agent form, for each opening of the dialog. */
  resetNew(): void {
    this.newName = '';
    this.newCaps = [];
    this.newCap = '';
    this.newConcurrency = '1';
    this.newIcon = '';
    this.createError = null;
  }

  /** Creates the agent and issues its first token; true when it exists, so the dialog may close. */
  async mint(): Promise<boolean> {
    if (!this.canCreate) return false;
    const concurrency = Number(this.newConcurrency);
    if (!Number.isInteger(concurrency) || concurrency < 1) {
      this.createError = 'Cards at once must be a whole number of at least 1.';
      return false;
    }
    this.minting = true;
    this.createError = null;
    try {
      const t = await createAgent(this.newName.trim(), [...this.newCaps], undefined, { concurrency });
      this.minted = { agentName: t.agent.name, token: t.token };
      this.copied = false;
      // The create route takes no picture; a PATCH sets it. The agent exists either way, so a refused
      // picture is said under the list, not by keeping the dialog open on an agent already made.
      const icon = this.newIcon.trim();
      if (icon !== '') {
        const res = await updateAgent(t.agent.id, { iconUrl: icon });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          this.error = `${t.agent.name} was created, but its picture was not saved: ${body?.error ?? res.status}`;
        }
      }
      this.resetNew();
      await this.changed();
      return true;
    } catch (e) {
      this.createError = message(e);
      return false;
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
