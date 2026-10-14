<script lang="ts">
  /**
   * An address that is not a page (404), or a page that threw, inside the vibe's own shell with a way
   * home (loading-audit L16). Never SvelteKit's bare "404 Not Found".
   */
  import { page } from '$app/state';
  import { appearance } from '$lib/appearance.svelte';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import PageMain from '$lib/components/parts/PageMain.svelte';
  import { Button } from '@superjackfruit/vibekit';

  const vibe = $derived(appearance.value.vibe);
  const missing = $derived(page.status === 404);
</script>

<svelte:head><title>{missing ? 'Not found' : 'Something went wrong'} · Superpipeline</title></svelte:head>

<AppShell here={null} section="inbox" boardName={null} view={null} showing={null} status={null} bleed={vibe === 'quiet'} ownHeading>
  <PageMain scope="scr-error">
    <div class="sp-error">
      <p class="t-eyebrow">{missing ? 'Not found' : `Error ${page.status}`}</p>
      <h1 class="t-h1">{missing ? "This page isn't here." : 'Something went wrong on this page.'}</h1>
      <p class="t-body">{missing ? 'The address may be mistyped, or the page has moved.' : 'Your boards are safe. Going back to your Inbox usually helps.'}</p>
      <div><Button variant="primary" href="/inbox">Go to your Inbox</Button></div>
    </div>
  </PageMain>
</AppShell>

<style>
  .sp-error { display: flex; flex-direction: column; gap: var(--vk-space-3); padding-block: var(--vk-space-6); max-width: 60ch; }
</style>
