<!-- apps/web/src/lib/components/workspace/CapabilitiesTab.svelte -->
<script lang="ts">
  import { Button, Face } from '@superjackfruit/vibekit';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { CapabilitiesModel } from './capabilities-model.svelte';
  import { agentCountText, capsHeading, holdersOf, INFERRED_TITLE } from './capability-notes';
  import { similarText } from './workspace-words';
  import PanelTag from './PanelTag.svelte';
  import type { WorkspaceTabProps } from './types';

  let { review }: WorkspaceTabProps = $props();
  const model = new CapabilitiesModel();
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void model.refresh();
</script>

{#snippet plusIcon()}<LineIcon name="plus" size={14} />{/snippet}

<section class={review?.span2 ? 'panel span2' : 'panel'} aria-labelledby="ct-h">
  <div class="panel-head" style="flex-direction: column; align-items: flex-start;">
    {#if review}<PanelTag text={review.tag} />{/if}
    <h2 class="t-h2" id="ct-h">{model.capabilities === null ? 'Capabilities' : capsHeading(model.rows.length)}</h2>
    <p class="t-meta">What agents can do. A board stage asks for one; an agent holding it claims the card.</p>
  </div>
  {#if model.capabilities === null}
    <p class="panel-body t-meta" role="status">Loading capabilities…</p>
  {:else}
    {#if model.notes.length > 0 || review?.note}
      <div class="panel-body" style="display: flex; flex-direction: column; gap: var(--vk-space-2); border-bottom: 1px solid var(--vk-color-line);">
        {#each model.notes as n (n.key)}
          <div class="note"><LineIcon name="info" size={20} /><p class="t-body" style="font-size: 0.9375rem;"><strong>{n.key}</strong> {n.text} <a href={n.link.href}>{n.link.label}</a>{n.tail}</p></div>
        {/each}
        {#if review?.note}<p class="t-meta">{review.note}</p>{/if}
      </div>
    {/if}
    <ul style="list-style: none; margin: 0px; padding: 0px;">
      {#each model.rows as c (c.id)}
        <li class="crow">
          <div style="min-width: 0px;">
            <p class="t-h3">{c.key}</p>
            <p class="t-meta" style="display: flex; gap: 8px; align-items: center;"><span class="stack">{#each holdersOf(c, model.agents) as a (a.id)}<span class="face" style="width: 24px; height: 24px;"><Face id={a.name} label={a.name} mood="resting" size={24} src={a.iconUrl ?? undefined} /></span>{/each}</span>{agentCountText(c.agentCount)}</p>
          </div>
          <div style="min-width: 0px;">
            <label class="sr" for="cd-{c.key}">Description of {c.key}</label>
            <input class="input" id="cd-{c.key}" placeholder="Add a description" value={c.description ?? ''} style="min-height: 44px;" onblur={(e) => void model.describe(c, e.currentTarget.value)} />
          </div>
          <div class="caps">
            {#each c.implies ?? [] as to (to)}
              <span class="chip chip-line">implies {to}<button class="iconbtn" aria-label="Remove implies {to}" type="button" style="width: 28px; height: 28px;" onclick={() => void model.unimply(c.key, to)}><LineIcon name="close" size={14} /></button></span>
            {/each}
            {#if c.boardCount === 0}<span class="chip chip-line">no board asks</span>{/if}
            {#if c.origin === 'inferred'}<span class="chip chip-line" title={INFERRED_TITLE}>inferred</span>{/if}
            {#if model.implyingFor === c.key}
              <form style="display: inline-flex; gap: 6px;" onsubmit={(e) => { e.preventDefault(); void model.imply(c.key); }}>
                <label class="sr" for="im-{c.key}">{c.key} implies</label>
                <input class="input" id="im-{c.key}" placeholder="e.g. analysis" style="width: 160px; min-height: 36px;" bind:value={model.implyTo} />
                <Button variant="secondary" class="btn-sm" type="submit">Add</Button>
              </form>
            {:else}
              <Button variant="quiet" icon={plusIcon} aria-label="Add an implied capability to {c.key}" type="button" style="min-height: 44px; font-size: 0.875rem;" onclick={() => model.startImply(c.key)}>Implies…</Button>
            {/if}
          </div>
          <button class="iconbtn" aria-label="Remove {c.key}" type="button" onclick={() => void model.remove(c)}><LineIcon name="trash" /></button>
        </li>
      {/each}
    </ul>
  {/if}
  <form class="panel-body" style="border-top: 1px solid var(--vk-color-line); display: flex; flex-wrap: wrap; gap: var(--vk-space-2); align-items: flex-end;" onsubmit={(e) => { e.preventDefault(); void model.add(); }}>
    <div class="field" style="flex: 1 1 220px;"><label for="cap-new">Add a capability</label><input class="input" id="cap-new" placeholder="e.g. diagnostics" bind:value={model.newKey} /></div>
    <Button variant="secondary" class="btn-sm" type="submit">Add</Button>
    <p class="hint" style="flex-basis: 100%;">If the name is close to one you have, a “similar to …” hint appears after you add it.</p>
    {#if model.similar.length > 0}<p class="hint" role="status" style="flex-basis: 100%;">{similarText(model.similar)}</p>{/if}
    {#if model.error}<p class="hint" role="alert" style="flex-basis: 100%; color: var(--vk-color-signal-text);">{model.error}</p>{/if}
  </form>
</section>
