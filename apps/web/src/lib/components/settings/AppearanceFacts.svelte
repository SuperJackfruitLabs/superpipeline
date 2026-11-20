<!-- apps/web/src/lib/components/settings/AppearanceFacts.svelte -->
<script lang="ts">
  /** Appearance as facts (vibe, theme, accent) with one action: Open Appearance (the dialog). */
  import { Button, FactList, SectionHeader } from '@superjackfruitlabs/vibekit-ui';
  import { appearance } from '$lib/appearance.svelte';
  import { shellModel as m } from '$lib/components/shell/shell-model.svelte';
  import { accentWords, vibeWords } from './account-settings-words';

  let { n }: { n: number } = $props();
  const items = $derived([
    { term: 'Vibe', value: vibeWords(appearance.value.vibe) },
    { term: 'Theme', value: appearance.theme === 'dark' ? 'Dark' : 'Light' },
    { term: 'Accent', value: accentWords(appearance.accent) },
  ]);
</script>

<section class="set-sec">
  <SectionHeader {n} title="Appearance" meta="How Superpipeline looks for you on this account. Other people keep their own." />
  <FactList label="Appearance" {items} />
  <div class="set-acts"><Button variant="secondary" type="button" aria-haspopup="dialog" onclick={m.openAppearance}>Open Appearance</Button></div>
</section>
