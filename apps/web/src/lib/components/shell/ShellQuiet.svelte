<!-- apps/web/src/lib/components/shell/ShellQuiet.svelte -->
<script lang="ts">
  /**
   * Quiet, desktop (SP-Board-Quiet): plain text navigation, no rail and no icons. vibekit draws
   * the frame: AppShell (with the skip link), AppNav (the link row), Masthead (the board row:
   * "Board: name — Change board", live, search, New card, the view links) and StatusLine.
   */
  import {
    AppNav, AppShell as VkAppShell, Button, CommandField, Masthead, StatusLine, Tabs,
    type MenuItem as VkMenuItem, type NavItem,
  } from '@superjackfruit/vibekit';
  import '$lib/styles/shell/quiet.css';
  import { shellModel as m } from './shell-model.svelte';
  import { VIEWS, type ShellProps } from './types';

  let { here, boardName, view, showing, status, subTools, bleed = false, ownHeading = false, children }: ShellProps = $props();

  // Words only: vibekit draws no icon in this vibe's nav (the field is required, and ignored).
  const items = $derived<NavItem[]>([
    { id: 'inbox', label: 'Inbox', href: m.inboxHref, icon: 'list', current: here === 'inbox', count: m.inboxBadge || undefined, countIsNeeds: true, kbd: 'G I' },
    { id: 'plan', label: 'Plan', href: m.planHref, icon: 'board', current: here === 'plan', kbd: 'G P' },
    { id: 'crew', label: 'Crew', href: m.crewHref, icon: 'users', current: here === 'crew', kbd: 'G C' },
  ]);
  const accountItems = $derived<VkMenuItem[]>([{ heading: `Signed in as ${m.userName}` }, { label: 'Settings', onselect: m.openSettings }, { label: 'Sign out', onselect: m.signOut }]);
  const viewItems = VIEWS.map(([value, label]) => ({ value, label, href: `?view=${value}` }));
  const statusItems = $derived((status?.items ?? []).map((i) => ({ text: i.text, tone: i.signal ? ('needs' as const) : ('plain' as const) })));
</script>

{#snippet foot()}
  <Button variant="text" aria-haspopup="dialog" onclick={m.openAppearance}>Appearance</Button>
  <Button variant="text" pressed={m.dark} onclick={m.toggleTheme}>Dark theme</Button>
{/snippet}
<!-- "Name — Sign out" (SP-Board-Quiet): Sign out follows the account on the row. -->
{#snippet signOut()}<Button variant="text" onclick={m.signOut}>Sign out</Button>{/snippet}

{#snippet nav()}
  <AppNav label="Superpipeline" {items} account={{ initials: m.initials, name: m.userName, items: accountItems, menuLabel: 'Account' }} mark={{ label: 'Superpipeline', letter: 'S', href: m.homeHref }} appearance={foot} afterAccount={signOut} />
{/snippet}

{#snippet command()}<CommandField label="Search cards, agents and actions" placeholder="Search" kbd="⌘K" onopen={m.openSearch} />{/snippet}
{#snippet actions()}<Button variant="secondary" onclick={m.compose}>New card</Button>{/snippet}

{#snippet viewTabs()}
  <Tabs label="View" items={viewItems} value={view ?? 'board'} onchange={(v) => m.setView(v)} />
  {#if view !== 'projects'}<Button variant="text" aria-haspopup="dialog" onclick={m.openFilter}>Filter cards ({m.filterSummary})</Button>{/if}
  {@render subTools?.()}
  {#if showing}<span class="qs-note">{showing}</span>{/if}
{/snippet}

{#snippet masthead()}
  <!-- Pages without a board (Inbox, Crew, Settings) have one row: the link row alone. -->
  {#if boardName !== null}
    <Masthead
      heading={!ownHeading}
      eyebrow="Board:"
      title={boardName}
      switcher={{ label: 'Change board', onopen: m.openBoardSwitcher }}
      {command}
      live={{ state: m.connected ? 'live' : 'reconnecting', label: m.connected ? 'Live.' : 'Reconnecting…', detail: m.connected ? 'Changes appear as they happen.' : undefined, attrs: { 'data-live': m.connected ? 'on' : 'off' } }}
      {actions}
      tabs={view ? viewTabs : undefined}
    />
  {:else if !ownHeading}
    <h1 class="vk-visually-hidden">Superpipeline</h1>
  {/if}
{/snippet}

{#snippet statusLine()}<StatusLine items={statusItems} />{/snippet}

<div class="qs-shell">
  <VkAppShell product="superpipeline" {nav} {masthead} status={status && statusItems.length > 0 ? statusLine : undefined}>
    <!-- vibekit 0.0.3's Quiet frame runs full width; the page's reading column is the product's (the 72ch the frame used to set). -->
    {#if bleed}{@render children()}{:else}<div class="qs-read">{@render children()}</div>{/if}
  </VkAppShell>
</div>
