<script lang="ts">
  /** Settings (nav v2): Labels, Connections, Appearance, Account, as tabs. Reached from the account menu; the hash names the tab. */
  import { replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { appearance } from '$lib/appearance.svelte';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import SettingsView from '$lib/components/settings/SettingsView.svelte';
  import { SETTINGS_TABS, tabFromHash } from '$lib/components/settings/settings-words';

  const initial = tabFromHash(page.url.hash, SETTINGS_TABS);
</script>

<AppShell live={shellModel.liveToggle} here={null} section="settings" boardName={null} bleed={appearance.value.vibe === 'quiet'} ownHeading>
  <SettingsView {initial} ontab={(t) => replaceState(`#${t}`, page.state)} />
</AppShell>
