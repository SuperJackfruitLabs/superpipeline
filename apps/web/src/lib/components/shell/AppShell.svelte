<!-- apps/web/src/lib/components/shell/AppShell.svelte -->
<script lang="ts">
  /**
   * The frame every page renders inside. It picks the vibe's shell, desktop or phone
   * (`SHELL_LAYOUTS`, the one vibe switch), and owns what is the same in every vibe: the
   * composer, the board switcher, the filter dialog and the shell's keys.
   */
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { appearance } from '$lib/appearance.svelte';
  import { usePhone } from '@superjackfruit/vibekit';
  import { PHONE_QUERY } from '$lib/viewport.svelte';
  import { SHELL_LAYOUTS } from '$lib/layouts';
  import { app } from '$lib/stores/app.svelte';
  import FilterDialog from '$lib/components/plan/FilterDialog.svelte';
  import { nameInboxCount } from './nav-scope';
  import { createChordReader, isTypingTarget } from './shortcuts';
  import { shellModel } from './shell-model.svelte';
  import type { ShellProps } from './types';

  let props: ShellProps = $props();
  // The same query vibekit's AppShell is handed (`phoneQuery`), so the frame and its slots switch together.
  const phone = usePhone(PHONE_QUERY);
  const Shell = $derived(SHELL_LAYOUTS[appearance.value.vibe][phone.current ? 'phone' : 'desktop']);

  // vibekit draws the nav's count as "3 need you"; say whose cards it counts (nav-scope.ts).
  $effect(() => {
    const n = shellModel.inboxBadge;
    void Shell;
    queueMicrotask(() => nameInboxCount(document, shellModel.inboxHref, n));
  });

  const chords = createChordReader();
  function onKeydown(e: KeyboardEvent): void {
    if (e.defaultPrevented || isTypingTarget(e.target)) return;
    if (app.composeOpen || app.moveCardId || app.filterOpen || app.boardSwitcherOpen || app.cmdkOpen || app.openCardId || appearance.pickerOpen) return;
    const action = chords.read(e, Date.now());
    if (action === 'inbox') void goto(shellModel.inboxHref);
    else if (action === 'plan') void goto(shellModel.planHref);
    else if (action === 'crew') void goto(shellModel.crewHref);
    else if (action === 'compose' && app.boardId) app.requestCompose();
    else if (action === 'filter' && props.view) app.filterOpen = true;
    else return;
    e.preventDefault();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<Shell {...props} />
<FilterDialog />
