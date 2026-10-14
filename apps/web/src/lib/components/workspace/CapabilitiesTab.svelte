<!-- apps/web/src/lib/components/workspace/CapabilitiesTab.svelte -->
<script lang="ts">
  import { autogrow } from '$lib/autogrow';
  import { Button, Face } from '@superjackfruit/vibekit';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { CapabilitiesModel } from './capabilities-model.svelte';
  import { agentCountText, capsHeading, holdersOf, INFERRED_TITLE } from './capability-notes';
  import { similarText } from './workspace-words';
  import PanelTag from './PanelTag.svelte';
  import NewCapabilityDialog from './dialogs/NewCapabilityDialog.svelte';
  import type { WorkspaceTabProps } from './types';

  let { review }: WorkspaceTabProps = $props();
  const model = new CapabilitiesModel();
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void model.refresh();
  let creating = $state(false);
  function openNew(): void { model.resetNew(); creating = true; }
</script>

{#snippet plusIcon()}<LineIcon name="plus" size={14} />{/snippet}
{#snippet newIcon()}<LineIcon name="plus" size={18} />{/snippet}

<section class={review?.span2 ? 'panel span2' : 'panel'} aria-labelledby="ct-h">
  <div class="panel-head" style="flex-wrap: wrap; align-items: flex-start;">
    <div style="display: flex; flex-direction: column; align-items: flex-start; gap: inherit; flex: 1 1 260px; min-width: 0;">
      {#if review}<PanelTag text={review.tag} />{/if}
      <h2 class="t-h2" id="ct-h">{model.capabilities === null ? 'Capabilities' : capsHeading(model.rows.length)}</h2>
      <p class="t-meta">What agents can do. A board stage asks for one; an agent holding it claims the card.</p>
    </div>
    <Button class="btn-sm" type="button" icon={newIcon} onclick={openNew}>New capability</Button>
  </div>
  {#if model.similar.length > 0}<p class="hint" role="status" style="padding: var(--vk-space-3) var(--vk-space-5) 0;">{similarText(model.similar)}</p>{/if}
  {#if model.error}<p class="hint" role="alert" style="padding: var(--vk-space-3) var(--vk-space-5) 0; color: var(--vk-color-signal-text);">{model.error}</p>{/if}
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
            <textarea class="input grow" id="cd-{c.key}" rows="1" placeholder="Add a description" use:autogrow={c.description} value={c.description ?? ''} onblur={(e) => void model.describe(c, e.currentTarget.value)} onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}></textarea>
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
</section>

<NewCapabilityDialog bind:open={creating} {model} />
