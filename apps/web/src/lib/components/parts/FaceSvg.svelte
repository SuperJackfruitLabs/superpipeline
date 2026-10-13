<!-- apps/web/src/lib/components/parts/FaceSvg.svelte -->
<script lang="ts">
  /** An agent face as a bare SVG (Studio draws faces without the .vk-face wrapper). Seeded by name (D12). */
  import { faceSvg, type Mood } from '@superjackfruit/vibekit';
  let { name, mood, size, decorative = true }: { name: string; mood: Mood; size: number; decorative?: boolean } = $props();
  const svg = $derived(faceSvg(name, { label: name, mood, size }));
  const html = $derived(decorative ? svg.replace(/role="img" aria-label="[^"]*"/, 'aria-hidden="true" focusable="false"') : svg);
</script>

{@html html}
