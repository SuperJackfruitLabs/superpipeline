<!-- apps/web/src/lib/components/card/CardState.svelte -->
<script module lang="ts">
  export type CardPanel = 'gate' | 'question' | 'resume';
</script>

<script lang="ts">
  /**
   * The card's one sentence and its action (composition contract §7 "Card" 3, §11.3): where it is, for
   * how long, what is wanted and who did what last, with the verb that answers it (Review, Answer,
   * Resume or Restore) beside Move. Review, Answer and Resume open their panel in place of the
   * sentence, inside this same block. While the log is on its way the block says so (rule 11): the
   * skeleton, then from 8 s that the server is slow with Try again; a failed read says what happened.
   */
  import { tick, untrack } from 'svelte';
  import { Button, Notice } from '@superjackfruitlabs/vibekit-ui';
  import type { LoadPhase } from '$lib/loading.svelte';
  import { TRY_AGAIN } from '$lib/loading';
  import SkeletonRows from '$lib/components/parts/SkeletonRows.svelte';
  import type { CardModel } from './card-model.svelte';
  import type { GateBinding, QuestionBinding } from './bindings';
  import { FAILED_CARD, LOADING_CARD, gateAsk } from './card-words';
  import GatePanel from './gate/GatePanel.svelte';
  import QuestionPanel from './question/QuestionPanel.svelte';
  import ResumeForm from './ResumeForm.svelte';

  /** `opened`: a panel open from the start (the dev gallery's cells show each state as it looks once asked). */
  let { model: m, gate, question, phase, opened = null }: { model: CardModel; gate: GateBinding | null; question: QuestionBinding | null; phase: LoadPhase; opened?: CardPanel | null } = $props();

  let asked = $state<CardPanel | null>(null);
  // A different card starts with its sentence (or the panel it was opened at), never another card's open panel.
  let draftSeen: string | null = null;
  $effect(() => { const id = m.cardId; untrack(() => { asked = opened; draftSeen = null; void id; }); });
  // A half-typed resume note (kept across a sign-in round trip) opens its panel again, once per card.
  $effect(() => {
    const id = m.cardId;
    if (!id || draftSeen === id || !m.resume.show || m.resume.note === '') return;
    draftSeen = id;
    untrack(() => { asked ??= 'resume'; });
  });
  /** The open panel, while what it answers is still pending. */
  const panel = $derived<CardPanel | null>(
    asked === 'gate' && gate ? 'gate' : asked === 'question' && question ? 'question' : asked === 'resume' && m.resume.show ? 'resume' : null,
  );
  const sentence = $derived(m.sentence);
  let root = $state<HTMLElement | null>(null);

  async function answer(): Promise<void> {
    const verb = sentence.needsWord;
    if (verb === 'Restore') { await m.restore(); return; }
    asked = verb === 'Review' ? 'gate' : verb === 'Answer' ? 'question' : verb === 'Resume' ? 'resume' : null;
    await tick();
    // The panel takes focus at its first control, where it opened, without moving the page.
    root?.querySelector<HTMLElement>('input:not([disabled]), textarea, select')?.focus({ preventScroll: true });
  }
  const ask = $derived(gateAsk({ agent: m.agent.name, attempt: m.card?.attemptCount ?? 0, ageHours: m.ageHours, produced: m.artifacts.length, nextStage: m.stages[m.stageIndex + 1]?.name ?? null }));
  const prevStage = $derived(m.stages[m.stageIndex - 1]?.name ?? null);
</script>

{#snippet hidden(key: string)}<span hidden data-section={key}></span>{/snippet}
{#snippet more()}
  <div class="cv-more" data-section="cardActions">
    {#if !m.archived}<Button variant="quiet" disabled={m.archiving} onclick={() => m.archive()}>{m.archiving ? 'Archiving…' : 'Archive card'}</Button>{/if}
    <Button variant="quiet" onclick={() => m.remove()}>Delete card</Button>
  </div>
{/snippet}

<section class="cv-state" data-block="state" data-section="state" data-row="state" aria-label="Where it stands" aria-busy={phase !== 'ready' && phase !== 'failed' ? 'true' : undefined} bind:this={root}>
  {#if phase === 'failed'}
    <Notice tone="error" title={FAILED_CARD.title} announce>
      {FAILED_CARD.body}
      {#snippet action()}<Button variant="secondary" onclick={() => m.retry()}>{TRY_AGAIN}</Button>{/snippet}
    </Notice>
    {@render hidden('status')}{@render hidden('resume')}{@render hidden('cardActions')}
  {:else if phase !== 'ready'}
    <SkeletonRows label={LOADING_CARD} rows={2} slow={phase === 'slow'} onRetry={() => m.retry()} />
    {@render hidden('status')}{@render hidden('resume')}{@render hidden('cardActions')}
  {:else if panel === 'gate' && gate}
    <GatePanel {...gate} {ask} {prevStage} onMove={() => m.openMove()} />
    {@render more()}
    {@render hidden('status')}{@render hidden('resume')}
  {:else if panel === 'question' && question}
    <QuestionPanel {...question} onMove={() => m.openMove()} />
    {@render more()}
    {@render hidden('status')}{@render hidden('resume')}
  {:else if panel === 'resume'}
    <ResumeForm model={m} />
    {@render more()}
    {@render hidden('status')}
  {:else}
    <div class="cv-say">
      <p class="cv-sentence" data-section="status">{sentence.text}</p>
      {@render more()}
    </div>
    <div class="cv-act">
      {#if sentence.needsWord}<Button variant="primary" disabled={sentence.needsWord === 'Restore' && m.archiving} onclick={answer}>{sentence.needsWord}</Button>{/if}
      {#if !m.archived}<Button variant="secondary" onclick={() => m.openMove()}>Move</Button>{/if}
    </div>
    {@render hidden('resume')}
  {/if}
</section>
