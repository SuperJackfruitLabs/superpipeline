<!-- apps/web/src/lib/components/workspace/agents/AgentsPage.svelte -->
<script lang="ts">
  /** SP-Workspace-Agents-Daylight, -Paper and -Quiet: one DOM, three looks. */
  import './agents.css';
  import { Button } from '@superjackfruit/vibekit';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { agentsHeading, agentsPanelMeta, bannerTitle } from '../agent-status';
  import { AgentsModel } from '../agents-model.svelte';
  import { MenuState } from '../menu-state.svelte';
  import type { WorkspaceTabProps } from '../types';
  import AgentRow from './AgentRow.svelte';
  import AgentEditRow from './AgentEditRow.svelte';
  import NewAgentDialog from '../dialogs/NewAgentDialog.svelte';

  const _props: WorkspaceTabProps = $props();
  const model = new AgentsModel();
  const menus = new MenuState();
  // Loaded during init (ssr is off), so the busy mark is held before the first paint, never after it.
  void model.refresh();
  let creating = $state(false);
  function openNew(): void { model.resetNew(); creating = true; }
</script>

{#snippet keyIcon()}<LineIcon name="key" size={22} />{/snippet}
{#snippet copyIcon()}<LineIcon name="copy" size={18} />{/snippet}
{#snippet plusIcon()}<LineIcon name="plus" size={18} />{/snippet}

<svelte:document onclick={(e) => menus.onDocumentClick(e)} />

{#if model.minted}
  <div class="banner" role="status">
    <LineIcon name="key" size={22} />
    <p class="t-body" style="flex: 1 1 280px;"><strong>{bannerTitle(model.minted.agentName, model.minted.scopes)}</strong> Copy it now — it won't be shown again.</p>
    <code class="tokbox" aria-label="New token for {model.minted.agentName}">{model.minted.token}</code>
    <Button variant="secondary" class="btn-sm" icon={copyIcon} style="min-width: 152px;" onclick={() => void model.copyToken()}>{model.copied ? 'Copied' : 'Copy token'}</Button>
    <Button variant="quiet" class="btn-sm" onclick={() => (model.minted = null)}>Done</Button>
  </div>
{/if}

<section class="panel" aria-labelledby="agents-h">
  <div class="panel-head">
    {#if model.agents === null}
      <h2 class="t-h2" id="agents-h">Agents</h2>
    {:else}
      <h2 class="t-h2" id="agents-h">{agentsHeading(model.agents.length)}</h2>
      <span class="t-meta">{agentsPanelMeta(model.agents)}</span>
    {/if}
    <Button class="btn-sm" type="button" icon={plusIcon} style="margin-left: auto;" onclick={openNew}>New agent</Button>
  </div>
  <div class="panel-body legend" style="border-bottom: 1px solid var(--vk-color-line);">
    <div><span class="linked"><LineIcon name="check" size={18} /></span><p class="t-meta"><strong style="color: var(--vk-color-text);">Linked to AgentPod</strong> — this agent has an AgentPod identity, so it signs in as itself and its work shows under its own name.</p></div>
    <div><span><LineIcon name="key" size={18} /></span><p class="t-meta"><strong style="color: var(--vk-color-text);">Tokens</strong> — access keys it uses to reach this workspace. Revoke one from <em>Actions</em> if a station is retired.</p></div>
    <div><span><LineIcon name="dots" size={18} /></span><p class="t-meta"><strong style="color: var(--vk-color-text);">Actions</strong> — edit, issue or revoke tokens, unlink, delete.</p></div>
  </div>
  {#if model.agents === null && model.loadError}
    <div class="panel-body"><p class="t-meta" role="alert">Could not load the agents: {model.loadError}</p><Button variant="secondary" class="btn-sm" onclick={() => void model.refresh()}>Try again</Button></div>
  {:else if model.agents === null}
    <div class="panel-body" aria-busy="true"><span class="sr" role="status">Loading agents…</span>{#each [0, 1, 2] as k (k)}<div class="skel" style="height: 64px; margin-bottom: var(--vk-space-2);"></div>{/each}</div>
  {:else if model.agents.length === 0}
    <div class="panel-body"><p class="t-body">No agents yet. Create one with New agent — you'll get a token to point an AI agent at this workspace.</p></div>
  {:else}
    <div class="colhead t-eyebrow" aria-hidden="true"><span></span><span>Agent</span><span>Capabilities</span><span>AgentPod</span><span>Tokens</span><span style="min-width: 116px;"></span></div>
    <ul class="alist">
      {#each model.agents as a (a.id)}
        {#if model.editingId === a.id}<AgentEditRow agent={a} {model} />{:else}<AgentRow agent={a} {model} {menus} />{/if}
      {/each}
    </ul>
  {/if}
  {#if model.error && model.editingId === null}<p class="hint" role="alert" style="padding: 0 var(--vk-space-5) var(--vk-space-4); color: var(--vk-color-signal-text);">{model.error}</p>{/if}
</section>

<NewAgentDialog bind:open={creating} {model} />
