<!-- apps/web/src/lib/components/card/phone/CardPhoneSheet.svelte -->
<script lang="ts">
  /**
   * The card below 640px: the same composition (CardView, `surface="phone"`) in one full-screen sheet in
   * normal flow (the board layout hides the board), so the page scrolls as one document and is as tall
   * as the card. Named by the card title; focused and scrolled to the top on open. Esc still closes
   * (root layout `closeCardOnEscape`).
   */
  import { onMount } from 'svelte';
  import CardView from '../CardView.svelte';
  import type { CardModel } from '../card-model.svelte';
  import type { GateBinding, QuestionBinding } from '../bindings';

  let { model, gate, question, pageHref, boardHref, onClose }: { model: CardModel; gate: GateBinding | null; question: QuestionBinding | null; pageHref: string; boardHref: string; onClose: () => void } = $props();
  let root = $state<HTMLDivElement>();
  onMount(() => { window.scrollTo(0, 0); root?.focus({ preventScroll: true }); });
</script>

<!-- `dw-body` is the e2e suite's hook for "no sideways scroll", as on the drawer. -->
<div class="pcard-host dw-body" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabindex="-1" bind:this={root}>
  <CardView {model} surface="phone" {gate} {question} {pageHref} {boardHref} {onClose} />
</div>
