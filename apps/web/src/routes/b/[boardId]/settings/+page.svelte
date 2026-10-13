<script lang="ts">
  /**
   * Board settings, as a route: name, pipeline, schedules, GitHub and agent profiles.
   * Budget caps live on Operate › Spend, beside the figures they cap.
   */
  import { appearance } from '$lib/appearance.svelte';
  import { SETTINGS_LAYOUTS } from '$lib/layouts';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import { needsPart } from '$lib/components/shell/shell-words';
  import { plural } from '$lib/words';
  import { app } from '$lib/stores/app.svelte';

  const vibe = $derived(appearance.value.vibe);
  const Layout = $derived(SETTINGS_LAYOUTS[vibe]);
  // Only Studio's Settings reference draws a status line.
  const status = $derived(vibe === 'studio' ? shellModel.pageStatus([`Board settings · ${app.board?.name ?? ''}`, plural(shellModel.liveCount, 'card', 'cards'), needsPart(shellModel.needsCount)]) : null);
</script>

<AppShell here="plan" section="settings" boardName={app.board?.name ?? 'Untitled board'} view={null} showing={null} {status} bleed={vibe === 'quiet'} ownHeading>
  {#if app.board}
    <!-- Keyed on the board, so switching boards re-seeds the draft; a refresh of the same board keeps it and the rule-saved times. -->
    {#key app.boardId}<Layout board={app.board} {vibe} onChanged={() => void app.refresh()} />{/key}
  {:else}
    <div class="page"><p class="t-meta" role="status">Loading board settings…</p></div>
  {/if}
</AppShell>
