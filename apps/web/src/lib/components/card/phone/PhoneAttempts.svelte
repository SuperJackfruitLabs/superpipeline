<!-- apps/web/src/lib/components/card/phone/PhoneAttempts.svelte -->
<script lang="ts">
  import { Face } from '@superjackfruit/vibekit';
  import type { PhoneCardView } from './phone-card-words';
  let { view }: { view: PhoneCardView } = $props();
</script>

<ol class="att">
  {#each view.attemptRows as a (a.n)}
    <li><span class="mono">{a.n}</span><span class="who"><Face id={a.agentId} label={a.agentName} mood={a.mood} size={20} /> {a.agentName}</span><span class="mono">{a.usd}</span><span>{a.text}</span></li>
  {/each}
</ol>
