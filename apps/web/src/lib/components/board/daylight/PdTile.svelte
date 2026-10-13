<!-- apps/web/src/lib/components/board/daylight/PdTile.svelte -->
<script lang="ts">
  /** One Daylight phone tile (SP-Phone-Board-Daylight `article.tile`), in the wants lane or a stage lane. */
  import '../phone/phone-move.css';
  import './priority-chip.css';
  import { Button, Face } from '@superjackfruit/vibekit';
  import type { Stage } from '$lib/api';
  import CardMoveMenu from '../CardMoveMenu.svelte';
  import type { CardSummary } from '../card-summary';
  import PhoneIcon from '$lib/components/parts/PhoneIcon.svelte';
  import { cardKeys } from '../open-label';
  import { refLabel, safeHref } from '../ref-chip';
  import { clampWatch } from '../phone/clamp';
  import { actionWord, blockedByChip, isStopped, pdDue, pdStageLine, personStageText, phoneTitleLabel, usd } from '../phone/phone-words';
  import { sentenceCase } from '$lib/words';
  import { app } from '$lib/stores/app.svelte';

  let { s, stages }: { s: CardSummary; stages: Stage[] } = $props();

  let moveOpen = $state(false);
  let clamped = $state(false);
  let expanded = $state(false);

  const needs = $derived(s.urgency === 'needs');
  const stopped = $derived(isStopped(s));
  const said = $derived(s.card.needsHuman?.detail ?? s.attention?.detail ?? null);
  const blockers = $derived(s.card.blockedBy);
  const chip = $derived(s.held ? blockedByChip(blockers.map((b) => b.title)) : null);
  const due = $derived(pdDue(s));
  const who = $derived(s.lastAgent?.name ?? 'an agent');

  let menu = $state<ReturnType<typeof CardMoveMenu>>();
  const onTitleKey = (e: KeyboardEvent): void => cardKeys(e, { open: () => app.openCard(s.id), toggleMove: () => (moveOpen = !moveOpen), step: (d) => menu?.step(d) });
</script>

<!-- `.tile` clips (overflow: hidden), so the move menu sits beside it in a positioned box of the same size. -->
<div class="pd-tilebox">
  <article class="tile" class:p1={s.priority === 1} class:p2={s.priority === 2}>
    {#if s.priority > 0}<span class="sr">Priority {s.priority}</span>{/if}
    <div class="trow">
      <span class="stg">{pdStageLine(s)}{#if s.priority > 0}<span class="pd-pri" aria-hidden="true">P{s.priority}</span>{/if}</span>
      <button class="mv" type="button" aria-haspopup="menu" aria-label="Move {s.title} to another stage" aria-expanded={moveOpen} onclick={() => (moveOpen = !moveOpen)}><PhoneIcon name="move" />Move</button>
    </div>
    <h3><button class="tt" type="button" aria-label={phoneTitleLabel(s)} data-card-open={s.id} onclick={() => app.openCard(s.id)} onkeydown={onTitleKey}>{s.title}</button></h3>

    {#if needs && s.kind !== 'no-owner' && said}
      <div class="bub">
        <Face id={who} label={who} mood="needs" size={24} src={s.lastAgent?.iconUrl ?? undefined} />
        <div class="say">
          <span class="who">{who} · needs you</span>
          <p class:open={expanded} use:clampWatch={(v) => (clamped = v)}>{sentenceCase(said)}</p>
          {#if clamped || expanded}
            <button type="button" aria-expanded={expanded} onclick={() => (expanded = !expanded)}>{expanded ? 'Show less' : 'Read the rest'}</button>
          {/if}
        </div>
      </div>
    {/if}

    {#if needs && (s.firstRef || s.labels.length)}
      <div class="chips">
        {#if s.firstRef}<a class="chip ref" href={safeHref(s.firstRef.url) ?? undefined} target="_blank" rel="noopener"><PhoneIcon name="doc" />{refLabel(s.firstRef)}</a>{/if}
        {#each s.labels as l (l.id)}<span class="chip">{l.name}</span>{/each}
        {#if s.moreLabels > 0}<span class="chip" title="{s.moreLabels} more label{s.moreLabels === 1 ? '' : 's'}">+{s.moreLabels}</span>{/if}
      </div>
    {:else if !needs && chip}
      <div class="chips"><span class="chip blk" title={chip.title}><PhoneIcon name="blocked" />{chip.text}</span></div>
    {/if}

    {#if needs && s.kind === 'no-owner'}<p style="font-size: 15px;">{personStageText(s.stageName)}</p>{/if}

    <div class="meta">
      {#if s.urgency === 'queued'}<span class="agent">— <span class="mood">not picked up yet</span></span>{/if}
      {#if s.urgency === 'working' && s.lastAgent}<span class="agent"><Face id={s.lastAgent.name} label={s.lastAgent.name} mood="working" size={16} />{s.lastAgent.name} <span class="mood">working</span></span>{/if}
      {#if s.urgency === 'done'}<span class="chip" style="background: var(--vk-mood-done); color: var(--vk-face-ink); border-color: transparent;"><PhoneIcon name="check" />Done</span>{/if}
      {#if (needs || s.urgency === 'queued') && s.queuedBy}
        <span class="chip"><Face id={s.queuedBy.name} label={s.queuedBy.name} mood="resting" size={16} src={s.queuedBy.agent?.iconUrl ?? undefined} /> asked by {s.queuedBy.name}</span>
      {/if}
      {#if (needs && s.kind !== 'no-owner') || s.urgency === 'done'}<span>{usd(s.cost)}</span>{/if}
      {#if stopped}<span>attempt {s.attemptCount}</span>{/if}
      {#if due && (needs || s.urgency === 'queued')}
        {#if due.overdue}<span class="due"><PhoneIcon name="warn" />{due.text}</span>{:else}<span>{due.text}</span>{/if}
      {/if}
    </div>

    {#if needs}
      <div class="act"><Button variant="signal" onclick={() => app.openCard(s.id)}>{actionWord(s)}</Button></div>
    {/if}
  </article>
  <div class="ph-mvanchor"><CardMoveMenu bind:this={menu} card={s.card} {stages} bind:open={moveOpen} bare /></div>
</div>
