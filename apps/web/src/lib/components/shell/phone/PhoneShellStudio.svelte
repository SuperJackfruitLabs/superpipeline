<!-- apps/web/src/lib/components/shell/phone/PhoneShellStudio.svelte -->
<script lang="ts">
  /**
   * Studio, phone (SP-Phone-Board-Studio): a ruled header naming the section, Live and search on
   * the kicker row, the sub-bar under the header's rule, an ink tab bar.
   */
  import { Button, IconButton, Tabs } from '@superjackfruit/vibekit';
  import Icon from '$lib/components/parts/Icon.svelte';
  import { shellModel as m } from '../shell-model.svelte';
  import type { ShellProps } from '../types';
  import { SEARCH_NAME } from './common';
  import PhoneFrame from './PhoneFrame.svelte';

  let props: ShellProps = $props();
  const viewItems = $derived([
    { value: 'board' as const, label: 'Board', href: '?view=board' },
    { value: 'list' as const, label: 'List', href: '?view=list', count: m.listCount },
    { value: 'projects' as const, label: 'Projects', href: '?view=projects', count: m.projectCount },
  ]);
</script>

{#snippet searchIcon()}<Icon name="search" size={18} strokeWidth={1.75} />{/snippet}
{#snippet plusIcon()}<Icon name="plus" size={16} strokeWidth={1.75} />{/snippet}
{#snippet funnelIcon()}<Icon name="funnel" size={14} strokeWidth={1.75} />{/snippet}

{#snippet search()}<IconButton icon={searchIcon} label={SEARCH_NAME} raised onclick={m.openSearch} />{/snippet}
{#snippet actions()}<Button icon={plusIcon} onclick={m.compose}>New card</Button>{/snippet}

{#snippet views()}
  <Tabs label="View" items={viewItems} value={props.view ?? 'board'} onchange={(v) => m.setView(v)} />
  {#if props.view !== 'projects'}<Button variant="secondary" size="sm" icon={funnelIcon} aria-haspopup="dialog" onclick={m.openFilter}>Filter</Button>{/if}
{/snippet}

<PhoneFrame shell={props} vibe="studio" eyebrow="Superpipeline · {props.section}" switcherLabel="Switch board" eyebrowActions={search} actions={props.boardName !== null ? actions : undefined} below={props.view ? views : undefined} belowOutside glyphs={{ plan: 'plan-sq', operate: 'operate', workspace: 'people' }} />
