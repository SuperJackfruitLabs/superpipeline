type Place = { route: { id: string | null } } | null | undefined;

/**
 * A navigation that changes screen cross-fades (vibekit's vkNavigate). The first load, a param change on the same
 * screen, and opening or closing a card do not: the card drawer and sheet bring their own motion, and a page
 * transition over them would block the page for its length.
 */
export function isPageChange(from: Place, to: Place): boolean {
  const a = from?.route.id, b = to?.route.id;
  if (!a || !b || a === b) return false;
  return !a.includes('/c/[cardId]') && !b.includes('/c/[cardId]');
}
