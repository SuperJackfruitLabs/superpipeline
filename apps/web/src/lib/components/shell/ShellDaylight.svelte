<!-- apps/web/src/lib/components/shell/ShellDaylight.svelte -->
<script lang="ts">
  /**
   * Daylight, desktop (SP-Board-Daylight). vibekit draws the frame: AppShell, AppNav (the rail),
   * Masthead on a Sky (board name, search, live, actions, the Segmented view switch) and StatusLine. This file only
   * composes them and adds what is the product's own: the crew in the rail's foot and the sky band
   * under the masthead (`styles/shell/daylight.css`).
   */
  import {
    AppNav, AppShell as VkAppShell, Button, CommandField, Face, IconButton, Masthead, Segmented, Sky, StatusLine,
    type MenuItem as VkMenuItem, type NavItem,
  } from '@superjackfruit/vibekit';
  import Icon from '$lib/components/parts/Icon.svelte';
  import '$lib/styles/shell/daylight.css';
  import { shellModel as m } from './shell-model.svelte';
  import { VIEWS, type ShellProps } from './types';

  let { here, section, boardName, view, showing, status, subTools, sky, ownHeading = false, children }: ShellProps = $props();

  const items = $derived<NavItem[]>([
    { id: 'plan', label: 'Plan', href: m.planHref, icon: planIcon, current: here === 'plan', kbd: 'G P' },
    { id: 'operate', label: 'Operate', href: m.operateHref, icon: operateIcon, current: here === 'operate', count: m.operateBadge(boardName !== null) || undefined, countIsNeeds: true, kbd: 'G O' },
    { id: 'workspace', label: 'Workspace', href: m.workspaceHref, icon: workspaceIcon, current: here === 'workspace', kbd: 'G W' },
  ]);

  const accountItems = $derived<VkMenuItem[]>([
    { heading: m.userName },
    { label: 'Dark theme', checked: m.dark, oncheckedchange: () => m.toggleTheme() },
    { label: 'Appearance…', onselect: m.openAppearance },
    { separator: true },
    { label: 'Sign out', onselect: m.signOut },
  ]);

  const viewOptions = VIEWS.map(([value, label]) => ({ value, label }));
  const statusItems = $derived((status?.items ?? []).map((i) => ({ text: i.text, tone: i.signal ? ('needs' as const) : ('plain' as const) })));
</script>

{#snippet markIcon()}<Icon name="mark" size={26} strokeWidth={1.8} />{/snippet}
{#snippet planIcon()}<Icon name="plan" size={22} strokeWidth={1.8} filled={here === 'plan'} />{/snippet}
{#snippet operateIcon()}<Icon name={here === 'operate' ? 'operate-filled' : 'operate'} size={22} strokeWidth={1.8} />{/snippet}
{#snippet workspaceIcon()}<Icon name="workspace" size={22} strokeWidth={1.8} filled={here === 'workspace'} />{/snippet}
{#snippet sunIcon()}<Icon name={m.dark ? 'moon' : 'sun'} size={20} strokeWidth={1.8} />{/snippet}
{#snippet filterIcon()}<Icon name="filter" size={18} strokeWidth={1.8} />{/snippet}
{#snippet plusIcon()}<Icon name="plus" size={18} />{/snippet}

{#snippet crew()}
  <!-- vibekit's crew slot draws the rule, the column and the type; the faces overlap as the reference draws them. -->
  <span class="dy-faces" aria-hidden="true" title={m.crewTitle}>
    {#each m.crew.slice(0, 3) as c (c.id)}<Face id={c.name} label={c.name} mood={c.mood} size={20} />{/each}
  </span>
  <span title={m.crewScopeTitle}><b>{m.crewCount}</b>{m.crewLine}</span>
{/snippet}

{#snippet foot()}
  <IconButton icon={sunIcon} label="Appearance" aria-haspopup="dialog" title="Appearance · the sky follows the time of day" onclick={m.openAppearance} />
{/snippet}

{#snippet nav()}
  <AppNav label="Superpipeline" {items} account={{ initials: m.initials, name: m.userName, items: accountItems, menuLabel: 'Account' }} mark={{ label: 'Superpipeline', letter: 'S', href: m.homeHref, logo: markIcon }} crew={m.crew.length > 0 ? crew : undefined} appearance={foot} />
{/snippet}

{#snippet command()}
  <CommandField label="Search cards, agents and actions" placeholder="Search" kbd="⌘K" onopen={m.openSearch} />
{/snippet}

{#snippet actions()}
  <Button icon={plusIcon} onclick={m.compose}>New card</Button>
{/snippet}

{#snippet viewTabs()}
  <Segmented label="View" options={viewOptions} bind:value={() => view ?? 'board', (v) => m.setView(v as typeof VIEWS[number][0])} />
  {#if view !== 'projects'}
    <Button variant="secondary" icon={filterIcon} aria-haspopup="dialog" onclick={m.openFilter} class="dy-filter">Filter cards <span class="dy-cnt"><span class="vk-visually-hidden">· </span>{m.filterSummary}</span></Button>
  {/if}
  {@render subTools?.()}
  {#if showing}<span class="dy-note">{showing}</span>{/if}
{/snippet}

{#snippet masthead()}
  <!-- Daylight's masthead sits on the sky (SP-Board-Daylight), with the page's greeting band under it. -->
  <div class="dy-sky"><Sky phase={m.phase}>
  <Masthead
    heading={!ownHeading}
    eyebrow="Superpipeline · {section}"
    title={boardName ?? (ownHeading ? '' : 'Workspace')}
    switcher={boardName !== null ? { label: 'Switch board', onopen: m.openBoardSwitcher } : undefined}
    {command}
    live={{ state: m.connected ? 'live' : 'reconnecting', label: m.connected ? 'Live' : 'Reconnecting…', detail: m.connected ? 'changes appear as they happen' : undefined, attrs: { 'data-live': m.connected ? 'on' : 'off' } }}
    {actions}
    tabs={view ? viewTabs : undefined}
  />
  {@render sky?.()}
  </Sky></div>
{/snippet}

{#snippet statusLine()}<StatusLine items={statusItems} />{/snippet}

<div class="dy-shell">
  <VkAppShell product="superpipeline" {nav} {masthead} status={status && statusItems.length > 0 ? statusLine : undefined}>
    {#if !view && showing}<div class="dy-sub"><span class="dy-note">{showing}</span></div>{/if}
    {@render children()}
  </VkAppShell>
</div>
