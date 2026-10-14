<script lang="ts">
  /** Settings (nav v2): Labels, Connections, Appearance, Account. Reached from the account menu. */
  import { appearance } from '$lib/appearance.svelte';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import AccountSettings from '$lib/components/settings/AccountSettings.svelte';

  const vibe = $derived(appearance.value.vibe);
</script>

<AppShell here={null} section="settings" boardName={null} view={null} showing={null} status={null} bleed={vibe === 'quiet'} ownHeading>
  <AccountSettings {vibe} />
</AppShell>
