<script lang="ts">
  /**
   * Move a card to another stage (SP-Dlg-Move), on vibekit's sectioned Dialog. Opened by every Move
   * control (the board's ⇄ and Move buttons, the tiles' M key, the List rows, the peek) through
   * `app.openMoveDialog(id)`. The stage rows are vibekit Choice stage rows (owner face, chips and count
   * slots since 0.0.9). A move is said by the page-level live
   * region (`app.moveSaid`), success or refusal.
   */
  import { untrack } from 'svelte';
  import { Button, Choice, Dialog, Face } from '@superjackfruit/vibekit';
  import { app } from '$lib/stores/app.svelte';
  import { displayAgent } from '$lib/names';
  import { stageSummaries, summarize } from '$lib/components/board/card-summary';
  import Icon from '$lib/components/parts/Icon.svelte';
  import { dirLabel, initialPick, moveNowLead, moveThen, ownerFace, primaryLabel, stageCountText } from './move-model';
  import { ownerLine } from './who-picks-up';
  import './css/mv.css';

  let pick = $state<string | undefined>(undefined);
  let pending = $state(false);
  let refused = $state<string | null>(null);
  let list = $state<HTMLDivElement | null>(null);

  const card = $derived(app.moveCardId ? app.cardById(app.moveCardId) ?? null : null);
  const stages = $derived(app.board ? [...app.board.stages].sort((a, b) => a.order - b.order) : []);
  const hereIndex = $derived(card ? stages.findIndex((s) => s.key === card.currentStageKey) : -1);
  const info = $derived(app.board ? stageSummaries(app.board, app.filteredCards(), app.agents) : []);
  const summary = $derived.by(() => {
    const b = app.board;
    if (!b || !card) return null;
    return summarize(b, [card], { agents: app.agents, members: app.members, labels: app.labelById(), nowMs: Date.now() })[0] ?? null;
  });
  const agentId = $derived(summary?.delegate?.id ?? card?.lastAgentId ?? null);
  const agentName = $derived(summary?.delegate?.name ?? (card?.lastAgentId ? displayAgent(card.lastAgentId, app.agents) || 'an agent' : null));
  const picked = $derived(stages.find((s) => s.key === pick) ?? null);
  const mood = $derived(summary?.mood ?? 'resting');

  $effect(() => {
    const id = app.moveCardId;
    untrack(() => {
      refused = null;
      pending = false;
      const c = id ? app.cardById(id) : null;
      pick = (c ? initialPick(stages, c.currentStageKey) : null) ?? undefined;
    });
  });

  function close(): void { app.closeMoveDialog(); }
  async function move(): Promise<void> {
    if (!card || !picked || pending) return;
    pending = true;
    refused = null;
    await app.moveCard(card.id, picked.key);
    pending = false;
    if (app.error) { refused = app.error; return; }
    const id = card.id;
    close();
    // The control that opened this moved with its card (a new column, a new group): if focus could not
    // go back to it, it goes to the card where it is now, else to the page heading.
    setTimeout(() => {
      const here = document.activeElement;
      if (here && here !== document.body && here.isConnected) return;
      const tile = document.querySelector<HTMLElement>(`[data-card-id="${id}"]`);
      const target = tile?.querySelector<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])') ?? document.querySelector<HTMLElement>('h1');
      if (target && !target.matches('button, a[href], [tabindex]')) target.tabIndex = -1;
      target?.focus();
    }, 50);
  }
</script>

<Dialog open={card !== null} title={card?.title ?? ''} eyebrow="Move card" titleForm="object" width="640px" frame="sectioned" close="Close without moving" class="mv" onclose={close}>
  <!-- The reference sets the "Now in" line in the head, beside the close: vibekit's description row. -->
  {#snippet description()}{#if card}Now in <strong>{stages[hereIndex]?.name}</strong> · {#if agentId && agentName}<Face id={agentId} label={agentName} {mood} size={20} />{/if} {moveNowLead({ kind: summary?.lead.kind ?? 'idle', ageHours: summary?.ageHours ?? null, agentName })} {#if summary?.urgency === 'needs'}<span class="chip chip--needs">Waiting on you</span>{/if}{/if}{/snippet}
  {#if card}
    <div class="mv-content" data-dlg="mv">
      <fieldset class="mv-set">
        <legend class="mv-legend">Move to</legend>
        <!-- The checked row takes focus on open: vibekit focuses [data-autofocus], which Choice cannot carry. -->
        <div class="mv-list" bind:this={list} tabindex="-1" data-autofocus onfocus={() => list?.querySelector<HTMLInputElement>('input:checked')?.focus()}>
          {#each stages as s, i (s.key)}
            {@const here = i === hereIndex}
            {@const n = info.find((x) => x.key === s.key)}
            {@const owner = ownerFace(s, app.agents, { agentId, mood })}
            <Choice type="radio" stage {here} name="stage" value={s.key} label={s.name} description={ownerLine(s, app.agents)}
              bind:group={pick}>
              {#snippet chips()}{#if here}<span class="chip">Here now</span>{/if}{#if s.gate === 'approval'}<span class="chip chip--gate"><Icon name="flag" size={12} /> Approval gate</span>{/if}{/snippet}
              {#snippet face()}{#if owner}<Face id={owner.id} label={owner.name} mood={owner.mood} size={20} />{/if}{/snippet}
              {#snippet count()}<span class="st-right"><span>{stageCountText(n?.count ?? 0, n?.blocked ?? 0)}</span><span class="st-dir">{dirLabel(i, hereIndex)}</span></span>{/snippet}
            </Choice>
          {/each}
        </div>
      </fieldset>
      {#if picked}<p class="mv-then"><Icon name="arrow" size={18} /><span>{moveThen(picked, stages, app.agents)}</span></p>{/if}
      {#if refused}<p role="alert" class="mv-then">{refused}</p>{/if}
      <div class="mv-keys">
        <span><span class="kbd">Alt</span>+<span class="kbd">←</span><span class="kbd">→</span> moves one stage from the board</span>
        <span><span class="kbd">M</span> opens this on a card</span>
        <span><span class="kbd">esc</span> closes</span>
      </div>
      <span class="vk-visually-hidden" role="status">{pending ? 'Moving…' : ''}</span>
    </div>
  {/if}
  {#snippet actions()}
    <Button variant="secondary" onclick={close}>Cancel</Button>
    <Button aria-disabled={!picked || pending ? 'true' : undefined} onclick={() => void move()}>{primaryLabel(picked?.name ?? '', pending)}</Button>
  {/snippet}
</Dialog>

<style>
  :global(.vk-dialog.mv) { --vk-dialog-close-x: 20px; --vk-dialog-foot-y: 16px; }
  /* The reference artboard's type (.art: 16px / 1.45), which vibekit's body (1.5) does not set. */
  :global(.vk-dialog.mv .mv-content) { font-size: var(--vk-text-md); line-height: 1.45; }
  :global(.vk-dialog.mv .vk-overlay__description strong) { color: var(--vk-color-text); }
  :global(.vk-dialog.mv .mv-set) { border: 0; padding: 0; margin: 10px 0 0; min-width: 0; }
  :global(.vk-dialog.mv .mv-min) { min-width: 0; }
  /* The Studio shell's unscoped .st-right (styles/shell/studio.css) must not reach the rows. */
  :global(.vk-dialog.mv .st-right) { font-family: inherit; font-weight: inherit; line-height: inherit; margin-left: 0; white-space: normal; }
  :global(.vk-dialog.mv .mv-legend) { padding: 0; margin-bottom: 8px; font: 700 15px/1.3 var(--vk-font-display); }
</style>
