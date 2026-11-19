<script lang="ts">
  /**
   * The card drawer: a real modal dialog around the card's one composition (CardView). It owns focus
   * (on open, trapped, restored on close), the scrim and the width (one per vibe, widths.ts); the
   * CardModel owns the card; CardView draws it, its Close button included. Below 640px the same view
   * is the phone sheet.
   */
  import { onDestroy } from 'svelte';
  import { app } from '$lib/stores/app.svelte';
  import { appearance } from '$lib/appearance.svelte';
  import { viewport } from '$lib/viewport.svelte';
  import { CARD_DRAWER_WIDTH } from '$lib/components/card/widths';
  import CardPhoneSheet from '$lib/components/card/phone/CardPhoneSheet.svelte';
  import CardView from '$lib/components/card/CardView.svelte';
  import { CardModel } from '$lib/components/card/card-model.svelte';

  /** The card's board, from where the drawer is mounted (the route, or the Inbox item); never the remembered board. */
  let { boardId }: { boardId: string | null } = $props();
  const model = new CardModel(() => ({ boardId, cardId: app.openCardId, surface: 'drawer' }));
  const width = $derived(CARD_DRAWER_WIDTH[appearance.value.vibe]);
  const close = (): void => app.closeCard();

  // Focus: the panel on open, the opening tile on close (see the original comments, moved here unchanged).
  let panelEl = $state<HTMLElement | null>(null);
  let openerCardId: string | null = null;
  $effect(() => {
    if (model.card) openerCardId ??= model.card.id;
    if (model.card && panelEl) {
      openerCardId ??= model.card.id;
      panelEl.focus({ preventScroll: true });
    }
  });
  onDestroy(() => {
    const id = openerCardId;
    openerCardId = null;
    if (!id || typeof document === 'undefined') return;
    queueMicrotask(() => document.querySelector<HTMLElement>(`[data-card-open="${CSS.escape(id)}"]`)?.focus());
  });

  /** On screen: checkVisibility also leaves out what a closed <details> holds (Chromium hides it with content-visibility, so it keeps a box). */
  function shown(el: HTMLElement): boolean {
    return typeof el.checkVisibility === 'function' ? el.checkVisibility() : el.offsetParent !== null && el.getClientRects().length > 0;
  }
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
  function trapTab(e: KeyboardEvent): void {
    if (e.key !== 'Tab' || !panelEl) return;
    const items = [...panelEl.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => shown(el) || el === document.activeElement);
    if (items.length === 0) {
      e.preventDefault();
      panelEl.focus({ preventScroll: true });
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
  <CardPhoneSheet {model} gate={model.gateBinding} question={model.questionBinding} pageHref={model.pageHref} boardHref={model.boardHref} onClose={close} />
{:else if model.card}
  <div class="fixed inset-0 z-30 flex justify-end">
    <button class="absolute inset-0" style="background:var(--card-scrim, var(--sp-scrim))" onclick={close} aria-label="Close drawer" tabindex="-1"></button>
    <div
      bind:this={panelEl}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      tabindex="-1"
      onkeydown={trapTab}
      class="cv-drawer drawer-in safe-top safe-bottom safe-x relative h-full min-h-0 overflow-y-auto"
      style="width:{width}">
      <!-- `dw-body` stays as the e2e suite's hook for "no sideways scroll". -->
      <div class="dw-body">
        <CardView {model} surface="drawer" gate={model.gateBinding} question={model.questionBinding} pageHref={model.pageHref} boardHref={model.boardHref} onClose={close} />
      </div>
    </div>
  </div>
{/if}
