<!-- apps/web/src/lib/components/operate/BoardLog.svelte -->
<script lang="ts">
  /**
   * The board log, the same in every vibe: the newest events first, each with its card's title and a
   * copyable short id; the raw event names behind a disclosure (rule 5). On Spend it shows the latest
   * `collapsedRows` with a toggle and a link to the whole log; on the log page (`paged`) it shows
   * them a page at a time with "Show N more" (rule 7).
   */
  import { clockHMS } from '$lib/when';
  import { Button, LoadMore } from '@superjackfruitlabs/vibekit-ui';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { app } from '$lib/stores/app.svelte';
  import { eventLabel, logMeta, rawLine, shortId, shortTitle } from './spend-format';
  import type { BoardLogProps } from './spend-types';

  let { events, error, collapsedRows, fullLogHref, paged = false }: BoardLogProps = $props();
  let all = $state(false);
  // svelte-ignore state_referenced_locally
  let limit = $state(collapsedRows);
  let copied = $state<string | null>(null);
  const list = $derived(events ?? []);
  const shown = $derived(paged ? list.slice(0, limit) : all ? list : list.slice(0, collapsedRows));
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
    {#if fullLogHref}<Button variant="secondary" class="btn-sm log-full" href={fullLogHref}>Open the full board log <LineIcon name="chev-right" size={16} /></Button>{/if}
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
          <span class="t-body log-what">{eventLabel(e, app.board?.stages ?? [])}</span>
          {#if cardId}
            {@const t = title(cardId)}
            <span class="log-card">
              {#if t}<a class="t-meta" href="/b/{app.boardId}/c/{cardId}" title={t}>{shortTitle(t)}</a>{/if}
              <button class="idchip" aria-label="Copy card id {shortId(cardId)}" type="button" onclick={() => void copyId(cardId)}>{copied === cardId ? 'Copied' : `#${shortId(cardId)}`}</button>
            </span>
          {:else}<span></span>{/if}
        </li>
      {/each}
    </ol>
    <span class="sr" aria-live="polite">{copied ? 'Card id copied' : ''}</span>
    <div class="panel-body log-foot">
      {#if paged && list.length > shown.length}
        <LoadMore shown={shown.length} total={list.length} label="Show {Math.min(collapsedRows, list.length - shown.length)} more" onmore={() => { limit += collapsedRows; }} />
      {:else if !paged && list.length > collapsedRows}
        <Button variant="quiet" class="btn-sm log-toggle" type="button" aria-expanded={all} onclick={() => (all = !all)}>{all ? `Show the latest ${collapsedRows}` : `Show all ${list.length} events`}</Button>
      {/if}
      <details>
        <summary class="t-meta log-raw"><span class="disc-ico"><LineIcon name="chev-down" size={16} /></span><span class="log-rawword">Show raw event names</span></summary>
        <ol class="log">{#each list as e (e.seq)}<li class="lrow"><span class="time">{clockHMS(e.ts)}</span><span class="raw">{rawLine(e)}</span></li>{/each}</ol>
      </details>
    </div>
  {/if}
</section>
