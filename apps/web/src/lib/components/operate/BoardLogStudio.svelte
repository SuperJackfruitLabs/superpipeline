<!-- apps/web/src/lib/components/operate/BoardLogStudio.svelte -->
<script lang="ts">
  import { clockHMS } from '$lib/when';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { app } from '$lib/stores/app.svelte';
  import { eventLabel, logMeta, rawLine, shortId, shortTitle } from './spend-format';
  import type { BoardLogProps } from './spend-types';

  let { events, error, collapsedRows, fullLogHref, no = '09' }: BoardLogProps & { no?: string } = $props();
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

<section class="ar-sec" aria-labelledby="log-h" data-reveal>
  <div class="hd">
    <span class="no">{no}</span><h2 id="log-h">Board log</h2>
    <span class="r">{#if list.length > 0}{logMeta(list.length)}{' '}{/if}{#if fullLogHref}<a class="ar-btn2" href={fullLogHref}>Open the full board log <LineIcon name="arrow-right" size={14} stroke={1.75} /></a>{/if}</span>
  </div>
  {#if error}
    <p class="sp-empty"><span class="serif">Couldn't load the board log</span><span class="ar-hint">{error}</span></p>
  {:else if events === null}
    <p class="ar-hint" role="status">Loading the board log…</p>
  {:else if list.length === 0}
    <p class="sp-empty"><span class="serif">Nothing has happened on this board yet.</span></p>
  {:else}
    <table class="ar-tbl sp-log">
      <thead><tr><th scope="col">Time</th><th scope="col">Event</th><th scope="col">Card</th></tr></thead>
      <tbody>
        {#each shown as e (e.seq)}
          {@const cardId = typeof e.payload.cardId === 'string' ? e.payload.cardId : null}
          {@const t = cardId ? title(cardId) : null}
          <tr>
            <td class="m">{clockHMS(e.ts)}</td>
            <td>{eventLabel(e, app.board?.stages ?? [])}</td>
            <td><span class="sp-card">{#if cardId}{#if t}<a class="ttl sp-lt" href="/b/{app.boardId}/c/{cardId}" title={t}>{shortTitle(t)}</a>{/if}<button class="sp-id" aria-label="Copy card id {shortId(cardId)}" type="button" onclick={() => void copyId(cardId)}>{copied === cardId ? 'Copied' : `#${shortId(cardId)}`}</button>{/if}</span></td>
          </tr>
        {/each}
      </tbody>
    </table>
    <span class="sr" aria-live="polite">{copied ? 'Card id copied' : ''}</span>
    <div class="sp-more">
      {#if list.length > collapsedRows}<button class="ar-lk" type="button" aria-expanded={all} onclick={() => (all = !all)}>{all ? `Show the latest ${collapsedRows}` : `Show all ${list.length} events`}</button>{/if}
      <details>
        <summary class="ar-lk quiet"><span class="disc-ico"><LineIcon name="chev-down" size={16} /></span>Show raw event names</summary>
        <ol class="sp-raw">{#each list as e (e.seq)}<li><span class="m">{clockHMS(e.ts)}</span><span class="raw">{rawLine(e)}</span></li>{/each}</ol>
      </details>
    </div>
  {/if}
</section>
