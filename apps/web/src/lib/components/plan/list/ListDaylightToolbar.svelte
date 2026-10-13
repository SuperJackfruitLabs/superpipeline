<!-- apps/web/src/lib/components/plan/list/ListDaylightToolbar.svelte -->
<script lang="ts">
  /** Daylight's Group by and summary, drawn in the shell's sub-bar (ShellProps.subTools). */
  import { Segmented } from '@superjackfruit/vibekit';
  import type { ListGroupBy } from '$lib/stores/app.svelte';
  import { daylightSum, GROUPS } from './list-model';
  import type { ListLayoutProps } from './types';
  import './list-daylight-toolbar.css';
  let p: ListLayoutProps = $props();
</script>

<span class="bar__lbl">Group by</span>
<Segmented size="sm" label="Group by" options={GROUPS.map((g) => ({ value: g.id, label: g.label }))} bind:value={() => p.groupBy, (v) => p.onGroupBy(v as ListGroupBy)} />
<span class="sum">{daylightSum(p.cardCount, p.needsCount, p.sort)}</span>
