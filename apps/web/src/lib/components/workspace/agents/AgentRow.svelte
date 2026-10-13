<!-- apps/web/src/lib/components/workspace/agents/AgentRow.svelte -->
<script lang="ts">
  import { Face } from '@superjackfruit/vibekit';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import type { AgentSummary } from '$lib/api';
  import { agentStatus, tokensLabel } from '../agent-status';
  import type { AgentsModel } from '../agents-model.svelte';
  import type { MenuState } from '../menu-state.svelte';
  import AgentMenu from './AgentMenu.svelte';

  let { agent, model, menus }: { agent: AgentSummary; model: AgentsModel; menus: MenuState } = $props();
  const status = $derived(agentStatus(agent));
  const act = (fn: () => void) => () => { menus.close(); fn(); };
</script>

<li class="arow">
  <Face id={agent.name} label={agent.name} mood={status.mood} size={32} src={agent.iconUrl ?? undefined} />
  <div style="min-width: 0px;">
    <p class="t-h3" style="overflow-wrap: anywhere;">{agent.name}</p>
    <p class="t-meta">{status.line}</p>
  </div>
  <div class="caps">
    {#each agent.capabilities as c (c)}<span class="chip chip-line">{c}</span>{:else}<span class="t-meta">No capabilities — this agent can claim nothing</span>{/each}
  </div>
  {#if agent.externalId}
    <p class="t-meta linked"><LineIcon name="check" size={16} /><span>Linked to AgentPod</span></p>
  {:else}
    <p class="t-meta">Not linked</p>
  {/if}
  <p class="t-meta t-num" style="color: var(--vk-color-text);">{tokensLabel(agent.tokenIds.length)}</p>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -- Escape closes the menu and returns focus to its summary -->
  <details class="menu" open={menus.open === agent.id} ontoggle={(e) => menus.toggle(agent.id, e.currentTarget.open)} onkeydown={(e) => menus.onKeydown(e)}>
    <summary class="vk-button vk-button--secondary btn-sm" aria-label="Actions for {agent.name}" style="min-width: 116px;">Actions <span class="disc-ico"><LineIcon name="chev-down" size={16} /></span></summary>
    <AgentMenu {agent} form="page" showAll={model.allTokens.includes(agent.id)}
      onEdit={act(() => void model.startEdit(agent))} onIssue={(s) => { menus.close(); void model.onIssue(agent, s); }}
      onUnlink={act(() => void model.onUnlink(agent))} onRevoke={(t) => void model.onRevoke(agent, t)}
      onDelete={act(() => void model.onDelete(agent))} onShowAll={() => (model.allTokens = [...model.allTokens, agent.id])} />
  </details>
</li>
