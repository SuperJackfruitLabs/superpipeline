// apps/web/src/lib/components/shell/types.ts
import type { Snippet } from 'svelte';
import type { IconName } from '$lib/components/parts/icons';
import type { ShellStatus } from './shell-words';

/** The three places (nav v2): Inbox, the home; Plan; Crew. Settings sits in the account menu and highlights none. */
export type ShellHere = 'inbox' | 'plan' | 'crew' | null;
/** The Studio eyebrow word: "Superpipeline · board". */
export type ShellSection = 'board' | 'list' | 'projects' | 'inbox' | 'card' | 'crew' | 'settings' | 'spend' | 'log';
export type ShellView = 'board' | 'list' | 'projects';

export interface ShellProps {
  here: ShellHere;
  section: ShellSection;
  /** Board-scoped pages pass the board name; the Inbox, Crew and Settings pass null (no switcher). */
  boardName: string | null;
  /** Plan pages pass the active view; every other page passes null: no view switch, no Filter. */
  view: ShellView | null;
  /** The sub-bar note, verbatim ("Showing all 7 cards"). null hides it. */
  showing: string | null;
  /** Paper's masthead note ("Showing all 7 cards · 4 wait on you · 1 shipped"). */
  paperShowing?: string;
  /** Paper phone dateline suffix ("7 cards"). */
  editionCount?: string;
  /** Studio sub-bar right text ("The board at 13:51 · midday · Sunday 11 October"). */
  studioSubRight?: string | null;
  /** Studio status line; null or absent hides the footer. */
  status?: ShellStatus | null;
  /** Page tools drawn in the sub-bar right after the Filter control (Task 31's List puts Group by there). */
  subTools?: Snippet;
  /** Daylight: drawn inside the sky under the sub-bar (the board's greeting band). */
  sky?: Snippet;
  /** The page draws its own reading column: Quiet's shell drops its 72ch frame (the board sets its own); Studio's AppShell runs the page to its edges (vibekit `bleed`). */
  bleed?: boolean;
  /** The page draws its own h1 (Operate): the masthead title becomes a plain line, so the page still has exactly one h1. */
  ownHeading?: boolean;
  children: Snippet;
}

export interface MenuItem { kind: 'heading' | 'item' | 'checkbox'; label: string; sub?: string; icon?: IconName; checked?: boolean; onSelect?: () => void }

export const VIEWS: ReadonlyArray<readonly [ShellView, string]> = [['board', 'Board'], ['list', 'List'], ['projects', 'Projects']];
