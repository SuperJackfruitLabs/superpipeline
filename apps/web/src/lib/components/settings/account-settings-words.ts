// apps/web/src/lib/components/settings/account-settings-words.ts
import type { AccentChoice, Vibe } from '@superjackfruit/vibekit';

export const SETTINGS_LEDE = 'Workspace labels and connections, and how Superpipeline looks for you.';
/** The four sections, in page order; the account menu's Settings item hints at the first two. */
export const SETTINGS_SECTIONS = [
  { id: 'labels', label: 'Labels', hint: 'Shared by every board' },
  { id: 'connections', label: 'Connections', hint: 'Forge, AgentPod' },
  { id: 'appearance', label: 'Appearance', hint: 'Vibe, theme, accent' },
  { id: 'account', label: 'Account', hint: 'Name, sign out' },
] as const;
export const SETTINGS_MENU_HINT = 'Labels · Connections';

const VIBES: Record<Vibe, string> = { daylight: 'Daylight', paper: 'Paper', studio: 'Studio', quiet: 'Quiet' };
export const vibeWords = (v: Vibe): string => VIBES[v] ?? v;
export const accentWords = (a: AccentChoice): string => (a === 'product' ? 'Superpipeline (default)' : a.charAt(0).toUpperCase() + a.slice(1));
