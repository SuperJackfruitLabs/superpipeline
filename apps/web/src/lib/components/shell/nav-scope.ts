// apps/web/src/lib/components/shell/nav-scope.ts
/**
 * Which cards a number counts. The rail's Operate badge counts THIS board's cards waiting on you
 * on a board page and every board's on a workspace page, and vibekit's nav says only "3 need you".
 * Say the scope in the link's accessible name and tooltip (vibekit owns the link and its text).
 */
import { countWords } from '@superjackfruit/vibekit';

export const BOARD_SCOPE = 'on this board';
export const ALL_BOARDS_SCOPE = 'across all boards';

/** "3 need you on this board", "5 need you across all boards". */
export function scopedNeedWords(n: number, boardScoped: boolean): string {
  return `${countWords(n, true)} ${boardScoped ? BOARD_SCOPE : ALL_BOARDS_SCOPE}`;
}

/** Name the Operate link with its count's scope, in the rail and on the phone's tab bar. Returns the links it named. */
export function nameOperateCount(root: ParentNode, href: string, n: number, boardScoped: boolean): Element[] {
  const links = [...root.querySelectorAll(`.vk-appnav a[href="${href}"], .vk-phonetabbar a[href="${href}"]`)];
  for (const a of links) {
    if (n > 0) {
      const words = scopedNeedWords(n, boardScoped);
      a.setAttribute('aria-label', `Operate, ${words}`);
      a.setAttribute('title', `Operate · ${words}`);
    } else {
      a.removeAttribute('aria-label');
      a.removeAttribute('title');
    }
  }
  return links;
}
