<script lang="ts">
  import Icon from '$lib/components/parts/Icon.svelte';
  import type { TriggerCopyProps } from './types';
  let { name, onclick }: TriggerCopyProps = $props();
</script>
<span class="kick">Superpipeline · board</span><button class="ar-sw bs-trigger" type="button" aria-haspopup="listbox" aria-expanded="true" aria-controls="bs-list" aria-label="Board: {name}. Change board" {onclick}>{name} <Icon name="chev" size={18} /></button>
