// apps/web/src/lib/components/card/testing/mount-model.svelte.ts
/** Build a CardModel inside an effect root, the way a component would. Test-only. */
import { flushSync } from 'svelte';
import { CardModel, type CardSource, type CardSurface } from '../card-model.svelte';
import { BOARD_DX, CARD_4605 } from './card-4605';

export function mountModel(o: { surface?: CardSurface; boardId?: string; cardId?: string; holdDetail?: boolean; source?: CardSource } = {}): { model: CardModel; dispose: () => void } {
  let model!: CardModel;
  const dispose = $effect.root(() => {
    model = new CardModel(() => ({ boardId: o.boardId ?? BOARD_DX.boardId, cardId: o.cardId ?? CARD_4605.id, surface: o.surface ?? 'drawer' }), { holdDetail: o.holdDetail, source: o.source });
  });
  flushSync();
  return { model, dispose };
}
