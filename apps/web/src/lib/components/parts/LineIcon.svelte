<!-- apps/web/src/lib/components/parts/LineIcon.svelte -->
<script lang="ts">
  /** A decorative stroked icon. Studio draws 1.75 strokes, the other vibes 1.8 (the references). */
  import { LINE_ICONS, type LineIconName } from './line-icons';
  /** `square` squares the rounded rects (Studio draws its calendar, agent and copy glyphs that way). */
  let { name, size = 16, stroke = 1.8, square = false }: { name: LineIconName; size?: number; stroke?: number; square?: boolean } = $props();
  const shape = $derived(square ? LINE_ICONS[name].replace(/ rx="[\d.]+"/g, '') : LINE_ICONS[name]);
</script>

<svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round">{@html shape}</svg>
