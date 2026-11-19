<!-- apps/web/src/lib/components/inbox/tabs/SpendTab.svelte -->
<script lang="ts">
  /**
   * Spend, the summary (inbox-tabs mockup): one figure (the last 7 days), the cap beside it in words
   * with one meter, who spent it as a short list, and one verb. Caps are set per board, on the
   * board's Spend in detail page: on one board the verb goes there; on all boards the page says to
   * choose one.
   */
  import { Button, Face, Meter, SectionHeader } from '@superjackfruitlabs/vibekit-ui';
  import { countUp } from '@superjackfruitlabs/vibekit-ui/motion';
  import { usd } from '../../operate/operate-words';
  import { CHOOSE_A_BOARD_FOR_CAPS, type InboxStore } from '../inbox-model.svelte';
  import { SPEND_DETAIL, SPEND_FAILED, SPEND_NONE, SPEND_NOTE, spendCapLine, spendCapVerb, spendMeta, spendMore } from '../inbox-words';

  let { store }: { store: InboxStore } = $props();
  const s = $derived(store.spend);
  const detail = $derived(`/b/${store.boardId}/operate/telemetry`);
</script>

<section class="ib-group ib-spend" aria-labelledby="ib-spend-h">
  <div id="ib-spend-h"><SectionHeader n={1} title="Spend" meta={spendMeta(store.scoped ? store.boardName : 'All boards')} /></div>
  {#if store.usageError}<p class="ib-why" role="status">{SPEND_FAILED}</p>{/if}
  <p class="ib-spend__big"><b class="ib-spend__n" use:countUp={{ value: s.total, format: usd }}></b> <span class="ib-spend__cap">{spendCapLine(s.total, s.cap, store.scoped)}</span></p>
  {#if store.scoped && s.cap !== null}<Meter value={s.total} max={s.cap} label="Spend against the board cap" tone="plain" />{/if}
  <div class="ib-groupact">
    {#if store.scoped}
      <Button variant="secondary" href="{detail}#caps1">{spendCapVerb(s.cap !== null || s.cardCap !== null)}</Button>
      <Button variant="quiet" href={detail}>{SPEND_DETAIL}</Button>
    {:else}
      <p class="ib-why">{CHOOSE_A_BOARD_FOR_CAPS}</p>
    {/if}
  </div>
  {#if s.top.length === 0}
    <p class="ib-why">{SPEND_NONE}</p>
  {:else}
    <ul class="ib-rows ib-spend__who" aria-label="Who spent it">
      {#each s.top as a (a.name)}
        <li class="ib-row ib-row--spend" data-row={a.name}><span class="ib-row__face" aria-hidden="true"><Face id={a.name} label={a.name} mood="resting" size={24} /></span><span class="ib-row__t">{a.name}</span><span class="ib-cost">{usd(a.costUsd)}</span></li>
      {/each}
    </ul>
    {#if s.more > 0}<p class="ib-why">{spendMore(s.more)}</p>{/if}
  {/if}
  <p class="ib-why">{SPEND_NOTE}</p>
</section>
