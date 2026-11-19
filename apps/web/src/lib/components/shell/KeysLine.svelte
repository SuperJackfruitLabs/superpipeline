<!-- apps/web/src/lib/components/shell/KeysLine.svelte -->
<script lang="ts">
  /**
   * The keys line (composition contract, rule 13): the page's own keys, as words, at the end of its
   * footer line. The same element and text in every vibe; on a phone shell.css hides it (the `?` help
   * takes its place).
   */
  import { keysText, type KeyHint } from '$lib/keys';

  let { keys }: { keys: readonly KeyHint[] } = $props();
</script>

<span class="sh-keys" aria-label="Keyboard">{keysText(keys)}</span>
