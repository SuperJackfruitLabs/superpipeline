<script lang="ts">
  import Icon from '$lib/components/parts/Icon.svelte';
  import type { TriggerCopyProps } from './types';
  let { name, onclick }: TriggerCopyProps = $props();
</script>
<button class="dy-switch bs-trigger" type="button" aria-haspopup="listbox" aria-expanded="true" aria-controls="bs-list" aria-label="Board: {name}. Change board" {onclick}>{name} <Icon name="chev" size={22} /></button>
