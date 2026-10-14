<!-- apps/web/src/lib/components/shell/phone/PhoneShellQuiet.svelte -->
<script lang="ts">
  /**
   * Quiet, phone (SP-Phone-Board-Quiet): plain rows of words: "Board: name — Change board";
   * Search, New card and Filter; the view links. A 2px-ruled word bar, no icons.
   */
  import { Button, CommandField, Tabs } from '@superjackfruit/vibekit';
  import { shellModel as m } from '../shell-model.svelte';
  import { VIEWS, type ShellProps } from '../types';
  import { SEARCH_NAME } from './common';
  import PhoneFrame from './PhoneFrame.svelte';
  import PlanSwitch from '../PlanSwitch.svelte';

  let props: ShellProps = $props();
  const viewItems = VIEWS.map(([value, label]) => ({ value, label, href: `?view=${value}` }));
</script>

{#snippet below()}
  <div class="ph-row">
    <CommandField label={SEARCH_NAME} placeholder="Search" onopen={m.openSearch} />
    {#if props.boardName !== null}<Button variant="secondary" onclick={m.compose}>New card</Button>{/if}
    {#if props.view}<Button variant="text" aria-haspopup="dialog" onclick={m.openFilter}>Filter</Button>{/if}
  </div>
  {#if props.plan}<div class="ph-row"><PlanSwitch value={props.plan} /></div>{/if}
  {#if props.view}<div class="ph-row"><Tabs label="View" items={viewItems} value={props.view} onchange={(v) => m.setView(v)} /></div>{/if}
{/snippet}

<PhoneFrame shell={props} vibe="quiet" eyebrow={props.boardName !== null ? 'Board:' : undefined} switcherLabel="Change board" {below} glyphs={{ inbox: 'inbox', plan: 'board', crew: 'crew' }} />
