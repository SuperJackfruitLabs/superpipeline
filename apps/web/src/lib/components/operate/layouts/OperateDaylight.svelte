<!-- apps/web/src/lib/components/operate/layouts/OperateDaylight.svelte -->
<script lang="ts">
  import { untrack } from 'svelte';
  import SkeletonRows from '$lib/components/parts/SkeletonRows.svelte';
  import { attention, bumpOnChange, countUp, flashOnChange, flip, rise } from '@superjackfruit/vibekit/motion';
  import { arrivals } from '$lib/motion/arrivals';
  /** SP-Operate-Daylight: Needs you on the left; Running, Spend and Activity on the right. */
  import { Button, Face, Segmented } from '@superjackfruit/vibekit';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import BoardChip from '$lib/components/inbox/BoardChip.svelte';
  import { acrossBoards, askBoards } from '$lib/components/inbox/inbox-words';
  import { moveTargets } from '../operate-data';
  import { CapsUi, OperateUi } from '../operate-ui.svelte';
  import { cut140, daylightCap, daylightMeta, kindWord, moveOptionLabel, resumeOptions, RESUME_LABEL, staleLine, noticeBody, stopHint, usd, when } from '../operate-words';
  import type { NeedRow, OperateLayoutProps } from './types';
  import './operate-daylight.css';

  let { model, ui: uiProp, caps: capsProp }: OperateLayoutProps = $props();
  const ui = untrack(() => uiProp) ?? new OperateUi(() => model);
  const caps = untrack(() => capsProp) ?? new CapsUi(() => model);

  function go(e: MouseEvent, id: string, boardId: string, log = false): void {
    e.preventDefault();
    if (log) model.openLog(id, boardId);
    else model.open(id, boardId);
  }
  const events = (g: (typeof model.groups)[number]) => (ui.earlierOpen[g.cardId] ? [g.latest, ...g.earlier] : [g.latest]);
  const WHICH = [{ value: 'unread', label: 'Unread only' }, { value: 'all', label: 'Show all' }];
  const hasCap = $derived(model.spend.cap !== null || model.spend.cardCap !== null);

  // Motion: an ask that arrives while the Inbox is open pulses gently three times (its row and the count already say it).
  const arrived = arrivals();
  let fresh = $state(new Set<string>());
  $effect(() => { const ids = model.needs.map((r) => r.item.id); if (!model.loading) fresh = arrived(ids); });
</script>

{#snippet face(name: string | null, iconUrl: string | null, size: number, mood: 'needs' | 'working' | 'resting')}
  {#if name}<Face id={name} label={name} {mood} {size} src={iconUrl ?? undefined} />{:else}<span class="noface" aria-hidden="true" style="width: {size}px; height: {size}px;"></span>{/if}
{/snippet}

{#snippet acts(row: NeedRow)}
  {@const id = row.item.cardId}
  <div class="acts">
    {#each row.actions as a (a)}
      {#if a === 'resume'}<Button variant="primary" class="btn-sm" type="button" aria-expanded="false" onclick={() => ui.openResume(row)}><LineIcon name="play" />Resume</Button>
      {:else if a === 'review' || a === 'answer'}<Button variant="primary" class="btn-sm" href={model.cardHref(id, row.boardId)} onclick={(e: MouseEvent) => go(e, id, row.boardId)}>{a === 'review' ? 'Review' : 'Answer'}</Button>
      {:else if a === 'open'}<Button variant="secondary" class="btn-sm" href={model.cardHref(id, row.boardId)} onclick={(e: MouseEvent) => go(e, id, row.boardId)}>Open card</Button>
      {:else if a === 'log'}<Button variant="quiet" class="btn-sm" href={model.cardHref(id, row.boardId)} onclick={(e: MouseEvent) => go(e, id, row.boardId, true)}>Open log</Button>
      {:else if a === 'staff'}<Button variant="quiet" class="btn-sm" href="/crew/capabilities">Staff an agent</Button>{/if}
    {/each}
  </div>
{/snippet}

{#snippet moveActs(row: NeedRow)}
  {@const id = row.item.cardId}
  <div class="acts">
    <label class="vk-visually-hidden" for="mv-{id}">Move to stage</label>
    <select class="select" id="mv-{id}" bind:value={ui.moveTo[id]}>
      {#each moveTargets(row.stages, row.item.stageKey) as s (s.key)}<option value={s.key}>{moveOptionLabel('daylight', s, model.agents)}</option>{/each}
    </select>
    <Button variant="primary" class="btn-sm" type="button" onclick={() => ui.move(row)}><LineIcon name="move" />Move card</Button>
    <Button variant="secondary" class="btn-sm" href={model.cardHref(id, row.boardId)} onclick={(e: MouseEvent) => go(e, id, row.boardId)}>Open card</Button>
    <Button variant="quiet" class="btn-sm" href="/crew/capabilities">Staff an agent</Button>
  </div>
{/snippet}

<div class="op-dy"><div class="grid">
  <div>
    <section class="panel" id="needs" aria-labelledby="h-needs">
      <div class="ph"><h2 id="h-needs">Needs you</h2><span class="count" class:count--needs={!model.loading && model.needs.length > 0} use:bumpOnChange={model.needs.length}>{model.loading ? '–' : model.needs.length}</span>{#if !model.scoped && !model.loading}<span class="ph__end">{acrossBoards(askBoards(model.needs))}</span>{/if}</div>
      {#if model.loading}<SkeletonRows label="Checking your boards…" rowHeight={132} slow={model.slow} />{:else if model.needs.length === 0}<p class="empty">Nothing is waiting on you.</p>{/if}
      {#each model.needs as row (row.item.id)}
        {@const id = row.item.cardId}
        {@const noOwner = row.item.kind === 'no-owner'}
        <article class="ask" aria-labelledby="t-{id}" data-attention-row={row.item.kind} in:rise animate:flip use:attention={fresh.has(row.item.id)}>
          {@render face(row.agentName, row.iconUrl, 32, 'needs')}
          <div>
            <div class="ask__who"><b>{row.agentName ?? 'Unclaimed'}</b><BoardChip name={row.boardName} /><span>{daylightMeta(row)}</span><span class="badge badge--needs">{kindWord(row.item.kind)}</span></div>
            <h3 class="ask__title" id="t-{id}"><a href={model.cardHref(id, row.boardId)} onclick={(e: MouseEvent) => go(e, id, row.boardId)}>{row.item.title}</a></h3>
            {#if noOwner}
              <div class="bubble bubble--system"><p>{row.item.instruction}</p></div>
            {:else if row.item.detail}
              <div class="bubble"><p>{ui.expanded[id] ? row.item.detail : cut140(row.item.detail)}</p>{#if row.item.detail.length > 140}<button class="bubble__more" type="button" aria-expanded={ui.expanded[id] ? 'true' : 'false'} onclick={() => ui.toggle(id)}>{ui.expanded[id] ? 'Show less' : 'Show all'}</button>{/if}</div>
            {/if}
            {#if !noOwner}<p class="hint">{stopHint(row.item)}</p>{/if}
            {#if ui.resuming === id}
              <form class="resume" aria-label="Resume {row.agentName ?? 'this card'}" onsubmit={(e) => { e.preventDefault(); void ui.send(row); }}>
                <div class="resume__row">
                  <label class="lbl">Resume at<select class="select" id="resume-at-{id}" bind:value={ui.resumeAt}>{#each resumeOptions(row.stages, row.item.stageKey) as o (o.key)}<option value={o.key}>{o.label}</option>{/each}</select></label>
                </div>
                <label class="lbl">{RESUME_LABEL}
                  <textarea class="textarea" bind:value={ui.text}></textarea></label>
                <div class="acts" style="margin-top: 0px;"><Button variant="primary" class="btn-sm" type="submit" aria-disabled={ui.canSend ? 'false' : 'true'}><LineIcon name="play" />Send back to work</Button><Button variant="quiet" class="btn-sm" type="button" onclick={() => ui.cancel()}>Cancel</Button></div>
              </form>
            {:else if noOwner}
              {@render moveActs(row)}
            {:else}
              {@render acts(row)}
            {/if}
            {#if ui.refusals[id]}<p class="hint" role="alert" style="color: var(--vk-color-signal-text);">{ui.refusals[id]}</p>{/if}
          </div>
        </article>
      {/each}
    </section>
  </div>
  <div>
    <section class="panel" aria-labelledby="h-run">
      <div class="ph" style="margin-bottom: var(--vk-space-3);"><h2 id="h-run">Running</h2><span class="count">{model.loading ? '–' : model.running.length}</span>{#if !model.scoped}<span class="ph__end">all boards</span>{/if}</div>
      {#if model.loading}
        <SkeletonRows label="Checking what is running…" rows={2} rowHeight={56} />
      {:else if model.running.length === 0}
        <p class="empty"><LineIcon name="clock" size={22} />No agent is working anything right now.</p>
      {:else}
        {#each model.running as r (r.cardId)}
          <div class="grp">
            <div class="grp__head">{@render face(r.agentName, r.iconUrl, 24, 'working')}<h3 class="grp__title"><a href={model.cardHref(r.cardId, r.boardId)} onclick={(e: MouseEvent) => go(e, r.cardId, r.boardId)}>{r.title}</a></h3></div>
            <div class="ev"><span class="ev__t">{r.stageName}</span><span class="ev__body">{r.agentName ?? 'An agent'}{r.costUsd > 0 ? ` · ${usd(r.costUsd)}` : ''}</span></div>
          </div>
        {/each}
      {/if}
    </section>
    <section class="panel" aria-labelledby="h-spend">
      <div class="ph"><h2 id="h-spend">Spend</h2><span class="count" style="font-weight: 500; font-family: var(--vk-font-body); font-size: var(--vk-text-sm);">{model.scoped ? '' : 'all boards · '}last 7 days</span>{#if model.scoped}<a class="ph__end" href="/b/{model.boardId}/operate/telemetry">Details <LineIcon name="arrow" /></a>{/if}</div>
      {#if model.usageError}<p class="empty" style="font-size: var(--vk-text-sm);">Couldn't load spend — {model.usageError}</p>{/if}
      {#if model.loading}
        <div class="spend"><span class="spend__n">—</span><span class="spend__cap"></span></div>
      {:else}
        <div class="spend"><span class="spend__n" use:countUp={{ value: model.spend.total, format: usd }}></span><span class="spend__cap">{daylightCap(model.spend.cap)}</span></div>
      {/if}
      <div class="bar" aria-hidden="true">{#if !model.loading && model.spend.pct !== null}<i style="display: block; height: 100%; border-radius: inherit; width: {model.spend.pct}%; background: {model.spend.overBudget ? 'var(--vk-color-signal)' : 'var(--vk-color-text)'};"></i>{/if}</div>
      {#if model.loading}
        <SkeletonRows label="Loading spend…" rows={1} />
      {:else if model.spend.top.length === 0}
        <p class="empty" style="font-size: var(--vk-text-sm);">No agent has spent anything in the last 7 days.</p>
      {:else}
        {#each model.spend.top as a (a.name)}<p class="empty" style="font-size: var(--vk-text-sm);">{a.name} · {usd(a.costUsd)}</p>{/each}
      {/if}
      {#if caps.editing}
        <div class="resume">
          <div class="resume__row">
            <label class="lbl">Board cap $<input class="money" inputmode="decimal" placeholder="none" bind:value={caps.board} /></label>
            <label class="lbl">Card cap $<input class="money" inputmode="decimal" placeholder="none" bind:value={caps.card} /></label>
          </div>
          {#each [caps.boardError, caps.cardError, caps.refused].filter(Boolean) as msg (msg)}<p class="hint" role="alert" style="color: var(--vk-color-signal-text);">{msg}</p>{/each}
          <div class="acts" style="margin-top: 0px;"><Button variant="primary" class="btn-sm" type="button" disabled={caps.saving} onclick={() => caps.save()}>Save caps</Button><Button variant="quiet" class="btn-sm" type="button" onclick={() => caps.cancel(model.spend)}>Cancel</Button></div>
        </div>
      {:else}
        <div class="acts"><Button variant="secondary" class="btn-sm" type="button" onclick={() => caps.start(model.spend)}><LineIcon name="dollar" />{hasCap ? 'Change the caps' : 'Set a budget cap'}</Button></div>
      {/if}
    </section>
    <section class="panel" aria-labelledby="h-act">
      <div class="ph" style="flex-wrap: wrap;"><h2 id="h-act">Activity</h2><span class="count">{model.loading ? '–' : model.unread} unread{model.scoped ? '' : ' · all boards'}</span>
        <div class="seg"><Segmented size="sm" label="Which activity" options={WHICH} bind:value={() => (model.showRead ? 'all' : 'unread'), (v) => { model.showRead = v === 'all'; }} /></div>
      </div>
      {#if model.loading}<SkeletonRows label="Loading activity…" rows={2} rowHeight={56} />{:else if model.groups.length === 0}<p class="empty">{model.showRead ? (model.scoped ? 'Nothing has happened on this board yet.' : 'Nothing has happened on any board yet.') : 'Nothing unread.'}</p>{/if}
      {#each model.groups as g (g.cardId)}
        <div class="grp" in:rise animate:flip use:flashOnChange={g.latest.seq}>
          <div class="grp__head">{@render face(g.agentName, g.iconUrl, 24, g.need ? 'needs' : 'resting')}<h3 class="grp__title"><a href={model.cardHref(g.cardId, g.boardId)} onclick={(e: MouseEvent) => go(e, g.cardId, g.boardId)}>{g.title}</a></h3></div>
          {#each events(g) as n (n.seq)}
            <div class="ev"><span class="ev__t">{when(n)}</span><span class="ev__body">{staleLine(n, 'daylight', g.need?.item.kind ?? null) ?? noticeBody(n)}{#if g.need}{' '}<a href="#needs">Why, in Needs you</a>{/if}</span>{#if !n.read}<button class="tick" type="button" aria-label="Mark read" onclick={() => model.markRead(n.seq, g.boardId)}><LineIcon name="tick" size={20} /></button>{/if}</div>
          {/each}
          {#if (g.need && (g.need.actions.includes('resume') || g.need.actions.includes('move'))) || g.earlier.length > 0}
            <div class="ev__acts">
              {#if g.need?.actions.includes('resume')}<Button variant="secondary" class="btn-sm" type="button" onclick={() => ui.fromActivity(g.need!, 'needs')}><LineIcon name="play" />Resume</Button>
              {:else if g.need?.actions.includes('move')}<Button variant="secondary" class="btn-sm" type="button" onclick={() => ui.fromActivity(g.need!, 'needs')}><LineIcon name="move" />Move</Button>{/if}
              {#if g.earlier.length > 0}<Button variant="quiet" class="btn-sm" type="button" aria-expanded={ui.earlierOpen[g.cardId] ? 'true' : 'false'} onclick={() => ui.toggleEarlier(g.cardId)}>Earlier reminders</Button>{/if}
            </div>
          {/if}
        </div>
      {/each}
    </section>
  </div>
</div></div>
