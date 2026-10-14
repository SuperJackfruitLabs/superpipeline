// apps/web/src/lib/motion/reveal.ts — "Show all" and other expand toggles animate (Round 3, M1).
//
// A toggle (a button with aria-expanded) inside a `[data-reveal]` block swaps that block's content: a clamped
// excerpt for the full text, five log rows for all of them, a closed attempt for an open one. The swap used to
// be instant. One document-level listener measures the block's height before the click, lets Svelte update the
// DOM, then animates the height from the old value to the new one (overflow clipped while it runs), so the text
// grows into place instead of jumping. vibekit's .vk-reveal (0fr → 1fr) only covers hidden → shown; these swaps
// go from one height to another, so the height is measured. Reduced motion: nothing animates. Quiet: a short
// fade only, never a moving height. Focus and aria-expanded are the toggle's own and are left alone.
import { duration, isReducedMotion } from '@superjackfruit/vibekit/motion';

export type RevealKind = 'none' | 'fade' | 'height';

/** What a toggle does in this vibe and motion setting. */
export function revealKind(reduced: boolean, vibe: string | undefined, from: number, to: number): RevealKind {
  if (reduced) return 'none';
  if (vibe === 'quiet') return 'fade';
  return Math.abs(to - from) < 1 ? 'none' : 'height';
}

const running = new WeakMap<HTMLElement, Animation>();

/** Animate one block from its old height to its current one (or fade it in Quiet). */
export function animateReveal(el: HTMLElement, from: number): Animation | null {
  if (typeof el.animate !== 'function') return null;
  running.get(el)?.cancel();
  const to = el.getBoundingClientRect().height;
  const kind = revealKind(isReducedMotion(el), document.documentElement.dataset.vibe, from, to);
  if (kind === 'none') return null;
  const easing = getComputedStyle(el).getPropertyValue('--vk-ease-standard').trim() || 'ease';
  const anim = kind === 'fade'
    ? el.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: duration('fast', el), easing: 'linear' })
    : el.animate([{ height: `${from}px`, overflow: 'clip' }, { height: `${to}px`, overflow: 'clip' }], { duration: duration('base', el), easing });
  running.set(el, anim);
  const done = () => { if (running.get(el) === anim) running.delete(el); };
  anim.addEventListener('finish', done);
  anim.addEventListener('cancel', done);
  return anim;
}

/** The block a toggle reveals: its nearest `[data-reveal]` ancestor. Menus and dialogs are not reveals. */
export function revealTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const toggle = target.closest<HTMLElement>('[aria-expanded]');
  if (!toggle || toggle.hasAttribute('aria-haspopup')) return null;
  return toggle.closest<HTMLElement>('[data-reveal]');
}

/** Install the listener once (the root layout). Returns the uninstaller. */
export function installReveal(doc: Document = document): () => void {
  const onClick = (e: Event) => {
    const el = revealTarget(e.target);
    if (!el) return;
    const from = el.getBoundingClientRect().height;
    // Svelte flushes its DOM update in a microtask; the frame callback runs after that and before paint.
    requestAnimationFrame(() => animateReveal(el, from));
  };
  doc.addEventListener('click', onClick, true);
  return () => doc.removeEventListener('click', onClick, true);
}
