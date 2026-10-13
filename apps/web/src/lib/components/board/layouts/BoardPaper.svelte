<!-- apps/web/src/lib/components/board/layouts/BoardPaper.svelte -->
<script lang="ts">
  /** Paper desktop board: the front page (SB §4.1). The masthead and its h1 are the shell's. */
  import '../paper/paper.css';
  import { Button } from '@superjackfruit/vibekit';
  import Icon from '$lib/components/parts/Icon.svelte';
  import { paperKicker, paperSection } from '../board-words';
  import PaperPipeline from '../paper/PaperPipeline.svelte';
  import PaperStory from '../paper/PaperStory.svelte';
  import type { BoardLayoutProps } from './types';

  let { model, onCompose }: BoardLayoutProps = $props();

  const terminal = $derived(model.stages[model.stages.length - 1]?.name ?? 'Done');
  const wait = $derived(paperKicker(model.counts.needs));
  const progress = $derived(paperSection('In progress', model.working.length, 'Nothing in progress.'));
  const coming = $derived(paperSection('Coming up', model.queued.length, 'Nothing is coming up.'));
  const shipped = $derived(paperSection(terminal, model.done.length, `Nothing in ${terminal} yet.`));
  const closed = $derived(paperSection('Closed', model.closed.length, 'No card has been closed.'));
</script>

<div class="pp">
  <div class="pp-cols">
    <section class="pp-col" aria-labelledby="pp-wait">
      <h2 class="pp-kicker" class:live={wait.live} id="pp-wait">{wait.text}</h2>
      {#if wait.none}<p class="pp-none">{wait.none}</p>{/if}
      {#each model.needs as s (s.id)}<PaperStory {s} size="lead" stages={model.stageDefs} terminalName={terminal} boardId={model.boardId} />{/each}
    </section>
    <section class="pp-col" aria-label="In progress and coming up">
      <h2 class="pp-kicker">{progress.text}</h2>
      {#if progress.none}<p class="pp-none">{progress.none}</p>{/if}
      {#each model.working as s (s.id)}<PaperStory {s} size="small" stages={model.stageDefs} terminalName={terminal} boardId={model.boardId} />{/each}
      <h2 class="pp-kicker">{coming.text}</h2>
      {#if coming.none}<p class="pp-none">{coming.none}</p>{/if}
      {#each model.queued as s (s.id)}<PaperStory {s} size="small" stages={model.stageDefs} terminalName={terminal} boardId={model.boardId} />{/each}
    </section>
    <section class="pp-col" aria-label="{terminal} and closed">
      <h2 class="pp-kicker">{shipped.text}</h2>
      {#if shipped.none}<p class="pp-none">{shipped.none}</p>{/if}
      {#each model.done as s (s.id)}<PaperStory {s} size="small" stages={model.stageDefs} terminalName={terminal} boardId={model.boardId} />{/each}
      <h2 class="pp-kicker pp-kicker-gap">{closed.text}</h2>
      {#if closed.none}<p class="pp-none">{closed.none}</p>{/if}
      {#each model.closed as s (s.id)}<PaperStory {s} size="small" stages={model.stageDefs} terminalName={terminal} boardId={model.boardId} />{/each}
      <div class="pp-write">
        <h3>Write a new card</h3>
        <p>Describe it in a sentence; an agent drafts the brief.</p>
        <div style="align-self: flex-start;"><Button variant="secondary" onclick={onCompose}>New card{#snippet icon()}<Icon name="plus" size={16} strokeWidth={1.8} />{/snippet}</Button></div>
      </div>
    </section>
  </div>
  <PaperPipeline stages={model.stages} />
</div>
