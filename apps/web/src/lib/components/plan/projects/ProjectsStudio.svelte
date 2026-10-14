<script lang="ts">
  /** SP-Projects-Studio: an annual-report list, one ruled row per project. */
  import './projects-studio.css';
  import { Button } from '@superjackfruit/vibekit';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { viewport } from '$lib/viewport.svelte';
  import { fmtTarget, HEALTH_LABEL, milestoneDate, milestonesMeta, progressPct, rollupSegments, STATE_LABEL, STUDIO_UNIT } from '../project-rollup';
  import type { ProjectsLayoutProps } from './types';

  let { model }: ProjectsLayoutProps = $props();
  const pad = (n: number) => String(n).padStart(2, '0');
  /** A plain click opens the drawer over the list; a phone, or a modified click, follows the link to the page. */
  function openProject(e: MouseEvent, id: string): void {
    if (viewport.phone || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    model.drawerId = id;
  }
</script>

<div class="pj-main">
  <div class="ar-hero">
    <span class="big ink" aria-hidden="true">{model.projects.length}</span>
    <div class="txt">
      <p class="kick">Plan · the workspace</p>
      <svelte:element this={viewport.phone ? 'h2' : 'h1'}>Projects</svelte:element>
      <p>{model.summary} A project gathers cards from any board; each shows how many are done and what they cost.</p>
      <div class="pj-acts">{#snippet plusIcon()}<LineIcon name="plus" size={16} stroke={1.75} />{/snippet}<Button icon={plusIcon} onclick={() => (model.dialogOpen = true)}>New project</Button></div>
    </div>
  </div>

  {#if model.loadError}<p class="ar-hint" role="alert">{model.loadError}</p>
  {:else if model.loading && model.projects.length === 0}<div aria-busy="true"><p class="ar-hint" role="status">Loading projects…</p><span class="vk-skeleton" aria-hidden="true" style="width: 80%;"></span><span class="vk-skeleton" aria-hidden="true" style="width: 60%;"></span></div>
  {:else if model.projects.length === 0}<p class="ar-hint">No projects yet. Use “New project” above to add the first.</p>{/if}

  {#each model.groups as g, gi (g.id)}
    <section class="ar-sec" aria-labelledby={g.id}>
      <div class="hd"><span class="no">{pad(gi + 1)}</span><h2 id={g.id}>{g.label}</h2><span class="pj-n">· {g.projects.length}</span></div>
      <ol class="pj-list">
        {#each g.projects as p, pi (p.id)}
          {@const i = model.ordered.indexOf(p)}
          {@const ms = model.milestones[p.id] ?? []}
          {@const rollup = model.rollups[p.id]}
          {@const err = model.rollupErrors[p.id]}
          <li class="pj-row" aria-labelledby="pj-{i}">
            <span class="pj-ix" aria-hidden="true">{pad(gi + 1)}.{pi + 1}</span>
            <div class="pj-name">
              <h3 class="pj-t" id="pj-{i}"><a class="pj-link" href="/plan/projects/{p.id}" onclick={(e) => openProject(e, p.id)}>{p.name}</a></h3>
              <div class="pj-meta">
                <span class="ar-st"><span class="u {STUDIO_UNIT[p.state]}" aria-hidden="true"></span>{STATE_LABEL[p.state]}</span>
                {#if p.health}<span class="ar-st">{#if p.health === 'on-track'}<LineIcon name="check" size={14} stroke={1.75} />{/if}{HEALTH_LABEL[p.health]}</span>{/if}
                {#each model.boardsOf(p.id) as b (b.id)}<span class="ar-st pj-board">{b.name}</span>{/each}
                <span class="pj-date">{#if p.targetDate}<LineIcon name="date" size={13} stroke={1.75} square />{/if}{fmtTarget(p.targetDate)}</span>
              </div>
            </div>
            <div class="pj-roll">
              {#if err}
                <p class="ar-hint">Rollup unavailable — {err}</p>
              {:else if rollup}
                {@const segs = rollupSegments(rollup)}
                <p class="pj-fig"><span><strong>{rollup.cardsDone}/{rollup.cardsTotal}</strong> cards done</span><span class="pj-cost">{segs[1]!.text}</span></p>
                <div class="pj-bar" role="img" aria-label="{progressPct(rollup)}% of cards done"><i class="sp-fill" style="--p: {progressPct(rollup) / 100};"></i></div>
                <p class="ar-hint">{segs[2]!.text}</p>
              {:else}
                <div class="pj-load" aria-busy="true"><div class="pj-skel"></div><p class="ar-hint">Loading rollup…</p></div>
              {/if}
            </div>
            <button class="ar-ib pj-del" aria-label="Delete project {p.name}" type="button" disabled={model.deleting === p.id} onclick={() => void model.removeProject(p)}><LineIcon name="trash" size={18} stroke={1.75} /></button>
            <details class="pj-ms" open={model.msOpen[p.id] ?? false} ontoggle={(e) => (model.msOpen[p.id] = e.currentTarget.open)}>
              <summary><span class="disc-ico"><LineIcon name="chev-down" size={16} stroke={1.75} /></span>Milestones <span class="muted" style="font-weight: 500;">{milestonesMeta(ms.length)}</span></summary>
              {#each ms as m (m.id)}
                <p class="ar-hint">{m.name}{m.targetDate ? ` · ${milestoneDate(m.targetDate)}` : ''} <Button variant="text" aria-label="Remove milestone {m.name}" disabled={model.removingMs === m.id} onclick={() => void model.removeMilestone(p.id, m)}>Remove</Button></p>
              {/each}
              <form class="pj-msform" aria-label="Add a milestone to {p.name}" onsubmit={(e) => { e.preventDefault(); void model.addMilestone(p.id); }}>
                <div class="ar-field"><label for="ms-{i}">Milestone</label><input class="ar-in" id="ms-{i}" placeholder="Name" bind:value={model.msName[p.id]} /></div>
                <div class="ar-field"><label for="md-{i}">Date</label><input class="ar-in" id="md-{i}" type="date" bind:value={model.msTarget[p.id]} /></div>
                <Button variant="secondary" type="submit" disabled={model.addingFor === p.id}>{model.addingFor === p.id ? 'Adding…' : 'Add'}</Button>
              </form>
            </details>
          </li>
        {/each}
      </ol>
    </section>
  {/each}

  <p class="pj-note">If a rollup fails, the card says “Rollup unavailable” with the reason instead of showing a number. Deleting a project asks first.</p>
</div>
