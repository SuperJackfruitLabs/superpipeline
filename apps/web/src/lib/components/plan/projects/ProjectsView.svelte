<!-- apps/web/src/lib/components/plan/projects/ProjectsView.svelte -->
<script lang="ts">
  /**
   * Plan · Projects, one composition in every vibe (composition contract): the page head (the page's
   * one `[data-signature]` slot, restyled per vibe in projects.css, same words everywhere), then the
   * projects grouped by state, one card each: state, health, target, the boards its cards live on,
   * the rollup, and milestones behind a disclosure. A plain click opens the drawer over the list.
   */
  import './projects.css';
  import { Button } from '@superjackfruitlabs/vibekit-ui';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import PageMain from '$lib/components/parts/PageMain.svelte';
  import { viewport } from '$lib/viewport.svelte';
  import { fmtTarget, HEALTH_LABEL, milestoneDate, milestonesMeta, progressPct, rollupSegments, STATE_LABEL } from '../project-rollup';
  import type { ProjectsModel } from '../projects-model.svelte';
  import SkeletonRows from '$lib/components/parts/SkeletonRows.svelte';
  import LoadFailed from '$lib/components/parts/LoadFailed.svelte';
  import { PROJECTS_EMPTY, PROJECTS_EYEBROW, PROJECTS_FOOT, PROJECTS_LEDE } from './projects-words';

  let { model }: { model: ProjectsModel } = $props();
  /** A plain click opens the drawer over the list; a phone, or a modified click, follows the link to the page. */
  function openProject(e: MouseEvent, id: string): void {
    if (viewport.phone || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    model.drawerId = id;
  }
</script>

<PageMain scope="scr-projects">
  <div class="pj-top">
    <div class="pj-head" data-signature>
      <p class="t-eyebrow pj-eyebrow">{PROJECTS_EYEBROW}</p>
      <svelte:element this={viewport.phone ? 'h2' : 'h1'} class="t-h1 pj-title">Projects</svelte:element>
      <p class="t-body pj-lede">{model.summary} {PROJECTS_LEDE}</p>
    </div>
    <!-- The desktop masthead's primary action is New project (ProjectView); the phone header has none, so the page draws it. -->
    {#if viewport.phone}{#snippet plusIcon()}<LineIcon name="plus" size={18} />{/snippet}<Button icon={plusIcon} onclick={() => (model.dialogOpen = true)}>New project</Button>{/if}
  </div>

  {#if model.failed}
    <LoadFailed message={model.loadError ?? ''} onRetry={() => model.refresh()} />
  {:else if model.loadError}
    <p class="t-meta" role="alert">{model.loadError}</p>
  {:else if model.pending}
    <SkeletonRows label="Loading projects…" rows={3} rowHeight={150} />
  {:else if model.projects.length === 0}
    <p class="t-meta">{PROJECTS_EMPTY}</p>
  {/if}

  {#each model.groups as g (g.id)}
    <section class="pj-group" aria-labelledby={g.id}>
      <div class="group-h"><h2 class="t-h2" id={g.id}>{g.label}</h2><span class="count">{g.projects.length}</span></div>
      <div class="pgrid">
        {#each g.projects as p (p.id)}
          {@const i = model.ordered.indexOf(p)}
          {@const ms = model.milestones[p.id] ?? []}
          {@const rollup = model.rollups[p.id]}
          {@const err = model.rollupErrors[p.id]}
          <article class="panel pcard" aria-labelledby="pj-{i}" data-row={p.name}>
            <div class="pj-name">
              <h3 class="ptitle" id="pj-{i}"><a class="plink" href="/plan/projects/{p.id}" onclick={(e) => openProject(e, p.id)}>{p.name}</a></h3>
            </div>
            <div class="pj-facts">
              <span class={p.state === 'active' ? 'chip' : 'chip chip-line'}>{STATE_LABEL[p.state]}</span>
              {#if p.health}
                <span class={p.health === 'on-track' ? 'chip chip-ok' : 'chip chip-line'}>{#if p.health === 'on-track'}<LineIcon name="check" size={14} />{/if}{HEALTH_LABEL[p.health]}</span>
              {/if}
              {#if p.targetDate}
                <span class="t-meta pj-date"><LineIcon name="date" size={14} />{fmtTarget(p.targetDate)}</span>
              {:else}
                <span class="t-meta">{fmtTarget(null)}</span>
              {/if}
            </div>
            {#if model.boardsOf(p.id).length > 0}
              <p class="pboards"><span class="t-meta">Cards on</span>{#each model.boardsOf(p.id) as b (b.id)}<span class="chip chip-line">{b.name}</span>{/each}</p>
            {/if}
            {#if err}
              <p class="t-meta">Rollup unavailable — {err}</p>
            {:else if rollup}
              <div class="pj-roll">
                <div class="bar" role="img" aria-label="{progressPct(rollup)}% of cards done"><i style="width: {progressPct(rollup)}%;"></i></div>
                <p class="t-meta">{#each rollupSegments(rollup) as s, k (k)}{#if k > 0}{' · '}{/if}{#if s.kind === 'figure'}<strong class="pj-fig">{s.text}</strong>{:else}<span>{s.text}</span>{/if}{/each}</p>
              </div>
            {:else}
              <div class="pj-roll" aria-busy="true">
                <div class="skel"></div>
                <p class="t-meta">Loading rollup…</p>
              </div>
            {/if}
            <div class="pfoot">
              <details open={model.msOpen[p.id] ?? false} ontoggle={(e) => (model.msOpen[p.id] = e.currentTarget.open)}>
                <summary><span class="disc-ico"><LineIcon name="chev-down" size={16} /></span>Milestones <span class="t-meta pj-msmeta">{milestonesMeta(ms.length)}</span></summary>
                {#if ms.length > 0}
                  <ul class="mslist">
                    {#each ms as m (m.id)}
                      <li>
                        <span class="t-body">{m.name}</span>
                        {#if m.targetDate}<span class="t-meta">{milestoneDate(m.targetDate)}</span>{/if}
                        <button class="iconbtn" type="button" aria-label="Remove milestone {m.name}" disabled={model.removingMs === m.id} onclick={() => void model.removeMilestone(p.id, m)}><LineIcon name="trash" size={18} /></button>
                      </li>
                    {/each}
                  </ul>
                {/if}
                <form class="msform" aria-label="Add a milestone to {p.name}" onsubmit={(e) => { e.preventDefault(); void model.addMilestone(p.id); }}>
                  <div class="field">
                    <label for="ms-{i}">Milestone</label>
                    <input class="input" id="ms-{i}" placeholder="Name" bind:value={model.msName[p.id]} />
                  </div>
                  <div class="field">
                    <label for="md-{i}">Date</label>
                    <input class="input" id="md-{i}" type="date" bind:value={model.msTarget[p.id]} />
                  </div>
                  <Button class="btn-sm" variant="secondary" type="submit" disabled={model.addingFor === p.id}>{model.addingFor === p.id ? 'Adding…' : 'Add'}</Button>
                  {#if model.msError[p.id]}<p class="hint pj-wide" role="alert">{model.msError[p.id]}</p>{/if}
                </form>
              </details>
              <button class="iconbtn" aria-label="Delete project {p.name}" type="button" disabled={model.deleting === p.id} onclick={() => void model.removeProject(p)}><LineIcon name="trash" size={18} /></button>
            </div>
          </article>
        {/each}
      </div>
    </section>
  {/each}

  <p class="t-meta">{PROJECTS_FOOT}</p>
</PageMain>
