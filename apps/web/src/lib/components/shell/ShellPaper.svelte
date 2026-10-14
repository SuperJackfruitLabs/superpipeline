<!-- apps/web/src/lib/components/shell/ShellPaper.svelte -->
<script lang="ts">
  /**
   * Paper, desktop (SP-Board-Paper): a newspaper masthead, no rail. vibekit draws the frame:
   * AppShell, AppNav (the nameplate and the sections), Masthead (board name with "Change board",
   * and the edition line: Filter, Search, Write a new card), the dateline and Live on AppNav, Tabs in the sub-bar and StatusLine. This file only
   * composes them; `styles/shell/paper.css` holds the product's own note.
   */
  import {
    AppNav, AppShell as VkAppShell, Button, CommandField, Masthead, StatusLine, Tabs,
    type MenuItem as VkMenuItem, type NavItem,
  } from '@superjackfruit/vibekit';
  import Icon from '$lib/components/parts/Icon.svelte';
  import '$lib/styles/shell/paper.css';
  import { shellModel as m } from './shell-model.svelte';
  import { VIEWS, type ShellProps } from './types';

  let { here, section, boardName, view, showing, paperShowing, status, subTools, ownHeading = false, children }: ShellProps = $props();

  // Words only: vibekit draws no icon in this vibe's nav (the field is required, and ignored).
  const items = $derived<NavItem[]>([
    { id: 'inbox', label: 'Inbox', href: m.inboxHref, icon: 'list', current: here === 'inbox', count: m.inboxBadge || undefined, countIsNeeds: true, kbd: 'G I' },
    { id: 'plan', label: 'Plan', href: m.planHref, icon: 'board', current: here === 'plan', kbd: 'G P' },
    { id: 'crew', label: 'Crew', href: m.crewHref, icon: 'users', current: here === 'crew', kbd: 'G C' },
  ]);
  const accountItems = $derived<VkMenuItem[]>([{ heading: `Signed in as ${m.userName}` }, { label: 'Settings', onselect: m.openSettings }, { label: 'Sign out', onselect: m.signOut }]);
  const viewItems = VIEWS.map(([value, label]) => ({ value, label, href: `?view=${value}` }));
  const note = $derived(paperShowing ?? showing);
  // Paper draws the dateline on the nameplate row and Live at the end of the section bar (AppNav), not in the masthead.
  const live = $derived({ state: m.connected ? 'live' as const : 'reconnecting' as const, label: m.connected ? 'Live' : 'Reconnecting…', detail: m.connected ? 'changes appear as they happen' : undefined, attrs: { 'data-live': m.connected ? 'on' : 'off' } });
  const statusItems = $derived((status?.items ?? []).map((i) => ({ text: i.text, tone: i.signal ? ('needs' as const) : ('plain' as const) })));
</script>

{#snippet filterIcon()}<Icon name="filter-paper" size={16} />{/snippet}
{#snippet penIcon()}<Icon name="pen" size={16} />{/snippet}

{#snippet foot()}
  <Button variant="text" aria-haspopup="dialog" onclick={m.openAppearance}>Appearance</Button>
  <Button variant="text" pressed={m.dark} onclick={m.toggleTheme}>Dark theme</Button>
{/snippet}

{#snippet nav()}
  <AppNav label="Superpipeline" {items} account={{ initials: m.initials, name: m.userName, items: accountItems, menuLabel: 'Account' }} mark={{ label: 'Superpipeline', letter: 'S', href: m.homeHref }} dateline={m.dateline} live={live} appearance={foot} />
{/snippet}

<!-- The edition line (SP-Board-Paper): Filter on Plan pages, then Search and Write a new card. -->
{#snippet actions()}
  {#if view && view !== 'projects'}
    <Button variant="secondary" icon={filterIcon} aria-haspopup="dialog" onclick={m.openFilter}>Filter cards <span class="ps-cnt">· {m.filterSummary}</span></Button>
  {/if}
  <CommandField label="Search cards, agents and actions" placeholder="Search" kbd="⌘K" onopen={m.openSearch} />
  <Button icon={penIcon} onclick={m.compose}>Write a new card</Button>
{/snippet}

{#snippet viewTabs()}
  {#if view}<Tabs label="View" items={viewItems} value={view} onchange={(v) => m.setView(v)} />{/if}
  {@render subTools?.()}
  {#if note}<span class="ps-note">{note}</span>{/if}
{/snippet}

{#snippet masthead()}
  <!-- One shell frame per vibe: no page draws an empty ruled sub-bar (Settings and Spend did; Operate and Workspace never had one). -->
  <Masthead
    heading={!ownHeading}
    eyebrow="Superpipeline · {section}"
    title={boardName ?? (ownHeading ? '' : 'Superpipeline')}
    switcher={boardName !== null ? { label: 'Change board', onopen: m.openBoardSwitcher } : undefined}
    {actions}
    tabs={view ? viewTabs : undefined}
  />
{/snippet}

{#snippet statusLine()}<StatusLine items={statusItems} />{/snippet}

<div class="ps-shell">
  <VkAppShell product="superpipeline" {nav} {masthead} status={status && statusItems.length > 0 ? statusLine : undefined}>
    {@render children()}
  </VkAppShell>
</div>
