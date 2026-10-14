<!-- apps/web/src/lib/components/shell/ShellStudio.svelte -->
<script lang="ts">
  /**
   * Studio, desktop (SP-Board-Studio, the Annual report). vibekit draws the frame: AppShell,
   * AppNav (the ink rail; its account square opens the account menu, Sign out follows it), Masthead (the ruled top
   * bar), Tabs in the sub-bar and StatusLine (the mono status bar). The page sits in `.ar`, the
   * Annual content base (`styles/annual.css`); `styles/shell/studio.css` holds the sub-bar's own
   * note and right-hand text.
   */
  import {
    AppNav, AppShell as VkAppShell, Button, CommandField, IconButton, Kbd, Masthead, StatusLine, Tabs,
    type MenuItem as VkMenuItem, type NavItem,
  } from '@superjackfruit/vibekit';
  import Icon from '$lib/components/parts/Icon.svelte';
  import '$lib/styles/shell/studio.css';
  import '$lib/styles/shell/studio-dark.css';
  import { shellModel as m } from './shell-model.svelte';
  import PlanSwitch from './PlanSwitch.svelte';
  import { VIEWS, type ShellProps } from './types';

  let { here, section, boardName, view, plan, showing, studioSubRight, status, subTools, bleed = false, ownHeading = false, children }: ShellProps = $props();

  const items = $derived<NavItem[]>([
    { id: 'inbox', label: 'Inbox', href: m.inboxHref, icon: inboxIcon, current: here === 'inbox', count: m.inboxBadge || undefined, countIsNeeds: true, kbd: 'G I' },
    { id: 'plan', label: 'Plan', href: m.planHref, icon: planIcon, current: here === 'plan', kbd: 'G P' },
    { id: 'crew', label: 'Crew', href: m.crewHref, icon: crewIcon, current: here === 'crew', kbd: 'G C' },
  ]);
  const accountItems = $derived<VkMenuItem[]>([
    { heading: m.userName },
    { label: 'Dark theme', checked: m.dark, oncheckedchange: () => m.toggleTheme() },
    { label: 'Appearance…', onselect: m.openAppearance },
    { label: 'Settings', onselect: m.openSettings },
  ]);
  const counts: Partial<Record<string, number>> = $derived({ list: m.listCount });
  const viewItems = $derived(VIEWS.map(([value, label]) => ({ value, label, href: `?view=${value}`, count: counts[value] })));
  const statusItems = $derived((status?.items ?? []).map((i) => ({ text: i.text, tone: i.signal ? ('needs' as const) : ('plain' as const) })));
  // The keys sit at the status line's end (SP-Board-Studio `.ar-status .r`).
  const statusKeys = $derived((status?.right ?? []).map((text) => ({ text })));
</script>

{#snippet markIcon()}<Icon name="mark" size={22} strokeWidth={2} />{/snippet}
{#snippet inboxIcon()}<Icon name="inbox" size={20} strokeWidth={1.75} />{/snippet}
{#snippet planIcon()}<Icon name="plan-sq" size={20} strokeWidth={1.75} />{/snippet}
{#snippet crewIcon()}<Icon name="crew" size={20} strokeWidth={1.75} />{/snippet}
{#snippet moonIcon()}<Icon name="moon" size={18} strokeWidth={1.75} />{/snippet}
{#snippet sunIcon()}<Icon name="sun" size={20} strokeWidth={1.75} />{/snippet}
{#snippet funnelIcon()}<Icon name="funnel" size={14} strokeWidth={1.75} />{/snippet}
{#snippet signOutIcon()}<Icon name="signout-studio" size={18} strokeWidth={1.75} />{/snippet}
{#snippet plusIcon()}<Icon name="plus" size={16} strokeWidth={1.75} />{/snippet}

{#snippet foot()}
  <IconButton icon={moonIcon} label="Dark theme" aria-pressed={m.dark} onclick={m.toggleTheme} />
  <IconButton icon={sunIcon} label="Appearance" aria-haspopup="dialog" onclick={m.openAppearance} />
{/snippet}

{#snippet signOut()}<IconButton icon={signOutIcon} label="Sign out" onclick={m.signOut} />{/snippet}

{#snippet nav()}
  <AppNav label="Superpipeline" {items} account={{ initials: m.initials, name: m.userName, items: accountItems, menuLabel: 'Account' }} mark={{ label: 'Superpipeline', letter: 'S', href: m.homeHref, logo: markIcon }} appearance={foot} afterAccount={signOut} />
{/snippet}

{#snippet command()}<CommandField placeholder="Search or run a command" kbd="⌘K" onopen={m.openSearch} />{/snippet}
{#snippet actions()}<Button icon={plusIcon} aria-keyshortcuts="N" onclick={m.compose}>New card <span aria-hidden="true"><Kbd keys={['N']} /></span></Button>{/snippet}

{#snippet viewTabs()}
  {#if plan}<PlanSwitch value={plan} />{/if}
  {#if view}<Tabs label="View" items={viewItems} value={view} onchange={(v) => m.setView(v)} />{/if}
  {#if view}
    <Button variant="secondary" size="sm" icon={funnelIcon} aria-haspopup="dialog" aria-keyshortcuts="F" onclick={m.openFilter}>Filter cards <span class="st-cnt">{m.filterSummary}</span></Button>
  {/if}
  {@render subTools?.()}
  {#if showing}<span class="st-hint">{showing}</span>{/if}
  {#if studioSubRight}<span class="st-right">{studioSubRight}</span>{/if}
{/snippet}

{#snippet masthead()}
  <!-- Off Plan there is no sub-bar; the Inbox, Crew and Settings have no board switcher. -->
  <Masthead
    heading={!ownHeading}
    eyebrow="Superpipeline · {section}"
    title={boardName ?? (ownHeading ? '' : 'Superpipeline')}
    switcher={boardName !== null ? { label: 'Change board', onopen: m.openBoardSwitcher } : undefined}
    {command}
    live={{ state: m.connected ? 'live' : 'reconnecting', label: m.connected ? 'Live' : 'Reconnecting…', attrs: { 'data-live': m.connected ? 'on' : 'off' } }}
    {actions}
    tabs={view || plan ? viewTabs : undefined}
  />
{/snippet}

{#snippet statusLine()}<StatusLine items={statusItems} end={statusKeys} />{/snippet}

<div class="ar st-shell" data-shell="studio">
  <VkAppShell product="superpipeline" {nav} {masthead} {bleed} status={statusItems.length + statusKeys.length > 0 ? statusLine : undefined}>
    {@render children()}
  </VkAppShell>
</div>
