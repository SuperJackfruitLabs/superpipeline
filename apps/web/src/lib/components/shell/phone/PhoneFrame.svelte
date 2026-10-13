<!-- apps/web/src/lib/components/shell/phone/PhoneFrame.svelte -->
<script lang="ts">
  /**
   * What the four phone shells share. vibekit draws the frame: AppShell's `phone` slots (from the
   * product's 900px query), PhoneHeader (the board name is the page's one h1 and, on a board, the
   * switcher; Live, the dateline, search and links in the props each vibe's mockup puts them in)
   * and PhoneTabBar (Plan, Operate with the board's needs-you count, Workspace, and You, a menu tab
   * that opens the account menu). Each vibe's shell hands in its pieces; vibekit picks the vibe's form.
   */
  import { AppShell as VkAppShell, PhoneHeader, PhoneTabBar, type Phase, type PhoneTabItem } from '@superjackfruit/vibekit';
  import type { Snippet } from 'svelte';
  import Icon from '$lib/components/parts/Icon.svelte';
  import type { IconName } from '$lib/components/parts/icons';
  import { PHONE_QUERY } from '$lib/viewport.svelte';
  import '$lib/styles/phone-base.css';
  import { shellModel as m } from '../shell-model.svelte';
  import type { ShellProps } from '../types';
  import { youMenuItems } from '../you-menu';

  let {
    shell, vibe, eyebrow, phase, switcherLabel, actions, eyebrowActions, dateline, links, below, belowOutside = false, glyphs, you,
  }: {
    shell: ShellProps;
    vibe: 'daylight' | 'paper' | 'studio' | 'quiet';
    eyebrow?: string;
    /** Daylight's sky. */
    phase?: Phase;
    /** The board switcher's words: "Switch board" (Daylight, Studio) or "Change board" (Paper, Quiet). */
    switcherLabel: string;
    /** Beside the title (Daylight's search and New card, Studio's New card). */
    actions?: Snippet;
    /** At the end of the eyebrow row (Paper's and Studio's search). */
    eyebrowActions?: Snippet;
    /** Paper's dateline under the title. */
    dateline?: string;
    /** Paper's links after "Change board". */
    links?: Snippet;
    /** Under the title: the view control and Filter on Plan pages, Quiet's rows of buttons. */
    below?: Snippet;
    /** Studio draws `below` after the header's rule. */
    belowOutside?: boolean;
    /** Tab glyphs (Daylight and Studio draw icons; Paper and Quiet are words, and vibekit ignores these). */
    glyphs: { plan: IconName; operate: IconName; workspace: IconName };
    /** The "You" tab's glyph: the signed-in person's initials, as each reference draws them. */
    you?: Snippet;
  } = $props();

  const boardScoped = $derived(shell.boardName !== null);
  const title = $derived(shell.boardName ?? 'Workspace');
  const live = $derived({ state: m.connected ? 'live' as const : 'reconnecting' as const, label: m.connected ? 'Live' : 'Reconnecting…', attrs: { 'data-live': m.connected ? 'on' : 'off' } });

  const items = $derived<PhoneTabItem[]>([
    { id: 'plan', label: 'Plan', href: m.planHref, icon: planIcon, current: shell.here === 'plan' },
    { id: 'operate', label: 'Operate', href: m.operateHref, icon: operateIcon, current: shell.here === 'operate', count: m.operateBadge(boardScoped) || undefined, countIsNeeds: true },
    { id: 'workspace', label: 'Workspace', href: m.workspaceHref, icon: workspaceIcon, current: shell.here === 'workspace' },
    { id: 'you', label: 'You', href: '#you', icon: you ?? youIcon, menu: { label: 'You', name: m.userName, items: youMenuItems() } },
  ]);
  const anyBelow = $derived(Boolean(below || shell.subTools));
</script>

<!-- Daylight fills the current tab's glyph (the reference's [aria-current] .ico{fill}). -->
{#snippet planIcon()}<Icon name={glyphs.plan} size={20} filled={vibe === 'daylight' && shell.here === 'plan'} />{/snippet}
{#snippet operateIcon()}<Icon name={glyphs.operate} size={20} />{/snippet}
{#snippet workspaceIcon()}<Icon name={glyphs.workspace} size={20} filled={vibe === 'daylight' && shell.here === 'workspace'} />{/snippet}
{#snippet youIcon()}<span class="ph-you" aria-hidden="true">{m.initials}</span>{/snippet}

{#snippet under()}
  {@render below?.()}
  {@render shell.subTools?.()}
{/snippet}
<!-- vibekit 0.0.7's greeting slot: drawn after the below row, so Daylight's Live sits above the hello. -->
{#snippet greeting()}{@render shell.sky?.()}{/snippet}

{#snippet header()}
  <PhoneHeader {title} {eyebrow} {phase} switcher={boardScoped ? { label: switcherLabel, onopen: m.openBoardSwitcher } : undefined} {live} {dateline} {actions} {eyebrowActions} {links} below={anyBelow ? under : undefined} greeting={shell.sky ? greeting : undefined} {belowOutside} />
{/snippet}
{#snippet tabbar()}<PhoneTabBar label="Superpipeline" {items} />{/snippet}

<div class="ph-root" data-shell="{vibe}-phone">
  <VkAppShell product="superpipeline" nav={tabbar} masthead={header} phone={{ header, tabbar }} phoneQuery={PHONE_QUERY}>
    {@render shell.children()}
  </VkAppShell>
</div>
