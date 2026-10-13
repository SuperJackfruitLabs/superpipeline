// apps/web/src/routes/dev/card-states/cells.ts
/** The fixture world's six cards for the card-states gallery (dev only). */
import type { GalleryCellSpec } from '$lib/components/card/states/CardStatesGallery.svelte';
import type { CardStateCellKey } from '$lib/components/card/layouts/types';

export const GALLERY_CELLS: Record<CardStateCellKey, GalleryCellSpec> = {
  gate: { boardId: 'brd_fa33a0a0721d4d18', cardId: 'card_42269e99036f42ae' },
  question: { boardId: 'brd_af3fde184dd84d90', cardId: 'card_fx_af3f_0001' },
  archived: { boardId: 'brd_e247f164e060443f', cardId: 'card_e1eb201927f94506' },
  done: { boardId: 'brd_f47143722126442c', cardId: 'card_f180b1627c594b41' },
  error: { boardId: 'brd_fa33a0a0721d4d18', cardId: 'card_42269e99036f42ae' },
  // Never fetches its detail, so cell F stays in its loading shape (and the held routes in the
  // harness never keep `data-ready` waiting).
  loading: { boardId: 'brd_134a0ddb6d434478', cardId: 'card_05823a57e8224605', holdDetail: true },
};
export const GALLERY_BOARD_IDS = [...new Set(Object.values(GALLERY_CELLS).map((c) => c.boardId))];
