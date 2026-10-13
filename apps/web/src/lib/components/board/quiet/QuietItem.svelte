<!-- apps/web/src/lib/components/board/quiet/QuietItem.svelte -->
<script lang="ts">
  import { Face } from '@superjackfruit/vibekit';
  import type { Stage } from '$lib/api';
  import { app } from '$lib/stores/app.svelte';
  import CardMoveMenu from '../CardMoveMenu.svelte';
  import { cardKeys, openLabel } from '../open-label';
  import { quietAction, quietFacts, quietMeta, quietMood } from '../board-words';
  import type { CardSummary } from '../card-summary';

  let { s, stages, boardId }: { s: CardSummary; stages: Stage[]; boardId: string } = $props();
  let moveOpen = $state(false);
  let menu = $state<ReturnType<typeof CardMoveMenu>>();
  const mood = $derived(quietMood(s));
  const speaker = $derived(s.urgency === 'working' ? (s.delegate ?? s.lastAgent) : (s.lastAgent ?? s.delegate));
  const action = $derived(quietAction(s));
  function open(e: MouseEvent): void {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    app.openCard(s.id);
  }
</script>

<li class="qt-item" data-card-id={s.id}>
  <h3><button class="qt-titlebtn" type="button" aria-label={openLabel({ title: s.title, stageName: s.stageName })} onclick={() => app.openCard(s.id)} onkeydown={(e) => cardKeys(e, { open: () => app.openCard(s.id), toggleMove: () => (moveOpen = !moveOpen), step: (d) => menu?.step(d) })}>{s.title}</button></h3>
  <div class="qt-meta">{#if mood && speaker}<Face id={speaker.name} label={speaker.name} {mood} size={20} />{/if}{quietMeta(s)}</div>
  <p class="qt-facts">{quietFacts(s)}</p>
  <div class="qt-acts">
    {#if action}<button type="button" onclick={() => app.openCard(s.id)}>{action.label}</button>{/if}
    <a href="/b/{boardId}/c/{s.id}" onclick={open}>Open</a>
    <button type="button" aria-haspopup="menu" aria-expanded={moveOpen} aria-label="Move {s.title} to another stage" onclick={() => (moveOpen = !moveOpen)}>Move to another stage</button>
  </div>
  <CardMoveMenu bind:this={menu} bind:open={moveOpen} card={s.card} {stages} bare />
</li>
