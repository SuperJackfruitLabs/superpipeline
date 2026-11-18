<!-- apps/web/src/routes/b/[boardId]/operate/telemetry/+page.svelte (whole file) -->
<script lang="ts">
  /** Spend, in detail: "where did it go", next to Operate's "are we fine". */
  import { appearance } from '$lib/appearance.svelte';
  import { SPEND_LAYOUTS } from '$lib/layouts';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import { app } from '$lib/stores/app.svelte';

  const vibe = $derived(appearance.value.vibe);
  const Layout = $derived(SPEND_LAYOUTS[vibe]);
</script>

<AppShell live={shellModel.liveToggle} here="plan" section="spend" boardName={app.board?.name ?? 'Untitled board'} bleed={vibe === 'quiet'} ownHeading>
  <Layout {vibe} />
</AppShell>
