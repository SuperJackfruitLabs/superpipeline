/**
 * The drawer opens at the top (audit #1/#28): vibekit's Drawer focuses the `[data-autofocus]`
 * element on open with a plain `focus()`, which scrolls that element to the top of the panel and
 * hides the title and Close above it (measured 130–265px). This attachment makes that element's
 * focus never scroll, and puts the panel back at its top once, as it opens.
 */
export function openAtTop(el: Element): () => void {
  const node = el as HTMLElement;
  const own = Object.getOwnPropertyDescriptor(node, 'focus');
  node.focus = function (opts?: FocusOptions) {
    HTMLElement.prototype.focus.call(this, { ...opts, preventScroll: true });
  };
  let p: HTMLElement | null = node.parentElement;
  while (p && p.scrollHeight <= p.clientHeight && getComputedStyle(p).overflowY !== 'auto' && getComputedStyle(p).overflowY !== 'scroll') p = p.parentElement;
  if (p) p.scrollTop = 0;
  return () => {
    if (own) Object.defineProperty(node, 'focus', own);
    else delete (node as { focus?: unknown }).focus;
  };
}

/** Focus a control the reader just asked for (an inline edit form), without moving the page. */
export function focusInPlace(el: Element | null | undefined): void {
  (el as HTMLElement | null | undefined)?.focus({ preventScroll: true });
}
