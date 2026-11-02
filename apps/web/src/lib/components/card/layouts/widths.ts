import type { Vibe } from '@superjackfruit/vibekit';

/** How wide each vibe draws the card drawer. Here rather than in `$lib/layouts`, so the drawers
 * that read their own width do not import the registry that imports them. */
export const CARD_DRAWER_WIDTH: Readonly<Record<Vibe, string>> = {
  daylight: 'min(680px, 100%)',
  paper: 'min(780px, calc(100% - 32px))',
  studio: 'min(940px, 100%)',
  quiet: 'min(1120px, 100%)',
};
