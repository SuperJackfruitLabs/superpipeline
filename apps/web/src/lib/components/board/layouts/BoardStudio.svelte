<script lang="ts">
  /** Studio: the board as a dense table, one row per card, under a readout and a row of numbers (spec §5.1). */
  import { onMount } from 'svelte';
  import { StageTrack, greeting } from '@superjackfruit/vibekit';
  import { app } from '$lib/stores/app.svelte';
  import AgentFace from '$lib/components/AgentFace.svelte';
  import { ageLabel } from '$lib/age';
  import { FACE_VARIANT } from '$lib/layouts';
  import CardFacts from '../CardFacts.svelte';
  import CardMoveMenu from '../CardMoveMenu.svelte';
  import StageList from '../StageList.svelte';
  import { groupByUrgency, type CardSummary, type Urgency } from '../card-summary';
  import { cardKeys, openLabel } from '../open-label';
  import type { BoardLayoutProps } from './types';

  let { summaries, stages: stageSummaries, phase, vibe, boardName }: BoardLayoutProps = $props();

  type Filter = 'all' | 'needs' | 'working' | 'idle' | 'done';
  // Idle is a card nobody is working on yet (queued); Done takes the finished and the closed.
  const FILTERS: Array<{ key: Filter; label: string; has: (u: Urgency) => boolean }> = [
    { key: 'all', label: 'All', has: () => true },
    { key: 'needs', label: 'Needs', has: (u) => u === 'needs' },
    { key: 'working', label: 'Working', has: (u) => u === 'working' },
    { key: 'idle', label: 'Idle', has: (u) => u === 'queued' },
    { key: 'done', label: 'Done', has: (u) => u === 'done' || u === 'closed' },
  ];
  let filter = $state<Filter>('all');
  const count = (f: (typeof FILTERS)[number]) => summaries.filter((s) => f.has(s.urgency)).length;
  const shown = $derived.by(() => {
    const keep = FILTERS.find((f) => f.key === filter)!;
    return groupByUrgency(summaries).flatMap((g) => g.cards).filter((s) => keep.has(s.urgency));
  });

  const stages = $derived([...(app.board?.stages ?? [])].sort((a, b) => a.order - b.order));
  const trackNames = $derived(stageSummaries.map((s) => s.name));
  const faceVariant = $derived(FACE_VARIANT[vibe]);
  const usd = (n: number) => `$${n.toFixed(2)}`;

  const metrics = $derived([
    { label: 'cards', value: String(summaries.length) },
    { label: 'needs you', value: String(summaries.filter((s) => s.urgency === 'needs').length) },
    { label: 'working', value: String(summaries.filter((s) => s.urgency === 'working').length) },
    { label: 'spend', value: usd(app.board?.usage.totalCostUsd ?? 0) },
    { label: 'over budget', value: String(summaries.filter((s) => s.overBudget).length) },
    { label: 'overdue', value: String(summaries.filter((s) => s.overdue).length) },
  ]);

  let now = $state(new Date());
  onMount(() => {
    const t = setInterval(() => (now = new Date()), 30_000);
    return () => clearInterval(t);
  });
  const clock = $derived(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);

  const STATUS: Record<Urgency, { word: string; mood: 'needs' | 'working' | 'resting' | 'done' }> = {
    needs: { word: 'Needs you', mood: 'needs' },
    working: { word: 'Working', mood: 'working' },
    queued: { word: 'Idle', mood: 'resting' },
    done: { word: 'Done', mood: 'done' },
    closed: { word: 'Closed', mood: 'done' },
  };

  let menus = $state<Record<string, boolean>>({});
  let movers = $state<Record<string, ReturnType<typeof CardMoveMenu> | undefined>>({});
  const keys = (e: KeyboardEvent, s: CardSummary) =>
    cardKeys(e, { open: () => app.openCard(s.id), toggleMove: () => (menus[s.id] = !(menus[s.id] ?? false)), step: (d) => movers[s.id]?.step(d) });
</script>

<div class="studio-board mx-auto max-w-[1400px] px-4 py-4">
  <header class="border-border flex flex-wrap items-center gap-x-4 gap-y-2 border-b pb-3">
    <h1 class="text-xl font-semibold">{boardName}</h1>
    <span class="eyebrow border-border rounded-[var(--vk-radius-sm)] border px-2 py-0.5">SUPERPIPELINE</span>
    <div class="flex flex-wrap gap-1" role="group" aria-label="Quick filter">
      {#each FILTERS as f (f.key)}
        <button type="button" class="tap border-border rounded-[var(--vk-radius-sm)] border px-3 text-sm {filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-surface'}" aria-pressed={filter === f.key} onclick={() => (filter = f.key)}>{f.label} <span class="font-mono">{count(f)}</span></button>
      {/each}
    </div>
    <p class="font-mono ml-auto text-sm">{clock} {greeting(phase, 'studio')}</p>
  </header>

  <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" role="group" aria-label="Board numbers">
    {#each metrics as m (m.label)}
      <p class="bg-surface border-border rounded-[var(--vk-radius-sm)] border px-3 py-2"><span class="font-mono block text-lg font-semibold">{m.value}</span><span class="eyebrow">{m.label}</span></p>
    {/each}
  </div>

  <div class="mt-3"><StageList stages={stageSummaries} variant="strip" /></div>

  <table class="studio-table mt-4 w-full text-left text-sm">
    <caption class="sr-only">Cards</caption>
    <!-- Visible from 768px up: without it the columns are bare numbers. On the phone each stacked
         cell carries its own data-label, so the row is visually hidden there (never removed). -->
    <thead class="border-border border-b max-md:sr-only">
      <tr>{#each ['Status', 'Card', 'Agent', 'Stage', 'Attempts', 'Age', 'Next', 'Cost', 'Due', 'Move'] as h (h)}<th scope="col" class="eyebrow text-muted-foreground py-1.5 pr-3 font-normal">{h}</th>{/each}</tr>
    </thead>
    <tbody>
      {#each shown as s (s.id)}
        {@const st = STATUS[s.urgency]}
        <tr class="border-border border-b align-top {s.urgency === 'needs' ? 'bg-signal-wash' : ''}">
          <td data-label="Status" class="py-2 pr-3 whitespace-nowrap">
            <span class="status-led inline-block size-2.5 rounded-full align-middle" data-mood={st.mood} data-blink={st.mood === 'needs'} aria-hidden="true"></span>
            <span class="eyebrow ml-1">{st.word}</span>
          </td>
          <td data-label="Card" class="min-w-0 py-2 pr-3">
            <button type="button" class="hit text-left font-semibold hover:underline" aria-label={openLabel(s)} data-card-open={s.id} onclick={() => app.openCard(s.id)} onkeydown={(e) => keys(e, s)}>{s.title}</button>
            {#if s.archived}<span class="eyebrow ml-1">archived</span>{/if}
            <CardFacts {s} tone="chips" />
          </td>
          <td data-label="Agent" class="py-2 pr-3">
            {#if s.delegate}<AgentFace agentId={s.delegate.id} name={s.delegate.name} iconUrl={s.delegate.iconUrl} mood={s.mood} size={20} variant={faceVariant} withName />{:else}<span class="text-muted-foreground">nobody</span>{/if}
          </td>
          <td data-label="Stage" class="py-2 pr-3">
            <StageTrack stages={trackNames} current={s.stageIndex} stopped={s.urgency === 'needs'} label="Stage of {s.title}" />
          </td>
          <td data-label="Attempts" class="font-mono py-2 pr-3"><span class={s.attemptCount >= 2 ? 'text-signal-text font-semibold' : ''}>{s.attemptCount}</span></td>
          <td data-label="Age" class="font-mono py-2 pr-3">{ageLabel(s.ageHours) ?? '—'}</td>
          <td data-label="Next" class="py-2 pr-3">
            {#if s.attention}{s.attention.instruction}{:else}auto · {s.state}{/if}
            {#if s.questionFrom}
              <button type="button" class="vk-button vk-button--signal ml-1" onclick={() => app.openCard(s.id)}>⚑ Answer {s.questionFrom}</button>
            {:else if s.gatePending}
              <button type="button" class="vk-button vk-button--signal ml-1" onclick={() => app.openCard(s.id)}>⚑ Review</button>
            {/if}
          </td>
          <td data-label="Cost" class="font-mono py-2 pr-3"><span class={s.overBudget ? 'text-signal-text' : ''}>{s.cost > 0 ? usd(s.cost) : '—'}</span></td>
          <td data-label="Due" class="font-mono py-2 pr-3"><span class={s.overdue ? 'text-signal-text' : ''}>{s.dueAt ? `${s.overdue ? '⚠ ' : ''}${s.dueAt.slice(0, 10)}` : '—'}</span></td>
          <td data-label="Move" class="relative min-h-11 min-w-11 py-2">
            <CardMoveMenu card={s.card} {stages} visible bind:open={() => menus[s.id] ?? false, (v) => (menus[s.id] = v)} bind:this={movers[s.id]} />
          </td>
        </tr>
      {:else}
        <tr><td colspan="10" class="text-muted-foreground py-6">No cards here.</td></tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  /* Phone: each row stacks, each cell carries its own label, and the header stays, visually hidden. */
  @media (max-width: 767px) {
    .studio-table, .studio-table :global(tbody), .studio-table :global(tr), .studio-table :global(td) { display: block; }
    .studio-table :global(tr) { position: relative; padding: var(--vk-space-2) 0; }
    .studio-table :global(td) { padding: var(--vk-space-1) 0; }
    .studio-table :global(td[data-label])::before {
      content: attr(data-label);
      display: block;
      font-size: 0.6875rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--vk-color-muted);
    }
    .studio-table :global(td[data-label='Move'])::before { content: none; }
    .studio-table :global(td[data-label='Move']) { position: absolute; top: 0; right: 0; }
  }
</style>
