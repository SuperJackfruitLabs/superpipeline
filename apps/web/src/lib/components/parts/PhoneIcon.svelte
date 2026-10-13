<!-- apps/web/src/lib/components/parts/PhoneIcon.svelte -->
<script lang="ts" module>
  /** The stroke icons the phone references draw, copied path for path from their inline SVGs. */
  export const PHONE_ICONS = {
    move: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"></path>',
    'move-studio': '<path d="M7 7l-4 4 4 4M17 9l4 4-4 4M3 11h12M9 13h12"></path>',
    doc: '<path d="M6 3h8l4 4v14H6z"></path><path d="M14 3v4h4"></path>',
    warn: '<path d="M12 3l9 17H3z"></path><path d="M12 10v4M12 17h.01"></path>',
    blocked: '<circle cx="12" cy="12" r="9"></circle><path d="M7.5 12h9"></path>',
    check: '<path d="M5 12l5 5 9-10"></path>',
    open: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"></path>',
    'open-studio': '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"></path>',
    close: '<path d="M6 6l12 12M18 6L6 18"></path>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"></path>',
    pin: '<path d="M9 3h6l-1 6 3 3H7l3-3zM12 12v9"></path>',
    send: '<path d="M4 12l16-8-6 16-3-7z"></path>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M16 8V4H4v12h4"></path>',
    'copy-studio': '<rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h8"></path>',
    plus: '<path d="M12 5v14M5 12h14"></path>',
    archive: '<rect x="3" y="4" width="18" height="5" rx="1"></rect><path d="M5 9v11h14V9M10 13h4"></path>',
    'archive-studio': '<rect x="3" y="4" width="18" height="5"></rect><path d="M5 9v11h14V9M10 13h4"></path>',
    back: '<path d="M15 5l-7 7 7 7"></path>',
    'back-studio': '<path d="M19 12H5M10 7l-5 5 5 5"></path>',
  } as const;
  export type PhoneIconName = keyof typeof PHONE_ICONS;
</script>

<script lang="ts">
  /**
   * `ico`: the D/P/Q phone form, class "ico", sized by the ported CSS (20px, 14px inside a chip), or by
   * `size` as an inline width/height like the references. `plain`: width/height attributes and an
   * explicit stroke (Studio 1.75, the "Open as a page" glyph 2).
   */
  let { name, size, form = 'ico', stroke = 1.75 }: { name: PhoneIconName; size?: number; form?: 'ico' | 'plain'; stroke?: number } = $props();
</script>

{#if form === 'plain'}
  <svg viewBox="0 0 24 24" width={size ?? 16} height={size ?? 16} fill="none" stroke="currentColor" stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">{@html PHONE_ICONS[name]}</svg>
{:else}
  <svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={size ? `width: ${size}px; height: ${size}px;` : undefined}>{@html PHONE_ICONS[name]}</svg>
{/if}
