// apps/web/src/lib/components/settings/account-settings-words.ts
import type { AccentChoice, Vibe } from '@superjackfruitlabs/vibekit-ui';

export const SETTINGS_LEDE = 'Workspace labels and connections, and how Superpipeline looks for you.';

const VIBES: Record<Vibe, string> = { daylight: 'Daylight', paper: 'Paper', studio: 'Studio', quiet: 'Quiet', console: 'Console' };
export const vibeWords = (v: Vibe): string => VIBES[v] ?? v;
export const accentWords = (a: AccentChoice): string => (a === 'product' ? 'Superpipeline (default)' : a.charAt(0).toUpperCase() + a.slice(1));
