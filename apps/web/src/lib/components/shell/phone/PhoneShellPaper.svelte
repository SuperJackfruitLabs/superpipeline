<!-- apps/web/src/lib/components/shell/phone/PhoneShellPaper.svelte -->
<script lang="ts">
  /**
   * Paper, phone (SP-Phone-Board-Paper): the nameplate with Live and Search, the board as the
   * headline with its dateline, "Change board" and "Write a new card", the view tabs, and a
   * double-ruled word bar.
   */
  import { Button, Tabs } from '@superjackfruit/vibekit';
  import Icon from '$lib/components/parts/Icon.svelte';
  import { shellModel as m } from '../shell-model.svelte';
  import { VIEWS, type ShellProps } from '../types';
  import { SEARCH_NAME } from './common';
  import PhoneFrame from './PhoneFrame.svelte';

  let props: ShellProps = $props();
  const viewItems = VIEWS.map(([value, label]) => ({ value, label, href: `?view=${value}` }));
  const dateline = $derived(props.boardName !== null ? `${m.dateline}${props.editionCount ? ` · ${props.editionCount}` : ''}` : undefined);
</script>

{#snippet searchIcon()}<Icon name="search" size={16} />{/snippet}
{#snippet filterIcon()}<Icon name="filter-paper" size={16} />{/snippet}

{#snippet search()}<Button variant="secondary" icon={searchIcon} aria-label={SEARCH_NAME} onclick={m.openSearch}>Search</Button>{/snippet}
{#snippet links()}<Button variant="text" onclick={m.compose}>Write a new card</Button>{/snippet}

{#snippet views()}
  <Tabs label="View" items={viewItems} value={props.view ?? 'board'} onchange={(v) => m.setView(v)} />
  {#if props.view !== 'projects'}<Button variant="secondary" icon={filterIcon} aria-haspopup="dialog" onclick={m.openFilter}>Filter</Button>{/if}
{/snippet}

<PhoneFrame shell={props} vibe="paper" eyebrow="Superpipeline" switcherLabel="Change board" eyebrowActions={search} {dateline} links={props.boardName !== null ? links : undefined} below={props.view ? views : undefined} glyphs={{ inbox: 'inbox', plan: 'board', crew: 'crew' }} />
