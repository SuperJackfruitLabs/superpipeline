<script lang="ts">
  /** Settings (nav v2): Labels, Connections, Appearance, Account. Reached from the account menu. */
  import { appearance } from '$lib/appearance.svelte';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import AccountSettings from '$lib/components/settings/AccountSettings.svelte';

  const vibe = $derived(appearance.value.vibe);
</script>

<AppShell live={shellModel.liveToggle} here={null} section="settings" boardName={null} bleed={vibe === 'quiet'} ownHeading>
  <AccountSettings {vibe} />
</AppShell>
