// apps/web/src/lib/components/shell/types.ts
import type { Snippet } from 'svelte';
import type { IconName } from '$lib/components/parts/icons';
import type { LiveState, LiveToggle, MastheadLive } from '@superjackfruitlabs/vibekit-ui';

/** The three places (nav v2): Inbox, the home; Plan; Crew. Settings sits in the account menu and highlights none. */
export type ShellHere = 'inbox' | 'plan' | 'crew' | null;
/** The Studio eyebrow word: "Superpipeline · board". */
export type ShellSection = 'board' | 'list' | 'projects' | 'project' | 'inbox' | 'card' | 'crew' | 'settings' | 'spend' | 'log';
/** A board's views (Projects is Plan's own section since nav v2, not a board view). */
export type ShellView = 'board' | 'list';
/** Plan's two sections: a board's Board/List, and the workspace's Projects. */
export type PlanSection = 'boards' | 'projects';

/**
 * The masthead's Live pill as a pause/resume toggle (`shellModel.liveToggle`): the connection's state
 * and words, and vibekit's `LiveToggle` over `liveUpdates`. `attrs` marks the pill (`data-live`).
 */
export type ShellLive = LiveToggle & { state: LiveState; label: string; detail?: string; attrs?: MastheadLive['attrs'] };

/**
 * What a page hands the one shell. Pages draw their own tabs, filter, "Showing…" line and footer; the
 * shell is the same composition in every vibe, and only its signature slot differs.
 */
export interface ShellProps {
  here: ShellHere;
  section: ShellSection;
  /** Board-scoped pages pass the board name; the Inbox, Crew and Settings pass null (no switcher). */
  boardName: string | null;
  /** Plan pages pass their section (Boards or Projects): the Plan switch is drawn. Off Plan, absent. */
  plan?: PlanSection;
  /** The phone header's title when the page names itself (a project page); else the board or section. */
  title?: string;
  /** The Live toggle: pass `shellModel.liveToggle`. */
  live: ShellLive;
  /**
   * The masthead's primary action where the page's main thing is not a card (Plan · Projects: New project).
   * Absent: New card, which opens the composer.
   */
  primary?: { label: string; onclick: () => void };
  /** The page runs to the shell's edges (vibekit `bleed`); off, Quiet keeps its 72ch reading column. */
  bleed?: boolean;
  /** The page draws its own h1: the masthead title becomes a plain line, so the page still has exactly one h1. */
  ownHeading?: boolean;
  children: Snippet;
}

export interface MenuItem { kind: 'heading' | 'item' | 'checkbox'; label: string; sub?: string; icon?: IconName; checked?: boolean; onSelect?: () => void }

export const VIEWS: ReadonlyArray<readonly [ShellView, string]> = [['board', 'Board'], ['list', 'List']];
export const PLAN_SECTIONS: ReadonlyArray<readonly [PlanSection, string]> = [['boards', 'Boards'], ['projects', 'Projects']];
