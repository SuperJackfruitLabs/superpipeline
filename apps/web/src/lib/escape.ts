import { isTypingTarget } from '$lib/components/shell/shortcuts';

/**
 * Escape closes the card, unless something inside it already took the key: the embedded viewer
 * (panels, the widen confirmation, full screen) listens on the document and calls preventDefault.
 */
export function closeCardOnEscape(e: KeyboardEvent, close: () => void): void {
  if (e.key === 'Escape' && !e.defaultPrevented) close();
}

/** Drawn: Chromium's checkVisibility, else (jsdom) not under a `hidden` ancestor. */
const shown = (el: Element): boolean => (typeof el.checkVisibility === 'function' ? el.checkVisibility() : !el.closest('[hidden]'));

/** A dialog or menu is open over the page: its own Esc is the one that counts. */
function overlayOpen(doc: Document): boolean {
  return [...doc.querySelectorAll('dialog[open], [role="dialog"], [role="alertdialog"], [role="menu"]')].some(shown);
}

/**
 * Escape leaves a page that is a card (the card page): from anywhere on it, not only from inside the
 * card, unless something already took the key, the person is typing, or a dialog or menu is open.
 */
export function leaveOnEscape(e: KeyboardEvent, leave: () => void): void {
  if (e.key !== 'Escape' || e.defaultPrevented || isTypingTarget(e.target)) return;
  if (overlayOpen(document)) return;
  e.preventDefault();
  leave();
}
