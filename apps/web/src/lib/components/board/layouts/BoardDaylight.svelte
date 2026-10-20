<!-- apps/web/src/lib/components/board/layouts/BoardDaylight.svelte -->
<script lang="ts">
  /** Daylight desktop board: lanes under the sky, empty stages as strips, the peek from 1440px (SB §3). */
  import '../daylight/daylight.css';
  import { flushSync, onDestroy, tick, untrack } from 'svelte';
  import { duration, flipChildren, isReducedMotion } from '@superjackfruit/vibekit/motion';
  import { MediaQuery } from 'svelte/reactivity';
  import { app } from '$lib/stores/app.svelte';
  import { dlCols } from '../board-words';
  import DlLane from '../daylight/DlLane.svelte';
  import DlStrip from '../daylight/DlStrip.svelte';
  import { createPeek } from '../daylight/peek-controller';
  import type { BoardLayoutProps } from './types';

  let { model }: BoardLayoutProps = $props();

  const wide = new MediaQuery('min-width: 1440px');
  let expanded = $state<Record<string, boolean>>({});
  let peekId = $state<string | null>(null);
  const peek = createPeek({
    wide: () => wide.current,
    drawerOpen: () => !!app.openCardId,
    onChange: (id) => (peekId = id),
    focusTitle: (id) => {
      const title = [...document.querySelectorAll<HTMLElement>('[data-title-for]')].find((el) => el.dataset.titleFor === id);
      if (!title || document.activeElement === title) return false;
      title.focus();
      return true;
    },
  });
  onDestroy(() => peek.destroy());

  // The peek gives way to the card drawer, and does not come back when the drawer closes and focus returns.
  let drawerFor: string | null = null;
  $effect(() => {
    const id = app.openCardId;
    untrack(() => {
      if (id) { drawerFor = id; peek.drawerOpened(); }
      else if (drawerFor) { peek.drawerClosed(drawerFor); drawerFor = null; }
    });
  });

  /**
   * Collapse or expand an empty stage. The stage's slot persists while its content swaps (strip <->
   * lane): the slot's width animates from the old track to the new, and the other stages glide to
   * their new places (vibekit flipChildren), with the motion tokens; reduced motion is instant.
   * Focus moves to the control that undoes it, so a keyboard person stays on the same stage.
   */
  let board = $state<HTMLElement | null>(null);
  function setExpanded(key: string, open: boolean): void {
    const slots = () => (board ? [...board.querySelectorAll<HTMLElement>(':scope > .dl-slot')] : []);
    const slot = slots().find((el) => el.dataset.laneSlot === key);
    const from = slot?.getBoundingClientRect().width ?? 0;
    flipChildren(slots, () => flushSync(() => { expanded[key] = open; }), board ?? undefined);
    if (slot && !isReducedMotion(slot)) {
      const to = slot.getBoundingClientRect().width;
      if (Math.abs(to - from) > 1) {
        slot.dataset.resizing = '';
        const a = slot.animate([{ width: `${from}px` }, { width: `${to}px` }], { duration: duration('base', slot), easing: 'cubic-bezier(0.2, 0, 0, 1)' });
        const done = () => delete slot.dataset.resizing;
        a.finished.then(done, done);
      }
    }
    void tick().then(() => {
      const target = slot?.querySelector<HTMLElement>(open ? '.dl-collapse' : '.dl-strip');
      target?.focus({ preventScroll: true });
    });
  }

  const cols = $derived(dlCols(model.stages, expanded));
  const firstNeedsId = $derived(model.needs[0]?.id ?? null);
  const peekLane = $derived(model.cards.find((s) => s.id === peekId)?.stageKey ?? null);
</script>

<svelte:window onkeydown={(e) => { if (e.key !== 'Escape') peek.keyPressed(); if (e.key === 'Escape' && peekId && !e.defaultPrevented && !app.openCardId) peek.close(); }} />

<section class="dl-scope dl-board" aria-label="{model.boardName} stages" style="grid-template-columns: {cols}" bind:this={board}>
  {#each model.stages as stage (stage.key)}
    {@const cards = model.ordered.filter((s) => s.stageKey === stage.key)}
    <div class="dl-slot" data-lane-slot={stage.key}>
      {#if cards.length === 0 && !expanded[stage.key]}
        <DlStrip {stage} onExpand={() => setExpanded(stage.key, true)} />
      {:else}
        <DlLane
          {stage}
          {cards}
          stages={model.stageDefs}
          {peekId}
          {firstNeedsId}
          {peek}
          style={peekLane === stage.key ? 'z-index: 5;' : undefined}
          onCollapse={cards.length === 0 ? () => setExpanded(stage.key, false) : undefined}
        />
      {/if}
    </div>
  {/each}
</section>
