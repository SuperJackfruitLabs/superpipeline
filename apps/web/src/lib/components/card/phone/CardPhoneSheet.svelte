<!-- apps/web/src/lib/components/card/phone/CardPhoneSheet.svelte -->
<script lang="ts">
  /**
   * The card below 640px: one full-screen sheet in normal flow (the board layout hides the board), so the
   * page scrolls as one document and is as tall as the card. Named by the card title; focused and
   * scrolled to the top on open. Esc still closes (root layout `closeCardOnEscape`).
   */
  import { onMount } from 'svelte';
  import { CARD_LAYOUTS } from '$lib/layouts';
  import type { CardLayoutProps } from '../layouts/types';
  import './phone-card-shared.css';

  let props: CardLayoutProps = $props();
  const Phone = $derived(CARD_LAYOUTS[props.vibe].phone);
  let root = $state<HTMLDivElement>();
  onMount(() => { window.scrollTo(0, 0); root?.focus(); });
</script>

<!-- `dw-body` is the e2e suite's hook for "no sideways scroll", as on the drawer. -->
<div class="pcard-host dw-body" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabindex="-1" bind:this={root}>
  <Phone {...props} />
</div>
