<!-- apps/web/src/lib/components/board/daylight/DlTile.svelte -->
<script lang="ts">
  /** One Daylight card tile (SB §3.3 Tiles). The title's ::after covers the tile, so the whole tile opens the card. */
  import './priority-chip.css';
  import { Button, Face } from '@superjackfruit/vibekit';
  import type { Stage } from '$lib/api';
  import { app } from '$lib/stores/app.svelte';
  import { cardDraggable } from '$lib/dnd';
  import Icon from '$lib/components/parts/Icon.svelte';
  import Initials from '$lib/components/parts/Initials.svelte';
  import CardMoveMenu from '../CardMoveMenu.svelte';
  import { cardKeys, openLabel } from '../open-label';
  import { refLabel } from '../ref-chip';
  import { dueShort, moreLabelsTitle, tileAction, tileWho } from '../board-words';
  import type { CardSummary } from '../card-summary';
  import type { PeekController } from './peek-controller';
  import DlPeek from './DlPeek.svelte';

  let { s, stages, peekOpen, firstNeeds, peek }: {
    s: CardSummary; stages: Stage[]; peekOpen: boolean; firstNeeds: boolean; peek: PeekController;
  } = $props();

  let moveOpen = $state(false);
  let menu = $state<ReturnType<typeof CardMoveMenu>>();
  const who = $derived(tileWho(s));
  const action = $derived(tileAction(s));
  const chips = $derived(s.priority > 0 || s.labels.length > 0 || s.moreLabels > 0 || s.blocked !== null);
  function act(): void {
    if (action?.does === 'move') moveOpen = true;
    else app.openCard(s.id);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -- pointerenter and focusin only tell the board where the eye is; the title button inside is the control -->
<article
  class="dl-tile"
  class:p1={s.priority === 1}
  class:p2={s.priority === 2}
  class:needs={s.urgency === 'needs'}
  class:focused={peekOpen}
  data-card-id={s.id}
  use:cardDraggable={{ cardId: s.id }}
  onpointerenter={() => peek.pointerEnter(s.id)}
  onpointerleave={() => peek.pointerLeave(s.id)}
  onfocusin={() => peek.focusIn(s.id)}
  onfocusout={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) peek.focusOut(s.id); }}
>
  <h3>
    <button
      class="dl-title"
      type="button"
      id={firstNeeds ? 'first-needs' : undefined}
      data-title-for={s.id}
      data-card-open={s.id}
      data-stretch-target
      aria-label={openLabel({ title: s.title, stageName: s.stageName })}
      onclick={() => app.openCard(s.id)}
      onkeydown={(e) => cardKeys(e, { open: () => app.openCard(s.id), toggleMove: () => (moveOpen = !moveOpen), step: (d) => menu?.step(d) })}
    >{s.title}</button>
  </h3>
  <button class="dl-move" type="button" aria-haspopup="menu" aria-expanded={moveOpen} aria-label="Move {s.title} to another stage" onclick={(e) => { e.stopPropagation(); moveOpen = !moveOpen; }}><Icon name="move" size={16} strokeWidth={1.8} />Move</button>
  <CardMoveMenu bind:this={menu} bind:open={moveOpen} card={s.card} {stages} bare />
  {#if chips}
    <div class="dl-chips">
      {#if s.priority > 0}<span class="vk-visually-hidden">Priority {s.priority}</span><span class="dl-chip dl-pri" aria-hidden="true">P{s.priority}</span>{/if}
      {#each s.labels as l (l.id)}<span class="dl-chip">{l.name}</span>{/each}
      {#if s.moreLabels > 0}<span class="dl-chip" title={moreLabelsTitle(s.moreLabels)}>+{s.moreLabels}</span>{/if}
      {#if s.blocked}<span class="dl-chip block" title="Blocked by another card. This card will not be claimed"><Icon name="blocked" size={13} strokeWidth={1.8} />Blocked</span>{/if}
    </div>
  {/if}
  {#if s.firstRef}<div class="dl-ref"><Icon name="link" size={14} strokeWidth={1.8} /><span>{s.firstRef.title ?? refLabel(s.firstRef)}</span></div>{/if}
  <div class="dl-meta">
    {#if who.kind === 'person'}
      <span class="dl-who"><Initials text={who.initials} label={who.name} size={24} fontSize={9} /><span style="white-space: nowrap;">{who.text}</span><span class="dl-mood needs">{who.note}</span></span>
    {:else if who.kind === 'agent'}
      <span class="dl-who"><Face id={who.name} label={who.name} mood={who.mood} size={24} />{who.name}<span class="dl-mood" class:needs={who.mood === 'needs'}>{who.note}</span></span>
    {:else if who.kind === 'done'}
      <span class="dl-who" style="color: var(--vk-color-success-text);"><Icon name="check" size={18} strokeWidth={1.8} />{who.text}</span>
    {:else}
      <span class="dl-who" style="font-weight: 600; color: var(--vk-color-muted);">{who.text}</span>
    {/if}
    {#if s.queuedBy}
      <span class="dl-asked" title="Queued by {s.queuedBy.name}, not by you"><Face id={s.queuedBy.name} label={s.queuedBy.name} mood="working" size={18} />asked by {s.queuedBy.name}</span>
    {/if}
    {#if s.dueAt && s.overdue}
      <span class="dl-due"><Icon name="warn" size={14} strokeWidth={1.8} />Overdue · due {dueShort(s.dueAt)}</span>
    {:else if s.dueAt}
      <span class="dl-due" style="color: var(--vk-color-muted);">Due {dueShort(s.dueAt)}</span>
    {/if}
  </div>
  {#if action}<div class="dl-act"><Button variant="signal" onclick={act}>{action.label}</Button></div>{/if}
  {#if peekOpen}<DlPeek {s} actionLabel={action?.label ?? null} onAct={act} onClose={() => peek.close()} />{/if}
</article>
