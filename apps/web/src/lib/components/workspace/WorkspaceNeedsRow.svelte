<!-- apps/web/src/lib/components/workspace/WorkspaceNeedsRow.svelte -->
<script lang="ts">
  import { Button } from '@superjackfruit/vibekit';
  import type { AttentionItem } from '$lib/components/attention/attention';
  import { actionLink, chipClass, clip, metaLine, WS_KIND_LABEL } from './needs-row';
  import type { NeedsModel } from './needs-model.svelte';

  let { item, model }: { item: AttentionItem; model: NeedsModel } = $props();
  const c = $derived(item.detail ? clip(item.detail) : null);
  const full = $derived(model.expanded.includes(item.id));
  const open = $derived(model.openId === item.cardId);
</script>

<li class="nrow">
  <span class="chip {chipClass(item.kind)}" style="justify-self: start;">{WS_KIND_LABEL[item.kind]}</span>
  <div style="display: flex; flex-direction: column; gap: 4px; min-width: 0px;">
    <a class="t-h3" href="/b/{item.boardId}/c/{item.cardId}" style={c?.long ? 'text-decoration: none; overflow-wrap: anywhere;' : 'text-decoration: none;'}>{item.title}</a>
    <p class="t-meta">{metaLine(item)}</p>
    {#if c}
      <p class="t-body" data-reveal style={c.long ? 'overflow-wrap: anywhere;' : undefined}>{full ? item.detail : c.shown}{#if c.long}{' '}<Button variant="quiet" type="button" aria-expanded={full} style="min-height: 32px; padding: 0px 4px; font-size: 0.875rem;" onclick={() => model.toggleFull(item.id)}>{full ? 'Show less' : 'Show all'}</Button>{/if}</p>
    {/if}
    <p class="t-meta">{item.instruction}</p>
  </div>
  <div class="nacts">
    {#each item.actions as a (a)}
      {#if a === 'resume'}
        <Button variant="primary" class="btn-sm" aria-expanded={open} type="button" onclick={() => void model.toggleResume(item.cardId)}>Resume</Button>
      {:else}
        {@const l = actionLink(item, a)}
        {#if l}<Button variant={l.primary ? 'primary' : 'secondary'} class="btn-sm" href={l.href} style="text-decoration: none;">{l.label}</Button>{/if}
      {/if}
    {/each}
  </div>
  {#if open}
    <form class="resume" aria-label="Resume this card" onsubmit={(e) => { e.preventDefault(); void model.send(item); }}>
      <div class="field">
        <label for="rs-note">Note for the agent</label>
        <textarea class="input" id="rs-note" style="min-height: 72px;" maxlength="8000" bind:value={model.drafts[item.cardId]}></textarea>
      </div>
      {#if model.refusal}<p class="hint" role="alert" style="color: var(--vk-color-signal-text);">{model.refusal}</p>{/if}
      <div style="display: flex; gap: var(--vk-space-2);">
        <Button variant="primary" class="btn-sm" type="submit" aria-disabled={model.sending || (model.drafts[item.cardId] ?? '').trim() === '' ? 'true' : undefined}>Send back to work</Button>
        <Button variant="quiet" class="btn-sm" type="button" onclick={() => void model.toggleResume(item.cardId)}>Cancel</Button>
      </div>
      <span class="sr" role="status">{model.sending ? 'Sending it back to work…' : ''}</span>
    </form>
  {/if}
</li>
