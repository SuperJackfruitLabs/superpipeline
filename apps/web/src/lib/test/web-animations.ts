// apps/web/src/lib/test/web-animations.ts
/**
 * jsdom has no Web Animations, and Svelte's transitions and animations run on `element.animate`. This
 * stands in for it: each animation is recorded and finishes on the next microtask, so a leaving
 * element leaves and an entering one settles, and a test can say whether the page animated at all.
 */
export interface Recorded { el: Element; keyframes: unknown; options: number | KeyframeAnimationOptions | undefined }

/** How long a recorded animation runs, in ms. */
export const durationOf = (r: Recorded): number => (typeof r.options === 'number' ? r.options : Number(r.options?.duration ?? 0));

export function stubWebAnimations(): { calls: Recorded[]; restore: () => void } {
  const calls: Recorded[] = [];
  const had = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    writable: true,
    value(this: Element, keyframes: unknown, options?: number | KeyframeAnimationOptions) {
      calls.push({ el: this, keyframes, options });
      const a = { onfinish: null as null | (() => void), oncancel: null, cancel() {}, play() {}, pause() {}, finish() { a.onfinish?.(); }, currentTime: 0, playState: 'running', finished: Promise.resolve() };
      queueMicrotask(() => a.onfinish?.());
      return a;
    },
  });
  return {
    calls,
    restore: () => {
      if (had) Object.defineProperty(Element.prototype, 'animate', had);
      else Reflect.deleteProperty(Element.prototype, 'animate');
    },
  };
}
