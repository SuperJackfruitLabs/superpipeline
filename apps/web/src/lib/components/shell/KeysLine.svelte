<!-- apps/web/src/lib/components/shell/KeysLine.svelte -->
<script lang="ts">
  /**
   * The keys line (composition contract, rule 13): the page's own keys, as words, at the end of its
   * footer line. The same element and text in every vibe; on a phone (no hardware keyboard) shell.css
   * hides it and nothing replaces it.
   */
  import { keysText, type KeyHint } from '$lib/keys';

  let { keys, id }: { keys: readonly KeyHint[]; id?: string } = $props();
</script>

<span {id} class="sh-keys" aria-label="Keyboard">{keysText(keys)}</span>
