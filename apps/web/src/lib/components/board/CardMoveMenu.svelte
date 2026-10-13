<script lang="ts">
  import type { Card, Stage } from '$lib/api';
  import { app } from '$lib/stores/app.svelte';

  /**
   * The ⇄ control that opens the Move dialog (SP-Dlg-Move) for this card, and the Alt+arrow step.
   * `visible` keeps the control shown at all times; the default hides it until the tile is hovered
   * or focused. `bare`: the caller draws the trigger (Daylight's own Move button) and sets `open`;
   * the tiles' M key sets `open` too. Either way the dialog opens. Every move is said by the one
   * page-level live region (`app.moveSaid`), since a moved tile changes column and unmounts.
   */
  let { card, stages, open = $bindable(false), visible = false, bare = false }: { card: Card; stages: Stage[]; open?: boolean; visible?: boolean; bare?: boolean } = $props();

  const stageIndex = $derived(stages.findIndex((s) => s.key === card.currentStageKey));

  $effect(() => {
    if (open) { open = false; app.openMoveDialog(card.id); }
  });

  /**
   * The Alt+arrow body: move to the neighbouring stage, if there is one. `Alt` + arrow rather than a
   * bare arrow: bare arrows move BETWEEN cards.
   */
  export function step(delta: -1 | 1): void {
    const next = stages[stageIndex + delta];
    if (next) void app.moveCard(card.id, next.key);
  }
</script>

{#if !bare}
  <div class="absolute top-2 right-2 z-10">
    <button
      type="button"
      onclick={(e) => { e.stopPropagation(); app.openMoveDialog(card.id); }}
      aria-label="Move {card.title} to another stage"
      aria-haspopup="dialog"
      title="Move to…"
      class="text-muted-foreground hover:text-foreground tap mono rounded-[6px] text-[11px] leading-none {visible ? '' : 'opacity-0 focus-visible:opacity-100 group-hover:opacity-100'}"
    >⇄</button>
  </div>
{/if}
