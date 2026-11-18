// apps/web/e2e/visual/screens.ts — the screens the visual job captures at base and at head: per vibe,
// light theme, Board, the rich card's page, its drawer over the board, the phone board and the New card
// dialog (20). The card and dialog screens are the pixel suite's (same routes, steps and fixture world),
// app side only and whole page: no parts, no masks (both sides are rendered by one machine, so nothing
// needs hiding). The board's references were retired by the composition contract, so its two screens
// are defined here, at the sizes their artboards had.
import { SCREENS, type Screen, type Vibe } from '../pixel/screens';

const VIBES = ['Daylight', 'Paper', 'Studio', 'Quiet'] as const;
const KINDS = ['Board', 'CardPage', 'Card', 'Phone-Board', 'Dlg-NewCard'] as const;
export const VISUAL_ARTBOARDS: string[] = VIBES.flatMap((V) => KINDS.map((k) => `SP-${k}-${V}`));

const DX = '/b/brd_134a0ddb6d434478';
const waitLive: Screen['steps'] = async (p) => { await p.locator('[data-live="on"]').first().waitFor(); };
const BOARD_SCREENS: Screen[] = VIBES.flatMap((V) => {
  const vibe = V.toLowerCase() as Vibe;
  const strength = vibe === 'quiet' ? ('off' as const) : undefined;
  return [
    { artboard: `SP-Board-${V}`, vibe, route: DX, strength, steps: waitLive, size: { w: 1440, h: 1148 } },
    { artboard: `SP-Phone-Board-${V}`, vibe, route: DX, strength, steps: waitLive, size: { w: 390, h: 844 } },
  ];
});

export const VISUAL_SCREENS: Screen[] = VISUAL_ARTBOARDS.map((a) => {
  const s = [...BOARD_SCREENS, ...SCREENS].find((x) => x.artboard === a);
  if (!s) throw new Error(`visual: no screen ${a}`);
  return { ...s, parts: undefined, masks: undefined };
});
