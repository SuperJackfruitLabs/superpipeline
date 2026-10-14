// apps/web/src/lib/autogrow.ts — a textarea that is exactly as tall as its text.
/**
 * `use:autogrow={value}` on a `<textarea rows="1">`: the field is as tall as what it holds, so a long
 * description wraps and shows in full instead of running out of a one-line box. It refits when the text
 * is typed or replaced, and when the field's WIDTH changes (a rotated phone, a resized window): the
 * text wraps differently at every width, so the height has to be asked again.
 */
export function autogrow(node: HTMLTextAreaElement, _value?: unknown): { update: (v?: unknown) => void; destroy: () => void } {
  const fit = (): void => {
    node.style.height = 'auto';
    const chrome = node.offsetHeight - node.clientHeight; // borders
    node.style.height = `${node.scrollHeight + chrome}px`;
  };
  let width = -1;
  const ro = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => {
        if (node.clientWidth === width) return;
        width = node.clientWidth;
        fit();
      })
    : null;
  fit();
  node.addEventListener('input', fit);
  ro?.observe(node);
  return { update: () => fit(), destroy: () => { node.removeEventListener('input', fit); ro?.disconnect(); } };
}
