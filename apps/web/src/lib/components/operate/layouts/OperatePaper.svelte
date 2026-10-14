<!-- apps/web/src/lib/components/operate/layouts/OperatePaper.svelte -->
<script lang="ts">
  import { viewport } from '$lib/viewport.svelte';
  import { untrack } from 'svelte';
  import SkeletonRows from '$lib/components/parts/SkeletonRows.svelte';
  import { attention, bumpOnChange, flashOnChange, flip, rise } from '@superjackfruit/vibekit/motion';
  import { arrivals } from '$lib/motion/arrivals';
  /** SP-Operate-Paper: "The desk" — letters waiting on you, the digest, and the ledger. */
  import { Button, Face } from '@superjackfruit/vibekit';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import BoardChip from '$lib/components/inbox/BoardChip.svelte';
  import { acrossBoards, askBoards, CHECKING, inboxCounts, inboxSubline, wantYou } from '$lib/components/inbox/inbox-words';
  import { greetNamed } from '$lib/greet';
  import { moveTargets } from '../operate-data';
  import { CapsUi, OperateUi } from '../operate-ui.svelte';
  import { cut140, letters, moveOptionLabel, paperCap, paperMastEnd, paperMastLine, paperMeta, resumeOptions, RESUME_LABEL, staleLine, noticeBody, stopHint, usd, when } from '../operate-words';
  import type { NeedRow, OperateLayoutProps } from './types';
  import './operate-paper.css';

  let { model, ui: uiProp, caps: capsProp }: OperateLayoutProps = $props();
  const ui = untrack(() => uiProp) ?? new OperateUi(() => model);
  const caps = untrack(() => capsProp) ?? new CapsUi(() => model);
  const go = (e: MouseEvent, id: string, boardId: string, log = false) => { e.preventDefault(); if (log) model.openLog(id, boardId); else model.open(id, boardId); };
  const events = (g: (typeof model.groups)[number]) => (ui.earlierOpen[g.cardId] ? [g.latest, ...g.earlier] : [g.latest]);
  const hasCap = $derived(model.spend.cap !== null || model.spend.cardCap !== null);

  // Motion: an ask that arrives while the Inbox is open pulses gently three times (its row and the count already say it).
  const arrived = arrivals();
  let fresh = $state(new Set<string>());
  $effect(() => { const ids = model.needs.map((r) => r.item.id); if (!model.loading) fresh = arrived(ids); });
</script>

{#snippet face(name: string | null, iconUrl: string | null, size: number, mood: 'needs' | 'working' | 'resting')}
  {#if name}<Face id={name} label={name} {mood} {size} src={iconUrl ?? undefined} />{:else}<span class="noface" aria-hidden="true" style="width: {size}px; height: {size}px;"></span>{/if}
{/snippet}

{#snippet resumeForm(row: NeedRow)}
  {@const id = row.item.cardId}
  <form class="letter-resume" aria-label="Resume {row.agentName ?? 'this card'}" onsubmit={(e) => { e.preventDefault(); void ui.send(row); }}>
    <label>Resume at<select class="select" id="resume-at-{id}" bind:value={ui.resumeAt}>{#each resumeOptions(row.stages, row.item.stageKey) as o (o.key)}<option value={o.key}>{o.label}</option>{/each}</select></label>
    <label>{RESUME_LABEL}<textarea class="select" bind:value={ui.text}></textarea></label>
    <div class="acts"><Button variant="primary" class="btn-sm" type="submit" aria-disabled={ui.canSend ? 'false' : 'true'}><LineIcon name="play" />Send back to work</Button><button class="more" type="button" onclick={() => ui.cancel()}>Cancel</button></div>
  </form>
{/snippet}

<div class="op-pp"><div class="paper">
  <header class="mast">
    <div>
      <p class="mast__eyebrow">Superpipeline · Inbox · {model.boardName}</p>
      <svelte:element this={viewport.phone ? 'h2' : 'h1'} class="op-title">{greetNamed(model.phase, model.firstName)}{model.loading ? '' : ` ${wantYou(model.needs.length, true)}`}</svelte:element>
      <p class="mast__line">{model.loading ? CHECKING : inboxSubline(inboxCounts(model.needs), askBoards(model.needs), model.running.length)}</p>
    </div>
    <p class="mast__end">{model.loading ? model.boardName : paperMastEnd(model.boardName, model.cardCount)}</p>
  </header>
  <div class="cols">
    <section class="col" id="letters" aria-labelledby="k1">
      <div class="kick"><h2 id="k1">Waiting on you</h2><span class="kick__n" class:kick__n--needs={!model.loading && model.needs.length > 0}>{model.loading ? '–' : letters(model.needs.length)}</span>{#if !model.scoped && !model.loading}<span class="lnk">{acrossBoards(askBoards(model.needs))}</span>{/if}</div>
      {#if model.loading}<SkeletonRows label="Checking your boards…" rowHeight={150} slow={model.slow} />{:else if model.needs.length === 0}<p class="prose">Nothing is waiting on you.</p>{/if}
      {#each model.needs as row (row.item.id)}
        {@const id = row.item.cardId}
        {@const noOwner = row.item.kind === 'no-owner'}
        {@const meta = paperMeta(row)}
        <article class="letter" aria-labelledby="l-{id}" data-attention-row={row.item.kind} in:rise animate:flip use:attention={fresh.has(row.item.id)}>
          <p class="letter__meta"><span class="flag">{meta[0]}</span>{#each meta.slice(1) as m (m)}<span>{m}</span>{/each}</p>
          <h3 id="l-{id}"><a href={model.cardHref(id, row.boardId)} onclick={(e: MouseEvent) => go(e, id, row.boardId)}>{row.item.title}</a></h3>
          {#if noOwner}
            <blockquote class="quote quote--board">{row.item.instruction}</blockquote>
          {:else if row.item.detail}
            <blockquote class="quote" data-reveal>“{ui.expanded[id] ? row.item.detail : cut140(row.item.detail)}”{#if row.item.detail.length > 140}<button class="more" type="button" aria-expanded={ui.expanded[id] ? 'true' : 'false'} style="margin-left: var(--vk-space-2);" onclick={() => ui.toggle(id)}>{ui.expanded[id] ? 'Show less' : 'Show all'}</button>{/if}</blockquote>
          {/if}
          <div class="sig">{@render face(row.agentName, row.iconUrl, 28, 'needs')}<span>{row.agentName ? `— ${row.agentName}` : '— the board · unclaimed'}</span><BoardChip name={row.boardName} /></div>
          {#if !noOwner}<p class="hint">{stopHint(row.item)}</p>{/if}
          {#if ui.resuming === id}
            {@render resumeForm(row)}
          {:else if noOwner}
            <div class="acts">
              <label class="vk-visually-hidden" for="mv-{id}">Move to stage</label>
              <select class="select" id="mv-{id}" bind:value={ui.moveTo[id]}>{#each moveTargets(row.stages, row.item.stageKey) as s (s.key)}<option value={s.key}>{moveOptionLabel('paper', s, model.agents)}</option>{/each}</select>
              <Button variant="primary" class="btn-sm" type="button" onclick={() => ui.move(row)}><LineIcon name="move" />Move card</Button>
              <Button variant="secondary" class="btn-sm" href={model.cardHref(id, row.boardId)} onclick={(e: MouseEvent) => go(e, id, row.boardId)}>Open card</Button>
              <Button variant="quiet" class="btn-sm" href="/crew/capabilities">Staff an agent</Button>
            </div>
          {:else}
            <div class="acts">
              {#each row.actions as a (a)}
                {#if a === 'resume'}<Button variant="primary" class="btn-sm" type="button" aria-expanded="false" onclick={() => ui.openResume(row)}><LineIcon name="play" />Resume</Button>
                {:else if a === 'review' || a === 'answer'}<Button variant="primary" class="btn-sm" href={model.cardHref(id, row.boardId)} onclick={(e: MouseEvent) => go(e, id, row.boardId)}>{a === 'review' ? 'Review' : 'Answer'}</Button>
                {:else if a === 'open'}<Button variant="secondary" class="btn-sm" href={model.cardHref(id, row.boardId)} onclick={(e: MouseEvent) => go(e, id, row.boardId)}>Open card</Button>
                {:else if a === 'log'}<Button variant="quiet" class="btn-sm" href={model.cardHref(id, row.boardId)} onclick={(e: MouseEvent) => go(e, id, row.boardId, true)}>Open log</Button>
                {:else if a === 'staff'}<Button variant="quiet" class="btn-sm" href="/crew/capabilities">Staff an agent</Button>{/if}
              {/each}
            </div>
          {/if}
          {#if ui.refusals[id]}<p class="hint" role="alert" style="color: var(--vk-color-signal-text);">{ui.refusals[id]}</p>{/if}
        </article>
      {/each}
    </section>
    <section class="col" aria-labelledby="k2">
      <div class="kick"><h2 id="k2">Since you last looked</h2><span class="kick__n">{model.loading ? '–' : model.unread} unread{model.scoped ? '' : ' · all boards'}</span></div>
      <div class="toggle" role="group" aria-label="Which activity"><button type="button" aria-pressed={model.showRead ? 'false' : 'true'} onclick={() => (model.showRead = false)}>Unread only</button><button type="button" aria-pressed={model.showRead ? 'true' : 'false'} onclick={() => (model.showRead = true)}>Show all</button></div>
      {#if model.loading}<SkeletonRows label="Loading activity…" rows={2} rowHeight={60} />{:else if model.groups.length === 0}<p class="prose">{model.showRead ? (model.scoped ? 'Nothing has happened on this board yet.' : 'Nothing has happened on any board yet.') : 'Nothing unread.'}</p>{/if}
      {#each model.groups as g (g.cardId)}
        <div class="dig" in:rise animate:flip use:flashOnChange={g.latest.seq}>
          <h3>{@render face(g.agentName, g.iconUrl, 22, g.need ? 'needs' : 'resting')}<a href={model.cardHref(g.cardId, g.boardId)} onclick={(e: MouseEvent) => go(e, g.cardId, g.boardId)}>{g.title}</a></h3>
          {#each events(g) as n (n.seq)}
            <div class="dig__row"><p><span class="dig__t">{when(n)}</span>{staleLine(n, 'paper', g.need?.item.kind ?? null) ?? ` — ${noticeBody(n)} `}{#if g.need}<a href="#letters" class="lnk" style="min-height: 0px; display: inline;">The reason is in its letter.</a>{/if}</p>{#if !n.read}<button class="tick" type="button" aria-label="Mark read" onclick={() => model.markRead(n.seq, g.boardId)}><LineIcon name="tick" size={18} /></button>{/if}</div>
          {/each}
          <div class="acts" style="margin-top: var(--vk-space-1);">
            {#if g.need?.actions.includes('resume')}<Button variant="secondary" class="btn-sm" type="button" onclick={() => ui.fromActivity(g.need!, 'letters')}>Resume</Button>
            {:else if g.need?.actions.includes('move')}<Button variant="secondary" class="btn-sm" type="button" onclick={() => ui.fromActivity(g.need!, 'letters')}>Move</Button>{/if}
            {#if g.earlier.length > 0}<button class="more" type="button" aria-expanded={ui.earlierOpen[g.cardId] ? 'true' : 'false'} onclick={() => ui.toggleEarlier(g.cardId)}>Earlier reminders</button>{/if}
          </div>
        </div>
      {/each}
    </section>
    <aside class="col" aria-label="At work and the ledger">
      <section aria-labelledby="k3">
        <div class="kick"><h2 id="k3">At work</h2><span class="kick__n">{model.loading ? '–' : model.running.length}{model.scoped ? '' : ' · all boards'}</span></div>
        {#if model.loading}
          <SkeletonRows label="Checking what is running…" rows={2} />
        {:else if model.running.length === 0}
          <p class="prose">No agent is working anything right now.</p>
        {:else}
          {#each model.running as r (r.cardId)}<p class="prose">{r.agentName ?? 'An agent'} on <a class="lnk" style="min-height: 0px; display: inline;" href={model.cardHref(r.cardId, r.boardId)} onclick={(e: MouseEvent) => go(e, r.cardId, r.boardId)}>{r.title}</a>, in {r.stageName}{r.costUsd > 0 ? ` · ${usd(r.costUsd)}` : ''}.</p>{/each}
        {/if}
      </section>
      <section class="box" aria-labelledby="k4">
        <div class="kick"><h2 id="k4">The ledger</h2><span class="kick__n">last 7 days</span></div>
        {#if model.usageError}<p class="small">Couldn't load spend — {model.usageError}</p>{/if}
        {#if model.loading}
        <p class="figure">—</p>
        <SkeletonRows label="Loading spend…" rows={2} />
        {:else}
        <p class="figure" use:bumpOnChange={model.spend.total}>{usd(model.spend.total)}</p>
        <p class="prose" style="font-style: italic;">{paperCap(model.spend.cap)}</p>
        {/if}
        <p class="small">{model.loading ? '' : model.spend.top.length === 0 ? 'No agent has spent anything this week.' : `${model.spend.top[0]!.name} spent the most this week.`}</p>
        {#if caps.editing}
          <div class="caps">
            <label>Board cap $<input class="select" inputmode="decimal" placeholder="none" bind:value={caps.board} /></label>
            <label>Card cap $<input class="select" inputmode="decimal" placeholder="none" bind:value={caps.card} /></label>
            {#each [caps.boardError, caps.cardError, caps.refused].filter(Boolean) as msg (msg)}<p class="hint" role="alert" style="color: var(--vk-color-signal-text);">{msg}</p>{/each}
            <div class="acts"><Button variant="primary" class="btn-sm" type="button" disabled={caps.saving} onclick={() => caps.save()}>Save caps</Button><button class="more" type="button" onclick={() => caps.cancel(model.spend)}>Cancel</button></div>
          </div>
        {:else}
          <div class="acts"><Button variant="secondary" class="btn-sm" type="button" onclick={() => caps.start(model.spend)}>{hasCap ? 'Change the caps' : 'Set a budget cap'}</Button></div>
        {/if}
        {#if model.scoped}<a class="lnk" href="/b/{model.boardId}/operate/telemetry">Details <LineIcon name="arrow" size={14} /></a>{/if}
      </section>
    </aside>
  </div>
</div></div>
