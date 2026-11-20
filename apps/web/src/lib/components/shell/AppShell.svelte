<!-- apps/web/src/lib/components/shell/AppShell.svelte -->
<script lang="ts">
  /**
   * The frame every page renders inside: the one shell (`ShellView`, the same composition in every
   * vibe, desktop and phone), and what goes with it on every page: the filter dialog, the Inbox
   * link's scope and the shell's keys.
   */
  import { goto } from '$app/navigation';
  import { usePhone } from '@superjackfruitlabs/vibekit-ui';
  import { appearance } from '$lib/appearance.svelte';
  import { PHONE_QUERY } from '$lib/viewport.svelte';
  import { app } from '$lib/stores/app.svelte';
  import FilterDialog from '$lib/components/plan/FilterDialog.svelte';
  import { nameInboxCount } from './nav-scope';
  import { createChordReader, isTypingTarget } from './shortcuts';
  import { shellModel } from './shell-model.svelte';
  import ShellView from './ShellView.svelte';
  import type { ShellProps } from './types';

  let props: ShellProps = $props();
  let root = $state<HTMLElement | null>(null);

  const phone = usePhone(PHONE_QUERY);

  // vibekit draws the nav's count as "3 need you"; say whose cards it counts (nav-scope.ts). The rail
  // and the phone's tab bar swap at PHONE_QUERY, and a new vibe redraws the nav: name it again then.
  $effect(() => {
    const n = shellModel.inboxBadge;
    const el = root;
    void phone.current;
    void appearance.value.vibe;
    if (el) queueMicrotask(() => nameInboxCount(el, shellModel.inboxHref, n));
  });

  const chords = createChordReader();
  function onKeydown(e: KeyboardEvent): void {
    if (e.defaultPrevented || isTypingTarget(e.target)) return;
    if (app.composeOpen || app.moveCardId || app.filterOpen || app.boardSwitcherOpen || app.cmdkOpen || app.openCardId || appearance.pickerOpen) return;
    const action = chords.read(e, Date.now());
    if (action === 'inbox') void goto(shellModel.inboxHref);
    else if (action === 'plan') void goto(shellModel.planHref);
    else if (action === 'crew') void goto(shellModel.crewHref);
    else if (action === 'compose' && props.primary) props.primary.onclick();
    else if (action === 'compose' && app.boardId) app.requestCompose();
    else if (action === 'filter' && shellModel.filterAvailable) shellModel.openFilter();
    else return;
    e.preventDefault();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="sh-frame" bind:this={root}><ShellView {...props} /></div>
<FilterDialog />

<style>
  .sh-frame { display: contents; }
</style>
