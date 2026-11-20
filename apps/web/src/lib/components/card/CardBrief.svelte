<!-- apps/web/src/lib/components/card/CardBrief.svelte -->
<script lang="ts">
  /**
   * The brief, open (composition contract §7 "Card" 5): what the card asks, the rest of its spec read
   * as labelled groups (never JSON), and the agent's plan when it posted one. A card with no brief
   * keeps the block's place hidden.
   */
  import { SectionHeader } from '@superjackfruitlabs/vibekit-ui';
  import type { CardModel } from './card-model.svelte';
  import SpecValueView from './SpecValueView.svelte';
  import { specGroups } from './spec-groups';
  import { planProgress } from './card-words';

  let { model: m, level }: { model: CardModel; level: 2 | 3 } = $props();
  const card = $derived(m.card!);
  const description = $derived(typeof card.spec?.description === 'string' && card.spec.description.trim() ? card.spec.description : null);
  const groups = $derived(specGroups(card.spec, { criteriaHeading: 'What it must produce' }));
  const planDone = $derived(m.plan?.filter((s) => s.done).length ?? 0);
  const empty = $derived(!description && groups.length === 0 && !m.plan);
</script>

<section class="cv-sec" data-block="brief" hidden={empty}>
  <SectionHeader n={1} title="The brief" {level} />
  {#if description}<p class="cv-p cv-pre" data-section="description">{description}</p>{:else}<span hidden data-section="description"></span>{/if}
  {#if groups.length}
    <div class="cv-groups" data-section="details" data-testid="spec-details">
      {#each groups as g (g.label)}
        <div class="cv-group">
          <p class="cv-grouphead">{g.label}</p>
          <dl class="cv-dl cv-dl--stack">
            {#each g.rows as r (r.key)}<div><dt>{r.label}</dt><dd data-testid="spec-value-{r.key}"><SpecValueView value={r.value} v={{ more: 'cv-linkbtn', id: 'cv-mono', link: 'cv-link', matrixLinks: true }} /></dd></div>{/each}
          </dl>
        </div>
      {/each}
    </div>
  {:else}<span hidden data-section="details"></span>{/if}
  {#if m.plan}
    <div class="cv-plan" data-section="plan">
      <p class="cv-grouphead">The agent’s plan <span class="cv-meta">{planProgress(planDone, m.plan.length)}</span></p>
      <ul class="cv-check">{#each m.plan as step, i (i)}<li data-done={step.done ? '1' : '0'}><span class="cv-box" aria-hidden="true">{step.done ? '✓' : ''}</span><span>{step.text}{#if step.done}<span class="vk-visually-hidden"> (done)</span>{/if}</span></li>{/each}</ul>
    </div>
  {:else}<span hidden data-section="plan"></span>{/if}
</section>
