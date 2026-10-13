<script lang="ts">
  /**
   * Filter cards, as a dialog every shell's Filter button opens (`app.filterOpen`). vibekit's
   * Dialog draws the frame, the scrim and the focus trap; the rows are vibekit Choices. The chips
   * say what is on, each one a way to switch it off: a board must never silently misrepresent what
   * it is showing.
   */
  import { Button, Choice, Dialog, Field } from '@superjackfruit/vibekit';
  import { app } from '$lib/stores/app.svelte';
  import { noFilters } from '$lib/stores/card-filters';
  import { resolveProjectName } from './project-lookup';

  const f = $derived(app.filters);
  const states = $derived(app.boardStates());
  const owners = $derived(app.boardOwners());
  const labelCatalogue = $derived(app.labels);
  const labelById = $derived(app.labelById());
  const projectCatalogue = $derived(app.projects);

  /** One chip per active filter, each knowing how to switch itself off. */
  const active = $derived([
    ...f.states.map((s) => ({ key: `state:${s}`, label: s, clear: () => (app.filters.states = f.states.filter((x) => x !== s)) })),
    ...f.owners.map((o) => ({ key: `owner:${o}`, label: o, clear: () => (app.filters.owners = f.owners.filter((x) => x !== o)) })),
    ...(f.minPriority !== null ? [{ key: 'pri', label: `P${f.minPriority}+`, clear: () => (app.filters.minPriority = null) }] : []),
    ...(f.needsReview ? [{ key: 'rev', label: 'needs review', clear: () => (app.filters.needsReview = false) }] : []),
    ...(f.live ? [{ key: 'live', label: 'working', clear: () => (app.filters.live = false) }] : []),
    ...(f.overBudget ? [{ key: 'bud', label: 'over budget', clear: () => (app.filters.overBudget = false) }] : []),
    ...f.labels.map((id) => ({ key: `lbl:${id}`, label: labelById.get(id)?.name ?? id, clear: () => (app.filters.labels = f.labels.filter((x) => x !== id)) })),
    ...(f.showArchived ? [{ key: 'arch', label: 'archived', clear: () => (app.filters.showArchived = false) }] : []),
    // `resolveProjectName` is the single place that decides what a dangling project id renders as.
    ...(f.projectId ? [{ key: `prj:${f.projectId}`, label: resolveProjectName(f.projectId, projectCatalogue) ?? f.projectId, clear: () => (app.filters.projectId = null) }] : []),
  ]);

  const FLAGS = [['needsReview', 'needs review'], ['live', 'an agent is working it'], ['overBudget', 'over budget'], ['showArchived', 'show archived']] as const;

  function toggle<T>(list: T[], v: T, on: boolean): T[] {
    const without = list.filter((x) => x !== v);
    return on ? [...without, v] : without;
  }
  function close(): void {
    app.filterOpen = false;
  }
</script>

<Dialog bind:open={app.filterOpen} title="Filter cards" onclose={close}>
  {#if active.length > 0}
    <div class="mb-3 flex flex-wrap items-center gap-1" role="group" aria-label="Filters on">
      {#each active as chip (chip.key)}
        <button type="button" onclick={chip.clear} aria-label="Remove filter {chip.label}" class="mono border-marigold/40 text-marigold hover:bg-inset inline-flex items-center gap-1 rounded-[6px] border px-1.5 text-[10px]" style="min-height:var(--tap)">{chip.label} <span aria-hidden="true">×</span></button>
      {/each}
    </div>
  {/if}

  {#if states.length > 0}
    <fieldset class="mb-3"><legend class="eyebrow mb-1.5">state</legend>
      {#each states as s (s)}
        <Choice type="checkbox" name="fd-state" value={s} label={s} bind:checked={() => f.states.includes(s), (on) => (app.filters.states = toggle(f.states, s, on))} />
      {/each}
    </fieldset>
  {/if}

  {#if owners.length > 0}
    <fieldset class="mb-3"><legend class="eyebrow mb-1.5">owner</legend>
      {#each owners as o (o)}
        <Choice type="checkbox" name="fd-owner" value={o} label={o} bind:checked={() => f.owners.includes(o), (on) => (app.filters.owners = toggle(f.owners, o, on))} />
      {/each}
    </fieldset>
  {/if}

  {#if labelCatalogue.length > 0}
    <fieldset class="mb-3"><legend class="eyebrow mb-1.5">labels</legend>
      {#each labelCatalogue as l (l.id)}
        <Choice type="checkbox" name="fd-label" value={l.id} label={l.name} bind:checked={() => f.labels.includes(l.id), (on) => (app.filters.labels = toggle(f.labels, l.id, on))} />
      {/each}
    </fieldset>
  {/if}

  {#if projectCatalogue.length > 0}
    <!-- A SINGLE project at a time (unlike labels, which AND together): a card belongs to at most
         one project, so "match every selected project" would always show nothing. -->
    <fieldset class="mb-3"><legend class="eyebrow mb-1.5">project</legend>
      {#each projectCatalogue as p (p.id)}
        <Choice type="checkbox" name="fd-project" value={p.id} label={p.name} bind:checked={() => f.projectId === p.id, (on) => (app.filters.projectId = on ? p.id : null)} />
      {/each}
    </fieldset>
  {/if}

  <Field id="fd-priority" label="min priority" type="number" min="0" placeholder="—"
    bind:value={() => (f.minPriority === null ? '' : String(f.minPriority)), (v) => (app.filters.minPriority = v === '' || v === undefined || v === null ? null : Number(v))} />

  <fieldset class="mt-3">
    {#each FLAGS as [key, label] (key)}
      <Choice type="checkbox" name="fd-{key}" value={key} {label} bind:checked={() => f[key], (on) => (app.filters[key] = on)} />
    {/each}
  </fieldset>

  {#snippet lead()}
    <Button variant="secondary" disabled={active.length === 0} onclick={() => (app.filters = noFilters())}>Clear filters</Button>
  {/snippet}
  {#snippet actions()}
    <Button onclick={close}>Done</Button>
  {/snippet}
</Dialog>
