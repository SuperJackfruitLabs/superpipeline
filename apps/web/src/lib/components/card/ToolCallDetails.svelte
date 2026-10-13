<!--
  A tool call's details: its parameter and result as stored, behind one "Details" disclosure. Daylight
  drew this first; every vibe uses it so every attempt's tool calls can be read the same way. Nothing
  is drawn for a row that carries neither.
-->
<script lang="ts">
  import RawJson from './RawJson.svelte';

  let { parameter, result, cls = '' }: { parameter: unknown; result: unknown; cls?: string } = $props();
</script>

{#if parameter !== null || result !== null}
  <details class="tcd {cls}"><summary>Details</summary><RawJson value={{ parameter, result }} bare /></details>
{/if}

<style>
  .tcd { min-width: 0; max-width: 100%; }
  .tcd > summary { cursor: pointer; min-height: 24px; }
</style>
