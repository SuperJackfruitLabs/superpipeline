<!-- apps/web/src/lib/components/parts/Initials.svelte -->
<script lang="ts">
  /** A person, as initials in a ringed disc (the references' inline person mark). Agents use Face. */
  let { text, label, size, fontSize }: { text: string; label: string; size: number; fontSize: number } = $props();
</script>

<span role="img" aria-label={label} style="flex: 0 0 auto; display: inline-grid; place-items: center; width: {size}px; height: {size}px; border-radius: 50%; background: var(--vk-color-raised); box-shadow: inset 0 0 0 1px var(--vk-color-line); color: var(--vk-color-text); font: 700 {fontSize}px/1 var(--vk-font-body);">{text}</span>
