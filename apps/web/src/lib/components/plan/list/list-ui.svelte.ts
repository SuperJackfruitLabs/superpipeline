/**
 * The List's transient UI state (Studio's quick filter and selected row, Daylight's open Move menu),
 * owned by PlanView so a layout that re-mounts (a re-render at another width) keeps it.
 */
import type { QuickFilter } from './types';

export class ListUi {
  quick = $state<QuickFilter>('all');
  selected = $state<number | null>(null);
  /** The card whose Move menu is open (Daylight); null when none. */
  moveOpen = $state<string | null>(null);
}
