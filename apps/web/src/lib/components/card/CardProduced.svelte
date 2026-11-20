<!-- apps/web/src/lib/components/card/CardProduced.svelte -->
<script lang="ts">
  /**
   * What the last attempt produced (composition contract §7 "Card" 6): each document as a row with
   * Open, and the acceptance criteria as a checklist, never JSON. Nothing produced and nothing to prove
   * keeps the block's place hidden.
   */
  import { Button, SectionHeader } from '@superjackfruitlabs/vibekit-ui';
  import type { CardModel } from './card-model.svelte';
  import StructuredValue from './StructuredValue.svelte';
  import { criterionKey, producedMeta, producedTitle } from './card-words';

  let { model: m, level }: { model: CardModel; level: 2 | 3 } = $props();
  const criteria = $derived(m.acceptanceCriteria ?? []);
  const empty = $derived(m.artifacts.length === 0 && criteria.length === 0);
</script>

<section class="cv-sec" data-block="produced" hidden={empty}>
  <SectionHeader n={2} title={producedTitle(m.card?.attemptCount ?? 0)} meta={producedMeta(m.artifacts.length, criteria.length) || undefined} {level} />
  {#each m.artifacts as a (a.id)}
    <div class="cv-art" data-row="artifact">
      <div class="cv-art__t"><p class="cv-art__title">{a.title}</p>{#if a.meta}<p class="cv-meta">{a.meta}</p>{/if}</div>
      <Button variant="secondary" href={a.url} target="_blank" rel="noopener noreferrer" aria-label="Open {a.title}">Open</Button>
    </div>
  {/each}
  {#if criteria.length}
    <ul class="cv-check" data-section="criteria" aria-label="Acceptance criteria">
      {#each criteria as c, i (i)}<li><span class="cv-key">{criterionKey(i)}</span><span>{#if typeof c === 'string'}{c}{:else}<StructuredValue value={c} />{/if}</span></li>{/each}
    </ul>
  {:else}<span hidden data-section="criteria"></span>{/if}
</section>
