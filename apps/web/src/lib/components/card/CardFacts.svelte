<!-- apps/web/src/lib/components/card/CardFacts.svelte -->
<script lang="ts">
  /**
   * The card's facts, in words (rule 5): owner, priority, label names, due, attempt, who asked for it,
   * then the project, the sub-tasks, the cost, the links and the references (§11.3 folds those here).
   * Names, never ids. A fact with nothing to say and nothing to do stays out of the way.
   */
  import { tick } from 'svelte';
  import { Button, Field } from '@superjackfruitlabs/vibekit-ui';
  import type { CardModel } from './card-model.svelte';
  import LinkAddForm from './LinkAddForm.svelte';
  import { cardFacts, costFact, labelName, linksFact, projectLine, subtasksLine } from './card-words';
  import { refLabel, referenceSource } from './references';
  import { safeHref } from './spec-details';
  import { focusInPlace } from './open-at-top';

  let { model: m }: { model: CardModel } = $props();
  const card = $derived(m.card!);
  const facts = $derived(cardFacts({ owner: m.ownerName, priority: card.priority, labels: m.labels.map(labelName), dueAt: card.dueAt, attempts: card.attemptCount, askedBy: m.provenance?.known ? m.queuedByName : '' }));
  const LINK_LABEL = { blockedBy: 'Blocked by', resolvedBlockedBy: 'Blocked by (resolved)', blocks: 'Blocks', relates: 'Relates to', supersedes: 'Supersedes', advisory: 'On other boards' } as const;
  type LinkRow = { title: string; remove: import('$lib/components/link-groups').RemoveArgs };
  const linkRows = $derived(Object.entries(LINK_LABEL).flatMap(([key, label]) => (m.linkGroups[key as keyof typeof LINK_LABEL] as LinkRow[]).map((row) => ({ key, label, ...row }))));
  const showCost = $derived(card.costUsd > 0 || !!m.estimate?.estimatedUsd);

  // Change project: the inline form takes focus where it is, never scrolling the card.
  let projectWas = false;
  $effect(() => {
    const editing = m.project.editing;
    if (editing && !projectWas) void tick().then(() => focusInPlace(document.querySelector('[data-project-form] select')));
    projectWas = editing;
  });
</script>

<section class="cv-facts" data-block="facts" aria-label="Facts">
  <dl class="cv-dl" data-section="facts">
    {#each facts as f (f.term)}
      <div><dt>{f.term}</dt><dd>{f.value}{#if f.term === 'Owner' && m.canAssign}{' '}<Button variant="quiet" disabled={m.assigning} onclick={() => m.assignToMe()}>{m.assigning ? 'Assigning…' : 'Assign to me'}</Button>{/if}</dd></div>
    {/each}
    <div class="cv-wide" data-section="project">
      <dt>Project</dt>
      <dd>
        {#if m.project.editing}
          <div class="cv-form" data-project-form>
            <Field id="cv-project" label="Project" control="select" bind:value={m.project.projectId} onchange={() => void m.project.onProjectChange()}
              options={[{ value: '', label: 'No project' }, ...m.projects.map((p) => ({ value: p.id, label: p.name }))]} />
            <Field id="cv-milestone" label="Milestone" control="select" bind:value={m.project.milestoneId} disabled={m.project.projectId === ''}
              options={[{ value: '', label: 'No milestone' }, ...m.project.milestones.map((ms) => ({ value: ms.id, label: ms.name }))]} />
            {#if m.project.error}<p class="cv-alert" role="alert">{m.project.error}</p>{/if}
            <div class="cv-row">
              <Button variant="primary" disabled={m.project.saving} onclick={() => m.project.save()}>{m.project.saving ? 'Saving…' : 'Save'}</Button>
              <Button variant="quiet" onclick={() => m.project.cancel()}>Cancel</Button>
            </div>
          </div>
        {:else}
          {m.projectName ? projectLine(m.projectName, m.milestoneName) : 'none'}{' '}<Button variant="quiet" onclick={() => m.project.start()}>{m.projectName ? 'Change project' : 'Assign to a project'}</Button>
        {/if}
      </dd>
    </div>
    {#if m.children.length}
      <div class="cv-wide" data-section="subtasks">
        <dt>Sub-tasks</dt>
        <dd>{subtasksLine(card.openChildCount, m.children.length)}<ul class="cv-list">{#each m.children as c (c.id)}<li><Button variant="quiet" onclick={() => m.openCard(c.id)}>{c.title}</Button></li>{/each}</ul></dd>
      </div>
    {:else}<div hidden data-section="subtasks"></div>{/if}
    {#if showCost}
      <div data-section="cost"><dt>Cost</dt><dd>{costFact(card.costUsd, m.estimate?.estimatedUsd ?? null)}</dd></div>
    {:else}<div hidden data-section="cost"></div>{/if}
    <div class="cv-wide" data-section="links">
      <dt>Links</dt>
      <dd>
        {#if linkRows.length}
          <ul class="cv-list">
            {#each linkRows as row (row.key + row.title)}<li>{row.label}: {row.title} <Button variant="quiet" disabled={m.links.removing.size > 0} onclick={() => m.links.remove(row.remove)}>Remove</Button></li>{/each}
          </ul>
        {:else}{linksFact(0)}{' '}{/if}
        <Button variant="quiet" onclick={() => m.links.openAdd()}>Add link</Button>
        {#if m.links.listError}<p class="cv-alert" role="alert">{m.links.listError}</p>{/if}
        <LinkAddForm model={m} />
      </dd>
    </div>
    {#if m.otherRefs.length}
      <div class="cv-wide" data-section="references">
        <dt>References</dt>
        <dd>
          <ul class="cv-list">
            {#each m.otherRefs as r (r.id)}<li>{#if safeHref(r.url)}<a class="cv-link" href={safeHref(r.url)!} target="_blank" rel="noreferrer">{r.title ?? refLabel(r)}</a>{:else}{r.title ?? refLabel(r)}{/if} <span class="cv-meta">· {referenceSource(r)}</span></li>{/each}
          </ul>
        </dd>
      </div>
    {:else}<div hidden data-section="references"></div>{/if}
  </dl>
</section>
