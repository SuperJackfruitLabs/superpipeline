<script lang="ts">
  /** Paper: the board as a front page. What waits on you is a letter; the rest is set below it (spec §5.1). */
  import { app } from '$lib/stores/app.svelte';
  import AgentFace from '$lib/components/AgentFace.svelte';
  import Words from '$lib/components/Words.svelte';
  import { ageLabel } from '$lib/age';
  import { LIGHT_WORDS, leadText } from '$lib/copy';
  import { FACE_VARIANT } from '$lib/layouts';
  import CardFacts from '../CardFacts.svelte';
  import CardMoveMenu from '../CardMoveMenu.svelte';
  import StageList from '../StageList.svelte';
  import { groupByUrgency, type CardSummary } from '../card-summary';
  import { cardKeys, openLabel } from '../open-label';
  import type { BoardLayoutProps } from './types';

  let { summaries, stages: stageSummaries, phase, vibe, boardName, cardCount, onCompose }: BoardLayoutProps = $props();

  const groups = $derived(groupByUrgency(summaries));
  const of = (u: string) => groups.find((g) => g.urgency === u)?.cards ?? [];
  const needs = $derived(of('needs'));
  const working = $derived(of('working'));
  const queued = $derived(of('queued'));
  const closed = $derived(of('closed'));
  // Shipped reads newest first; a card with no date sorts last.
  const since = (s: CardSummary) => Date.parse(s.stateSince ?? '') || -Infinity;
  const done = $derived([...of('done')].sort((a, b) => since(b) - since(a)));
  const SHOWN = 5;

  const stages = $derived([...(app.board?.stages ?? [])].sort((a, b) => a.order - b.order));
  const faceVariant = $derived(FACE_VARIANT[vibe]);
  const today = $derived(new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }));

  let menus = $state<Record<string, boolean>>({});
  let movers = $state<Record<string, ReturnType<typeof CardMoveMenu> | undefined>>({});
  const keys = (e: KeyboardEvent, s: CardSummary) =>
    cardKeys(e, { open: () => app.openCard(s.id), toggleMove: () => (menus[s.id] = !(menus[s.id] ?? false)), step: (d) => movers[s.id]?.step(d) });
</script>

{#snippet title(s: CardSummary, cls: string)}
  <h3 id="pp-t-{s.id}" class={cls}>
    <button type="button" class="hit text-left hover:underline" aria-label={openLabel(s)} data-card-open={s.id} onclick={() => app.openCard(s.id)} onkeydown={(e) => keys(e, s)}>{s.title}</button>
  </h3>
{/snippet}

{#snippet action(s: CardSummary)}
  {#if s.questionFrom}
    <button type="button" class="vk-button vk-button--signal" onclick={() => app.openCard(s.id)}>⚑ Answer {s.questionFrom}</button>
  {:else if s.gatePending}
    <button type="button" class="vk-button vk-button--signal" onclick={() => app.openCard(s.id)}>⚑ Review</button>
  {/if}
{/snippet}

{#snippet mover(s: CardSummary)}
  <CardMoveMenu card={s.card} {stages} visible bind:open={() => menus[s.id] ?? false, (v) => (menus[s.id] = v)} bind:this={movers[s.id]} />
{/snippet}

{#snippet entry(s: CardSummary)}
  <article class="entry border-border relative border-b py-3 pr-12" aria-labelledby="pp-t-{s.id}">
    {@render title(s, 'font-display text-base')}
    <p class="text-muted-foreground mt-0.5 text-sm"><em>{s.delegate ? s.delegate.name : 'nobody'}</em> · {s.stageName}</p>
    <CardFacts {s} tone="chips" />
    {#if s.archived}<p class="eyebrow mt-1">archived</p>{/if}
    {#if s.questionFrom || s.gatePending}<div class="mt-2">{@render action(s)}</div>{/if}
    {@render mover(s)}
  </article>
{/snippet}

<div class="paper-board mx-auto max-w-[1200px] px-4 py-6">
  <header class="border-b-2 border-[var(--vk-color-text)] pb-3">
    <h1 class="font-display text-3xl">{boardName}</h1>
    <p class="text-muted-foreground">{today}, in {LIGHT_WORDS[phase]}</p>
    <p class="eyebrow">Superpipeline · {cardCount} cards</p>
  </header>

  <div class="mt-6 grid gap-8 lg:grid-cols-3">
    <section aria-labelledby="pp-wait">
      <h2 id="pp-wait" class="eyebrow text-signal-text"><span aria-hidden="true">●</span> Waiting on you · {needs.length} {needs.length === 1 ? 'letter' : 'letters'}</h2>
      {#if needs.length === 0}<p class="text-muted-foreground mt-3">Nothing waits on you.</p>{/if}
      {#each needs as s (s.id)}
        <article class="letter border-border relative border-b py-4 pr-12" aria-labelledby="pp-t-{s.id}">
          {@render title(s, 'font-display text-lg')}
          <p class="agent-voice mt-1">“<Words text={leadText(s.lead, vibe)} />”</p>
          <p class="mt-2 flex items-center gap-2 text-sm">
            {#if s.delegate}<AgentFace agentId={s.delegate.id} name={s.delegate.name} iconUrl={s.delegate.iconUrl} mood={s.mood} size={24} variant={faceVariant === 'mood' ? 'portrait' : faceVariant} withName />{/if}
            {#if ageLabel(s.ageHours)}<span class="text-muted-foreground">{ageLabel(s.ageHours)}</span>{/if}
          </p>
          <CardFacts {s} tone="chips" />
          {#if s.archived}<p class="eyebrow mt-1">archived</p>{/if}
          <div class="mt-2 flex flex-wrap items-center gap-2">
            {#if s.questionFrom || s.gatePending}{@render action(s)}{:else}<button type="button" class="vk-button vk-button--secondary" onclick={() => app.openCard(s.id)}>Open</button>{/if}
          </div>
          {@render mover(s)}
        </article>
      {/each}
    </section>

    <section aria-labelledby="pp-progress">
      <h2 id="pp-progress" class="eyebrow">In progress</h2>
      {#if working.length === 0}<p class="text-muted-foreground mt-3">Nothing in progress.</p>{/if}
      {#each working as s (s.id)}{@render entry(s)}{/each}
      <h2 class="eyebrow mt-6">Coming up</h2>
      {#if queued.length === 0}<p class="text-muted-foreground mt-3">Nothing coming up.</p>{/if}
      {#each queued as s (s.id)}{@render entry(s)}{/each}
    </section>

    <section aria-labelledby="pp-shipped">
      <h2 id="pp-shipped" class="eyebrow">Shipped</h2>
      {#each done.slice(0, SHOWN) as s (s.id)}{@render entry(s)}{/each}
      {#if done.length > SHOWN}
        <details class="mt-2"><summary class="tap cursor-pointer">Show all {done.length} shipped</summary>{#each done.slice(SHOWN) as s (s.id)}{@render entry(s)}{/each}</details>
      {/if}
      {#if closed.length}
        <details class="mt-2"><summary class="tap cursor-pointer">Show {closed.length} closed</summary>{#each closed as s (s.id)}{@render entry(s)}{/each}</details>
      {/if}
      <div class="bg-raised mt-6 rounded-[var(--vk-radius-md)] p-4">
        <button type="button" class="font-display tap text-lg" onclick={onCompose}>Write a new card</button>
        <p class="text-muted-foreground text-sm">Describe it in a sentence; an agent drafts the brief.</p>
      </div>
    </section>
  </div>

  <section aria-labelledby="pp-pipeline" class="border-border mt-10 border-t pt-4">
    <h2 id="pp-pipeline" class="eyebrow">The pipeline</h2>
    <StageList stages={stageSummaries} variant="lines" />
  </section>
</div>
