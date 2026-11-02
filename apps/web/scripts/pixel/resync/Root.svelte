<script lang="ts">
  // The page a product renders a vibekit component in: VibeRoot scoped to the element, Gold by product.
  import type { Component as Mounted, ComponentProps } from 'svelte';
  import { VibeRoot } from '@superjackfruit/vibekit';
  type Look = Pick<ComponentProps<typeof VibeRoot>, 'vibe' | 'theme'>;
  let { look, Component, props }: { look: Look; Component: Mounted<Record<string, unknown>>; props: Record<string, unknown> } = $props();
</script>

<VibeRoot vibe={look.vibe} theme={look.theme} product="superpipeline" accent="product" scope="element"><Component {...props} /></VibeRoot>
