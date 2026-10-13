<!-- apps/web/src/lib/components/workspace/PanelTag.svelte -->
<script lang="ts">
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  let { text }: { text: string } = $props();
</script>

<p class="t-eyebrow tabtag"><LineIcon name="chev-right" size={14} />{text}</p>
