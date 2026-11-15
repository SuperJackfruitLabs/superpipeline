<script lang="ts">
  import type { Reference } from '$lib/api';

  let { references = [] as Reference[] }: { references?: Reference[] } = $props();

  interface ReferenceRow {
    id: string;
    title: string;
    url: string;
    version: string | null;
  }

  const versionValue = (value: unknown): string | null => {
    if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value);
    if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) return value;
    return null;
  };

  function rowOf(reference: Reference): ReferenceRow {
    let url = reference.url;
    let version: string | null = null;
    try {
      const parsed = new URL(reference.url);
      const pinned = parsed.pathname.match(/^(\/a\/[^/]+)\/v\/([1-9]\d*)\/?$/);
      const pinnedVersion = pinned?.[2];
      if (pinnedVersion) {
        version = pinnedVersion;
      } else if (reference.provider === 'superlibrary') {
        const item = parsed.pathname.match(/^(\/a\/[^/]+)\/?$/);
        const itemPath = item?.[1];
        version = versionValue(reference.metadata?.version);
        if (itemPath && version) {
          parsed.pathname = `${itemPath}/v/${version}`;
          parsed.search = '';
          parsed.hash = '';
          url = parsed.toString();
        }
      }
    } catch {
      // Keep malformed legacy links visible; the browser will still expose the original href.
    }
    return {
      id: reference.id,
      title: reference.title?.trim() || reference.subtitle?.trim() || reference.url,
      url,
      version,
    };
  }

  const rows = $derived(references.map(rowOf));
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
