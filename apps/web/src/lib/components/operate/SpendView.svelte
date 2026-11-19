<!-- apps/web/src/lib/components/operate/SpendView.svelte -->
<script lang="ts">
  /**
   * Spend, in detail, one composition in every vibe (composition contract): the page head (the page's
   * one `[data-signature]` slot, restyled per vibe in spend.css, same words everywhere) with the time
   * window, the four figures, spend by day, by agent, board, model and card, the budget caps, and the
   * board log's latest events with a link to the whole log.
   */
  import { Face } from '@superjackfruitlabs/vibekit-ui';
  import { viewport } from '$lib/viewport.svelte';
  import './spend.css';
  import PageMain from '$lib/components/parts/PageMain.svelte';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { displayAgent } from '$lib/names';
  import { app } from '$lib/stores/app.svelte';
  import BoardLog from './BoardLog.svelte';
  import BudgetCaps from './BudgetCaps.svelte';
  import { avgPerCard, barHeight, budgetLine, busiestLine, cardsWithSpend, chartLabel, compactCount, dayLabel, dayRange, pctOf, shortId, tokenPair, usd } from './spend-format';
  import { TelemetryModel } from './telemetry-model.svelte';
  import { SPEND_COMING, SPEND_EYEBROW, SPEND_LEDE } from './operate-words';
  import SkeletonRows from '$lib/components/parts/SkeletonRows.svelte';
  import LoadFailed from '$lib/components/parts/LoadFailed.svelte';

  const model = new TelemetryModel();
  $effect(() => { if (app.boardId) void model.load(app.boardId, model.window_); });
  const u = $derived(model.usage);
  const budget = $derived(budgetLine(model.spend, model.budgetUsd, model.overBudget));
  const fill = $derived(model.budgetUsd ? Math.min(100, pctOf(model.spend, model.budgetUsd)) : 0);
  const maxOf = (xs: number[]) => Math.max(0.000001, ...xs);
  function setCap(e: MouseEvent): void { e.preventDefault(); document.getElementById('cap-b1')?.focus(); }
</script>

{#snippet empty(title: string, body: string)}
  <div class="emptyp"><p class="t-body">{title}</p><p class="t-meta">{body}</p></div>
{/snippet}
{#snippet pending()}
  {#if model.usageError}
    <div class="emptyp"><LoadFailed message="Couldn't load spend." onRetry={() => app.boardId && model.load(app.boardId, model.window_)} /></div>
  {:else}
    <div class="emptyp"><SkeletonRows label="Loading spend…" rows={3} /></div>
  {/if}
{/snippet}

<PageMain scope="scr-spend">
  <div class="sp-top">
    <a class="t-meta back-link" href="/b/{app.boardId}"><LineIcon name="chev-left" size={16} />Back to the board</a>
    <div class="sp-headrow">
      <div class="sp-head" data-signature>
        <p class="t-eyebrow sp-eyebrow">{SPEND_EYEBROW}</p>
        <svelte:element this={viewport.phone ? 'h2' : 'h1'} class="t-h1 sp-title">Agent spend</svelte:element>
        <p class="t-body sp-lede">{SPEND_LEDE(model.board?.name ?? '')}</p>
      </div>
      <div class="seg" role="group" aria-label="Time window">
        <button aria-pressed={model.window_ === '7d'} type="button" onclick={() => (model.window_ = '7d')}>Last 7 days</button>
        <button aria-pressed={model.window_ === '5h'} type="button" onclick={() => (model.window_ = '5h')}>Last 5 hours</button>
      </div>
    </div>
  </div>

  <div class="tiles">
    <div class="panel tile">
      <p class="t-eyebrow">Spend vs budget</p>
      <p class="big">{u ? usd(model.spend) : '—'}</p>
      <div class="bar" role="img" aria-label="{fill}% of budget used"><i class:over={model.overBudget} style="width: {fill}%;"></i></div>
      <p class="t-meta">{u ? budget.text : ''}{#if budget.setCap}<a href="#caps1" onclick={setCap}>Set a cap</a>{/if}</p>
    </div>
    <div class="panel tile">
      <p class="t-eyebrow">Average cost per card</p>
      <p class="big">{u ? avgPerCard(u.totalCostUsd, u.byCard.length) : '—'}</p>
      <p class="t-meta">{u ? cardsWithSpend(u.byCard.length) : 'Loading spend…'}</p>
    </div>
    <div class="panel tile">
      <p class="t-eyebrow">Tokens</p>
      <p class="big">{u ? compactCount(u.totalInputTokens + u.totalOutputTokens) : '—'}</p>
      <p class="t-meta">{u ? tokenPair(u.totalInputTokens, u.totalOutputTokens) : 'Loading spend…'}</p>
    </div>
    <div class="panel tile">
      <p class="t-eyebrow">Unpriced records</p>
      <p class="big">{u ? String(u.unpricedRecords) : '—'}</p>
      <p class="t-meta">Usage records without cost data</p>
    </div>
  </div>

  <section class="panel" aria-labelledby="day-h1">
    <div class="panel-head">
      <h2 class="t-h2" id="day-h1">Spend by day</h2>
      <span class="t-meta">{dayRange(model.days.map((d) => d.day))}</span>
      <span class="t-meta sp-end">{u ? busiestLine(model.days) : 'Loading spend…'}</span>
    </div>
    <div class="chart" role="img" aria-label={chartLabel(model.days)}>
      {#each model.days as d (d.day)}
        <div class="col"><span class="t-meta t-num">{usd(d.costUsd)}</span><span class={d.costUsd === 0 ? 'b zero' : 'b'} style="height: {barHeight(d.costUsd, model.maxDay)}px;"></span></div>
      {/each}
    </div>
    <div class="days" aria-hidden="true">{#each model.days as d (d.day)}<span class="t-meta">{dayLabel(d.day)}</span>{/each}</div>
  </section>

  <div class="grid2">
    <section class="panel" aria-label="Spend by agent">
      <div class="panel-head"><h2 class="t-h2">By agent</h2></div>
      {#if !u}{@render pending()}
      {:else if u.byAgent.length === 0}{@render empty('No agent cost data yet.', 'Agents on this board have not reported cost in this window. When they do, each shows with its face, a bar and its total.')}
      {:else}
        {@const max = maxOf(u.byAgent.map((a) => a.costUsd))}
        <ul class="sp-rows">
          {#each u.byAgent as a (a.agentId)}
            {@const name = displayAgent(a.agentId, app.agents)}
            <li class="rrow"><span class="face sp-face"><Face id={name} label={name} mood="resting" size={24} /></span><span class="t-body">{name}</span><div class="bar"><i style="width: {pctOf(a.costUsd, max)}%;"></i></div><span class="money t-num">{usd(a.costUsd)}</span></li>
          {/each}
        </ul>
      {/if}
    </section>
    <section class="panel" aria-label="Spend by board">
      <div class="panel-head"><h2 class="t-h2">By board</h2><span class="t-meta">all your boards</span></div>
      {#if !u || model.boardTotals === null}{@render pending()}
      {:else if model.boardTotals.every((b) => b.costUsd === 0)}{@render empty('No board recorded spend.', 'Your boards side by side, this one highlighted, once any of them records cost.')}
      {:else}
        {@const max = maxOf(model.boardTotals.map((b) => b.costUsd))}
        <ul class="sp-rows">
          {#each model.boardTotals as b, i (b.id)}
            <li class={b.id === app.boardId ? 'rrow here' : 'rrow'}><span class="t-meta t-num">{i + 1}</span><span class="t-body">{b.name}</span><div class="bar"><i style="width: {pctOf(b.costUsd, max)}%;"></i></div><span class="money t-num">{usd(b.costUsd)}</span></li>
          {/each}
        </ul>
      {/if}
    </section>
    <section class="panel" aria-label="Spend by model">
      <div class="panel-head"><h2 class="t-h2">By model</h2></div>
      {#if !u}{@render pending()}
      {:else if u.byModel.length === 0}{@render empty('No model cost data yet.', 'Each model the agents used, with its total.')}
      {:else}
        {@const max = maxOf(u.byModel.map((m) => m.costUsd))}
        <ul class="sp-rows">
          {#each u.byModel as m, i (m.model)}
            <li class="rrow"><span class="t-meta t-num">{i + 1}</span><span class="t-body">{m.model}</span><div class="bar"><i style="width: {pctOf(m.costUsd, max)}%;"></i></div><span class="money t-num">{usd(m.costUsd)}</span></li>
          {/each}
        </ul>
      {/if}
    </section>
    <section class="panel" aria-label="Top spenders by card">
      <div class="panel-head"><h2 class="t-h2">Top spenders · by card</h2></div>
      {#if !u}{@render pending()}
      {:else if u.byCard.length === 0}{@render empty('No card cost data yet.', 'The eight cards that cost the most, linked to the card.')}
      {:else}
        {@const top = [...u.byCard].sort((a, b) => b.costUsd - a.costUsd).slice(0, 8)}
        {@const max = maxOf(top.map((c) => c.costUsd))}
        <ul class="sp-rows">
          {#each top as c, i (c.cardId)}
            <li class="rrow"><span class="t-meta t-num">{i + 1}</span><a class="t-body" href="/b/{app.boardId}/c/{c.cardId}">{model.cardTitle(c.cardId) ?? `Card #${shortId(c.cardId)}`}</a><div class="bar"><i style="width: {pctOf(c.costUsd, max)}%;"></i></div><span class="money t-num">{usd(c.costUsd)}</span></li>
          {/each}
        </ul>
      {/if}
    </section>
    <BudgetCaps suffix="1" />
    <section class="panel" aria-label="Coming next">
      <div class="panel-head"><h2 class="t-h2">Coming next</h2></div>
      <div class="panel-body"><p class="t-body sp-muted">{SPEND_COMING}</p></div>
    </section>
  </div>

  <BoardLog events={model.events} error={model.eventsError} collapsedRows={8} fullLogHref="/b/{app.boardId}/operate/log" />
</PageMain>
