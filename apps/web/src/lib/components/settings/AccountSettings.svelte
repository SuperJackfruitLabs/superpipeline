<!-- apps/web/src/lib/components/settings/AccountSettings.svelte -->
<script lang="ts">
  /**
   * Settings (nav v2), from the account menu: Labels and Connections (shared by every board, moved
   * out of Crew), Appearance (vibe, theme, accent) and Account (sign out). The Labels and
   * Connections panels are the vibe's own (`WORKSPACE_TABS`); Studio frames them in `wo-main`.
   */
  import { Button } from '@superjackfruit/vibekit';
  import type { Vibe } from '@superjackfruit/vibekit';
  import { appearance } from '$lib/appearance.svelte';
  import { WORKSPACE_TABS } from '$lib/layouts';
  import PageMain from '$lib/components/parts/PageMain.svelte';
  import { shellModel as m } from '$lib/components/shell/shell-model.svelte';
  import { viewport } from '$lib/viewport.svelte';
  import '$lib/components/workspace/workspace.css';
  import '$lib/components/workspace/workspace-studio.css';
  import { accentWords, SETTINGS_SECTIONS, SETTINGS_LEDE, vibeWords } from './account-settings-words';

  let { vibe }: { vibe: Vibe } = $props();
  const Labels = $derived(WORKSPACE_TABS[vibe].labels);
  const Connections = $derived(WORKSPACE_TABS[vibe].connections);
  const heading = $derived(viewport.phone ? 'h2' : 'h1');
</script>

{#snippet body()}
  <nav class="as-toc" aria-label="Settings sections">
    {#each SETTINGS_SECTIONS as s (s.id)}<a href="#{s.id}"><b>{s.label}</b> <span>{s.hint}</span></a>{/each}
  </nav>
  <div id="labels" class="as-sec"><Labels {vibe} /></div>
  <div id="connections" class="as-sec"><Connections {vibe} /></div>
  <section id="appearance" class="as-sec panel" aria-labelledby="as-app-h">
    <div class="panel-head" style="flex-direction: column; align-items: flex-start;">
      <h2 class="t-h2" id="as-app-h">Appearance</h2>
      <p class="t-meta">How Superpipeline looks for you on this account. Other people keep their own.</p>
    </div>
    <dl class="panel-body as-dl">
      <div><dt>Vibe</dt><dd>{vibeWords(appearance.value.vibe)}</dd></div>
      <div><dt>Theme</dt><dd>{appearance.theme === 'dark' ? 'Dark' : 'Light'}</dd></div>
      <div><dt>Accent</dt><dd>{accentWords(appearance.accent)}</dd></div>
    </dl>
    <div class="panel-body as-acts">
      <Button variant="secondary" aria-haspopup="dialog" onclick={m.openAppearance}>Open Appearance</Button>
      <Button variant="text" onclick={m.toggleTheme}>{m.dark ? 'Light theme' : 'Dark theme'}</Button>
    </div>
  </section>
  <section id="account" class="as-sec panel" aria-labelledby="as-acc-h">
    <div class="panel-head" style="flex-direction: column; align-items: flex-start;">
      <h2 class="t-h2" id="as-acc-h">Account</h2>
      <p class="t-meta">Signed in as {m.userName}. Agents keep working while you are signed out.</p>
    </div>
    <div class="panel-body as-acts"><Button variant="secondary" onclick={m.signOut}>Sign out</Button></div>
  </section>
{/snippet}

{#if vibe === 'studio'}
  <div class="wo-main"><div class="wo-head"><span class="kick">Settings</span><svelte:element this={heading}>Settings</svelte:element><p class="lede">{SETTINGS_LEDE}</p></div>{@render body()}</div>
{:else}
  <PageMain scope="scr-ws scr-settings">
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <svelte:element this={heading} class="t-h1">Settings</svelte:element>
      <p class="t-body" style="color: var(--vk-color-muted); max-width: 70ch;">{SETTINGS_LEDE}</p>
    </div>
    {@render body()}
  </PageMain>
{/if}

<style>
  .as-toc { display: flex; flex-wrap: wrap; gap: var(--vk-space-2) var(--vk-space-5); margin-block: var(--vk-space-4); }
  .as-toc a { display: inline-flex; gap: 6px; align-items: baseline; min-height: 44px; align-items: center; color: var(--vk-color-text); }
  .as-toc span { color: var(--vk-color-muted); font-size: var(--vk-text-sm); }
  .as-sec { scroll-margin-top: var(--vk-space-6); margin-top: var(--vk-space-5); }
  .as-dl { display: grid; gap: var(--vk-space-2); margin: 0; }
  .as-dl div { display: flex; gap: var(--vk-space-3); flex-wrap: wrap; }
  .as-dl dt { min-width: 8ch; color: var(--vk-color-muted); }
  .as-dl dd { margin: 0; }
  .as-acts { display: flex; gap: var(--vk-space-3); flex-wrap: wrap; }
</style>
