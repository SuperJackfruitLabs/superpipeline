<script lang="ts">
  // The page a product renders a vibekit component in: VibeRoot scoped to the element, Gold by product.
  import { VibeRoot } from '@superjackfruit/vibekit';
  let { look, Component, props }: { look: { vibe: any; theme: any }; Component: any; props: Record<string, unknown> } = $props();
</script>

<VibeRoot vibe={look.vibe} theme={look.theme} product="superpipeline" accent="product" scope="element"><Component {...props} /></VibeRoot>
