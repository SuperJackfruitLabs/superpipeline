<!-- apps/web/src/lib/components/operate/BoardLog.svelte -->
<script lang="ts">
  import { clockHMS } from '$lib/when';
  import { Button } from '@superjackfruit/vibekit';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { app } from '$lib/stores/app.svelte';
  import { eventLabel, logMeta, rawLine, shortId, shortTitle } from './spend-format';
  import type { BoardLogProps } from './spend-types';

  let { events, error, collapsedRows, fullLogHref }: BoardLogProps = $props();
  let all = $state(false);
  let copied = $state<string | null>(null);
  const list = $derived(events ?? []);
  const shown = $derived(all ? list : list.slice(0, collapsedRows));
  const title = (id: string) => app.board?.cards.find((c) => c.id === id)?.title ?? null;
  async function copyId(id: string): Promise<void> {
    await navigator.clipboard?.writeText(id);
    copied = id;
    setTimeout(() => (copied = copied === id ? null : copied), 2000);
  }
</script>

<section class="panel" aria-labelledby="log-h" data-reveal>
  <div class="panel-head">
    <h2 class="t-h2" id="log-h">Board log</h2>
    {#if events !== null && list.length > 0}<span class="t-meta">{logMeta(list.length)}</span>{/if}
    {#if fullLogHref}<Button variant="secondary" class="btn-sm"  href={fullLogHref} style="margin-left: auto; text-decoration: none;">Open the full board log <LineIcon name="chev-right" size={16} /></Button>{/if}
  </div>
  {#if error}
    <div class="panel-body"><p class="t-body">Couldn't load the board log</p><p class="t-meta">{error}</p></div>
  {:else if events === null}
    <p class="panel-body t-meta" role="status">Loading the board log…</p>
  {:else if list.length === 0}
    <p class="panel-body t-meta">Nothing has happened on this board yet.</p>
  {:else}
    <ol class="log">
      {#each shown as e (e.seq)}
        {@const cardId = typeof e.payload.cardId === 'string' ? e.payload.cardId : null}
        <li class="lrow">
          <span class="time">{clockHMS(e.ts)}</span>
          <span class="t-body" style="font-size: 0.9375rem;">{eventLabel(e, app.board?.stages ?? [])}</span>
          {#if cardId}
            {@const t = title(cardId)}
            <span style="display: inline-flex; gap: 8px; align-items: center; min-width: 0px;">
              {#if t}<a class="t-meta" href="/b/{app.boardId}/c/{cardId}" title={t} style="overflow-wrap: anywhere;">{shortTitle(t)}</a>{/if}
              <button class="idchip" aria-label="Copy card id {shortId(cardId)}" type="button" onclick={() => void copyId(cardId)}>{copied === cardId ? 'Copied' : `#${shortId(cardId)}`}</button>
            </span>
          {:else}<span></span>{/if}
        </li>
      {/each}
    </ol>
    <span class="sr" aria-live="polite">{copied ? 'Card id copied' : ''}</span>
    <div class="panel-body" style="border-top: 1px solid var(--vk-color-line); display: flex; flex-direction: column; gap: var(--vk-space-2);">
      {#if list.length > collapsedRows}
        <Button variant="quiet" class="btn-sm"  type="button" style="align-self: flex-start;" aria-expanded={all} onclick={() => (all = !all)}>{all ? `Show the latest ${collapsedRows}` : `Show all ${list.length} events`}</Button>
      {/if}
      <details>
        <summary class="t-meta" style="min-height: 44px; display: flex; align-items: center; gap: 6px;"><span class="disc-ico"><LineIcon name="chev-down" size={16} /></span><span style="text-decoration: underline;">Show raw event names</span></summary>
        <ol class="log">{#each list as e (e.seq)}<li class="lrow"><span class="time">{clockHMS(e.ts)}</span><span class="raw">{rawLine(e)}</span></li>{/each}</ol>
      </details>
    </div>
  {/if}
</section>
