<!--
  One vibe around one component, for composition tests (render-vibes.ts). An element-scoped VibeRoot,
  so four copies can share a document; the component reads its vibe from context as in the app.
-->
<script lang="ts" generics="P extends Record<string, unknown>">
  import type { Component } from 'svelte';
  import { VibeRoot, type Theme, type Vibe } from '@superjackfruitlabs/vibekit-ui';

  let { vibe, theme = 'light', component: C, props }: { vibe: Vibe; theme?: Theme; component: Component<P>; props: P } = $props();
</script>

<VibeRoot {vibe} {theme} scope="element">
  <C {...props} />
</VibeRoot>
