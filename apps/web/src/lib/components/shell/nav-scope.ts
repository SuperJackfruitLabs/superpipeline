// apps/web/src/lib/components/shell/nav-scope.ts
/**
 * Which cards a number counts. The rail's Inbox badge counts every board's cards waiting on you,
 * on every page, and vibekit's nav says only "3 need you".
 * Say the scope in the link's accessible name and tooltip (vibekit owns the link and its text).
 */
import { countWords } from '@superjackfruit/vibekit';

export const BOARD_SCOPE = 'on this board';
export const ALL_BOARDS_SCOPE = 'across all boards';

/** "3 need you on this board", "5 need you across all boards". */
export function scopedNeedWords(n: number, boardScoped: boolean): string {
  return `${countWords(n, true)} ${boardScoped ? BOARD_SCOPE : ALL_BOARDS_SCOPE}`;
}

/** Name the Inbox link with its count's scope (always every board), in the rail and on the phone's tab bar. Returns the links it named. */
export function nameInboxCount(root: ParentNode, href: string, n: number): Element[] {
  const links = [...root.querySelectorAll(`.vk-appnav a.vk-appnav__item[href="${href}"], .vk-phonetabbar a[href="${href}"]`)];
  for (const a of links) {
    if (n > 0) {
      const words = scopedNeedWords(n, false);
      a.setAttribute('aria-label', `Inbox, ${words}`);
      a.setAttribute('title', `Inbox · ${words}`);
    } else {
      a.removeAttribute('aria-label');
      a.removeAttribute('title');
    }
  }
  return links;
}
