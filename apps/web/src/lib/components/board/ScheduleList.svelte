<!-- apps/web/src/lib/components/board/ScheduleList.svelte -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { Button } from '@superjackfruit/vibekit';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import type { Stage } from '$lib/api';
  import { formatFireTime } from './schedule-format';
  import { ScheduleModel } from './schedule-model.svelte';

  let { boardId, stages }: { boardId: string; stages: Stage[] } = $props();
  const model = new ScheduleModel(untrack(() => boardId));
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void model.load();
</script>

{#snippet ic_plus_16()}<LineIcon name="plus" size={16} />{/snippet}

<div class="panel-body" style="display: flex; flex-direction: column; gap: var(--vk-space-4);">
  {#if model.schedules.length === 0}
    <p class="empty">No recurring cards on this board yet. Each one you add lists its cadence, time zone, target stage, next and last run, and who set it up, with Pause and Remove.</p>
  {:else}
    <ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--vk-space-3);">
      {#each model.schedules as s (s.id)}
        <li style="display: flex; flex-wrap: wrap; align-items: center; gap: var(--vk-space-2);">
          <div style="flex: 1 1 240px; min-width: 0;">
            <p class="t-h3">{s.title}</p>
            <p class="t-meta">{s.rule} · {s.timezone} · {stages.find((x) => x.key === s.stageKey)?.name ?? 'first stage'} · next {formatFireTime(s.nextFireAt, s.timezone)} · last {formatFireTime(s.lastFiredAt, s.timezone)}{s.createdBy ? ` · set up by ${s.createdBy}` : ''}</p>
            {#if s.skipCount > 0}<p class="t-meta">Skipped {s.skipCount} {s.skipCount === 1 ? 'time' : 'times'} — the previous card was still open when it came due.</p>{/if}
          </div>
          <Button variant="secondary" class="btn-sm"  type="button" aria-disabled={model.busy === s.id ? 'true' : undefined} onclick={() => void model.toggle(s)}>{s.enabled ? 'Pause' : 'Resume'}</Button>
          <Button variant="danger" class="btn-sm"  type="button" aria-disabled={model.busy === s.id ? 'true' : undefined} onclick={() => void model.remove(s)}>Remove</Button>
        </li>
      {/each}
    </ul>
  {/if}
  <form class="formgrid" aria-label="Add a recurring card" onsubmit={(e) => { e.preventDefault(); void model.add(); }}>
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
      <summary class="t-meta" style="min-height: 44px; display: flex; align-items: center; gap: 6px; text-decoration: underline;"><LineIcon name="info" size={16} />How to write a cadence</summary>
      <p class="t-meta">every 30 minutes · every 2 hours · every 3 days · daily at 09:00 · weekly on mon at 09:00 · monthly on 1 at 09:00 (day 1–28). Schedules are checked every five minutes, so a card may open up to five minutes late.</p>
    </details>
    {#if model.formError}<p class="hint full" role="alert" style="color: var(--vk-color-signal-text);">{model.formError}</p>{/if}
    <div class="full"><Button variant="secondary" class="btn-sm"  type="submit" aria-disabled={model.busy === 'add' ? 'true' : undefined} icon={ic_plus_16}>Add schedule</Button></div>
  </form>
</div>
