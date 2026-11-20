// apps/web/src/lib/components/shell/shell-model.svelte.ts
/**
 * Every global value the shell shows, as reactive getters over the store and the appearance, and the
 * actions the shell's controls call. The shell reads this; pages pass only what is theirs
 * (`ShellProps`), and register what the shell's keys need from them (a filter).
 */
import type { Phase } from '@superjackfruitlabs/vibekit-ui';
import { untrack } from 'svelte';
import { goto } from '$app/navigation';
import { app } from '$lib/stores/app.svelte';
import { appearance } from '$lib/appearance.svelte';
import { activeFilterCount } from '$lib/stores/card-filters';
import { signOut } from './account';
import { boardCounts, boardStatus, dateline, initialsOf, showingLine, userNameOf, type ShellStatus } from './shell-words';
import type { ShellLive, ShellView } from './types';
import { liveView } from '$lib/loading';
import { liveUpdates } from '$lib/live/live-updates.svelte';

const liveCards = () => (app.board?.cards ?? []).filter((c) => !c.archivedAt);
const needIds = () => new Set(app.needsYou().map((i) => i.cardId));

/** What the mounted page has handed the shell: how many filters it offers, and how the latest one opens. */
class PageRegistry {
  filters = $state(0);
  openers: Array<() => void> = [];
}
const page = new PageRegistry();

export const shellModel = {
  /** The Inbox badge (nav v2): every card waiting on you, across all boards, on every page. */
  get inboxBadge(): number { return app.attention.length; },
  /**
   * The masthead's Live toggle: the connection's word (Connecting… on first load, Live, Reconnecting…
   * only after a drop, Offline), and pause/resume over `liveUpdates`. Paused, it reads Paused.
   */
  get liveToggle(): ShellLive {
    const v = liveView(app.connection);
    return {
      state: liveUpdates.live ? v.state : 'paused', label: v.label, detail: v.detail, attrs: v.attrs,
      live: liveUpdates.live, queued: liveUpdates.queued.length,
      ontoggle: () => (liveUpdates.live ? liveUpdates.pause() : liveUpdates.resume()),
      onapply: () => liveUpdates.apply(),
    };
  },
  /** A page offers a filter (the board's top row): F opens the filter dialog. */
  get filterAvailable(): boolean { return page.filters > 0; },
  /**
   * The page registers its filter while it is mounted; call the returned function to withdraw it (use in `$effect`).
   * `open` is how F opens it (the Inbox's filter row); without it F opens the board's Filter cards dialog.
   */
  registerFilter(open?: () => void): () => void {
    // Untracked: registering from an effect must not make that effect depend on the count it writes.
    untrack(() => (page.filters += 1));
    if (open) page.openers.push(open);
    let done = false;
    return () => {
      if (done) return;
      done = true;
      untrack(() => (page.filters -= 1));
      if (open) page.openers = page.openers.filter((o) => o !== open);
    };
  },
  get userName(): string { return userNameOf(app.user); },
  get initials(): string { return initialsOf(userNameOf(app.user)); },
  get dark(): boolean { return appearance.theme === 'dark'; },
  get phase(): Phase { return appearance.phase; },
  /**
   * The phone header's sky. The dark theme draws dusk (SP-Phone-Board-Daylight dark), whatever the
   * hour; light follows the time of day.
   */
  get phonePhase(): Phase { return appearance.theme === 'dark' ? 'dusk' : appearance.phase; },
  get dateline(): string { return dateline(new Date(), appearance.phase); },
  /** This board's non-archived cards. */
  get liveCount(): number { return liveCards().length; },
  /** Non-archived cards the filters let through (Studio "List 7"). */
  get listCount(): number { return app.filteredCards().filter((c) => !c.archivedAt).length; },
  get showing(): string { return showingLine(this.listCount, this.liveCount, activeFilterCount(app.filters) > 0); },
  get boardStatus(): ShellStatus { return boardStatus(boardCounts(app.board?.cards ?? [], needIds()), app.syncedAt, undefined, !liveUpdates.live); },
  homeHref: '/inbox',
  inboxHref: '/inbox',
  get planHref(): string { return app.boardId ? `/b/${app.boardId}` : '/'; },
  /** Plan · Boards: the open board. */
  get boardsHref(): string { return app.boardId ? `/b/${app.boardId}` : '/'; },
  projectsHref: '/plan/projects',
  crewHref: '/crew/agents',
  settingsHref: '/settings',
  openSearch(): void { app.cmdkOpen = true; },
  compose(): void { app.requestCompose(); },
  setView(v: ShellView): void { app.setView(v); },
  openFilter(): void { const open = page.openers.at(-1); if (open) open(); else app.filterOpen = true; },
  openBoardSwitcher(): void { app.boardSwitcherOpen = true; },
  openAppearance(): void { appearance.pickerOpen = true; },
  openSettings(): void { void goto('/settings'); },
  toggleTheme(): void { appearance.toggleTheme(); },
  signOut(): void { void signOut(); },
};
