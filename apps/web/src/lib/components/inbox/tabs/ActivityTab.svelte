<!-- apps/web/src/lib/components/inbox/tabs/ActivityTab.svelte -->
<script lang="ts">
  /**
   * Activity, paged (rule 7, inbox-tabs mockup): one row per card, newest first, with an unread mark,
   * the card, what happened last and when, and its earlier entries folded under "N earlier". Unread
   * only / Show all is one quiet toggle; twenty rows, then "Show 20 more". A row that needs you links
   * to its group in Needs you instead of repeating its buttons.
   */
  import { Button, LoadMore, SectionHeader, Segmented } from '@superjackfruitlabs/vibekit-ui';
  import { fade, flashOnChange, flip, rise } from '@superjackfruitlabs/vibekit-ui/motion';
  import type { Notification } from '$lib/api';
  import { ACTIVITY_PAGE } from '../../operate/operate-data';
  import { noticeBody, staleLine, when } from '../../operate/operate-words';
  import { GROUP_OF, type InboxGroupKey } from '../inbox-groups';
  import type { InboxStore } from '../inbox-model.svelte';
  import type { InboxUi } from '../inbox-ui.svelte';
  import { ACTIVITY_WHICH, activityMeta, activityNone, earlierLabel, IN_NEEDS, MARK_READ, showMore } from '../inbox-words';

  let { store, ui, onneeds }: { store: InboxStore; ui: InboxUi; onneeds(group: InboxGroupKey): void } = $props();
  const line = (n: Notification, kind: Parameters<typeof staleLine>[2]) => staleLine(n, 'daylight', kind) ?? noticeBody(n);
  const go = (e: MouseEvent, cardId: string, boardId: string) => { e.preventDefault(); store.open(cardId, boardId); };
  let root = $state<HTMLElement | null>(null);
</script>

<section class="ib-group ib-act" aria-labelledby="ib-act-h" bind:this={root}>
  <div id="ib-act-h"><SectionHeader n={1} title="Activity" meta={activityMeta(store.groups.length)} /></div>
  <div class="ib-groupact">
    <Segmented size="sm" label="Which activity" options={ACTIVITY_WHICH} bind:value={() => (store.showRead ? 'all' : 'unread'), (v) => { store.showRead = v === 'all'; }} />
  </div>
  {#if store.groups.length === 0}
    <p class="ib-why">{activityNone(store.showRead)}</p>
  {:else}
    <ul class="ib-rows">
      {#each store.activityPage as g (g.cardId)}
        <li class="ib-li" in:rise out:fade animate:flip>
          <article class="ib-row ib-row--act" data-row={g.cardId} data-activity-group aria-labelledby="ib-act-{g.cardId}" use:flashOnChange={g.latest.seq}>
            <span class="ib-unread" data-read={g.latest.read ? 'true' : 'false'} aria-hidden="true"></span>
            <!-- data-reveal: "N earlier" grows the row into place (lib/motion/reveal.ts). -->
            <div class="ib-row__body" data-reveal>
              <h4 class="ib-row__t" id="ib-act-{g.cardId}"><a href={store.cardHref(g.cardId, g.boardId)} onclick={(e) => go(e, g.cardId, g.boardId)}>{g.title}</a></h4>
              <p class="ib-row__meta">{#if !g.latest.read}<span class="vk-visually-hidden">Unread: </span>{/if}{line(g.latest, g.need?.item.kind ?? null)}
                {#if g.need}{' · '}<a href="#ib-g-{GROUP_OF[g.need.item.kind]}" onclick={(e) => { e.preventDefault(); onneeds(GROUP_OF[g.need!.item.kind]); }}>{IN_NEEDS}</a>{/if}
                {#if g.earlier.length > 0}{' · '}<button type="button" class="ib-more" aria-expanded={ui.earlierOpen[g.cardId] ? 'true' : 'false'} onclick={() => ui.toggleEarlier(g.cardId)}>{earlierLabel(g.earlier.length)}</button>{/if}
              </p>
              {#if ui.earlierOpen[g.cardId]}
                <ul class="ib-earlier">{#each g.earlier as n (n.seq)}<li><span class="ib-when">{when(n)}</span> {line(n, g.need?.item.kind ?? null)}</li>{/each}</ul>
              {/if}
            </div>
            <span class="ib-when">{when(g.latest)}</span>
            <div class="ib-row__act">{#if !g.latest.read}<Button variant="quiet" size="sm" aria-label="{MARK_READ}: {g.title}" onclick={() => store.markRead(g.latest.seq, g.boardId)}>{MARK_READ}</Button>{/if}</div>
          </article>
        </li>
      {/each}
    </ul>
    {#if store.activityRemaining > 0 || store.activityPage.length > ACTIVITY_PAGE}
      <LoadMore shown={store.activityPage.length} total={store.groups.length} label={showMore(Math.min(ACTIVITY_PAGE, store.activityRemaining))} onmore={() => store.showMoreActivity()} focusTarget={(i) => root?.querySelectorAll<HTMLElement>('.ib-row__t a')[i]} />
    {/if}
  {/if}
</section>
