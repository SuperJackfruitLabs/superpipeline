<!-- apps/web/src/lib/components/card/SpecValueView.svelte -->
<script lang="ts">
  /**
   * One brief value, by its shape (D-21, D-22). Each vibe passes its own class names, so the ported
   * CSS applies: `clamp` wraps the first paragraph (page forms), `more` is the Show more button,
   * `id` styles a Matrix id, `link` styles links, `matrixLinks` makes "onboarding card" a link
   * (drawers) or plain text (pages, as the references print it).
   */
  import StructuredValue from './StructuredValue.svelte';
  import { safeHref } from './spec-details';
  import { openCardAnywhere } from './open-card';
  import type { SpecValue } from './spec-groups';

  let { value, v }: { value: SpecValue; v: { clamp?: string; more: string; id?: string; link?: string; matrixLinks: boolean } } = $props();
  let open = $state(false);
</script>

{#if value.kind === 'text'}
  {#if v.clamp && !open && value.more}<span class={v.clamp}>{value.shown}</span>{:else}<span style="white-space: pre-line">{open && value.more ? `${value.shown}\n\n${value.more}` : value.shown}</span>{/if}{#if value.more}{' '}<button class={v.more} type="button" aria-expanded={open} onclick={() => (open = !open)}>{open ? 'Show less' : 'Show more'}</button>{/if}
{:else if value.kind === 'evidence'}
  {value.text}
{:else if value.kind === 'matrix'}
  {#if v.id}<span class={v.id}>{value.matrixId}</span>{:else}{value.matrixId}{/if} · {#if v.matrixLinks}<a class={v.link} href="#card-{value.cardId}" onclick={(e) => { e.preventDefault(); void openCardAnywhere(value.cardId); }}>onboarding card</a>{:else}onboarding card{/if}
{:else if value.kind === 'repo'}
  {value.repo} · {value.visibility}{#if value.policyUrl && safeHref(value.policyUrl)}{' · '}<a class={v.link} href={safeHref(value.policyUrl)!}>policy</a>{/if}
{:else}
  <StructuredValue value={value.value} />
{/if}
