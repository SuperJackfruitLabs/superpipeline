<script lang="ts">
  /**
   * A project's content (SP-ProjectPage, SP-Project-Drawer, SP-Phone-Project): the page draws all of
   * it in two columns, a phone in one; the drawer draws the same head, roll-up, blockers and
   * milestones compactly and sums up the rest, with "Open full page" for everything else.
   */
  import { Button, Dialog } from '@superjackfruit/vibekit';
  import type { Milestone } from '$lib/api';
  import { eventLabel } from '$lib/components/operate/spend-format';
  import { whenLabel } from '$lib/when';
  import { viewport } from '$lib/viewport.svelte';
  import { plural } from '$lib/words';
  import { cardStatus, fmtUsd } from '../project-detail';
  import type { ProjectPageModel } from '../project-page-model.svelte';
  import { fmtTarget, formatAsOf, HEALTH_LABEL, milestoneDate, STATE_LABEL } from '../project-rollup';
  import ProjectDialog from './ProjectDialog.svelte';
  import './project-body.css';
  import SkeletonRows from '$lib/components/parts/SkeletonRows.svelte';
  import LoadFailed from '$lib/components/parts/LoadFailed.svelte';
  import { couldNotLoad } from '$lib/loading';

  let { model, compact = false, ondeleted, onchanged }: {
    model: ProjectPageModel;
    compact?: boolean;
    ondeleted: () => void;
    onchanged?: () => void;
  } = $props();

  const p = $derived(model.project);
  const health = $derived(model.health);
  const H = $derived(compact ? 'h3' : 'h2');
  const now = new Date();

  let editOpen = $state(false);
  let deleteOpen = $state(false);

  // Milestone add / edit, inline.
  let msName = $state('');
  let msDate = $state('');
  let msError = $state<string | null>(null);
  let msBusy = $state(false);
  let editingMs = $state<string | null>(null);
  let editName = $state('');
  let editDate = $state('');

  const STATUS_WORD = { reached: 'Reached', open: 'Open', overdue: 'Overdue' } as const;
  function msLine(m: Milestone): string {
    const n = model.cardsIn(m).length;
    const date = m.targetDate ? milestoneDate(m.targetDate) : 'No date';
    return `${date} · ${STATUS_WORD[model.statusOf(m)]} · ${plural(n, 'card', 'cards')}`;
  }
  const reached = $derived(model.milestones.filter((m) => model.statusOf(m) === 'reached').length);
  const overdue = $derived(model.milestones.filter((m) => model.statusOf(m) === 'overdue').length);
  const msMeta = $derived(`${reached} of ${model.milestones.length} reached${overdue > 0 ? ` · ${overdue} overdue` : ''}`);

  async function addMs(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    if (msName.trim() === '' || msBusy) return;
    msBusy = true;
    msError = await model.addMilestone(msName, msDate);
    msBusy = false;
    if (!msError) { msName = ''; msDate = ''; }
  }
  function startEdit(m: Milestone): void { editingMs = m.id; editName = m.name; editDate = m.targetDate?.slice(0, 10) ?? ''; msError = null; }
  async function saveEdit(e: SubmitEvent, m: Milestone): Promise<void> {
    e.preventDefault();
    if (editName.trim() === '') return;
    msError = await model.editMilestone(m, editName, editDate);
    if (!msError) editingMs = null;
  }
  async function remove(): Promise<void> {
    if (await model.remove()) { deleteOpen = false; ondeleted(); }
  }
  const openCards = $derived(model.cards.filter((c) => c.card.state !== 'completed').length);
</script>

{#if p}
<div class="pjb" class:pjb--compact={compact}>
  <div class="pjb-main">
    <section class="pjb-head" aria-label="About this project">
      {#if !compact}<svelte:element this={viewport.phone ? 'h2' : 'h1'} class="pjb-title">{p.name}</svelte:element>{/if}
      <div class="pjb-chips">
        <span class="pjb-chip">{STATE_LABEL[p.state]}</span>
        <span class="pjb-chip pjb-chip--line" data-health={p.health ?? 'none'}>declared {p.health ? HEALTH_LABEL[p.health] : 'not set'}</span>
        {#if health}<span class="pjb-chip pjb-chip--line" data-health={health.health}>computed {HEALTH_LABEL[health.health]}{health.health === 'on-track' ? '' : `: ${health.reason}`}</span>{/if}
        <span class="pjb-meta">{fmtTarget(p.targetDate)}</span>
      </div>
      {#if p.description}<p class="pjb-goal">{p.description}</p>{/if}
      <div class="pjb-roll">
        {#if model.rollupError}
          <p class="pjb-meta">Roll-up unavailable — {model.rollupError}</p>
        {:else if model.rollup}
          <p class="pjb-figs"><strong>{model.rollup.cardsDone}/{model.rollup.cardsTotal}</strong> cards done · <strong>{fmtUsd(model.rollup.costUsd)}</strong></p>
          <p class="pjb-meta">{formatAsOf(model.rollup)} · a snapshot</p>
        {:else}
          <SkeletonRows label="Loading the roll-up…" rows={2} />
        {/if}
        <Button variant="secondary" size="sm" busy={model.rollupBusy} onclick={() => void model.refreshRollup()}>Refresh</Button>
      </div>
      {#if model.boards.length > 0}
        <p class="pjb-boards"><span class="pjb-meta">Cards on</span>{#each model.boards as b (b.id)}<a class="pjb-chip pjb-chip--board" href="/b/{b.id}">{b.name}</a>{/each}</p>
      {/if}
    </section>

    <section class="pjb-sec" aria-labelledby="pjb-blockers">
      <div class="pjb-sech"><svelte:element this={H} id="pjb-blockers">Blockers</svelte:element><span class="pjb-meta">{model.cardsPending ? '–' : model.blockers.length === 0 ? 'none' : model.blockers.length}</span></div>
      {#if model.cardsPending}
        <SkeletonRows label="Loading the blockers…" rows={1} />
      {:else if model.blockers.length === 0}
        <p class="pjb-meta">Nothing is stopped: no card waits on a person or on another card.</p>
      {:else}
        <ul class="pjb-list">
          {#each model.blockers as b (b.cardId)}
            <li class="pjb-blocker" data-kind={b.kind}>
              <p class="pjb-ctitle">{b.title}</p>
              <p class="pjb-meta"><span class="pjb-chip pjb-chip--board">{b.boardName}</span> · {b.agent ?? 'Unclaimed'} · for {b.age}</p>
              <p>{b.kind === 'waiting' ? 'Stopped, waiting on' : 'Blocked by'} <strong>{b.on}</strong></p>
              {#if b.detail}<p class="pjb-meta">“{b.detail}”</p>{/if}
              <a class="pjb-link" href="/b/{b.boardId}/c/{b.cardId}">Open card<span class="vk-visually-hidden">: {b.title}</span></a>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section class="pjb-sec" aria-labelledby="pjb-ms">
      <div class="pjb-sech"><svelte:element this={H} id="pjb-ms">Milestones</svelte:element><span class="pjb-meta">{model.milestones.length === 0 ? 'none yet' : msMeta}</span></div>
      {#if model.milestones.length > 0}
        <ol class="pjb-timeline">
          {#each model.milestones as m (m.id)}
            {@const st = model.statusOf(m)}
            <li class="pjb-mstone" data-status={st}>
              {#if editingMs === m.id}
                <form class="pjb-msform" aria-label="Edit milestone {m.name}" onsubmit={(e) => void saveEdit(e, m)}>
                  <label class="pjb-field"><span>Milestone</span><input class="vk-field__input" bind:value={editName} /></label>
                  <label class="pjb-field"><span>Date</span><input class="vk-field__input" type="date" bind:value={editDate} /></label>
                  <Button type="submit" variant="secondary" size="sm">Save</Button>
                  <Button variant="text" size="sm" onclick={() => (editingMs = null)}>Cancel</Button>
                </form>
              {:else}
                <span class="pjb-dot" aria-hidden="true"></span>
                <div class="pjb-msbody">
                  <p class="pjb-ctitle">{m.name}</p>
                  <p class="pjb-meta">{msLine(m)}</p>
                </div>
                <span class="pjb-chip pjb-chip--line" data-status={st}>{STATUS_WORD[st]}</span>
                <span class="pjb-msacts">
                  <Button variant="text" size="sm" aria-label="Edit milestone {m.name}" onclick={() => startEdit(m)}>Edit</Button>
                  <Button variant="text" size="sm" aria-label="Remove milestone {m.name}" onclick={() => void model.removeMilestone(m).then((e) => (msError = e))}>Remove</Button>
                </span>
              {/if}
            </li>
          {/each}
        </ol>
      {/if}
      <form class="pjb-msform" aria-label="Add a milestone" onsubmit={(e) => void addMs(e)}>
        <label class="pjb-field"><span>New milestone</span><input class="vk-field__input" bind:value={msName} /></label>
        <label class="pjb-field"><span>Date</span><input class="vk-field__input" type="date" bind:value={msDate} /></label>
        <Button type="submit" variant="secondary" size="sm" busy={msBusy}>Add</Button>
      </form>
      {#if msError}<p class="pjb-meta" role="alert">{msError}</p>{/if}
    </section>

    {#if compact}
      <section class="pjb-sec" aria-label="The rest of the project">
        <p><strong>Cards</strong> <span class="pjb-meta">{#if model.cardsPending}–{:else}{model.cards.length} · {model.doneCount} done{/if}{#each model.groups as g (g.boardId)} · {g.boardName} {g.total}{/each}</span></p>
        {#if model.activity[0]}<p><strong>Activity</strong> <span class="pjb-meta">latest {whenLabel(model.activity[0].ts, now)} · {eventLabel(model.activity[0].event, model.activity[0].stages)}</span></p>{/if}
        <p><strong>Agents and spend</strong> <span class="pjb-meta">{model.cardsPending ? '–' : `${model.agents.map((a) => a.name).join(', ') || 'no agent yet'} · ${fmtUsd(model.spend.reduce((n, s) => n + s.costUsd, 0))}`}</span></p>
      </section>
    {:else}
      <section class="pjb-sec" aria-labelledby="pjb-cards">
        <div class="pjb-sech"><h2 id="pjb-cards">Cards</h2><span class="pjb-meta">{model.cardsPending ? '–' : `${model.cards.length} on ${plural(model.groups.length, 'board', 'boards')} · ${model.doneCount} done`}</span></div>
        {#if model.cardsPending}
          <SkeletonRows label="Loading the project's cards…" rows={3} rowHeight={44} />
        {:else if model.cards.length === 0}
          <p class="pjb-meta">No cards yet. Choose this project on a card, or in the New card dialog.</p>
        {/if}
        {#each model.groups as g (g.boardId)}
          <div class="pjb-board">
            <h3 class="pjb-bname">{g.boardName} <span class="pjb-meta">{plural(g.total, 'card', 'cards')} · {g.done} done · {fmtUsd(g.costUsd)}</span> <a class="pjb-link" href="/b/{g.boardId}">Open the board<span class="vk-visually-hidden">: {g.boardName}</span></a></h3>
            <table class="pjb-table">
              <thead><tr><th scope="col">Card</th><th scope="col">Stage</th><th scope="col">Agent</th><th scope="col">Status</th></tr></thead>
              <tbody>
                {#each g.stages as s (s.stage)}
                  {#each s.cards as c (c.card.id)}
                    <tr>
                      <td><a href="/b/{c.boardId}/c/{c.card.id}">{c.card.title}</a></td>
                      <td>{c.stageName}</td>
                      <td>{c.card.lastAgentId ? model.agentName(c.card.lastAgentId) : 'Unclaimed'}</td>
                      <td>{cardStatus(c.card)}</td>
                    </tr>
                  {/each}
                {/each}
              </tbody>
            </table>
          </div>
        {/each}
      </section>

      <section class="pjb-sec" aria-labelledby="pjb-act">
        <div class="pjb-sech"><h2 id="pjb-act">Activity</h2><span class="pjb-meta">your local time</span></div>
        {#if model.activityPending}
          <SkeletonRows label="Loading the activity…" rows={3} />
        {:else if model.activity.length === 0}
          <p class="pjb-meta">Nothing has happened on this project’s cards yet.</p>
        {:else}
          <ul class="pjb-list">
            {#each model.activity as a (a.key)}
              <li class="pjb-act"><span>{eventLabel(a.event, a.stages)} · <a href="/b/{a.boardId}/c/{a.cardId}">{a.cardTitle}</a></span><span class="pjb-meta"><time datetime={a.ts}>{whenLabel(a.ts, now)}</time> · {a.boardName}</span></li>
            {/each}
          </ul>
        {/if}
      </section>
    {/if}
  </div>

  {#if !compact}
    <aside class="pjb-aside" aria-label="Project facts">
      <section class="pjb-sec" aria-labelledby="pjb-agents">
        <div class="pjb-sech"><h2 id="pjb-agents">Agents on it</h2></div>
        {#if model.cardsPending}<SkeletonRows label="Loading the agents…" rows={2} />{:else if model.agents.length === 0}<p class="pjb-meta">No agent has worked a card here yet.</p>{/if}
        <ul class="pjb-list">{#each model.agents as a (a.name)}<li>{a.name} <span class="pjb-meta">· {plural(a.cards, 'card', 'cards')}</span></li>{/each}</ul>
      </section>
      <section class="pjb-sec" aria-labelledby="pjb-spend">
        <div class="pjb-sech"><h2 id="pjb-spend">Spend by board</h2></div>
        {#if model.cardsPending}<SkeletonRows label="Loading the spend…" rows={2} />{:else if model.spend.length === 0}<p class="pjb-meta">Nothing spent yet.</p>{/if}
        <ul class="pjb-list">{#each model.spend as s (s.boardId)}<li>{s.boardName} <span class="pjb-meta">· {fmtUsd(s.costUsd)}</span></li>{/each}</ul>
      </section>
      <section class="pjb-sec" aria-labelledby="pjb-actions">
        <div class="pjb-sech"><h2 id="pjb-actions">Actions</h2></div>
        {@render projectActions()}
        <p class="pjb-meta">Completing keeps the project and its cards{openCards > 0 ? `; ${plural(openCards, 'card is', 'cards are')} still open` : ''}. Deleting asks first and leaves the cards on their boards, without a project.</p>
      </section>
    </aside>
  {:else}
    <div class="pjb-foot">{@render projectActions()}</div>
  {/if}
</div>

{#snippet projectActions()}
  <div class="pjb-actions">
    <Button variant="secondary" onclick={() => (editOpen = true)}>Edit project</Button>
    {#if p.state !== 'completed'}<Button variant="secondary" busy={model.busy} onclick={() => void model.complete().then(() => onchanged?.())}>Complete project</Button>{/if}
    <Button variant="danger" onclick={() => (deleteOpen = true)}>Delete project…</Button>
  </div>
  {#if model.error}<p class="pjb-meta" role="alert">{model.error}</p>{/if}
{/snippet}

<ProjectDialog bind:open={editOpen} project={p} onsaved={() => { void model.reload(); onchanged?.(); }} onclose={() => {}} />
<Dialog bind:open={deleteOpen} role="alertdialog" title="Delete “{p.name}”?" size="sm" onclose={() => (deleteOpen = false)}>
  <p>Its cards stay on their boards but will no longer show this project. Its milestones are deleted with it.</p>
  {#snippet actions()}
    <Button variant="secondary" data-autofocus onclick={() => (deleteOpen = false)}>Cancel</Button>
    <Button variant="danger" busy={model.busy} onclick={() => void remove()}>Delete the project</Button>
  {/snippet}
</Dialog>
{:else if model.notFound}
  <p class="pjb-meta" role="alert">This project no longer exists. It may have been deleted.</p>
{:else if model.loadFailed}
  <LoadFailed message={couldNotLoad('this project')} onRetry={() => model.load()} home />
{:else if model.error}
  <p class="pjb-meta" role="alert">{model.error}</p>
{:else}
  <SkeletonRows label="Loading the project…" rows={4} rowHeight={52} />
{/if}
