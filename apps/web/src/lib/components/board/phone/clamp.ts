// apps/web/src/lib/components/board/phone/clamp.ts
/**
 * Reports whether a line-clamped element hides text, so "Read the rest" renders only when there is a
 * rest to read (shell-and-board §5). Re-measures on resize and once fonts have loaded. 1px of
 * rounding is "fits".
 */
export function clampWatch(node: HTMLElement, set: (clamped: boolean) => void): { update(next: (clamped: boolean) => void): void; destroy(): void } {
  let report = set;
  let alive = true;
  const measure = () => { if (alive) report(node.scrollHeight > node.clientHeight + 1); };
  measure();
  const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
  ro?.observe(node);
  void document.fonts?.ready.then(measure);
  return { update(next) { report = next; measure(); }, destroy() { alive = false; ro?.disconnect(); } };
}
