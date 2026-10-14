<!-- apps/web/src/lib/components/shell/phone/PhoneShellDaylight.svelte -->
<script lang="ts">
  /** Daylight, phone (SP-Phone-Board-Daylight): the header on the phase's sky, a floating tab bar. */
  import { Button, IconButton, Segmented } from '@superjackfruit/vibekit';
  import Icon from '$lib/components/parts/Icon.svelte';
  import { shellModel as m } from '../shell-model.svelte';
  import { VIEWS, type ShellProps, type ShellView } from '../types';
  import { SEARCH_NAME } from './common';
  import PhoneFrame from './PhoneFrame.svelte';

  let props: ShellProps = $props();
  const viewOptions = VIEWS.map(([value, label]) => ({ value, label }));
</script>

{#snippet searchIcon()}<Icon name="search" size={20} />{/snippet}
{#snippet plusIcon()}<Icon name="plus" size={20} />{/snippet}
{#snippet funnelIcon()}<Icon name="funnel" size={20} />{/snippet}

{#snippet actions()}
  <IconButton icon={searchIcon} label={SEARCH_NAME} raised onclick={m.openSearch} />
  {#if props.boardName !== null}<Button icon={plusIcon} onclick={m.compose}>New card</Button>{/if}
{/snippet}

{#snippet views()}
  <Segmented label="View" options={viewOptions} form="pill" bind:value={() => props.view ?? 'board', (v) => m.setView(v as ShellView)} />
  {#if props.view !== 'projects'}<Button variant="secondary" icon={funnelIcon} aria-haspopup="dialog" onclick={m.openFilter}>Filter</Button>{/if}
{/snippet}

<PhoneFrame shell={props} vibe="daylight" phase={m.phonePhase} switcherLabel="Switch board" {actions} below={props.view ? views : undefined} glyphs={{ inbox: 'inbox', plan: 'plan-phone', crew: 'crew' }} />
