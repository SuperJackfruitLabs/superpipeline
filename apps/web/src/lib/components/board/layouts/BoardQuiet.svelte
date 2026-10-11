<script lang="ts">
  /** Quiet: the board as one plain list, grouped by what needs a decision (spec §5.1). Names only, no faces, no motion. */
  import { app } from '$lib/stores/app.svelte';
  import { ageLabel } from '$lib/age';
  import { leadText } from '$lib/copy';
  import CardFacts from '../CardFacts.svelte';
  import CardMoveMenu from '../CardMoveMenu.svelte';
  import StageList from '../StageList.svelte';
  import { groupByUrgency, type CardSummary, type Urgency } from '../card-summary';
  import { cardKeys, openLabel } from '../open-label';
  import type { BoardLayoutProps } from './types';

  let { summaries, stages: stageSummaries, vibe, boardName, cardCount, onCompose }: BoardLayoutProps = $props();

  const HEADINGS: Record<Urgency, string> = {
    needs: 'Needs your decision',
    working: 'In progress',
    queued: 'Waiting to start',
    done: 'Done',
    closed: 'Closed',
  };
  const groups = $derived(groupByUrgency(summaries));
  const stages = $derived([...(app.board?.stages ?? [])].sort((a, b) => a.order - b.order));

  let menus = $state<Record<string, boolean>>({});
  let movers = $state<Record<string, ReturnType<typeof CardMoveMenu> | undefined>>({});
  const keys = (e: KeyboardEvent, s: CardSummary) =>
    cardKeys(e, { open: () => app.openCard(s.id), toggleMove: () => (menus[s.id] = !(menus[s.id] ?? false)), step: (d) => movers[s.id]?.step(d) });

  const meta = (s: CardSummary) => [s.delegate ? s.delegate.name : 'nobody', s.stageName, ageLabel(s.ageHours)].filter(Boolean).join(' · ');

  // The visible word is short; the accessible name is the one every vibe shares, and always
  // contains the visible word, so speech input can say what it sees (WCAG 2.5.3).
  const action = (s: CardSummary) =>
    s.questionFrom ? { text: 'Answer', name: `⚑ Answer ${s.questionFrom}` }
    : s.gatePending ? { text: 'Review', name: '⚑ Review' }
    : { text: 'Open', name: `Open ${s.title}` };
</script>

<div class="quiet-board mx-auto max-w-[760px] px-4 py-6">
  <header class="pb-2">
    <h1 class="text-2xl font-semibold">{boardName}</h1>
    <p class="text-muted-foreground">Superpipeline · {cardCount} cards</p>
    <button type="button" class="tap mt-2 underline underline-offset-2" onclick={onCompose}>Write a new card</button>
  </header>

  {#each groups as g (g.urgency)}
    <section aria-labelledby="qb-{g.urgency}" class="mt-8">
      <h2 id="qb-{g.urgency}" class="text-lg font-semibold">{HEADINGS[g.urgency]} ({g.cards.length})</h2>
      {#if g.cards.length === 0}
        <p class="text-muted-foreground mt-2">None.</p>
      {:else}
        <ul class="mt-2">
          {#each g.cards as s (s.id)}
            {@const act = action(s)}
            <li class="border-border relative border-b py-3 pr-12 {g.urgency === 'needs' ? 'border-l-[5px] border-signal pl-3.5' : ''}" aria-labelledby="qb-t-{s.id}">
              <h3 id="qb-t-{s.id}" class="font-semibold">
                <button type="button" class="hit text-left hover:underline" aria-label={openLabel(s)} data-card-open={s.id} onclick={() => app.openCard(s.id)} onkeydown={(e) => keys(e, s)}>{s.title}</button>
              </h3>
              <p class="text-muted-foreground text-sm">{meta(s)}</p>
              <p class="text-sm">{leadText(s.lead, vibe)}</p>
              <CardFacts {s} tone="text" />
              {#if s.archived}<p class="text-muted-foreground text-sm">archived</p>{/if}
              <button type="button" class="tap mt-1 underline underline-offset-2" aria-label={act.name} onclick={() => app.openCard(s.id)}>{act.text}</button>
              <CardMoveMenu card={s.card} {stages} visible bind:open={() => menus[s.id] ?? false, (v) => (menus[s.id] = v)} bind:this={movers[s.id]} />
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/each}

  <section aria-labelledby="qb-stages" class="mt-8">
    <h2 id="qb-stages" class="text-lg font-semibold">Stages</h2>
    <StageList stages={stageSummaries} variant="table" />
  </section>
</div>
