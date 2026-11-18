<!-- apps/web/src/lib/components/shell/signature/PaperSignature.svelte -->
<script lang="ts">
  /** Paper's signature: the edition's dateline under the masthead ("Wednesday 18 November · in the morning light"). */
  import { shellModel as m } from '../shell-model.svelte';
</script>

<p class="sig-dateline">{m.dateline}</p>

<style>
  .sig-dateline { margin: 0; padding: 6px 0 10px; border-bottom: 1px solid var(--vk-color-line); font-family: var(--vk-font-display); font-style: italic; font-size: 15px; color: var(--vk-color-muted); }
</style>
