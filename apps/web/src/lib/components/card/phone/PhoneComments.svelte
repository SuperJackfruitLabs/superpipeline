<!-- apps/web/src/lib/components/card/phone/PhoneComments.svelte -->
<script lang="ts">
  import { Button } from '@superjackfruit/vibekit';
  import type { CardModel } from '../card-model.svelte';
  let { model }: { model: CardModel } = $props();
  const id = $props.id();
</script>

{#if model.comments.comments.length === 0}<p class="muted">No comments yet.</p>
{:else}
  <ul class="refs">{#each model.comments.comments as c (c.id)}<li class="rf"><b>{c.author.name ?? 'Someone'}</b><span>{c.body}</span></li>{/each}</ul>
{/if}
<label class="lab" for="cm-{id}">Comment</label>
<textarea id="cm-{id}" class="ta" rows="2" placeholder="Write a comment" maxlength="8192" bind:value={model.comments.draft}
  onkeydown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void model.comments.submit(); } }}></textarea>
<div class="addrow"><span class="muted small">⌘ or Ctrl + Enter to post</span><Button variant="secondary" class="sbtn" type="button" aria-disabled={model.comments.posting ? 'true' : undefined} onclick={() => { if (!model.comments.posting) void model.comments.submit(); }}>Comment</Button><span class="sr" role="status">{model.comments.posting ? 'Posting…' : ''}</span></div>
{#if model.comments.error}<p class="hint" role="alert">{model.comments.error}</p>{/if}
