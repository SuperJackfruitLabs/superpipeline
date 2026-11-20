<!-- apps/web/src/routes/b/[boardId]/operate/telemetry/+page.svelte (whole file) -->
<script lang="ts">
  /** Spend, in detail: "where did it go", next to Operate's "are we fine". One composition in every vibe (SpendView). */
  import { appearance } from '$lib/appearance.svelte';
  import SpendView from '$lib/components/operate/SpendView.svelte';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import { app } from '$lib/stores/app.svelte';

  const vibe = $derived(appearance.value.vibe);
</script>

<AppShell live={shellModel.liveToggle} here="plan" section="spend" boardName={app.board?.name ?? 'Untitled board'} bleed={vibe === 'quiet'} ownHeading>
  <SpendView />
</AppShell>
