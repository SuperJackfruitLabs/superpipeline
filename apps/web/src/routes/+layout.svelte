<script lang="ts">
  /**
   * The app frame: identity, navigation, and the two states that precede any board.
   *
   * Everything below the sign-in gate is a route now. `BoardScreen.svelte` used to hold the auth
   * guard, the onboarding, a `screen` enum, the card drawer, the palette and a six-section agents
   * modal in 1114 lines — which is why the address bar could not describe where you were.
   */
  import '../app.css';
  import { onMount } from 'svelte';
  import { goto, onNavigate } from '$app/navigation';
  import { vkNavigate } from '@superjackfruit/vibekit/motion';
  import { isPageChange } from '$lib/motion/page-change';
  import { page } from '$app/state';
  import { takeReturnTo } from '$lib/reconnect';
  import { app } from '$lib/stores/app.svelte';
  import { VibeRoot } from '@superjackfruit/vibekit';
  import { appearance } from '$lib/appearance.svelte';
  import PaletteMount from '$lib/components/dialogs/PaletteMount.svelte';
  import BoardSwitcherPopover from '$lib/components/dialogs/BoardSwitcherPopover.svelte';
  import AppearanceDialog from '$lib/components/dialogs/AppearanceDialog.svelte';
  import Landing from '$lib/components/Landing.svelte';
  import { closeCardOnEscape } from '$lib/escape';
  import { auth } from '$lib/auth-recovery.svelte';
  import LogoMotion from '$lib/components/LogoMotion.svelte';
  import ReconnectDialog from '$lib/components/dialogs/ReconnectDialog.svelte';
  import ReconnectToast from '$lib/components/dialogs/ReconnectToast.svelte';
  import NewCardDialog from '$lib/components/dialogs/NewCardDialog.svelte';
  import MoveCardDialog from '$lib/components/dialogs/MoveCardDialog.svelte';

  let { children } = $props();

  onMount(() => {
    appearance.init();
    void app.init().then(() => {
      const back = takeReturnTo();
      if (back && app.authState === 'ready') void goto(back, { replaceState: true });
    });
    return () => {
      app.dispose();
      appearance.dispose();
    };
  });

  // A change of screen cross-fades where View Transitions exist (a fade elsewhere); nothing under reduced motion.
  onNavigate((n) => (isPageChange(n.from, n.to) ? vkNavigate(n) : undefined));
</script>

<svelte:window
  onkeydown={(e) => { if (auth.state !== 'expired') closeCardOnEscape(e, () => app.closeCard()); }}
/>

<VibeRoot vibe={appearance.value.vibe} theme={appearance.theme}>
{#if app.authState === 'loading'}
  <main class="min-h-viewport safe-x flex flex-col items-center justify-center gap-3 text-center">
    <h1 class="sr-only">Loading Superpipeline</h1>
    <!-- The large mark: the pack's Channel animation, once per session; Quiet keeps it still. -->
    <LogoMotion size={72} playIntro={appearance.value.vibe !== 'quiet'} />
    <div class="wordmark text-lg">superpipeline</div>
    <div class="mono text-muted-foreground flex items-center gap-2 text-xs"><span class="live-dot"></span>loading your boards…</div>
  </main>
{:else if app.authState === 'signed-out'}
  <Landing />
{:else if page.data.shell === 'bare'}
  <!-- A page that draws its own frame (the card page, dev galleries): no rail, top bar or tabs. -->
  {@render children()}
  <PaletteMount />
  <BoardSwitcherPopover />
  <AppearanceDialog />
  <NewCardDialog />
  <MoveCardDialog />
{:else}
  <!-- The document scrolls: the phone's sticky bottom bar and the full-page pixel comparisons depend on it. -->
  <div class="app-root">{@render children()}</div>
  <PaletteMount />
  <BoardSwitcherPopover />
  <AppearanceDialog />
  <NewCardDialog />
  <MoveCardDialog />
{/if}
<!-- Every move, in every vibe, is said here: a moved tile or row changes column and unmounts. -->
<p class="vk-visually-hidden" role="status" aria-live="polite">{app.moveSaid}</p>
<ReconnectToast />
<ReconnectDialog />
</VibeRoot>
