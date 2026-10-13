<script lang="ts">
  /**
   * The card drawer: a real modal dialog around whichever layout the vibe picks (CARD_LAYOUTS).
   * It owns focus (on open, trapped, restored on close) and the scrim; the CardModel owns the
   * card; the layout draws it, its Close button included.
   */
  import { onDestroy } from 'svelte';
  import { app } from '$lib/stores/app.svelte';
  import { appearance } from '$lib/appearance.svelte';
  import { viewport } from '$lib/viewport.svelte';
  import { CARD_LAYOUTS } from '$lib/layouts';
  import CardPhoneSheet from '$lib/components/card/phone/CardPhoneSheet.svelte';
  import { CardModel } from '$lib/components/card/card-model.svelte';

  const model = new CardModel(() => ({ boardId: app.boardId, cardId: app.openCardId, surface: 'drawer' }));
  const vibe = $derived(appearance.value.vibe);
  const L = $derived(CARD_LAYOUTS[vibe]);
  const Layout = $derived(viewport.narrow ? L.phone : L.drawer);
  const close = (): void => app.closeCard();

  // Focus: the panel on open, the opening tile on close (see the original comments, moved here unchanged).
  let panelEl = $state<HTMLElement | null>(null);
  let openerCardId: string | null = null;
  $effect(() => {
    if (model.card) openerCardId ??= model.card.id;
    if (model.card && panelEl) {
      openerCardId ??= model.card.id;
      panelEl.focus();
    }
  });
  onDestroy(() => {
    const id = openerCardId;
    openerCardId = null;
    if (!id || typeof document === 'undefined') return;
    queueMicrotask(() => document.querySelector<HTMLElement>(`[data-card-open="${CSS.escape(id)}"]`)?.focus());
  });

  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
  function trapTab(e: KeyboardEvent): void {
    if (e.key !== 'Tab' || !panelEl) return;
    const items = [...panelEl.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => (el.offsetParent !== null && el.getClientRects().length > 0) || el === document.activeElement,
    );
    if (items.length === 0) {
      e.preventDefault();
      panelEl.focus();
      return;
    }
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panelEl)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }
</script>

{#if model.card && viewport.narrow}
  <!-- Below 640px the card is one full-screen sheet in normal flow (the board behind it is hidden). -->
  <CardPhoneSheet
    {model}
    {vibe}
    phase={appearance.phase}
    personName={app.user?.name ?? app.user?.login ?? 'there'}
    gate={model.gateBinding}
    question={model.questionBinding}
    pageHref={model.pageHref}
    onClose={close}
  />
{:else if model.card && L.framed}
  <!-- The layout draws vibekit's Drawer: its frame, scrim, focus trap and Esc. Focus returns to the tile on close (below). -->
  <Layout
    {model}
    {vibe}
    phase={appearance.phase}
    personName={app.user?.name ?? app.user?.login ?? 'there'}
    gate={model.gateBinding}
    question={model.questionBinding}
    pageHref={model.pageHref}
    onClose={close}
  />
{:else if model.card}
  <div class="fixed inset-0 z-30 flex {L.align === 'center' && !viewport.narrow ? 'justify-center' : 'justify-end'}">
    <button class="absolute inset-0" style="background:var(--card-scrim, var(--sp-scrim))" onclick={close} aria-label="Close drawer" tabindex="-1"></button>
    <div
      bind:this={panelEl}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      tabindex="-1"
      onkeydown={trapTab}
      class="drawer-in safe-top safe-bottom safe-x relative flex h-full min-h-0 flex-col"
      style="width:{viewport.narrow ? '100%' : L.width}">
      <Layout
        {model}
        {vibe}
        phase={appearance.phase}
        personName={app.user?.name ?? app.user?.login ?? 'there'}
        gate={model.gateBinding}
        question={model.questionBinding}
        pageHref={model.pageHref}
        onClose={close}
      />
    </div>
  </div>
{/if}
