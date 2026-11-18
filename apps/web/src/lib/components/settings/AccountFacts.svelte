<!-- apps/web/src/lib/components/settings/AccountFacts.svelte -->
<script lang="ts">
  /** Account as facts with one action: who is signed in, and Sign out. */
  import { Button, SectionHeader } from '@superjackfruitlabs/vibekit-ui';
  import { shellModel as m } from '$lib/components/shell/shell-model.svelte';

  let { n }: { n: number } = $props();
</script>

<section class="set-sec">
  <SectionHeader {n} title="Account" />
  <p class="set-line">Signed in as {m.userName}. Agents keep working while you are signed out.</p>
  <div class="set-acts"><Button variant="secondary" type="button" onclick={m.signOut}>Sign out</Button></div>
</section>
