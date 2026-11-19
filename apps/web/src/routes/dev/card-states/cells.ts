// apps/web/src/routes/dev/card-states/cells.ts
/** The fixture world's cards for the card-states gallery (dev only), one per approved state. */
import type { GalleryCellSpec, GalleryKey } from '$lib/components/card/CardStatesGallery.svelte';

export const GALLERY_CELLS: Record<GalleryKey, GalleryCellSpec> = {
  gate: { boardId: 'brd_fa33a0a0721d4d18', cardId: 'card_42269e99036f42ae', opened: 'gate' },
  question: { boardId: 'brd_af3fde184dd84d90', cardId: 'card_fx_af3f_0001', opened: 'question' },
  stopped: { boardId: 'brd_134a0ddb6d434478', cardId: 'card_05823a57e8224605', opened: 'resume' },
  done: { boardId: 'brd_f47143722126442c', cardId: 'card_f180b1627c594b41' },
  archived: { boardId: 'brd_e247f164e060443f', cardId: 'card_e1eb201927f94506' },
  // Never fetches its detail, so the cell stays in its loading shape (and never keeps `data-ready` waiting).
  loading: { boardId: 'brd_134a0ddb6d434478', cardId: 'card_05823a57e8224605', holdDetail: true },
  // Shows the failed read without making one.
  error: { boardId: 'brd_fa33a0a0721d4d18', cardId: 'card_42269e99036f42ae', failDetail: true },
};
export const GALLERY_BOARD_IDS = [...new Set(Object.values(GALLERY_CELLS).map((c) => c.boardId))];
