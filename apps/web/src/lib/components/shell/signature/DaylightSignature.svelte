<!-- apps/web/src/lib/components/shell/signature/DaylightSignature.svelte -->
<script lang="ts">
  /**
   * Daylight's signature: the sky of the hour behind the masthead (vibekit Sky with the phase). It is
   * decoration, so it is hidden from the accessibility tree; the masthead's text takes the sky's ink.
   */
  import { Sky } from '@superjackfruitlabs/vibekit-ui';
  import { shellModel as m } from '../shell-model.svelte';
</script>

<div class="sig-sky" aria-hidden="true"><Sky phase={m.phase} /></div>

<style>
  /* The sky fills the shell's top (masthead and Plan's switch), under them, with the rail's radius; vibekit's Sky places its own sun. */
  :global(.sh-top:has(> .sh-signature .sig-sky)) { position: relative; isolation: isolate; }
  .sig-sky { position: absolute; inset: 0; z-index: -1; overflow: hidden; border-radius: var(--vk-radius-lg); }
  .sig-sky :global(.vk-sky) { height: 100%; }
  /* Dark theme: the night sky, whatever the hour. */
  :global([data-theme='dark']) .sig-sky :global(.vk-sky) { --vk-sky-top: var(--vk-sky-night-top); --vk-sky-bottom: var(--vk-sky-night-bottom); --vk-sky-text: var(--vk-sky-night-text); --vk-sky-sun: var(--vk-sky-night-sun); }
  /* The masthead sits on the sky, not inside it: hand it the phase's ink (vibekit's Daylight masthead reads --vk-sky-text). */
  :global(.sh-top:has(.sig-sky .vk-sky[data-phase='dawn'])) { --vk-sky-text: var(--vk-sky-dawn-text); }
  :global(.sh-top:has(.sig-sky .vk-sky[data-phase='morning'])) { --vk-sky-text: var(--vk-sky-morning-text); }
  :global(.sh-top:has(.sig-sky .vk-sky[data-phase='noon'])) { --vk-sky-text: var(--vk-sky-noon-text); }
  :global(.sh-top:has(.sig-sky .vk-sky[data-phase='golden'])) { --vk-sky-text: var(--vk-sky-golden-text); }
  :global(.sh-top:has(.sig-sky .vk-sky[data-phase='dusk'])) { --vk-sky-text: var(--vk-sky-dusk-text); }
  :global(.sh-top:has(.sig-sky .vk-sky[data-phase='night'])), :global([data-theme='dark'] .sh-top:has(.sig-sky)) { --vk-sky-text: var(--vk-sky-night-text); }
  /* Time of day off or subtle: the page's own ink (vibekit's Sky drops its gradient the same way). */
  :global(:is([data-time='off'], [data-time='subtle']) .sh-top:has(.sig-sky)) { --vk-sky-text: var(--vk-color-text); }
</style>
