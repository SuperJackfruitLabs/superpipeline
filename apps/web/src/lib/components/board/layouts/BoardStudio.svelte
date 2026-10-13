<!-- apps/web/src/lib/components/board/layouts/BoardStudio.svelte -->
<script lang="ts">
  /** Studio desktop board: the annual report (SB §4.2). The status line and the sub row are the shell's. */
  import '../studio/studio-board.css';
  import StudioHero from '../studio/StudioHero.svelte';
  import StudioNeedsPanel from '../studio/StudioNeedsPanel.svelte';
  import StudioRow from '../studio/StudioRow.svelte';
  import { multiples, quickFilters, quickMatch, shareBar, studioFigures, studioNotes, type Quick } from '../studio/studio-prose';
  import type { BoardLayoutProps } from './types';

  let { model }: BoardLayoutProps = $props();
  let quick = $state<Quick>('all');
  let sel = $state<number | null>(null);
  let tbody = $state<HTMLElement>();

  const rows = $derived(model.ordered.filter((s) => quickMatch(s, quick)));
  const panel = $derived(model.needs.filter((s) => quickMatch(s, quick)));
  const stageNames = $derived(model.stages.map((s) => s.name));
  const terminal = $derived(model.stages[model.stages.length - 1]?.name ?? 'Done');
  const share = $derived(shareBar(model));
  /** The first row of each stage carries `id="stage-{n}"`, the multiples' link target. */
  const anchors = $derived(new Map(model.stages.flatMap((st) => { const r = rows.find((x) => x.stageKey === st.key); return r ? [[r.id, `stage-${st.index}`] as const] : []; })));

  function rowKeys(e: KeyboardEvent): void {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const next = Math.max(0, Math.min(rows.length - 1, (sel ?? -1) + (e.key === 'ArrowDown' ? 1 : -1)));
    sel = next;
    tbody?.querySelectorAll<HTMLElement>('.ttl')[next]?.focus();
  }
  function toStage(e: MouseEvent, href: string): void {
    e.preventDefault();
    const row = document.getElementById(href.slice(1));
    row?.scrollIntoView({ block: 'center' });
    row?.querySelector<HTMLElement>('.ttl')?.focus();
  }
</script>

<div class="bd-grid">
  <div class="bd-main">
    <div class="bd-qf" role="group" aria-label="Quick filter">
      <span class="kick lb">Show</span>
      {#each quickFilters(model) as q (q.key)}
        <button type="button" aria-pressed={quick === q.key} class:sig={q.sig} onclick={() => { quick = q.key; sel = null; }}>{q.label} <b>{q.n}</b></button>
      {/each}
    </div>

    <StudioHero {model} />

    <section class="ar-sec" aria-labelledby="bd-fig-h">
      <div class="hd"><span class="no">01</span><h2 id="bd-fig-h">The board in figures</h2><span class="r">this week</span></div>
      <div class="ar-figs">
        {#each studioFigures(model) as f (f.label)}<div class:sig={f.sig}><b class:z={f.zero}>{f.value}</b><span>{f.label}{#if f.fn}<sup class="fn">{f.fn}</sup>{/if}</span></div>{/each}
      </div>
    </section>

    <section class="ar-sec" aria-labelledby="bd-sm-h">
      <div class="hd"><span class="no">02</span><h2 id="bd-sm-h">Where the cards are, stage by stage</h2><span class="r">1 square = 1 card · stages darken towards {terminal}</span></div>
      <div class="ar-sm">
        {#each multiples(model) as x (x.stage.key)}
          <a class="ar-mul" class:z={x.zero} href={x.href} aria-label={x.aria} onclick={(e) => toStage(e, x.href)}><span class="band {x.band}"></span><span class="lb"><span class="mono">{String(x.stage.index).padStart(2, '0')}</span><span class="nm">{x.stage.name}</span></span><span class="n" aria-hidden="true">{x.stage.count}</span><span class="units" aria-hidden="true">{#each x.units as u, i (i)}<span class="u {u}"></span>{/each}</span><span class="meta">{#if x.gate}<span class="gate">{x.gate}</span>{/if}<span class="who">{x.stage.ownerLong}</span></span><span class="note">{x.note.text}{#if x.note.fn}<sup class="fn">{x.note.fn}</sup>{/if}</span></a>
        {/each}
      </div>
    </section>

    {#if share.parts.length}
      <section class="ar-sec" aria-labelledby="bd-st-h">
        <div class="hd"><span class="no">03</span><h2 id="bd-st-h">What state they are in</h2><span class="r">share of {model.counts.all} {model.counts.all === 1 ? 'card' : 'cards'}</span></div>
        <div class="ar-share" role="img" aria-label={share.aria} style="grid-template-columns: {share.cols};">
          {#each share.parts as p (p.bar)}<span class="lab" class:s={p.signal}><b>{p.n}</b>{p.label}</span>{/each}
          {#each share.parts as p (p.bar)}<i class={p.bar}></i>{/each}
        </div>
      </section>
    {/if}

    <section class="ar-sec" aria-labelledby="bd-tb-h">
      <div class="hd"><span class="no">04</span><h2 id="bd-tb-h">Every card, people needed first</h2><span class="r"><span><span class="kbd">↑</span> <span class="kbd">↓</span> row</span><span><span class="kbd">Enter</span> open</span><span><span class="kbd">M</span> move</span><span><span class="kbd">Alt</span> + <span class="kbd">←</span> <span class="kbd">→</span> stage</span></span></div>
      <table class="ar-tbl">
        <caption class="sr">{model.counts.all} {model.counts.all === 1 ? 'card' : 'cards'}, people needed first</caption>
        <thead><tr><th scope="col" style="width: 32px;">No.</th><th scope="col">Card</th><th scope="col" style="width: 116px;">Stage</th><th scope="col" style="width: 112px;">Agent</th><th scope="col" style="width: 44px;">Tries</th><th scope="col" style="width: 44px;">Age</th><th scope="col" style="width: 92px;">Due</th><th scope="col" style="width: 140px;">State</th><th scope="col" style="width: 84px;"><span class="sr">Move</span></th></tr></thead>
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -- the table's row keys (arrows, M, Alt+arrows) are the grid pattern, delegated from the rows' title buttons -->
        <tbody bind:this={tbody} onkeydown={rowKeys}>
          {#each rows as s, i (s.id)}
            <StudioRow {s} stages={model.stageDefs} {stageNames} selected={sel === i} anchor={anchors.get(s.id)} onSelect={() => (sel = i)} />
          {/each}
        </tbody>
      </table>
    </section>

    <section aria-labelledby="bd-fn-h">
      <h2 id="bd-fn-h" class="sr">Notes</h2>
      <ol class="ar-notes">
        {#each studioNotes(model) as note (note.n)}
          <li><span class="k">{note.n}</span><span>{#each note.parts as p, i (i)}{#if typeof p === 'string'}{p}{:else}<i>{p.i}</i>{/if}{/each}</span></li>
        {/each}
      </ol>
    </section>
  </div>
  <StudioNeedsPanel cards={panel} stages={model.stageDefs} boardId={model.boardId} />
</div>
