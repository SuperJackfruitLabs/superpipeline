<!-- apps/web/src/lib/components/card/states/CardStatesGallery.svelte -->
<script module lang="ts">
  export interface GalleryCellSpec { boardId: string; cardId: string; holdDetail?: boolean }
</script>

<script lang="ts">
  /**
   * Builds the six gallery CardModels from snapshots the route fetched (CardSource) and hands them
   * to the vibe's states layout. `specs` and `sources` are read once: the gallery does not change.
   */
  import { untrack } from 'svelte';
  import { appearance } from '$lib/appearance.svelte';
  import { CARD_STATES_LAYOUTS } from '$lib/layouts';
  import { CardModel, type CardSource } from '../card-model.svelte';
  import type { CardStateCell, CardStateCellKey } from '../layouts/types';

  let { specs, sources }: { specs: Record<CardStateCellKey, GalleryCellSpec>; sources: Record<string, CardSource> } = $props();
  const KEYS: CardStateCellKey[] = ['gate', 'question', 'archived', 'done', 'error', 'loading'];
  const models = untrack(() => Object.fromEntries(KEYS.map((k) => {
    const s = specs[k];
    return [k, new CardModel(() => ({ boardId: s.boardId, cardId: s.cardId, surface: 'gallery' }), { holdDetail: s.holdDetail, source: sources[s.boardId] })];
  })) as Record<CardStateCellKey, CardModel>);
  const cells = $derived(Object.fromEntries(KEYS.map((k) => [k, { model: models[k], gate: models[k].gateBinding, question: models[k].questionBinding }])) as Record<CardStateCellKey, CardStateCell>);
  const Layout = $derived(CARD_STATES_LAYOUTS[appearance.value.vibe]);
</script>

<Layout {cells} vibe={appearance.value.vibe} phase={appearance.phase} />
