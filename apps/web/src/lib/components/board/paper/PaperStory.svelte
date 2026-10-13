<!-- apps/web/src/lib/components/board/paper/PaperStory.svelte -->
<script lang="ts">
  /** One story on the Paper board (SB §4.1). A lead story quotes its agent; the quote clamps at 3 lines. */
  import './paper.css';
  import { Button, Face } from '@superjackfruit/vibekit';
  import type { Stage } from '$lib/api';
  import { app } from '$lib/stores/app.svelte';
  import Icon from '$lib/components/parts/Icon.svelte';
  import Initials from '$lib/components/parts/Initials.svelte';
  import CardMoveMenu from '../CardMoveMenu.svelte';
  import { cardKeys, openLabel } from '../open-label';
  import { paperBy, paperFacts, paperQuote, paperReply } from '../board-words';
  import type { CardSummary } from '../card-summary';

  let { s, size, stages, terminalName, boardId }: { s: CardSummary; size: 'lead' | 'small'; stages: Stage[]; terminalName: string; boardId: string } = $props();

  let moveOpen = $state(false);
  let menu = $state<ReturnType<typeof CardMoveMenu>>();
  const quote = $derived(paperQuote(s));
  const by = $derived(paperBy(s, terminalName));
  const facts = $derived(paperFacts(s));
  const reply = $derived(paperReply(s));
  const href = $derived(`/b/${boardId}/c/${s.id}`);

  // "Read the rest" exists only when the quote really overflows its three lines.
  let quoteEl = $state<HTMLElement>();
  let measured = $state(false);
  let clamped = $state(false);
  let expanded = $state(false);
  $effect(() => {
    if (!quoteEl || measured) return;
    clamped = quoteEl.scrollHeight > quoteEl.clientHeight + 1;
    measured = true;
  });

  /** A plain click opens the drawer here; a modified click keeps the link's own behaviour (new tab). */
  function open(e: MouseEvent): void {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    app.openCard(s.id);
  }
  function doReply(): void {
    if (reply?.does === 'move') moveOpen = true;
    else app.openCard(s.id);
  }
</script>

<article class="pp-story pp-{size}" data-card-id={s.id}>
  <h3><a {href} data-card-open={s.id} aria-label={openLabel({ title: s.title, stageName: s.stageName })} onclick={open} onkeydown={(e) => cardKeys(e, { open: () => app.openCard(s.id), toggleMove: () => (moveOpen = !moveOpen), step: (d) => menu?.step(d) })}>{s.title}</a></h3>
  {#if quote}
    <blockquote bind:this={quoteEl} class="pp-quote" class:pp-clamp={!expanded && (!measured || clamped)} style="margin: 0px;">“{quote}”</blockquote>
    {#if clamped}<button class="pp-more" type="button" aria-expanded={expanded} onclick={() => (expanded = !expanded)}>{expanded ? 'Show less' : 'Read the rest'}</button>{/if}
  {/if}
  <div class="pp-by">
    {#if by.mark === 'person'}<Initials text={by.initials} label={by.name} size={24} fontSize={9} />
    {:else if by.mark === 'agent'}<Face id={by.name} label={by.name} mood={by.mood} size={24} />
    {:else if by.mark === 'check'}<Icon name="check" size={18} strokeWidth={1.8} />{/if}
    <em>{by.em}</em>{by.rest}
  </div>
  {#if facts.length > 0}
    <div class="pp-facts">
      {#each facts as f, i (i)}<span class={f.cls}>{#if f.icon}<Icon name={f.icon} size={13} strokeWidth={1.8} />{/if}{f.text}</span>{/each}
    </div>
  {/if}
  <div class="pp-acts">
    {#if reply}<Button variant="signal" onclick={doReply}>{reply.label}</Button>{/if}
    <Button variant="secondary" href={href} aria-label="Open {s.title}" onclick={open}>Open <Icon name="arrow" size={16} strokeWidth={1.8} /></Button>
    <Button variant="ghost" aria-haspopup="menu" aria-expanded={moveOpen} aria-label="Move {s.title} to another stage" onclick={() => (moveOpen = !moveOpen)}>Move{#snippet icon()}<Icon name="move" size={16} strokeWidth={1.8} />{/snippet}</Button>
  </div>
  <CardMoveMenu bind:this={menu} bind:open={moveOpen} card={s.card} {stages} bare />
</article>
