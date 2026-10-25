<!-- apps/web/src/lib/components/card/question/ApprovalDetail.svelte -->
<script lang="ts">
  /** Readable approvals: what a strict decision asks a person to approve, from the producer's
   *  structured detail. The operation in plain words, each file with its size and a short preview,
   *  the agent's one-line reason, and the digest that binds it under a details toggle. */
  import type { ApprovalDetail } from '$lib/api';

  let { detail }: { detail: ApprovalDetail } = $props();
  const verb = { create: 'New', edit: 'Changed', delete: 'Removed' } as const;
  const size = (n: number | null) => (n === null ? '' : n === 1 ? '1 byte' : `${n} bytes`);
</script>

<div class="approval-detail" style="display: flex; flex-direction: column; gap: var(--vk-space-2, 8px);">
  <p class="approval-summary" style="margin: 0; font-weight: 600;">{detail.summary}</p>
  {#if detail.reason}<p class="approval-reason" style="margin: 0;">{detail.reason}</p>{/if}
  {#each detail.files as file (file.path)}
    <div class="approval-file">
      <div style="display: flex; gap: var(--vk-space-2, 8px); flex-wrap: wrap; overflow-wrap: anywhere;">
        <span>{verb[file.change]}</span><code>{file.path}</code>{#if file.bytes !== null}<span>· {size(file.bytes)}</span>{/if}
      </div>
      {#if file.preview}<pre class="approval-preview" style="margin: 4px 0 0; max-height: 10em; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere;">{file.preview}</pre>{/if}
    </div>
  {/each}
  <details class="approval-digest">
    <summary>Details</summary>
    <code style="overflow-wrap: anywhere;">{detail.digest}</code>
  </details>
</div>
