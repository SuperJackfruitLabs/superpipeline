<!-- apps/web/src/lib/components/board/studio/StudioCardPhone.svelte -->
<script lang="ts">
  /** One row of "Cards, needs you first" (SP-Phone-Board-Studio `article.pb-card`). */
  import '../phone/phone-move.css';
  import { Button, Face, IconButton } from '@superjackfruit/vibekit';
  import type { Stage } from '$lib/api';
  import CardMoveMenu from '../CardMoveMenu.svelte';
  import type { CardSummary } from '../card-summary';
  import PhoneIcon from '$lib/components/parts/PhoneIcon.svelte';
  import { unitOf } from '../board-model';
  import { cardKeys } from '../open-label';
  import { actionWord, phoneTitleLabel, rowIndex, studioDue, studioFacts, studioNext, studioRowLabel, usd } from '../phone/phone-words';
  import { app } from '$lib/stores/app.svelte';

  let { s, index, stages }: { s: CardSummary; index: number; stages: Stage[] } = $props();
  let moveOpen = $state(false);
  let menu = $state<ReturnType<typeof CardMoveMenu>>();
  const label = $derived(studioRowLabel(s));
  const next = $derived(studioNext(s));
  const facts = $derived(studioFacts(s));
  const due = $derived(studioDue(s));
  const n = $derived(s.stageCount);
</script>

{#snippet moveIcon()}<PhoneIcon name="move-studio" form="plain" size={16} />{/snippet}
<article class="pb-card">
  <div class="rl" class:needs={label.needs}><span class="ix">{rowIndex(index)}</span><span class="u {unitOf(s)}" aria-hidden="true"></span><span>{label.text}</span><span class="age">{s.ageShort}</span></div>
  <h3><button class="ttl" type="button" aria-label={phoneTitleLabel(s)} data-card-open={s.id} onclick={() => app.openCard(s.id)} onkeydown={(e) => cardKeys(e, { open: () => app.openCard(s.id), toggleMove: () => (moveOpen = !moveOpen), step: (d) => menu?.step(d) })}>{s.title}</button></h3>
  {#if facts.length}
    <p class="ar-facts">{#each facts as f, i (i)}<span class={f.p ? 'p' : undefined} title={f.title}>{f.text}</span>{/each}</p>
  {/if}
  <div class="stg">
    <span class="chip c{s.stageIndex + 1}"></span><span>{s.stageName}</span>
    <span class="ar-ramp" aria-hidden="true">{#each Array.from({ length: n }, (_, i) => i) as i (i)}<i class="c{i + 1}" class:on={i <= s.stageIndex}></i>{/each}</span>
    <span class="mono muted" style="font-size: 12px;">{s.stageIndex + 1}/{n}</span>
  </div>
  {#if s.urgency === 'needs'}
    <dl>
      <div><dt>Agent</dt><dd>{#if s.kind === 'no-owner'}a person{:else if s.lastAgent}<Face id={s.lastAgent.name} label={s.lastAgent.name} mood="needs" size={18} src={s.lastAgent.iconUrl ?? undefined} />{s.lastAgent.name}{:else}—{/if}</dd></div>
      <div><dt>Tries</dt><dd>{#if s.attemptCount > 1}<span class="sigt">{s.attemptCount}</span>{:else}{s.attemptCount}{/if}</dd></div>
      <div><dt>Cost</dt><dd>{usd(s.cost)}</dd></div>
      <div><dt>Due</dt><dd>{#if due.sig}<span class="sigt">{due.text}</span>{:else}{due.text}{/if}</dd></div>
    </dl>
  {/if}
  <div class="nx">
    <p class:q={next.q}>{next.text}</p>
    {#if s.urgency === 'needs'}<Button variant="primary" onclick={() => app.openCard(s.id)}>{actionWord(s)}</Button>{/if}
    <IconButton raised icon={moveIcon} label="Move {s.title} to another stage" aria-haspopup="menu" expanded={moveOpen} onclick={() => (moveOpen = !moveOpen)} />
  </div>
  <div class="ph-mvanchor" style="top: auto; bottom: 20px;"><CardMoveMenu bind:this={menu} card={s.card} {stages} bind:open={moveOpen} bare /></div>
</article>
