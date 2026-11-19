<!-- apps/web/src/lib/components/inbox/tabs/RunningTab.svelte -->
<script lang="ts">
  /**
   * Running (inbox-tabs mockup): one row per card an agent is working, with who, the card, its stage,
   * how long and what it has cost so far; the only verb is Open. When nothing runs, one sentence.
   */
  import { Button, Face, SectionHeader } from '@superjackfruitlabs/vibekit-ui';
  import { fade, flip, rise } from '@superjackfruitlabs/vibekit-ui/motion';
  import { usd } from '../../operate/operate-words';
  import BoardChip from '../BoardChip.svelte';
  import type { InboxStore } from '../inbox-model.svelte';
  import { RUNNING_NONE, RUNNING_NOTE, runningMeta } from '../inbox-words';

  let { store }: { store: InboxStore } = $props();
  const rows = $derived(store.running);
  const go = (e: MouseEvent, cardId: string, boardId: string) => { e.preventDefault(); store.open(cardId, boardId); };
</script>

<section class="ib-group" aria-labelledby="ib-running-h">
  <div id="ib-running-h"><SectionHeader n={1} title="Running" meta={`${rows.length} ${rows.length === 1 ? 'card' : 'cards'}`} /></div>
  {#if rows.length === 0}
    <p class="ib-why">{RUNNING_NONE}</p>
  {:else}
    <ul class="ib-rows">
      {#each rows as r (r.cardId)}
        <li class="ib-li" in:rise out:fade animate:flip>
          <article class="ib-row ib-row--run" data-row={r.cardId} aria-labelledby="ib-run-{r.cardId}">
            <span class="ib-row__face" aria-hidden="true">{#if r.agentName}<Face id={r.agentName} label={r.agentName} mood="working" size={32} src={r.iconUrl ?? undefined} />{/if}</span>
            <div class="ib-row__body">
              <h4 class="ib-row__t" id="ib-run-{r.cardId}"><a href={store.cardHref(r.cardId, r.boardId)} onclick={(e) => go(e, r.cardId, r.boardId)}>{r.title}</a></h4>
              <p class="ib-row__meta"><BoardChip name={r.boardName} /> {runningMeta(r, store.nowMs)}</p>
            </div>
            <span class="ib-cost">{usd(r.costUsd)}</span>
            <div class="ib-row__act"><Button variant="quiet" size="sm" href={store.cardHref(r.cardId, r.boardId)} onclick={(e: MouseEvent) => go(e, r.cardId, r.boardId)}>Open</Button></div>
          </article>
        </li>
      {/each}
    </ul>
    <p class="ib-why">{RUNNING_NOTE}</p>
  {/if}
</section>
