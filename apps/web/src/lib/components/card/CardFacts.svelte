<!-- apps/web/src/lib/components/card/CardFacts.svelte -->
<script lang="ts">
  /**
   * The card's facts, in words (rule 5): owner, priority, label names, due, attempt, who asked for it,
   * then the project, the sub-tasks, the cost, the links and the references (§11.3 folds those here),
   * each list with its one quiet action (Add a sub-task, Add link, Attach a link) opening its composer in place.
   * Names, never ids. A fact with nothing to say and nothing to do stays out of the way.
   */
  import { tick } from 'svelte';
  import { Button, Choice, Field } from '@superjackfruitlabs/vibekit-ui';
  import { boardChoosesRepositories, repositoriesFact, repositoriesWait } from './card-repositories';
  import type { CardModel } from './card-model.svelte';
  import LinkAddForm from './LinkAddForm.svelte';
  import { REFERENCE_ACTION, REFERENCE_LABEL, SUBTASK_ACTION, SUBTASK_LABEL, cardFacts, costFact, labelName, linksFact, projectLine, subtasksLine } from './card-words';
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
  // Repositories: only on a board with a bench stage whose cards choose, or a card that already chose.
  const stages = $derived(m.board?.stages ?? []);
  const here = $derived(stages.find((s) => s.key === card.currentStageKey));
  const showRepositories = $derived(boardChoosesRepositories(stages) || !!card.repositories?.length);
  const repositoriesWaits = $derived(repositoriesWait(card, here));

  // Add a sub-task, attach a reference: one composer open at a time, in place; it takes focus where it is.
  let adding = $state<'subtask' | 'reference' | null>(null);
  let root = $state<HTMLElement | null>(null);
  async function open(which: 'subtask' | 'reference'): Promise<void> {
    adding = which;
    await tick();
    focusInPlace(root?.querySelector(`[data-composer="${which}"] input`));
  }
  async function close(which: 'subtask' | 'reference'): Promise<void> {
    if (which === 'subtask') m.subtasks.reset(); else m.refsForm.reset();
    adding = null;
    await tick();
    focusInPlace(root?.querySelector(`[data-opens="${which}"]`));
  }

  // Change project: the inline form takes focus where it is, never scrolling the card.
  let projectWas = false;
  $effect(() => {
    const editing = m.project.editing;
    if (editing && !projectWas) void tick().then(() => focusInPlace(document.querySelector('[data-project-form] select')));
    projectWas = editing;
  });
</script>

<section class="cv-facts" data-block="facts" aria-label="Facts" bind:this={root}>
  <dl class="cv-dl" data-section="facts">
    {#each facts as f (f.term)}
      <div><dt>{f.term}</dt><dd>{f.value}{#if f.term === 'Owner' && m.canAssign}{' '}<Button variant="quiet" disabled={m.assigning} onclick={() => m.assignToMe()}>{m.assigning ? 'Assigning…' : 'Assign to me'}</Button>{/if}</dd></div>
    {/each}
    {#if showRepositories}
      <div class="cv-wide" data-section="repositories">
        <dt>Repositories</dt>
        <dd>
          {#if m.repositories.editing}
            <form class="cv-form" data-repositories-form onsubmit={(e) => { e.preventDefault(); void m.repositories.save(); }}>
              <fieldset class="cv-choices">
                <legend class="vk-visually-hidden">Repositories this card works in</legend>
                {#each m.repositories.options as name (name)}
                  <Choice type="checkbox" name="cv-repositories-{card.id}" value={name} label={name}
                    bind:checked={() => m.repositories.chosen.includes(name), (on) => m.repositories.toggle(name, on)} />
                {/each}
              </fieldset>
              {#if m.repositories.chosen.length > 1}
                <Field id="cv-primary-{card.id}" label="Work starts in" control="select" bind:value={m.repositories.primary}
                  options={[{ value: '', label: m.repositories.start && m.repositories.primary === '' ? `${m.repositories.start} (the stage's start)` : 'Choose one' }, ...m.repositories.chosen.map((n) => ({ value: n, label: n }))]} />
              {/if}
              {#if m.repositories.mustName}<p class="cv-meta" role="status">Name the repository the work starts in.</p>{/if}
              {#if m.repositories.error}<p class="cv-alert" role="alert">{m.repositories.error}</p>{/if}
              <div class="cv-row">
                <Button type="submit" variant="primary" disabled={m.repositories.saving || m.repositories.mustName}>{m.repositories.saving ? 'Saving…' : 'Save'}</Button>
                <Button variant="quiet" onclick={() => m.repositories.cancel()}>Cancel</Button>
              </div>
            </form>
          {:else}
            {repositoriesFact(card, here)}{' '}<Button variant="quiet" onclick={() => m.repositories.open()}>{card.repositories?.length ? 'Change repositories' : 'Choose repositories'}</Button>
            {#if repositoriesWaits}<p class="cv-alert" data-waits="repositories">{repositoriesWaits}</p>{/if}
          {/if}
        </dd>
      </div>
    {/if}
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
    <div class="cv-wide" data-section="subtasks">
      <dt>Sub-tasks</dt>
      <dd>
        {m.children.length ? subtasksLine(card.openChildCount, m.children.length) : 'none'}
        {#if m.children.length}<ul class="cv-list">{#each m.children as c (c.id)}<li><Button variant="quiet" onclick={() => m.openCard(c.id)}>{c.title}</Button></li>{/each}</ul>{/if}
        {#if adding === 'subtask'}
          <form class="cv-form" data-composer="subtask" onsubmit={(e) => { e.preventDefault(); if (!m.subtasks.adding) void m.subtasks.add(); }}>
            <Field id="cv-subtask-{card.id}" label={SUBTASK_LABEL} placeholder="What the sub-task asks" bind:value={m.subtasks.title} />
            {#if m.subtasks.error}<p class="cv-alert" role="alert">{m.subtasks.error}</p>{/if}
            <div class="cv-row">
              <Button type="submit" variant="secondary" aria-disabled={m.subtasks.adding ? 'true' : undefined} data-busy={m.subtasks.adding ? 'true' : undefined}>Add</Button>
              <Button variant="quiet" onclick={() => close('subtask')}>Cancel</Button>
              <span class="vk-visually-hidden" role="status">{m.subtasks.adding ? 'Adding…' : ''}</span>
            </div>
          </form>
        {:else}{' '}<Button variant="quiet" data-opens="subtask" onclick={() => open('subtask')}>{SUBTASK_ACTION}</Button>{/if}
      </dd>
    </div>
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
    <div class="cv-wide" data-section="references">
      <dt>References</dt>
      <dd>
        {#if m.otherRefs.length}
          <ul class="cv-list">
            {#each m.otherRefs as r (r.id)}<li>{#if safeHref(r.url)}<a class="cv-link" href={safeHref(r.url)!} target="_blank" rel="noreferrer">{r.title ?? refLabel(r)}</a>{:else}{r.title ?? refLabel(r)}{/if} <span class="cv-meta">· {referenceSource(r)}</span></li>{/each}
          </ul>
        {:else}none{/if}
        {#if adding === 'reference'}
          <form class="cv-form" data-composer="reference" onsubmit={(e) => { e.preventDefault(); if (!m.refsForm.adding) void m.refsForm.add(); }}>
            <Field id="cv-reference-{card.id}" type="url" label={REFERENCE_LABEL} placeholder="Paste a link to attach" bind:value={m.refsForm.url} />
            <div class="cv-row">
              <Button type="submit" variant="secondary" aria-disabled={m.refsForm.adding ? 'true' : undefined} data-busy={m.refsForm.adding ? 'true' : undefined}>Add</Button>
              <Button variant="quiet" onclick={() => close('reference')}>Cancel</Button>
              <span class="vk-visually-hidden" role="status">{m.refsForm.adding ? 'Adding…' : ''}</span>
            </div>
          </form>
        {:else}{' '}<Button variant="quiet" data-opens="reference" onclick={() => open('reference')}>{REFERENCE_ACTION}</Button>{/if}
      </dd>
    </div>
  </dl>
</section>
