<script lang="ts">
  import type { Card, Stage } from '$lib/api';
  import { app } from '$lib/stores/app.svelte';

  /**
   * `visible` keeps the control shown at all times. The default hides it until the tile is hovered
   * or focused, which suits a dense grid and leaves a touch screen with no way to reach it; a layout
   * that is not a grid of tiles passes `visible`.
   */
  let { card, stages, open = $bindable(false), visible = false }: { card: Card; stages: Stage[]; open?: boolean; visible?: boolean } = $props();

  /**
   * Moving a card was mouse-only — drag and drop with no keyboard or menu alternative — so the
   * board's central action was unavailable to keyboard and assistive-technology users.
   *
   * `Alt` + arrow rather than a bare arrow: bare arrows are how a keyboard user moves BETWEEN
   * cards, and stealing them to move the card itself would make the board impossible to read.
   */
  const stageIndex = $derived(stages.findIndex((s) => s.key === card.currentStageKey));
  let moveAnnouncement = $state('');

  async function moveTo(stageKey: string): Promise<void> {
    const target = stages.find((s) => s.key === stageKey);
    if (!target || stageKey === card.currentStageKey) return;
    open = false;
    await app.moveCard(card.id, stageKey);
    // Said out loud, because a keyboard user gets no visual feedback from a card that moved to a
    // column they cannot see. A refusal (a WIP limit) already lands in the error bar.
    moveAnnouncement = app.error ? '' : `${card.title} moved to ${target.name}`;
  }

  /** The Alt+arrow body: move to the neighbouring stage, if there is one. */
  export function step(delta: -1 | 1): void {
    const next = stages[stageIndex + delta];
    if (next) void moveTo(next.key);
  }
</script>

<!-- What just happened, for a reader who cannot see the column the card landed in. -->
<span aria-live="polite" class="sr-only">{moveAnnouncement}</span>

<!--
  The menu alternative to dragging. Reachable by keyboard (M, or Tab to the control) and by a
  pointer that cannot drag — a touch screen, a trackpad the user finds hard to hold.
-->
<div class="absolute top-2 right-2 z-10">
  <button
    onclick={(e) => { e.stopPropagation(); open = !open; }}
    aria-label="Move {card.title} to another stage"
    aria-expanded={open}
    title="Move to…"
    class="text-muted-foreground hover:text-foreground tap mono rounded-[6px] text-[11px] leading-none {visible ? '' : 'opacity-0 focus-visible:opacity-100 group-hover:opacity-100'}"
    style="opacity:{open ? 1 : undefined}"
  >⇄</button>
  {#if open}
    <div
      role="menu"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); open = false; } }}
      class="bg-surface border-border absolute top-full right-0 z-20 mt-1 w-40 rounded-[8px] border py-1 shadow-xl"
    >
      {#each stages as s (s.key)}
        <button
          role="menuitem"
          onclick={() => void moveTo(s.key)}
          disabled={s.key === card.currentStageKey}
          class="hover:bg-inset block w-full px-2.5 py-1 text-left text-xs disabled:opacity-40"
        >{s.name}{s.key === card.currentStageKey ? ' · here' : ''}</button>
      {/each}
    </div>
  {/if}
</div>
