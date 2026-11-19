<script lang="ts">
  import type { Reference } from '$lib/api';
  import { artifactRow } from '../references';

  let { references = [] as Reference[] }: { references?: Reference[] } = $props();

  const rows = $derived(references.map(artifactRow));
</script>

<section class="gate-references" aria-label="Artifacts linked by this run">
  <h3>Artifacts from this run</h3>
  {#if rows.length === 0}
    <p>This run linked no artifact</p>
  {:else}
    <ul>
      {#each rows as row (row.id)}
        <li><a href={row.url}>{row.title}</a>{#if row.version}<span> · version {row.version}</span>{/if}</li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .gate-references { margin-block: var(--vk-space-3, 12px); font-size: var(--vk-text-sm, 0.875rem); }
  h3, p { margin: 0; }
  h3 { font-size: inherit; font-weight: 700; }
  ul { margin: var(--vk-space-1, 4px) 0 0; padding-inline-start: 1.25rem; }
  li + li { margin-top: var(--vk-space-1, 4px); }
  a { overflow-wrap: anywhere; }
  span { color: var(--vk-color-muted, currentColor); }
</style>
