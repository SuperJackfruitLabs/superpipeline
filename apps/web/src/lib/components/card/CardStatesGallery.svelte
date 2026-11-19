<!-- apps/web/src/lib/components/card/CardStatesGallery.svelte -->
<script module lang="ts">
  export interface GalleryCellSpec { boardId: string; cardId: string; holdDetail?: boolean; failDetail?: boolean; opened?: CardPanel }
  /** The approved card states (card-states.html), in its order. */
  export const GALLERY_KEYS = ['gate', 'question', 'stopped', 'done', 'archived', 'loading', 'error'] as const;
  export type GalleryKey = (typeof GALLERY_KEYS)[number];
  export const GALLERY_TITLES: Readonly<Record<GalleryKey, string>> = {
    gate: 'Decision pending', question: 'Question pending', stopped: 'Stopped', done: 'Done', archived: 'Archived', loading: 'Loading', error: 'Error',
  };
</script>

<script lang="ts">
  /**
   * Every card state on one page, for review (dev only): one CardView per state, built from snapshots
   * the route fetched (CardSource). `specs` and `sources` are read once: the gallery does not change.
   */
  import { untrack } from 'svelte';
  import { CardModel, type CardSource } from './card-model.svelte';
  import CardView from './CardView.svelte';
  import type { CardPanel } from './CardState.svelte';

  let { specs, sources }: { specs: Record<GalleryKey, GalleryCellSpec>; sources: Record<string, CardSource> } = $props();
  const models = untrack(() => Object.fromEntries(GALLERY_KEYS.map((k) => {
    const s = specs[k];
    return [k, new CardModel(() => ({ boardId: s.boardId, cardId: s.cardId, surface: 'gallery' }), { holdDetail: s.holdDetail || s.failDetail, failDetail: s.failDetail, source: sources[s.boardId] })];
  })) as Record<GalleryKey, CardModel>);
</script>

<div class="cv-gallery">
  {#each GALLERY_KEYS as k (k)}
    <section class="cv-cell" aria-label={GALLERY_TITLES[k]} data-cell={k}>
      <p class="cv-celltitle">{GALLERY_TITLES[k]}</p>
      <CardView model={models[k]} surface="gallery" gate={models[k].gateBinding} question={models[k].questionBinding} pageHref={models[k].pageHref} boardHref={models[k].boardHref} opened={specs[k].opened ?? null} />
    </section>
  {/each}
</div>

<style>
  .cv-gallery { display: grid; gap: var(--vk-space-6); padding: var(--vk-space-5); max-width: 64rem; margin: 0 auto; }
  .cv-cell { border: 1px solid var(--vk-color-line); border-radius: var(--vk-radius-md); }
  .cv-celltitle { margin: 0; padding: var(--vk-space-3) var(--vk-space-5) 0; color: var(--vk-color-muted); font: var(--vk-type-eyebrow); }
</style>
