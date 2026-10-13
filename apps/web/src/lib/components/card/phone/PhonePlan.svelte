<!-- apps/web/src/lib/components/card/phone/PhonePlan.svelte -->
<script lang="ts">
  import type { PhoneCardView } from './phone-card-words';
  let { view, speaker }: { view: PhoneCardView; speaker: string } = $props();
</script>

{#if view.plan?.length}
  <ol class="nl">{#each view.plan as s, i (i)}<li>{s.done ? '✓ ' : ''}{s.text}</li>{/each}</ol>
{:else}
  <p class="muted">{speaker} did not post a plan for this card.</p>
{/if}
