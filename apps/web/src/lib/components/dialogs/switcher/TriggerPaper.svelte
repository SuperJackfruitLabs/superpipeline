<script lang="ts">
  import type { TriggerCopyProps } from './types';
  let { name, onclick }: TriggerCopyProps = $props();
</script>
<!-- A div, not an h1: the page already has its h1; the reference's .bs-anchor .mh-title rule sets every metric. -->
<div class="mh-title" aria-hidden="true">{name}</div><button class="mh-change bs-trigger" type="button" aria-haspopup="listbox" aria-expanded="true" aria-controls="bs-list" aria-label="Change board, now {name}" {onclick}>Change board</button>
