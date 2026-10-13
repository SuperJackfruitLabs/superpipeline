<script lang="ts">
  import type { TriggerCopyProps } from './types';
  let { name, onclick }: TriggerCopyProps = $props();
</script>
Board: <b>{name}</b> <span class="qn-dash" aria-hidden="true">—</span> <button class="qn-link bs-trigger" type="button" aria-haspopup="listbox" aria-expanded="true" aria-controls="bs-list" aria-label="Change board, now {name}" {onclick}>Change board</button>
