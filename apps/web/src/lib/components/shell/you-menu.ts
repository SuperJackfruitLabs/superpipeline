// apps/web/src/lib/components/shell/you-menu.ts
/**
 * The phone's account menu (G15), opened from the tab bar's "You" (vibekit's PhoneTabBar menu tab):
 * who is signed in, Appearance, the theme and Sign out. The rail and bar shells use AppNav's own
 * `account.items`.
 */
import type { MenuItem } from '@superjackfruit/vibekit';
import { shellModel as m } from './shell-model.svelte';

export function youMenuItems(): MenuItem[] {
  return [
    { heading: m.userName },
    { label: 'Appearance…', onselect: m.openAppearance },
    { label: m.dark ? 'Light theme' : 'Dark theme', onselect: m.toggleTheme },
    { separator: true },
    { label: 'Sign out', onselect: m.signOut },
  ];
}
