<!-- apps/web/src/lib/components/board/BoardTrack.svelte -->
<script lang="ts">
  /**
   * The pipeline, always visible: vibekit's board track names every stage in full, with its count and
   * who works it. Every cell is a drop target too, so a card can be moved to a stage that has no lane.
   * On a phone the track stays horizontal and scrolls sideways when it must.
   */
  import { StageTrack, type StageDetail } from '@superjackfruitlabs/vibekit-ui';
  import { replay } from '@superjackfruitlabs/vibekit-ui/motion';
  import { app } from '$lib/stores/app.svelte';
  import { trackCellDropTarget } from '$lib/dnd';

  let { keys, names, details }: { keys: string[]; names: string[]; details: StageDetail[] } = $props();
  let wrap = $state<HTMLElement | null>(null);

  // The cells are vibekit's; each `li`, in stage order, becomes the drop target for its stage. vibekit
  // draws a form of the track per vibe, so a vibe change (or any redraw) makes new cells: a watch on the
  // track binds whatever cells are on screen, and only when they are not the ones already bound.
  $effect(() => {
    const stageKeys = [...keys];
    void names.length;
    const el = wrap;
    if (!el) return;
    let bound: HTMLElement[] = [];
    let targets: Array<{ destroy?: () => void }> = [];
    const bind = () => {
      const cells = [...el.querySelectorAll<HTMLElement>('li.vk-stages__step')];
      if (cells.length === bound.length && cells.every((li, i) => li === bound[i])) return;
      for (const t of targets) t.destroy?.();
      bound = cells;
      targets = cells.flatMap((li, i) => {
        const key = stageKeys[i];
        if (!key) return [];
        const t = trackCellDropTarget(li, { stageKey: key, onDrop: (cardId) => void app.moveCard(cardId, key) });
        return t ? [t] : [];
      });
    };
    bind();
    const watch = new MutationObserver(bind);
    watch.observe(el, { childList: true, subtree: true });
    return () => { watch.disconnect(); for (const t of targets) t.destroy?.(); };
  });

  // A stage's count that changes live bumps once in its cell (rule 9), as a lane's count does; never on
  // the first draw, and nothing under reduced motion (vibekit's `replay` reads `data-motion`).
  let said: Map<string, string> | null = null;
  $effect(() => {
    const now = new Map(keys.map((k, i) => [k, `${details[i]?.count ?? ''}|${details[i]?.who ?? ''}`]));
    const was = said;
    said = now;
    if (!was || !wrap) return;
    const cells = [...wrap.querySelectorAll<HTMLElement>('li.vk-stages__step')];
    keys.forEach((k, i) => {
      if (was.get(k) === now.get(k)) return;
      const n = cells[i]?.querySelector<HTMLElement>('.vk-stages__detail');
      if (n) replay(n, 'vk-bump');
    });
  });
</script>

<div class="bv-track" bind:this={wrap}>
  <StageTrack form="board" stages={names} current={-1} {details} label="Stages" />
</div>
