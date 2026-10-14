<!-- apps/web/src/lib/components/operate/layouts/OperateStudio.svelte -->
<script lang="ts">
  import BoardChip from '$lib/components/inbox/BoardChip.svelte';
  import { acrossBoards, askBoards, inboxCounts, inboxSubline, wantYou } from '$lib/components/inbox/inbox-words';
  import { greetNamed } from '$lib/greet';
  import { viewport } from '$lib/viewport.svelte';
  import SkeletonRows from '$lib/components/parts/SkeletonRows.svelte';
  import { attention, countUp, rise } from '@superjackfruit/vibekit/motion';
  import { arrivals } from '$lib/motion/arrivals';
  /** SP-Operate-Studio: the annual-report spread, with J/K/R/M/O/. on the Needs table. */
  import { tick, untrack } from 'svelte';
  import { Face } from '@superjackfruit/vibekit';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import MoveMenu from '$lib/components/parts/MoveMenu.svelte';
  import { moveTargets } from '../operate-data';
  import { CapsUi, OperateUi } from '../operate-ui.svelte';
  import { attemptsSignalOperate, kindCell, needCounts, resumeOptions, RESUME_LABEL, staleLine, noticeBody, studioAge, studioCapFigure, studioHeroTitle, studioOpLine, studioSub, summarySentenceStudio, usd, when } from '../operate-words';
  import type { NeedRow, OperateLayoutProps } from './types';
  import './operate-studio.css';

  let { model, ui: uiProp, caps: capsProp }: OperateLayoutProps = $props();
  const ui = untrack(() => uiProp) ?? new OperateUi(() => model);
  const caps = untrack(() => capsProp) ?? new CapsUi(() => model);
  untrack(() => { if (!caps.editing) caps.start(model.spend); });

  let selected = $state(0);
  let menuFor = $state<string | null>(null);
  const triggers: Record<string, HTMLButtonElement> = {};
  const whys: Record<string, HTMLElement> = {};
  let clamped = $state<Record<string, boolean>>({});

  const hero = $derived(studioHeroTitle(model.needs.length, model.running.length));
  const capFig = $derived(studioCapFigure(model.spend.cap));
  const pad = (n: number) => String(n).padStart(2, '0');
  const go = (e: MouseEvent, id: string, boardId: string, log = false) => { e.preventDefault(); if (log) model.openLog(id, boardId); else model.open(id, boardId); };
  const events = (g: (typeof model.groups)[number]) => (ui.earlierOpen[g.cardId] ? [g.latest, ...g.earlier] : [g.latest]);

  /** "Show all" only where the three-line clamp actually hides something. */
  function measure(): void {
    const next: Record<string, boolean> = {};
    for (const [id, el] of Object.entries(whys)) if (el) next[id] = el.scrollHeight > el.clientHeight + 1;
    clamped = next;
  }
  $effect(() => {
    void model.needs;
    void tick().then(measure);
    void document.fonts?.ready.then(measure);
  });

  function openMenu(row: NeedRow): void { menuFor = row.item.cardId; }
  function closeMenu(): void { const id = menuFor; menuFor = null; if (id) triggers[id]?.focus(); }
  async function pick(row: NeedRow, key: string): Promise<void> { menuFor = null; await ui.move(row, key); triggers[row.item.cardId]?.focus(); }

  function onkeydown(e: KeyboardEvent): void {
    const t = e.target;
    if (e.metaKey || e.ctrlKey || e.altKey || (t instanceof Element && t.closest('input, textarea, select, [contenteditable="true"], [role="menu"]'))) return;
    const rows = model.needs;
    const row = rows[selected];
    switch (e.key.toLowerCase()) {
      case 'j': selected = Math.min(rows.length - 1, selected + 1); break;
      case 'k': selected = Math.max(0, selected - 1); break;
      case 'r': if (row?.actions.includes('resume')) void ui.openResume(row); else return; break;
      case 'm': if (row?.actions.includes('move')) openMenu(row); else return; break;
      case 'o': if (row) model.open(row.item.cardId, row.boardId); else return; break;
      case '.': {
        const g = row && model.groups.find((x) => x.cardId === row.item.cardId);
        if (g && !g.latest.read) void model.markRead(g.latest.seq, g.boardId); else return;
        break;
      }
      default: return;
    }
    e.preventDefault();
  }

  // Motion: an ask that arrives while the Inbox is open pulses gently three times (its row and the count already say it).
  const arrived = arrivals();
  let fresh = $state(new Set<string>());
  $effect(() => { const ids = model.needs.map((r) => r.item.id); if (!model.loading) fresh = arrived(ids); });
</script>

<svelte:window {onkeydown} />

{#snippet face(name: string | null, iconUrl: string | null, mood: 'needs' | 'working' | 'resting')}
  {#if name}<Face id={name} label={name} {mood} size={20} src={iconUrl ?? undefined} />{:else}<span class="u off" aria-hidden="true" style="width: 20px; height: 20px;"></span>{/if}
{/snippet}

<div class="op-main">
  <div class="op-line">
    <span class="kick">Inbox · {model.boardName}</span>
    <span class="keys" aria-label="Keyboard"><span><span class="kbd">J</span><span class="kbd">K</span> select</span><span><span class="kbd">R</span> resume</span><span><span class="kbd">M</span> move</span><span><span class="kbd">O</span> open</span><span><span class="kbd">.</span> mark read</span></span>
    <span class="r">{studioOpLine(model.nowMs, model.phase)}</span>
  </div>

  <div class="ar-hero">
    <span class="big" class:ink={model.needs.length === 0} aria-hidden="true">{model.needs.length}</span>
    <div class="txt">
      <span class="kick">Inbox</span>
      <svelte:element this={viewport.phone ? 'h2' : 'h1'} class="op-title">{greetNamed(model.phase, model.firstName)} {wantYou(model.needs.length)}</svelte:element>
      <p>{inboxSubline(inboxCounts(model.needs), askBoards(model.needs), model.running.length)}</p>
    </div>
  </div>

  <section class="ar-sec" aria-labelledby="op-f">
    <div class="hd"><span class="no">01</span><h2 id="op-f">Operations in figures</h2><span class="r">last 7 days</span></div>
    <div class="ar-figs">
      <div class:sig={model.needs.length > 0}><b class:z={model.needs.length === 0}>{model.needs.length}</b><span>Needs you</span></div>
      <div><b class:z={model.running.length === 0}>{model.running.length}</b><span>Running</span></div>
      <div><b class:z={model.spend.total === 0} use:countUp={{ value: model.spend.total, format: usd }}></b><span>Spend · 7 days</span></div>
      <div><b class:z={capFig.zero}>{capFig.value}</b><span>{capFig.label}</span></div>
      <div><b class:z={model.unread === 0}>{model.unread}</b><span>Unread activity</span></div>
    </div>
  </section>

  <section class="ar-sec" id="needs" aria-labelledby="op-n">
    <div class="hd"><span class="no">02</span><h2 id="op-n">Needs you</h2><span class="r"><span class="sigt">{model.needs.length}</span>{#if !model.scoped}<span class="m"> · {acrossBoards(askBoards(model.needs))}</span>{/if}</span></div>
    {#if model.loading}
      <SkeletonRows label="Loading what needs you…" />
    {:else if model.needs.length === 0}
      <p class="op-empty">Nothing on this board is waiting on you.</p>
    {:else}
      <table class="ar-tbl op-tbl">
        <thead><tr><th scope="col" style="width: 30px;">No.</th><th scope="col" style="width: 100px;">Kind</th><th scope="col">Card · stage</th><th scope="col" style="width: 116px;">Agent</th><th scope="col" style="width: 44px;">Age</th><th scope="col" style="width: 40px;">Att.</th><th scope="col" style="width: 30%;">Why it stopped</th><th scope="col" style="width: 200px;">Actions</th></tr></thead>
        <tbody>
          {#each model.needs as row, i (row.item.id)}
            {@const id = row.item.cardId}
            {@const noOwner = row.item.kind === 'no-owner'}
            <tr class:sel={selected === i} aria-current={selected === i ? 'true' : undefined} data-attention-row={row.item.kind} in:rise use:attention={fresh.has(row.item.id)}>
              <td><span class="ix">{pad(i + 1)}</span></td>
              <td><span class="op-kind"><span class="u needs"></span>{noOwner ? 'No owner' : 'Stopped'}</span></td>
              <td><a class="ttl" href={model.cardHref(id, row.boardId)} onclick={(e: MouseEvent) => go(e, id, row.boardId)}>{row.item.title}</a><div class="op-sub"><span class="chip c{row.stageIndex}"></span>{studioSub(row)}</div></td>
              <td><span class="ag">{#if row.agentName}<Face id={row.agentName} label={row.agentName} mood="needs" size={20} src={row.iconUrl ?? undefined} />{row.agentName}{:else}<span class="m">Unclaimed</span>{/if}<BoardChip name={row.boardName} /></span></td>
              <td><span class="m">{studioAge(row)}</span></td>
              <td><span class="m">{#if noOwner}—{:else if attemptsSignalOperate(row.card.attemptCount)}<span class="sigt">{row.card.attemptCount}</span>{:else}{row.card.attemptCount}{/if}</span></td>
              <td>
                {#if noOwner}
                  <p class="op-why" style="font-family: var(--ff); font-size: 14px;">{row.item.instruction}</p>
                {:else}
                  <p class="op-why" class:clamp={!ui.expanded[id]} bind:this={whys[id]}>{row.item.detail ?? row.item.headline}</p>
                  {#if clamped[id] || ui.expanded[id]}<button class="ar-lk" type="button" aria-expanded={ui.expanded[id] ? 'true' : 'false'} onclick={() => ui.toggle(id)}>{ui.expanded[id] ? 'Show less' : 'Show all'}</button>{/if}
                {/if}
              </td>
              <td>
                <div class="op-acts">
                  {#if noOwner}
                    <button class="ar-btn" type="button" aria-haspopup="menu" aria-expanded={menuFor === id ? 'true' : undefined} aria-keyshortcuts="M" bind:this={triggers[id]} onclick={() => (menuFor === id ? closeMenu() : openMenu(row))}>Move… <span class="kbd" aria-hidden="true">M</span></button>
                    {#if menuFor === id}<MoveMenu class="op-menu" trigger={triggers[id]} items={moveTargets(row.stages, row.item.stageKey).map((s) => ({ key: s.key, name: s.name, here: false }))} onpick={(k) => pick(row, k)} onclose={closeMenu} />{/if}
                    <a class="ar-btn2" href={model.cardHref(id, row.boardId)} aria-keyshortcuts="O" onclick={(e: MouseEvent) => go(e, id, row.boardId)}>Open <span class="kbd" aria-hidden="true">O</span></a>
                    <a class="ar-lk" href="/crew/capabilities">Staff an agent</a>
                  {:else}
                    {#if row.actions.includes('resume')}<button class="ar-btn" type="button" aria-keyshortcuts="R" onclick={() => ui.openResume(row)}>Resume <span class="kbd" aria-hidden="true">R</span></button>{/if}
                    <a class="ar-btn2" href={model.cardHref(id, row.boardId)} aria-keyshortcuts="O" onclick={(e: MouseEvent) => go(e, id, row.boardId)}>Open <span class="kbd" aria-hidden="true">O</span></a>
                    {#if row.actions.includes('log')}<a class="ar-lk" href={model.cardHref(id, row.boardId)} onclick={(e: MouseEvent) => go(e, id, row.boardId, true)}>Log</a>{/if}
                  {/if}
                </div>
                {#if ui.refusals[id]}<p class="ar-hint sigt" role="alert">{ui.refusals[id]}</p>{/if}
              </td>
            </tr>
            {#if ui.resuming === id}
              <tr class="op-resume"><td colspan="8">
                <form aria-label="Resume {row.agentName ?? 'this card'}" onsubmit={(e) => { e.preventDefault(); void ui.send(row); }}>
                  <div class="ar-field"><label for="resume-at-{id}">Resume at</label><select class="ar-sel" id="resume-at-{id}" bind:value={ui.resumeAt}>{#each resumeOptions(row.stages, row.item.stageKey) as o (o.key)}<option value={o.key}>{o.label}</option>{/each}</select></div>
                  <div class="ar-field"><label for="resume-note-{id}">{RESUME_LABEL}</label><textarea class="ar-ta" id="resume-note-{id}" bind:value={ui.text}></textarea></div>
                  <div class="op-acts"><button class="ar-btn" type="submit" aria-disabled={ui.canSend ? 'false' : 'true'}>Send back to work</button><button class="ar-lk quiet" type="button" onclick={() => ui.cancel()}>Cancel</button></div>
                </form>
              </td></tr>
            {/if}
          {/each}
        </tbody>
      </table>
    {/if}
  </section>

  <div class="op-split">
    <section class="ar-sec" aria-labelledby="op-a">
      <div class="hd"><span class="no">03</span><h2 id="op-a">Activity</h2><span class="r">{model.unread} unread{model.scoped ? '' : ' · all boards'} · by card <span class="op-seg" role="group" aria-label="Which activity"><button type="button" aria-pressed={model.showRead ? 'false' : 'true'} onclick={() => (model.showRead = false)}>Unread</button><button type="button" aria-pressed={model.showRead ? 'true' : 'false'} onclick={() => (model.showRead = true)}>All</button></span></span></div>
      {#if model.groups.length === 0}
        <p class="op-empty">{model.showRead ? (model.scoped ? 'Nothing has happened on this board yet.' : 'Nothing has happened on any board yet.') : 'Nothing unread.'}</p>
      {:else}
        <table class="ar-tbl">
          <thead><tr><th scope="col" style="width: 64px;">Time</th><th scope="col" style="width: 72px;">Kind</th><th scope="col">What</th><th scope="col" style="width: 44px;"><span class="sr">Mark read</span></th></tr></thead>
          <tbody>
            {#each model.groups as g (g.cardId)}
              <tr class="op-grp"><td colspan="4"><div class="in">{@render face(g.agentName, g.iconUrl, g.need ? 'needs' : 'resting')}<a class="ttl" href={model.cardHref(g.cardId, g.boardId)} onclick={(e: MouseEvent) => go(e, g.cardId, g.boardId)}>{g.title}</a><span class="end">{#if g.need?.actions.includes('resume')}<button class="ar-btn2" type="button" style="min-height: 44px;" onclick={() => { selected = model.needs.indexOf(g.need!); void ui.fromActivity(g.need!, 'needs'); }}>Resume</button>{:else if g.need?.actions.includes('move')}<button class="ar-btn2" type="button" aria-haspopup="menu" style="min-height: 44px;" onclick={() => { selected = model.needs.indexOf(g.need!); document.getElementById('needs')?.scrollIntoView?.({ block: 'start' }); openMenu(g.need!); }}>Move…</button>{/if}{#if g.earlier.length > 0}<button class="ar-lk quiet" type="button" aria-expanded={ui.earlierOpen[g.cardId] ? 'true' : 'false'} onclick={() => ui.toggleEarlier(g.cardId)}>Earlier</button>{/if}</span></div></td></tr>
              {#each events(g) as n (n.seq)}
                <tr class="op-ev"><td><span class="m">{when(n)}</span></td><td><span class="kick">{kindCell(n)}</span></td><td>{staleLine(n, 'studio', g.need?.item.kind ?? null) ?? `${noticeBody(n)} `}{#if g.need}<a class="ar-lk" href="#needs" style="min-height: 0px;">reason ↑</a>{/if}</td><td>{#if !n.read}<button class="op-tick" type="button" aria-label="Mark read" onclick={() => model.markRead(n.seq, g.boardId)}><LineIcon name="tick-ar" size={16} stroke={1.75} /></button>{/if}</td></tr>
              {/each}
            {/each}
          </tbody>
        </table>
      {/if}
    </section>
    <div class="op-stack">
      <section class="ar-sec" aria-labelledby="op-r">
        <div class="hd"><span class="no">04</span><h2 id="op-r">Running</h2><span class="r">{model.running.length}{model.scoped ? '' : ' · all boards'}</span></div>
        <table class="ar-tbl"><thead><tr><th scope="col">Agent</th><th scope="col">Card · stage</th><th scope="col" style="width: 64px;">Cost</th></tr></thead>
        <tbody>
          {#each model.running as r (r.cardId)}
            <tr><td><span class="ag">{@render face(r.agentName, r.iconUrl, 'working')}{r.agentName ?? '—'}</span></td><td><a class="ttl" href={model.cardHref(r.cardId, r.boardId)} onclick={(e: MouseEvent) => go(e, r.cardId, r.boardId)}>{r.title}</a><div class="op-sub">{r.stageName}</div></td><td><span class="m">{r.costUsd > 0 ? usd(r.costUsd) : '—'}</span></td></tr>
          {:else}
            <tr><td colspan="3" class="serif muted" style="font-size: 16px;">No agent is working anything right now.</td></tr>
          {/each}
        </tbody></table>
      </section>
      <section class="ar-sec" aria-labelledby="op-s">
        <div class="hd"><span class="no">05</span><h2 id="op-s">Spend</h2><span class="r">{model.scoped ? '' : 'all boards · '}last 7 days{#if model.scoped} · <a class="ar-lk" href="/b/{model.boardId}/operate/telemetry" style="min-height: 0px;">Detail <LineIcon name="arrow-ar" size={14} stroke={1.75} /></a>{/if}</span></div>
        {#if model.usageError}<p class="ar-hint">Couldn't load spend — {model.usageError}</p>{/if}
        <div class="ar-figs" style="grid-auto-flow: row; border-bottom: 0px;"><div><b class:z={model.spend.total === 0}>{usd(model.spend.total)}</b><span>{model.spend.cap === null ? 'No cap set' : `of ${usd(model.spend.cap)} cap`}</span></div></div>
        <div class="op-bar" aria-hidden="true">{#if model.spend.pct !== null}<i class="sp-fill" style="display: block; height: 100%; --p: {model.spend.pct / 100}; background: {model.spend.overBudget ? 'var(--sig)' : 'var(--text)'};"></i>{/if}</div>
        <table class="ar-tbl"><thead><tr><th scope="col">Top agents</th><th scope="col" style="width: 64px;">$</th></tr></thead><tbody>
          {#each model.spend.top as a (a.name)}
            <tr><td>{a.name}</td><td><span class="m">{usd(a.costUsd)}</span></td></tr>
          {:else}
            <tr><td colspan="2" class="serif muted" style="font-size: 16px;">No agent spend in the window.</td></tr>
          {/each}
        </tbody></table>
        <form class="op-cap" aria-label="Set a budget cap" onsubmit={(e) => { e.preventDefault(); void caps.save(); }}>
          <div class="ar-field"><label for="op-bc">Board cap $</label><input id="op-bc" class="ar-in" type="text" inputmode="decimal" placeholder="none" bind:value={caps.board} />{#if caps.boardError}<span class="ar-hint sigt">{caps.boardError}</span>{/if}</div>
          <div class="ar-field"><label for="op-cc">Card cap $</label><input id="op-cc" class="ar-in" type="text" inputmode="decimal" placeholder="none" bind:value={caps.card} />{#if caps.cardError}<span class="ar-hint sigt">{caps.cardError}</span>{/if}</div>
          {#if caps.refused}<p class="ar-hint sigt" role="alert">{caps.refused}</p>{/if}
          <div class="row"><button class="ar-btn" type="button" disabled={caps.saving} onclick={() => caps.save()}>Save caps</button><button class="ar-lk quiet" type="button" onclick={() => caps.start(model.spend)}>Cancel</button></div>
        </form>
      </section>
    </div>
  </div>
</div>
