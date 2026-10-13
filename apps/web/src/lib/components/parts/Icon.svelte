<!-- apps/web/src/lib/components/parts/Icon.svelte -->
<script lang="ts">
  /**
   * One icon. A vibekit name (or an alias of one) renders vibekit's `Icon`; a product glyph draws
   * the same 24 × 24 stroke frame. `bare` is the phone form: class `ico`, sized and stroked by the
   * phone stylesheet. `filled` fills the shapes (Daylight's current Plan and Workspace).
   */
  import { ICON_PATHS, Icon as VkIcon } from '@superjackfruit/vibekit';
  import { PRODUCT_ICONS, VK_ALIASES, isVkIcon, type IconName } from './icons';

  let { name, size = 20, label, filled = false, bare = false, strokeWidth = 2 }: { name: IconName; size?: number; label?: string; filled?: boolean; bare?: boolean; strokeWidth?: number } = $props();
  const vk = $derived((VK_ALIASES as Record<string, string>)[name] ?? (isVkIcon(name) ? name : null));
  /** A vibekit name drawn bare or filled uses vibekit's own paths, so it never renders blank. */
  const body = $derived.by(() => {
    const own = (PRODUCT_ICONS as Record<string, string>)[name];
    if (own) return own;
    const p = vk ? (ICON_PATHS as Record<string, { d: readonly string[]; circles?: readonly (readonly [number, number, number])[] }>)[vk] : undefined;
    if (!p) return '';
    return [...(p.circles ?? []).map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`), ...p.d.map((d) => `<path d="${d}"/>`)].join('');
  });
</script>

{#if vk && !filled && !bare}
  <VkIcon name={vk as never} {size} {label} />
{:else}
  <svg class={bare ? 'ico' : 'vk-icon'} aria-hidden={label ? undefined : 'true'} role={label ? 'img' : undefined} aria-label={label} focusable="false" viewBox="0 0 24 24"
    width={bare ? undefined : size} height={bare ? undefined : size} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" stroke-width={strokeWidth} stroke-linecap="round" stroke-linejoin="round">{@html body}</svg>
{/if}
