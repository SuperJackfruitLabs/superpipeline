<!-- apps/web/src/lib/components/board/layouts/BoardStudioPhone.svelte -->
<script lang="ts">
  /** SP-Phone-Board-Studio: hero, quick filter, figures, 01 where the cards are, 02 the rows, 03 the stages. The shell owns the main and PhoneHeader the h1, so the hero says its line in an h2. */
  import '../studio/pb-phone.css';
  import { Button, greeting } from '@superjackfruit/vibekit';
  import type { BoardLayoutProps } from './types';
  import StudioCardPhone from '../studio/StudioCardPhone.svelte';
  import { daysOverdue } from '../board-words';
  import { needsCounts, phoneLede, rowIndex, smAria, stagesSummaryRight, studioFigs, studioStageO, wantsOrder } from '../phone/phone-words';
  import { clockHM } from '$lib/when';
  import { app } from '$lib/stores/app.svelte';

  let { model, phase }: BoardLayoutProps = $props();
  type Q = 'all' | 'needs' | 'working' | 'queued' | 'done';
  let filter = $state<Q>('all');
  let stagesOpen = $state(false);

  const rows = $derived(wantsOrder(model.ordered).map((s, i) => ({ s, i })));
  const shown = $derived(rows.filter(({ s }) => filter === 'all' || s.urgency === filter));
  const c = $derived(model.counts);
  const kick = $derived(`${clockHM((app.syncedAt ?? new Date()).toISOString())} · ${greeting(phase, 'studio').toLowerCase()}`);
  const noOwner = $derived(model.needs.filter((s) => s.kind === 'no-owner'));
  const overdueDays = $derived(noOwner.length === 1 && noOwner[0]!.overdue && noOwner[0]!.dueAt ? daysOverdue(noOwner[0]!.dueAt, model.nowMs) : 0);
  const lede = $derived(phoneLede({ stopped: needsCounts(model.ordered).stopped, noOwner: noOwner.length, daysOverdue: overdueDays, queuedBlocked: c.queuedBlocked, done: c.done }));
  const figs = $derived(studioFigs({ spend: model.spend7d ?? 0, overBudget: c.overBudget, overdue: c.overdue, stages: model.stages.length, blocked: c.blocked }));
  const QF: Array<{ key: Q; label: string; count: number; sig?: boolean }> = $derived([
    { key: 'all', label: 'All', count: c.all }, { key: 'needs', label: 'Needs', count: c.needs, sig: true },
    { key: 'working', label: 'Working', count: c.working }, { key: 'queued', label: 'Idle', count: c.queued }, { key: 'done', label: 'Done', count: c.done },
  ]);
</script>

<!-- `.ar` is the Annual-report root (annual.css tokens and base); the phone shell does not draw one around the page. -->
<div class="ar pb-main">
  <section aria-label="Board summary" style="display: flex; flex-direction: column; gap: 16px;">
    <div class="pb-hero">
      <span class="big" aria-hidden="true">{c.needs}</span>
      <div>
        <span class="kick" style="display: block; margin-bottom: 6px;">{kick}</span>
        {#if c.needs === 0}<h2>None of the {c.all} cards is waiting on a person</h2>
        {:else}<h2><span class="sr">{`${c.needs} `}</span>of {c.all} {c.all === 1 ? 'card' : 'cards'} {c.needs === 1 ? 'is' : 'are'} waiting on a person</h2>{/if}
      </div>
    </div>
    <p class="pb-lede">{lede}</p>
    <div class="pb-qf" role="group" aria-label="Quick filter">
      {#each QF as q (q.key)}<Button variant="text" pressed={filter === q.key} class={q.sig ? 'sig' : undefined} onclick={() => (filter = q.key)}>{q.label} <b>{q.count}</b></Button>{/each}
    </div>
    <div class="pb-figs">
      {#each figs as f (f.label)}<div class:sig={f.sig}><b class:z={f.z}>{f.value}{#if f.small}<small>{f.small}</small>{/if}</b><span>{f.label}</span></div>{/each}
    </div>
  </section>

  <section class="ar-sec" aria-labelledby="pb-sm-h">
    <div class="hd"><span class="no">01</span><h2 id="pb-sm-h">Where the cards are</h2><span class="r">1 square = 1 card</span></div>
    <div class="pb-sm">
      {#each model.stages as st, i (st.key)}
        <a class:z={st.count === 0} href="#stage-{i + 1}" aria-label={smAria(i + 1, st.name, st.count)}>
          <span class="band c{i + 1}"></span><span class="no">{rowIndex(i)}</span><span class="n" aria-hidden="true">{st.count}</span>
          <span class="units" aria-hidden="true">{#each st.units as u, k (k)}<span class="u {u}"></span>{/each}</span>
        </a>
      {/each}
    </div>
  </section>

  <section class="ar-sec" aria-labelledby="pb-c-h">
    <div class="hd"><span class="no">02</span><h2 id="pb-c-h">Cards, needs you first</h2><span class="r">{shown.length} {shown.length === 1 ? 'row' : 'rows'}</span></div>
    <span class="sr">Each row: status, card, agent, stage, attempts, age, next step, cost, due.</span>
    <div>
      {#each shown as { s, i } (s.id)}
        {@const firstInStage = rows.find((r) => r.s.stageKey === s.stageKey)?.s.id === s.id}
        <div id={firstInStage ? `stage-${s.stageIndex + 1}` : undefined} style="display: contents;"><StudioCardPhone {s} index={i} stages={model.stageDefs} /></div>
      {/each}
    </div>
  </section>

  <details class="pb-stages" bind:open={stagesOpen}>
    <summary><span class="no">03</span><h2>Stages · {model.stages.length}, who works each</h2><span class="r">{stagesSummaryRight(c.blocked, stagesOpen)}</span></summary>
    <ol>
      {#each model.stages as st, i (st.key)}
        {@const o = studioStageO(st, st.ownerShort)}
        <li><span class="chip c{i + 1}"></span><b>{i + 1} {st.name}</b><span class="c">{st.count}</span><span class="o">{#if o.gate}<span class="gate">GATE</span>{/if}{o.text}</span></li>
      {/each}
    </ol>
  </details>
</div>
