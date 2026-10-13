// apps/web/src/lib/components/workspace/connections-model.svelte.ts
import { getWorkspace, setWorkspaceFleet, getForgeHost, setForgeHost, getHubPrincipals, getAgents, getCapabilities, createAgent, type WorkspaceTenant, type HubPrincipal, type AgentSummary, type CapabilityRecord } from '$lib/api';
import { beginHubAuthorization, hubStatus } from '$lib/hub-token';
import { app } from '$lib/stores/app.svelte';
import { FORGE_HOST_ERROR } from './workspace-words';

export class ConnectionsModel {
  loading = $state(true);
  workspace = $state<WorkspaceTenant | null>(null);
  agents = $state<AgentSummary[]>([]);
  capabilities = $state<CapabilityRecord[]>([]);
  principals = $state<HubPrincipal[] | null>(null);
  forgeHost = $state<string | null>(null);
  editingForge = $state(false);
  forgeInput = $state('');
  forgeError = $state<string | null>(null);
  editingFleet = $state(false);
  fleetInput = $state('');
  error = $state<string | null>(null);
  saving = $state(false);
  connecting = $state(false);
  picked = $state<string[]>([]);
  importCaps = $state<string[]>([]);
  importTyped = $state('');
  importing = $state(false);
  importResult = $state<string | null>(null);

  /** Fleet agents with no workspace agent yet. A hub that is not connected counts as none. */
  linkable: HubPrincipal[] = $derived((this.principals ?? []).filter((p) => !this.agents.some((a) => a.externalId === p.id)));

  async refresh(): Promise<void> {
    const load = (async () => {
      [this.workspace, this.agents, this.capabilities, this.forgeHost] = await Promise.all([
        getWorkspace().catch(() => null), getAgents().catch(() => []), getCapabilities().catch(() => []), getForgeHost().catch(() => null),
      ]);
      const status = await hubStatus().catch(() => ({ configured: false }));
      this.principals = status.configured ? await getHubPrincipals().catch(() => null) : null;
    })();
    app.markBusy(load);
    await load;
    this.loading = false;
  }

  startForge(): void { this.editingForge = true; this.forgeInput = this.forgeHost ?? ''; this.forgeError = null; }
  async saveForge(): Promise<void> {
    const next = this.forgeInput.trim();
    const res = await setForgeHost(next === '' ? null : next);
    if (!res.ok) { this.forgeError = next === '' ? `Could not clear the forge (${res.status}).` : FORGE_HOST_ERROR; return; }
    this.forgeHost = await getForgeHost();
    this.editingForge = false;
  }

  startFleet(): void { this.editingFleet = true; this.fleetInput = this.workspace?.externalId ?? ''; this.error = null; }
  async saveFleet(): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    try {
      const v = this.fleetInput.trim();
      const res = await setWorkspaceFleet(v === '' ? null : v);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        this.error = body?.error ?? `Linking failed (${res.status})`;
        return;
      }
      this.editingFleet = false;
      await this.refresh();
    } finally { this.saving = false; }
  }

  async connect(): Promise<void> {
    if (this.connecting) return;
    this.connecting = true;
    try { await beginHubAuthorization(); } finally { this.connecting = false; }
  }

  togglePicked(id: string): void { this.picked = this.picked.includes(id) ? this.picked.filter((x) => x !== id) : [...this.picked, id]; }

  async addPicked(): Promise<void> {
    if (this.importing || this.picked.length === 0 || this.importCaps.length === 0) return;
    this.importing = true;
    this.importResult = null;
    const failures: string[] = [];
    try {
      for (const id of this.picked) {
        const p = this.linkable.find((x) => x.id === id);
        if (!p) continue;
        try { await createAgent(p.handle, [...this.importCaps], p.id); } catch (e) { failures.push(`${p.handle}: ${e instanceof Error ? e.message : String(e)}`); }
      }
      this.picked = [];
      this.importResult = failures.length === 0 ? null : failures.join('; ');
      await this.refresh();
    } finally { this.importing = false; }
  }
}
