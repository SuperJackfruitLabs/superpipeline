<!-- apps/web/src/lib/components/card/CardView.svelte -->
<script lang="ts">
  /**
   * The card, one composition for every vibe and every surface (composition contract §7 "Card"): the
   * head, the track, the one state sentence with its action (a decision, a question or a resume opens
   * its panel in its place), the facts in words, the brief, what the last attempt produced, then the
   * conversation and history and the raw data behind closed disclosures. The drawer, the phone sheet and
   * the page mount this same view; phone is a breakpoint (card.css), not a second file. Outside the one
   * `[data-signature]` slot the markup and the words are the same in every vibe.
   *
   * While the card's log is on its way only the head and the track draw (both from the board snapshot)
   * and the state block waits (rule 11); the rest follows once the log is in, or the read failed.
   */
  import './card.css';
  import { StageTrack, type StageDetail } from '@superjackfruitlabs/vibekit-ui';
  import { loadState } from '$lib/loading.svelte';
  import type { CardModel, CardSurface } from './card-model.svelte';
  import type { GateBinding, QuestionBinding } from './bindings';
  import { trackWho } from './card-words';
  import { stripAria, stripKind } from './state-words';
  import CardHead from './CardHead.svelte';
  import CardState, { type CardPanel } from './CardState.svelte';
  import CardFacts from './CardFacts.svelte';
  import CardBrief from './CardBrief.svelte';
  import CardProduced from './CardProduced.svelte';
  import CardHistory from './CardHistory.svelte';
  import CardRaw from './CardRaw.svelte';

  /** `opened`: the dev gallery's cells open a panel from the start; every other surface opens on the sentence. */
  let { model: m, surface, gate, question, onClose, boardHref, pageHref, opened = null }: {
    model: CardModel; surface: CardSurface | 'phone'; gate: GateBinding | null; question: QuestionBinding | null;
    onClose?: () => void; boardHref: string; pageHref: string; opened?: CardPanel | null;
  } = $props();

  const load = loadState(() => ({ value: m.detail, failed: m.detailFailed }));
  const waiting = $derived(load.phase !== 'ready' && load.phase !== 'failed');
  /** Sections under the title: h2 under a page's h1, h3 under a drawer's h2. */
  const level = $derived<2 | 3>(surface === 'page' ? 2 : 3);
  const lead = $derived(m.lead);
  /** Esc closes the card where it can be closed, unless something inside it already took the key. */
  function escape(e: KeyboardEvent): void {
    if (e.key !== 'Escape' || e.defaultPrevented || !onClose) return;
    e.preventDefault();
    onClose();
  }
  const details = $derived<StageDetail[]>(
    m.stages.map((_, i) => (i === m.stageIndex && !m.archived ? { who: trackWho(!!lead?.needsYou, m.agent.name, m.ageHours), needs: !!lead?.needsYou } : {})),
  );
</script>

{#if m.card}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions: Esc from any control inside the card closes it -->
  <article class="cv" data-surface={surface} aria-labelledby={surface === 'gallery' ? undefined : 'drawer-title'} onkeydown={escape}>
    <CardHead model={m} {surface} {onClose} {boardHref} {pageHref} />
    <div class="cv-track" data-block="track">
      <StageTrack form="board" stages={m.stages.map((s) => s.name)} current={m.stageIndex} status={m.trackStatus} {details}
        label={stripAria(m.stageIndex, m.stages.length, m.stageName, stripKind(lead ?? { kind: 'idle' }, m.archived), 'drawer')} />
    </div>
    <CardState model={m} {gate} {question} phase={load.phase} {opened} />
    {#if !waiting}
      <CardFacts model={m} />
      <CardBrief model={m} {level} />
      <CardProduced model={m} {level} />
      <CardHistory model={m} />
      <CardRaw model={m} />
    {/if}
  </article>
{/if}
