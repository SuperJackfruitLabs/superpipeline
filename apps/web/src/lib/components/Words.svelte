<script lang="ts">
  /** Text with its emoji hidden from screen readers: the words carry the meaning. */
  import { splitEmoji } from '$lib/copy';
  let { text }: { text: string } = $props();
  const parts = $derived(splitEmoji(text));
</script>

{#each parts as p, i (i)}{#if p.emoji}<span aria-hidden="true">{p.text}</span>{:else}{p.text}{/if}{/each}
