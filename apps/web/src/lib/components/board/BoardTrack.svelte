<!-- apps/web/src/lib/components/board/BoardTrack.svelte -->
<script lang="ts">
  /**
   * The pipeline, always visible: vibekit's board track names every stage in full, with its count and
   * who works it. Every cell is a drop target too, so a card can be moved to a stage that has no lane.
   * On a phone the track stays horizontal and scrolls sideways when it must.
   */
  import { StageTrack, type StageDetail } from '@superjackfruitlabs/vibekit-ui';
  import { app } from '$lib/stores/app.svelte';
  import { trackCellDropTarget } from '$lib/dnd';

  let { keys, names, details }: { keys: string[]; names: string[]; details: StageDetail[] } = $props();
  let wrap = $state<HTMLElement | null>(null);

  // The cells are vibekit's; each `li`, in stage order, becomes the drop target for its stage.
  $effect(() => {
    const stageKeys = [...keys];
    void names.length;
    if (!wrap) return;
    const cells = [...wrap.querySelectorAll<HTMLElement>('li.vk-stages__step')];
    const targets = cells.flatMap((li, i) => {
      const key = stageKeys[i];
      if (!key) return [];
      const t = trackCellDropTarget(li, { stageKey: key, onDrop: (cardId) => void app.moveCard(cardId, key) });
      return t ? [t] : [];
    });
    return () => { for (const t of targets) t.destroy?.(); };
  });
</script>

<div class="bv-track" bind:this={wrap}>
  <StageTrack form="board" stages={names} current={-1} {details} label="Stages" />
</div>
