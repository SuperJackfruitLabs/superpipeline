// apps/web/src/lib/focus-row.ts
/**
 * Where focus goes after "Show N more" (vibekit `LoadMore`'s `focusTarget`): the first new row's
 * first control, or the row itself. Without it, the last press removes the button and focus falls
 * to the page's body. A table row comes in two forms (the table and the phone's cards); the one on
 * screen is chosen.
 */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
export const TABLE_ROWS = ['tr[data-row]', '.vk-datatable__card'] as const;

export function rowFocus(root: ParentNode | null | undefined, index: number, selectors: readonly string[] = TABLE_ROWS): HTMLElement | null {
  if (!root) return null;
  const rows = selectors.map((s) => root.querySelectorAll<HTMLElement>(s)[index]).filter((r): r is HTMLElement => !!r);
  const row = rows.find((r) => r.getClientRects().length > 0) ?? rows[0];
  if (!row) return null;
  const inner = row.querySelector<HTMLElement>(FOCUSABLE);
  if (inner) return inner;
  if (!row.hasAttribute('tabindex')) row.tabIndex = -1;
  return row;
}

/**
 * The first element matching `selector` that is not on its way out. A card that moves lane fades out of
 * its old one (Lane's `out:fade`), and Svelte makes an outroing element inert while it fades, so the old
 * tile and the new one both match `[data-card-id]` for a moment; focus belongs on the new one.
 */
export function liveMatch(selector: string, root: ParentNode = document): HTMLElement | null {
  return [...root.querySelectorAll<HTMLElement>(selector)].find((el) => !el.closest('[inert]')) ?? null;
}
