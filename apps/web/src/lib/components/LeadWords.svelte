<script lang="ts">
  /**
   * The lead sentence. The agent's own words render verbatim: an emoji it wrote ("Tests ✅ 12 ❌ 3")
   * carries meaning, and hiding it would hide information. Only the product's own fallback, whose
   * emoji are decoration (spec §6), goes through <Words>.
   */
  import type { Vibe } from '@superjackfruit/vibekit';
  import { leadText } from '$lib/copy';
  import type { CardLead } from './card/card-lead';
  import Words from './Words.svelte';

  let { lead, vibe }: { lead: Pick<CardLead, 'kind' | 'sentence'>; vibe: Vibe } = $props();
</script>

{#if lead.sentence === null}<Words text={leadText(lead, vibe)} />{:else}{lead.sentence}{/if}
