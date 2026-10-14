<!-- apps/web/src/lib/components/inbox/InboxShow.svelte -->
<script lang="ts">
  /**
   * The Inbox's Show row: All boards, the boards that need you, then "N more boards", which opens
   * the rest of the list in place. Choosing a board scopes the whole page (Needs you, Running, Spend,
   * Activity) and is held in memory only (`inboxScope`). Quiet draws it as a line of words.
   */
  import { app } from '$lib/stores/app.svelte';
  import { inboxScope, scopeChips, scopeLabel, SHOW_NOTE } from './inbox-scope.svelte';
  import './inbox.css';

  /** pending: the Inbox is still counting; the row keeps its one waiting form until the counted page arrives. */
  let { form = 'chips', pending = false }: { form?: 'chips' | 'words'; pending?: boolean } = $props();
  let moreOpen = $state(false);
  const s = $derived(scopeChips(app.boards, pending ? [] : app.attention, inboxScope.boardId));
  const shown = $derived(moreOpen ? [...s.chips, ...s.more.map((b) => ({ id: b.id, label: b.name, count: 0 }))] : s.chips);
  const countWords = (n: number) => (n === 1 ? '1 needs you' : `${n} need you`);
  /** Counts wait for the attention read: a chip shows its board's name, never a 0 that is not known yet. */
  const known = $derived(app.attentionLoaded && !pending);
</script>

<section class="ib-show ib-show--{form}" aria-labelledby="ib-show-h">
  <p class="ib-show__scope">{scopeLabel(inboxScope.boardId, app.boards)}</p>
  <div class="ib-show__row" role="group" aria-labelledby="ib-show-h">
    <h2 class="ib-show__h" id="ib-show-h">Show{form === 'words' ? ':' : ''}</h2>
    {#each shown as c, i (c.id ?? 'all')}
      {#if form === 'words' && i > 0}<span class="ib-show__dot" aria-hidden="true">·</span>{/if}
      <button type="button" class="ib-chip" aria-pressed={inboxScope.boardId === c.id ? 'true' : 'false'} aria-label={known ? `${c.label}, ${countWords(c.count)}` : c.label} onclick={() => inboxScope.choose(c.id)}>
        <span class="ib-chip__name">{c.label}</span>{#if !known}{#if form !== 'words'}<span class="ib-chip__n" aria-hidden="true">–</span>{/if}{:else if form === 'words'}<span> ({c.count})</span>{:else}<span class="ib-chip__n" class:ib-chip__n--needs={c.count > 0}>{c.count}</span>{/if}
      </button>
    {/each}
    {#if known && s.more.length > 0}
      {#if form === 'words'}<span class="ib-show__dot" aria-hidden="true">·</span>{/if}
      <button type="button" class="ib-more" aria-expanded={moreOpen ? 'true' : 'false'} onclick={() => (moreOpen = !moreOpen)}>{moreOpen ? 'Fewer boards' : s.moreLabel}</button>
    {/if}
  </div>
  <p class="ib-show__note">{SHOW_NOTE}</p>
</section>
