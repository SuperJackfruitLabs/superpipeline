// apps/web/e2e/visual/screens.ts — the screens the visual job captures at base and at head: per vibe,
// light theme, Board, the rich card's page, its drawer over the board, the phone board and the New card
// dialog (20). They are the pixel suite's screens (same routes, steps and fixture world), app side only and
// whole page: no parts, no masks (both sides are rendered by one machine, so nothing needs hiding).
import { SCREENS, type Screen } from '../pixel/screens';

const VIBES = ['Daylight', 'Paper', 'Studio', 'Quiet'] as const;
const KINDS = ['Board', 'CardPage', 'Card', 'Phone-Board', 'Dlg-NewCard'] as const;
export const VISUAL_ARTBOARDS: string[] = VIBES.flatMap((V) => KINDS.map((k) => `SP-${k}-${V}`));

export const VISUAL_SCREENS: Screen[] = VISUAL_ARTBOARDS.map((a) => {
  const s = SCREENS.find((x) => x.artboard === a);
  if (!s) throw new Error(`visual: no pixel screen ${a}`);
  return { ...s, parts: undefined, masks: undefined };
});
