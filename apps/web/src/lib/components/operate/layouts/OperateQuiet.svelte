<!-- apps/web/src/lib/components/operate/layouts/OperateQuiet.svelte -->
<script lang="ts">
  import BoardChip from '$lib/components/inbox/BoardChip.svelte';
  import { acrossBoards, askBoards, inboxCounts, inboxSubline, wantYou } from '$lib/components/inbox/inbox-words';
  import { greetNamed } from '$lib/greet';
  import { viewport } from '$lib/viewport.svelte';
  import { untrack } from 'svelte';
  /** SP-Operate-Quiet: one column, headings in reading order, most urgent first. */
  import { Button, Face } from '@superjackfruit/vibekit';
  import { moveTargets } from '../operate-data';
  import { CapsUi, OperateUi } from '../operate-ui.svelte';
  import { moveOptionLabel, QUIET_REFUSAL, quietLede, quietLine, quietMeta, quietSpend, resumeOptions, RESUME_LABEL, stopHint, usd } from '../operate-words';
  import type { OperateLayoutProps } from './types';
  import './operate-quiet.css';

  let { model, ui: uiProp, caps: capsProp }: OperateLayoutProps = $props();
  const ui = untrack(() => uiProp) ?? new OperateUi(() => model);
  const caps = untrack(() => capsProp) ?? new CapsUi(() => model);
  const go = (e: MouseEvent, id: string, boardId: string, log = false) => { e.preventDefault(); if (log) model.openLog(id, boardId); else model.open(id, boardId); };
  const events = (g: (typeof model.groups)[number]) => (ui.earlierOpen[g.cardId] ? [g.latest, ...g.earlier] : [g.latest]);
</script>

{#snippet face(name: string | null, iconUrl: string | null, mood: 'needs' | 'working' | 'resting')}
  {#if name}<Face id={name} label={name} {mood} size={20} src={iconUrl ?? undefined} />{:else}<span class="noface" aria-hidden="true" style="width: 20px; height: 20px;"></span>{/if}
{/snippet}

<div class="op-q"><div class="q"><div class="q__col">
  <svelte:element this={viewport.phone ? 'h2' : 'h1'} class="op-title">{greetNamed(model.phase, model.firstName)} {wantYou(model.needs.length)}</svelte:element>
  <p class="q__lede">{inboxSubline(inboxCounts(model.needs), askBoards(model.needs), model.running.length)}</p>
  <h2>Needs you ({model.needs.length})</h2>
  {#if askBoards(model.needs) > 0}<p class="plain">{acrossBoards(askBoards(model.needs)).replace(/^./, (c) => c.toUpperCase())}. Most urgent first.</p>{/if}
  {#if model.needs.length === 0}
    <p class="plain">None.</p>
  {:else}
    <p class="q__note">Most urgent first.</p>
  {/if}
  {#each model.needsUrgent as row, i (row.item.id)}
    {@const id = row.item.cardId}
    {@const noOwner = row.item.kind === 'no-owner'}
    <article class="item item--needs" aria-labelledby="q{i + 1}" data-attention-row={row.item.kind}>
      <h3 id="q{i + 1}"><a href={model.cardHref(id, row.boardId)} onclick={(e: MouseEvent) => go(e, id, row.boardId)}>{row.item.title}</a></h3>
      <p class="meta">{quietMeta(row)}{@render face(row.agentName, row.iconUrl, 'needs')}<span>{row.agentName ?? 'Unclaimed'}</span> · <BoardChip name={row.boardName} /></p>
      {#if noOwner}
        <dl class="dl"><dt>Why it waits</dt><dd>{row.item.instruction}</dd></dl>
      {:else}
        <dl class="dl"><dt>Why it stopped</dt><dd>{row.item.detail ?? row.item.headline}</dd><dt>What to do</dt><dd>{stopHint(row.item)}</dd></dl>
      {/if}
      {#if ui.resuming === id}
        <fieldset class="form"><legend>Resume this card</legend>
          <label class="lbl">Resume at<select class="inp" id="resume-at-{id}" bind:value={ui.resumeAt}>{#each resumeOptions(row.stages, row.item.stageKey) as o (o.key)}<option value={o.key}>{o.label}</option>{/each}</select></label>
          <label class="lbl">{RESUME_LABEL}<textarea class="inp" bind:value={ui.text}></textarea></label>
          <div class="acts" style="margin-top: 0px;"><Button variant="primary" class="btn-sm" type="button" aria-disabled={ui.canSend ? 'false' : 'true'} onclick={() => ui.send(row)}>Send back to work</Button><button class="textbtn" type="button" onclick={() => ui.cancel()}>Cancel</button></div>
        </fieldset>
      {:else if noOwner}
        <div class="acts">
          <label class="lbl" style="display: flex; align-items: center; gap: 12px;">Move to<select class="inp" id="mv-{id}" bind:value={ui.moveTo[id]}>{#each moveTargets(row.stages, row.item.stageKey) as s (s.key)}<option value={s.key}>{moveOptionLabel('quiet', s, model.agents)}</option>{/each}</select></label>
          <Button variant="primary" class="btn-sm" type="button" onclick={() => ui.move(row)}>Move card</Button><a href={model.cardHref(id, row.boardId)} onclick={(e: MouseEvent) => go(e, id, row.boardId)}>Open card</a><a href="/crew/capabilities">Staff an agent</a>
        </div>
      {:else}
        <div class="acts">
          {#each row.actions as a (a)}
            {#if a === 'resume'}<Button variant="primary" class="btn-sm" type="button" aria-expanded="false" onclick={() => ui.openResume(row)}>Resume</Button>
            {:else if a === 'review' || a === 'answer'}<a href={model.cardHref(id, row.boardId)} onclick={(e: MouseEvent) => go(e, id, row.boardId)}>{a === 'review' ? 'Review' : 'Answer'}</a>
            {:else if a === 'open'}<a href={model.cardHref(id, row.boardId)} onclick={(e: MouseEvent) => go(e, id, row.boardId)}>Open card</a>
            {:else if a === 'log'}<a href={model.cardHref(id, row.boardId)} onclick={(e: MouseEvent) => go(e, id, row.boardId, true)}>Open log</a>
            {:else if a === 'staff'}<a href="/crew/capabilities">Staff an agent</a>{/if}
          {/each}
        </div>
      {/if}
      {#if ui.refusals[id]}<p class="plain" role="alert">{QUIET_REFUSAL}{ui.refusals[id]}</p>{/if}
    </article>
  {/each}
  <h2>Working now ({model.running.length}{model.scoped ? '' : ', all boards'})</h2>
  {#if model.running.length === 0}
    <p class="plain">None. No agent is working anything right now.</p>
  {:else}
    <ul class="ev">{#each model.running as r (r.cardId)}<li>{@render face(r.agentName, r.iconUrl, 'working')}<a href={model.cardHref(r.cardId, r.boardId)} onclick={(e: MouseEvent) => go(e, r.cardId, r.boardId)}>{r.title}</a> in {r.stageName}{r.costUsd > 0 ? ` · ${usd(r.costUsd)}` : ''}</li>{/each}</ul>
  {/if}
  <h2>Activity ({model.unread} unread{model.scoped ? '' : ', all boards'})</h2>
  <div class="toggle" role="group" aria-label="Which activity"><button class="textbtn" type="button" aria-pressed={model.showRead ? 'false' : 'true'} onclick={() => (model.showRead = false)}>Unread only</button><button class="textbtn" type="button" aria-pressed={model.showRead ? 'true' : 'false'} onclick={() => (model.showRead = true)}>Show all</button></div>
  {#if model.groups.length === 0}<p class="plain">{model.showRead ? (model.scoped ? 'Nothing has happened on this board yet.' : 'Nothing has happened on any board yet.') : 'Nothing unread.'}</p>{/if}
  {#each model.groups as g (g.cardId)}
    <div class="item" style="padding-left: 0px;">
      <h3 style="display: flex; gap: 10px; align-items: center;">{@render face(g.agentName, g.iconUrl, g.need ? 'needs' : 'resting')}<a href={model.cardHref(g.cardId, g.boardId)} onclick={(e: MouseEvent) => go(e, g.cardId, g.boardId)}>{g.title}</a></h3>
      <ul class="ev">{#each events(g) as n (n.seq)}<li><span>{quietLine(n, g.need?.item.kind ?? null, g.need !== null)}</span>{#if !n.read}<button class="textbtn" type="button" onclick={() => model.markRead(n.seq, g.boardId)}>Mark read</button>{/if}</li>{/each}</ul>
      <div class="acts" style="margin-top: var(--vk-space-2);">
        {#if g.need?.actions.includes('resume')}<Button variant="secondary" class="btn-sm" type="button" onclick={() => ui.fromActivity(g.need!, 'content')}>Resume</Button>
        {:else if g.need?.actions.includes('move')}<Button variant="secondary" class="btn-sm" type="button" onclick={() => ui.fromActivity(g.need!, 'content')}>Move</Button>{/if}
        {#if g.earlier.length > 0}<button class="textbtn" type="button" aria-expanded={ui.earlierOpen[g.cardId] ? 'true' : 'false'} onclick={() => ui.toggleEarlier(g.cardId)}>{ui.earlierOpen[g.cardId] ? 'Hide earlier reminders' : 'Show earlier reminders'}</button>{/if}
      </div>
    </div>
  {/each}
  <h2>Spend in the last 7 days</h2>
  {#if model.usageError}<p class="plain">Couldn't load spend — {model.usageError}</p>{/if}
  <p class="plain"><span class="money">{usd(model.spend.total)}</span>{quietSpend(model.spend.cap, model.spend.top)}</p>
  <div class="acts"><Button variant="secondary" class="btn-sm" type="button" onclick={() => (caps.editing ? caps.cancel(model.spend) : caps.start(model.spend))}>Set a budget cap</Button>{#if model.scoped}<a href="/b/{model.boardId}/operate/telemetry">Spend details</a>{/if}</div>
  {#if caps.editing}
    <fieldset class="form"><legend>Set a budget cap</legend>
      <label class="lbl">Board cap in dollars<input class="inp" inputmode="decimal" bind:value={caps.board} /></label>
      <label class="lbl">Card cap in dollars<input class="inp" inputmode="decimal" bind:value={caps.card} /></label>
      {#each [caps.boardError, caps.cardError, caps.refused].filter(Boolean) as msg (msg)}<p class="plain" role="alert">{QUIET_REFUSAL}{msg}</p>{/each}
      <div class="acts" style="margin-top: 0px;"><Button variant="primary" class="btn-sm" type="button" disabled={caps.saving} onclick={() => caps.save()}>Save caps</Button><button class="textbtn" type="button" onclick={() => caps.cancel(model.spend)}>Cancel</button></div>
    </fieldset>
  {/if}
</div></div></div>
