<!-- apps/web/src/lib/components/shell/signature/StudioSignature.svelte -->
<script lang="ts">
  /**
   * Studio's signature: the mono status line along the page's foot, from the status the page hands
   * the shell (`shellModel.showStatus`: a board's counts, or the page's own line). The needs item
   * takes the signal tone; the keys sit in its end group. No status, no line.
   */
  import { StatusLine } from '@superjackfruitlabs/vibekit-ui';
  import { shellModel as m } from '../shell-model.svelte';

  const status = $derived(m.status);
  const items = $derived((status?.items ?? []).map((i) => ({ text: i.text, tone: i.signal ? ('needs' as const) : ('plain' as const) })));
  const end = $derived((status?.right ?? []).map((text) => ({ text })));
</script>

{#if items.length + end.length > 0}<div class="sig-status"><StatusLine {items} {end} /></div>{/if}

<style>
  /*
   * The line sits in the DOM with the rest of the signature, under the masthead, and the grid draws it
   * at the foot: the shell's top lets its two parts take their own areas (vibekit's Studio AppShell
   * names `top` and `status`).
   */
  :global(.vk-appshell--studio > .vk-appshell__top:has(.sig-status)), :global(.vk-appshell--studio .sh-top:has(.sig-status)) { display: contents; }
  :global(.vk-appshell--studio .sh-top:has(.sig-status) > .vk-masthead) { grid-area: top; min-width: 0; }
  :global(.vk-appshell--studio .sh-top > .sh-signature:has(.sig-status)) { grid-area: status; min-width: 0; }
</style>
