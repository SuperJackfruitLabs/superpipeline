/**
 * The List's transient UI state (the selected row, the open Move menu, the page), owned by PlanView
 * so a view that re-mounts (a re-render at another width) keeps it.
 */

/** Rows per page of the List. */
export const LIST_PAGE = 30;

export class ListUi {
  /** The selected row's card id (J / K, or focus in a row); null when none. */
  selected = $state<string | null>(null);
  /** The card whose Move menu is open; null when none. */
  moveOpen = $state<string | null>(null);
  /** How many rows are shown (rule 7: Show N more). */
  limit = $state(LIST_PAGE);
}
