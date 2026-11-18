<!-- apps/web/src/lib/components/settings/SchedulesTable.svelte -->
<script lang="ts">
  /**
   * A board's schedules (cards that open themselves on a cadence) as one table: the card and where it
   * opens, its cadence and time zone, next and last run, Pause and Remove. New schedule, the section's
   * one action, opens the form under the header.
   */
  import { Button, DataTable, SectionHeader, type Column } from '@superjackfruitlabs/vibekit-ui';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import SkeletonRows from '$lib/components/parts/SkeletonRows.svelte';
  import type { Schedule, Stage } from '$lib/api';
  import { formatFireTime } from '$lib/components/board/schedule-format';
  import type { ScheduleModel } from '$lib/components/board/schedule-model.svelte';

  let { model, stages, n }: { model: ScheduleModel; stages: Stage[]; n: number } = $props();
  let adding = $state(false);
  const stageName = (s: Schedule) => stages.find((x) => x.key === s.stageKey)?.name ?? 'first stage';
  async function add(): Promise<void> {
    await model.add();
    if (!model.formError) adding = false;
  }

  const columns: Column<Schedule>[] = [
    { key: 'title', label: 'Card', cell: title },
    { key: 'rule', label: 'Cadence', cell: cadence },
    { key: 'when', label: 'Next · last', cell: when },
    { key: 'actions', label: 'Actions', align: 'end', cell: actions },
  ];
</script>

{#snippet title(s: Schedule)}
  <span class="set-row-title">{s.title}</span>
  <p class="set-sub">Opens in {stageName(s)}{s.createdBy ? ` · set up by ${s.createdBy}` : ''}{s.skipCount > 0 ? ` · skipped ${s.skipCount} ${s.skipCount === 1 ? 'time' : 'times'}, the previous card still open` : ''}</p>
{/snippet}
{#snippet cadence(s: Schedule)}<span class="set-cadence">{s.rule} · {s.timezone}</span>{/snippet}
{#snippet when(s: Schedule)}<span class="set-cadence">{formatFireTime(s.nextFireAt, s.timezone)} · {formatFireTime(s.lastFiredAt, s.timezone)}</span>{/snippet}
{#snippet actions(s: Schedule)}
  <span class="set-acts">
    <Button variant="quiet" type="button" busy={model.busy === s.id} onclick={() => void model.toggle(s)}>{s.enabled ? 'Pause' : 'Resume'}</Button>
    <Button variant="quiet" type="button" busy={model.busy === s.id} onclick={() => void model.remove(s)}>Remove</Button>
  </span>
{/snippet}
{#snippet empty()}<p class="set-empty">No recurring cards on this board yet. Each one you add lists its cadence, time zone, target stage, next and last run, and who set it up, with Pause and Remove.</p>{/snippet}
{#snippet newSchedule()}<Button variant="secondary" type="button" aria-expanded={adding} onclick={() => (adding = !adding)}>New schedule</Button>{/snippet}

<section class="set-sec">
  <SectionHeader {n} title="Schedules" meta="Cards that open themselves on a cadence." action={newSchedule} />
  {#if adding}
    <form class="formgrid" aria-label="Add a recurring card" onsubmit={(e) => { e.preventDefault(); void add(); }}>
      <div class="field full"><label for="sc-t">Card title</label><input class="input" id="sc-t" placeholder="e.g. Weekly dependency check" bind:value={model.title} /></div>
      <div class="field"><label for="sc-r">Cadence</label><input class="input" id="sc-r" placeholder="daily at 09:00" bind:value={model.rule} /></div>
      <div class="field"><label for="sc-z">Time zone</label><input class="input" id="sc-z" placeholder="e.g. Asia/Kolkata" bind:value={model.timezone} /></div>
      <div class="field">
        <label for="sc-s">Opens in stage</label>
        <select class="input" id="sc-s" bind:value={model.stageKey}>
          <option value="">First stage ({stages[0]?.name ?? '—'})</option>
          {#each stages.slice(1) as st (st.key)}<option value={st.key}>{st.name}</option>{/each}
        </select>
      </div>
      <div class="field"><label for="sc-p">Priority</label><input class="input" id="sc-p" type="number" placeholder="e.g. 2" min="1" bind:value={model.priority} /></div>
      <div class="field full">
        <label for="sc-o">If the previous card is still open</label>
        <select class="input" id="sc-o" bind:value={model.overlap}><option value="skip">Skip this one</option><option value="allow">Open another anyway</option></select>
      </div>
      <details class="full">
        <summary class="t-meta set-how"><LineIcon name="info" size={16} />How to write a cadence</summary>
        <p class="t-meta">every 30 minutes · every 2 hours · every 3 days · daily at 09:00 · weekly on mon at 09:00 · monthly on 1 at 09:00 (day 1–28). Schedules are checked every five minutes, so a card may open up to five minutes late.</p>
      </details>
      {#if model.formError}<p class="set-error full" role="alert">{model.formError}</p>{/if}
      <div class="full set-acts"><Button variant="secondary" type="submit" busy={model.busy === 'add'}>Add schedule</Button><Button variant="quiet" type="button" onclick={() => (adding = false)}>Cancel</Button></div>
    </form>
  {/if}
  {#if !model.loaded}
    <SkeletonRows label="Loading schedules…" rows={2} rowHeight={56} />
  {:else}
    <DataTable label="Recurring cards" {columns} rows={model.schedules} rowKey={(s) => s.id} {empty} />
  {/if}
</section>
