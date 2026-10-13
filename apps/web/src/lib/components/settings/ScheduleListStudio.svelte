<!-- apps/web/src/lib/components/settings/ScheduleListStudio.svelte -->
<script lang="ts">
  import { untrack } from 'svelte';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import type { Stage } from '$lib/api';
  import { formatFireTime } from '$lib/components/board/schedule-format';
  import { ScheduleModel } from '$lib/components/board/schedule-model.svelte';

  let { boardId, stages }: { boardId: string; stages: Stage[] } = $props();
  const model = new ScheduleModel(untrack(() => boardId));
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void model.load();
</script>

{#if model.schedules.length === 0}
  <p class="st-empty">No recurring cards on this board yet. Each one you add lists its cadence, time zone, target stage, next and last run, and who set it up, with Pause and Remove.</p>
{:else}
  <table class="ar-tbl">
    <caption class="sr">Recurring cards</caption>
    <thead><tr><th scope="col">Card</th><th scope="col">Cadence</th><th scope="col">Next · last</th><th scope="col"><span class="sr">Actions</span></th></tr></thead>
    <tbody>
      {#each model.schedules as s (s.id)}
        <tr>
          <td>{s.title}<p class="ar-hint">{stages.find((x) => x.key === s.stageKey)?.name ?? 'first stage'}{s.createdBy ? ` · set up by ${s.createdBy}` : ''}</p></td>
          <td class="m">{s.rule} · {s.timezone}</td>
          <td class="m">{formatFireTime(s.nextFireAt, s.timezone)} · {formatFireTime(s.lastFiredAt, s.timezone)}</td>
          <td><button class="ar-btn2" type="button" aria-disabled={model.busy === s.id ? 'true' : undefined} onclick={() => void model.toggle(s)}>{s.enabled ? 'Pause' : 'Resume'}</button> <button class="ar-btn2 btn-destructive" type="button" aria-disabled={model.busy === s.id ? 'true' : undefined} onclick={() => void model.remove(s)}>Remove</button></td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
<form class="st-grid" aria-label="Add a recurring card" onsubmit={(e) => { e.preventDefault(); void model.add(); }}>
  <div class="ar-field full"><label for="sc-t">Card title</label><input class="ar-in" id="sc-t" placeholder="e.g. Weekly dependency check" bind:value={model.title} /></div>
  <div class="ar-field"><label for="sc-r">Cadence</label><input class="ar-in" id="sc-r" placeholder="daily at 09:00" bind:value={model.rule} /></div>
  <div class="ar-field"><label for="sc-z">Time zone</label><input class="ar-in" id="sc-z" placeholder="e.g. Asia/Kolkata" bind:value={model.timezone} /></div>
  <div class="ar-field"><label for="sc-s">Opens in stage</label><select class="ar-sel" id="sc-s" bind:value={model.stageKey}><option value="">First stage ({stages[0]?.name ?? '—'})</option>{#each stages.slice(1) as st (st.key)}<option value={st.key}>{st.name}</option>{/each}</select></div>
  <div class="ar-field"><label for="sc-p">Priority</label><input class="ar-in" id="sc-p" type="number" placeholder="e.g. 2" min="1" bind:value={model.priority} /></div>
  <div class="ar-field full"><label for="sc-o">If the previous card is still open</label><select class="ar-sel" id="sc-o" bind:value={model.overlap}><option value="skip">Skip this one</option><option value="allow">Open another anyway</option></select></div>
  <details class="full st-how">
    <summary class="ar-lk quiet"><LineIcon name="info" size={16} />How to write a cadence</summary>
    <p class="ar-hint">every 30 minutes · every 2 hours · every 3 days · daily at 09:00 · weekly on mon at 09:00 · monthly on 1 at 09:00 (day 1–28). Schedules are checked every five minutes, so a card may open up to five minutes late.</p>
  </details>
  {#if model.formError}<p class="ar-hint full" role="alert">{model.formError}</p>{/if}
  <div class="full"><button class="ar-btn2" type="submit" aria-disabled={model.busy === 'add' ? 'true' : undefined}><LineIcon name="plus" size={16} />Add schedule</button></div>
</form>
