<script lang="ts">
  /**
   * Board settings, as a route: stages, schedules, labels, caps, GitHub and the board's name and agent
   * profiles, as tabs (BoardSettingsView, one composition in every vibe). The hash names the tab.
   */
  import { BLEED_VIBES } from '$lib/vibe-sets';
  import { replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { appearance } from '$lib/appearance.svelte';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import BoardSettingsView from '$lib/components/settings/BoardSettingsView.svelte';
  import { BOARD_SETTINGS_TABS, tabFromHash } from '$lib/components/settings/settings-words';
  import { app } from '$lib/stores/app.svelte';

  const initial = tabFromHash(page.url.hash, BOARD_SETTINGS_TABS);
</script>

<AppShell live={shellModel.liveToggle} here="plan" section="settings" boardName={app.board?.name ?? 'Untitled board'} bleed={BLEED_VIBES.has(appearance.value.vibe)} ownHeading>
  {#if app.board}
    <!-- Keyed on the board, so switching boards re-seeds the draft; a refresh of the same board keeps it and the rule-saved times. -->
    {#key app.boardId}<BoardSettingsView board={app.board} {initial} onChanged={() => void app.refresh()} ontab={(t) => replaceState(`#${t}`, page.state)} />{/key}
  {:else}
    <div class="page"><p class="t-meta" role="status">Loading board settings…</p></div>
  {/if}
</AppShell>
