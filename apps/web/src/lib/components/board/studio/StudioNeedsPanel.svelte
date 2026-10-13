<!-- apps/web/src/lib/components/board/studio/StudioNeedsPanel.svelte -->
<script lang="ts">
  import type { Stage } from '$lib/api';
  import { app } from '$lib/stores/app.svelte';
  import Icon from '$lib/components/parts/Icon.svelte';
  import FaceSvg from '$lib/components/parts/FaceSvg.svelte';
  import CardMoveMenu from '../CardMoveMenu.svelte';
  import type { CardSummary } from '../card-summary';
  import { pad2, panelAction, panelHeading, panelText, rowAgent } from './studio-prose';

  let { cards, stages, boardId }: { cards: CardSummary[]; stages: Stage[]; boardId: string } = $props();
  const head = $derived(panelHeading(cards.length));
  let moving = $state<string | null>(null);
  function open(e: MouseEvent, id: string): void {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    app.openCard(id);
  }
</script>

<aside class="bd-panel" aria-labelledby="bd-nd-h">
  <header>
    <span class="kick">{head.kick}</span>
    <h2 id="bd-nd-h">{head.h2}</h2>
    {#if head.p}<p>{head.p}</p>{/if}
  </header>
  {#each cards as s (s.id)}
    {@const who = rowAgent(s)}
    {@const act = panelAction(s)}
    <article class="bd-need" aria-labelledby="nd-{pad2(s.ix)}" data-card-id={s.id}>
      <div class="row"><span class="mono">{pad2(s.ix)}</span><span class="kick">Waiting on you</span><span class="mono age">{s.ageShort}</span></div>
      <h3 id="nd-{pad2(s.ix)}">{s.title}</h3>
      <div class="by">{#if who.kind === 'agent'}<FaceSvg name={who.name} mood={who.mood} size={20} /><b>{who.name}</b>{:else if who.kind === 'person'}<span class="ar-ini" aria-hidden="true" style="width: 20px; height: 20px; font-size: 8px;">{who.initials}</span><b>{who.text}</b>{/if}<span class="stg"><span class="chip c{Math.min(s.stageIndex + 1, 7)}"></span>{s.stageName}</span><span class="mono">{s.stageIndex + 1}/{s.stageCount}</span></div>
      <p class="serif" style="font-size: 16.5px; line-height: 1.45;">{panelText(s)}</p>
      <div class="acts">
        {#if act.does === 'move'}
          <button class="ar-btn" type="button" aria-haspopup="menu" onclick={() => (moving = moving === s.id ? null : s.id)}><Icon name="move" size={15} strokeWidth={1.75} />{act.label}</button><a class="ar-btn2" href="/b/{boardId}/c/{s.id}" onclick={(e) => open(e, s.id)}>Open</a>
        {:else}
          <button class="ar-btn" type="button" onclick={() => app.openCard(s.id)}>{act.label}</button>
        {/if}
      </div>
      <CardMoveMenu card={s.card} {stages} bare open={moving === s.id} />
    </article>
  {/each}
  <dl class="bd-keys" aria-label="Keyboard">
    <dt><span class="kbd">⌘K</span></dt><dd>Search or run a command</dd>
    <dt><span class="kbd">N</span></dt><dd>New card</dd>
    <dt><span class="kbd">F</span></dt><dd>Filter cards</dd>
    <dt><span class="kbd">M</span></dt><dd>Move the selected card</dd>
  </dl>
</aside>
