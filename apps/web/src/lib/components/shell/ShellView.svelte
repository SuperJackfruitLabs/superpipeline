<!-- apps/web/src/lib/components/shell/ShellView.svelte -->
<script lang="ts">
  /**
   * The one shell, in every vibe (composition contract, 2026-11-18). vibekit draws the frame and each
   * vibe's form of it: AppShell, AppNav (Inbox, Plan, Crew, the account and Appearance), Masthead
   * (eyebrow, the board switcher or a plain title, Search, the Live toggle, the primary action, and
   * Plan's Boards | Projects switch). Below PHONE_QUERY the same component hands vibekit its phone
   * slots: PhoneHeader and PhoneTabBar (with You, the account menu).
   *
   * The markup is the same in all four vibes. The one exception is the `[data-signature]` slot under
   * the masthead, where each vibe draws its signature (`signature/`): Daylight's sky, Paper's
   * dateline, Studio's status line; Quiet has none.
   */
  import {
    AppNav, AppShell as VkAppShell, Button, CommandField, IconButton, Masthead, PhoneHeader, PhoneTabBar, usePhone, useVibe,
    type MenuItem as VkMenuItem, type NavItem, type PhoneTabItem, type Vibe,
  } from '@superjackfruitlabs/vibekit-ui';
  import type { Component } from 'svelte';
  import Icon from '$lib/components/parts/Icon.svelte';
  import BrandMark from '$lib/components/BrandMark.svelte';
  import { PHONE_QUERY } from '$lib/viewport.svelte';
  import '$lib/styles/phone-base.css';
  import './shell.css';
  import { shellModel as m } from './shell-model.svelte';
  import PlanSwitch from './PlanSwitch.svelte';
  import { youMenuItems } from './you-menu';
  import DaylightSignature from './signature/DaylightSignature.svelte';
  import PaperSignature from './signature/PaperSignature.svelte';
  import StudioSignature from './signature/StudioSignature.svelte';
  import QuietSignature from './signature/QuietSignature.svelte';
  import type { ShellProps } from './types';

  let { here, section, boardName, plan, title, live, primary, bleed = false, ownHeading = false, children }: ShellProps = $props();

  /** The phone header and the search button's accessible name (the phone references). */
  const SEARCH_LABEL = 'Search cards, agents and actions';
  /** A page without a board names itself in the phone header. */
  const SECTION_TITLE: Partial<Record<ShellProps['section'], string>> = { inbox: 'Inbox', crew: 'Crew', settings: 'Settings', projects: 'Projects', project: 'Project' };
  /** The one place the shell asks which vibe is on: the signature it draws. */
  const SIGNATURES: Record<Vibe, Component> = { daylight: DaylightSignature, paper: PaperSignature, studio: StudioSignature, quiet: QuietSignature };

  const vibe = useVibe();
  const phone = usePhone(PHONE_QUERY);
  const Signature = $derived(SIGNATURES[vibe.current]);

  const items = $derived<NavItem[]>([
    { id: 'inbox', label: 'Inbox', href: m.inboxHref, icon: inboxIcon, current: here === 'inbox', count: m.inboxBadge || undefined, countIsNeeds: true, kbd: 'G I' },
    { id: 'plan', label: 'Plan', href: m.planHref, icon: planIcon, current: here === 'plan', kbd: 'G P' },
    { id: 'crew', label: 'Crew', href: m.crewHref, icon: crewIcon, current: here === 'crew', kbd: 'G C' },
  ]);
  const tabs = $derived<PhoneTabItem[]>([
    ...items.map(({ kbd: _kbd, ...item }) => item),
    { id: 'you', label: 'You', href: '#you', icon: youIcon, menu: { label: 'You', name: m.userName, items: youMenuItems() } },
  ]);
  const accountItems = $derived<VkMenuItem[]>([
    { heading: m.userName },
    { label: 'Dark theme', checked: m.dark, oncheckedchange: () => m.toggleTheme() },
    { label: 'Appearance…', onselect: m.openAppearance },
    { label: 'Settings', onselect: m.openSettings },
    { separator: true },
    { label: 'Sign out', onselect: m.signOut },
  ]);
  const switcher = $derived(boardName !== null ? { label: 'Switch board', onopen: m.openBoardSwitcher } : undefined);
  const phoneTitle = $derived(title ?? boardName ?? SECTION_TITLE[section] ?? 'Superpipeline');
</script>

<!-- Nav v2: the current place is marked by the item, never by filling a line icon. -->
{#snippet markIcon()}<BrandMark class="sh-mark" />{/snippet}
{#snippet inboxIcon()}<Icon name="inbox" size={20} strokeWidth={1.8} />{/snippet}
{#snippet planIcon()}<Icon name="plan" size={20} strokeWidth={1.8} />{/snippet}
{#snippet crewIcon()}<Icon name="crew" size={20} strokeWidth={1.8} />{/snippet}
{#snippet youIcon()}<span class="ph-you" aria-hidden="true">{m.initials}</span>{/snippet}
{#snippet sunIcon()}<Icon name="sun" size={20} strokeWidth={1.8} />{/snippet}
{#snippet searchIcon()}<Icon name="search" size={18} />{/snippet}
{#snippet plusIcon()}<Icon name="plus" size={18} />{/snippet}

{#snippet foot()}
  <IconButton icon={sunIcon} label="Appearance" aria-haspopup="dialog" title="Appearance" onclick={m.openAppearance} />
{/snippet}

{#snippet nav()}
  <AppNav label="Superpipeline" {items} account={{ initials: m.initials, name: m.userName, items: accountItems, menuLabel: 'Account' }} mark={{ label: 'Superpipeline', letter: 'S', href: m.homeHref, logo: markIcon }} appearance={foot} />
{/snippet}

{#snippet command()}<CommandField label={SEARCH_LABEL} placeholder="Search" kbd="⌘K" onopen={m.openSearch} />{/snippet}
{#snippet actions()}<Button icon={plusIcon} onclick={primary?.onclick ?? m.compose}>{primary?.label ?? 'New card'}</Button>{/snippet}
{#snippet planTabs()}{#if plan}<PlanSwitch value={plan} />{/if}{/snippet}

{#snippet masthead()}
  <div class="sh-top">
    <Masthead
      heading={!ownHeading}
      eyebrow="Superpipeline · {section}"
      title={boardName ?? (ownHeading ? '' : 'Superpipeline')}
      {switcher}
      {command}
      live={{ ...live, toggle: live }}
      {actions}
      tabs={plan ? planTabs : undefined}
    />
    <div class="sh-signature" data-signature><Signature /></div>
  </div>
{/snippet}

<!--
  The phone: the header names the page (its one h1). Search and, on a board, New card sit in the row
  under the title, with Plan's switch: beside a long board name they would push the header past a
  390px screen (Quiet writes "— Switch board" on the title row too).
-->
{#snippet phoneBelow()}
  <span class="sh-phone-row">
    <IconButton icon={searchIcon} label="{SEARCH_LABEL} (⌘K)" raised onclick={m.openSearch} />
    {#if boardName !== null}<Button icon={plusIcon} onclick={m.compose}>New card</Button>{/if}
  </span>
  {#if plan}<PlanSwitch value={plan} />{/if}
{/snippet}
{#snippet header()}
  <PhoneHeader title={phoneTitle} eyebrow="Superpipeline · {section}" phase={m.phonePhase} {switcher} live={{ ...live, detail: undefined }} below={phoneBelow} />
{/snippet}
{#snippet tabbar()}<PhoneTabBar label="Superpipeline" items={tabs} />{/snippet}

<!-- Studio's pages read the Annual content base (`styles/annual.css`) from the desktop shell, until each page carries its own. -->
<div class={['sh-root', phone.current && 'ph-root', vibe.current === 'studio' && !phone.current && 'ar']} data-shell={phone.current ? 'phone' : 'desktop'}>
  <VkAppShell product="superpipeline" {nav} {masthead} phone={{ header, tabbar }} phoneQuery={PHONE_QUERY} {bleed}>
    {@render children()}
  </VkAppShell>
</div>
