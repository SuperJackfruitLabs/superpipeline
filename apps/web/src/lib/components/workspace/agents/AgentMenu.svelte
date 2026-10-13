<!-- apps/web/src/lib/components/workspace/agents/AgentMenu.svelte -->
<script lang="ts">
  /** The pop-up inside `details.menu`: the same items in both DOMs; Studio swaps the text classes. */
  import { Button } from '@superjackfruit/vibekit';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import type { AgentScope, AgentSummary } from '$lib/api';
  import { moreTokens, tokensInUse } from '../agent-status';

  let { agent, form, showAll, onEdit, onIssue, onUnlink, onRevoke, onDelete, onShowAll }: {
    agent: AgentSummary; form: 'page' | 'studio'; showAll: boolean;
    onEdit: () => void; onIssue: (scopes?: AgentScope[]) => void; onUnlink: () => void; onRevoke: (tokenId: string) => void; onDelete: () => void; onShowAll: () => void;
  } = $props();

  const C = $derived(form === 'studio'
    ? { meta: 'wa-meta', eyebrow: 'kick', body: 'wa-body', stroke: 1.75 }
    : { meta: 't-meta', eyebrow: 't-eyebrow', body: 't-body', stroke: 1.8 });
  const n = $derived(agent.tokenIds.length);
  const shown = $derived(showAll ? agent.tokenIds : agent.tokenIds.slice(0, 2));
  const more = $derived(showAll ? null : moreTokens(n));
</script>

<div class="menu-pop" role="menu" aria-label="Actions for {agent.name}">
  <button class="mi" role="menuitem" type="button" onclick={onEdit}><LineIcon name="pencil" size={18} stroke={C.stroke} />Edit agent</button>
  <button class="mi" role="menuitem" type="button" onclick={() => onIssue()}><LineIcon name="key" size={18} stroke={C.stroke} />Issue a token</button>
  <button class="mi" role="menuitem" type="button" onclick={() => onIssue(['run'])}><LineIcon name="key" size={18} stroke={C.stroke} />Issue a run-only token<span class={C.meta} style="margin-left: auto;">can run cards, not change them</span></button>
  {#if agent.externalId}
    <button class="mi" role="menuitem" type="button" onclick={onUnlink}><LineIcon name="link" size={18} stroke={C.stroke} />Unlink from AgentPod</button>
  {/if}
  <div class="mi-group">
    <p class={C.eyebrow} style="padding: 0 var(--vk-space-3);">{tokensInUse(n)}</p>
    {#each shown as t, i (t)}
      <div class="tokrow">
        <span class={C.body}>Token {i + 1}</span>
        <span class={C.meta}>issued to {agent.name}</span>
        <!-- Revoke is an ink outline (the danger variant), never the signal. -->
        <Button variant="danger" class="btn-sm" aria-label="Revoke token {i + 1} of {agent.name}" title={t} onclick={() => onRevoke(t)}>Revoke</Button>
      </div>
    {/each}
    {#if more}
      <p class={C.meta} style="padding: 0 var(--vk-space-3);">{more.more}<a href="#show-all-{agent.id}" onclick={(e) => { e.preventDefault(); onShowAll(); }}>{more.link}</a></p>
    {/if}
  </div>
  <button class="mi mi-danger" role="menuitem" type="button" onclick={onDelete}><LineIcon name="trash" size={18} stroke={C.stroke} />Delete agent…</button>
</div>
