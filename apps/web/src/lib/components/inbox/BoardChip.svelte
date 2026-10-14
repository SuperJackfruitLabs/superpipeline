<!-- apps/web/src/lib/components/inbox/BoardChip.svelte -->
<script lang="ts">
  /** The board an ask, a run or an event belongs to, drawn next to the agent: the Inbox spans boards. */
  import './inbox.css';
  let { name }: { name: string } = $props();
</script>

{#if name}<span class="ib-board" title="Board: {name}"><span class="vk-visually-hidden">Board: </span>{name}</span>{/if}
