<!-- apps/web/src/lib/components/operate/TelemetryStudio.svelte -->
<script lang="ts">
  import SkeletonRows from '$lib/components/parts/SkeletonRows.svelte';
  import LoadFailed from '$lib/components/parts/LoadFailed.svelte';
  import './spend-studio.css';
  import { viewport } from '$lib/viewport.svelte';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { displayAgent } from '$lib/names';
  import { app } from '$lib/stores/app.svelte';
  import BoardLogStudio from './BoardLogStudio.svelte';
  import BudgetCapsStudio from './BudgetCapsStudio.svelte';
  import { avgPerCard, barHeightStudio, budgetLine, busiestIndex, busiestLine, cardsWithSpend, chartLabel, compactCount, dayLabel, dayRange, pctOf, tokenPair, usd } from './spend-format';
  import { TelemetryModel } from './telemetry-model.svelte';
  import type { SpendLayoutProps } from './spend-types';

  const _props: SpendLayoutProps = $props();
  const model = new TelemetryModel();
  $effect(() => { if (app.boardId) void model.load(app.boardId, model.window_); });
  const u = $derived(model.usage);
  const budget = $derived(budgetLine(model.spend, model.budgetUsd, model.overBudget));
  const fill = $derived(model.budgetUsd ? Math.min(100, pctOf(model.spend, model.budgetUsd)) : 0);
  const peak = $derived(busiestIndex(model.days));
  const maxOf = (xs: number[]) => Math.max(0.000001, ...xs);
  function setCap(e: MouseEvent): void { e.preventDefault(); document.getElementById('cap-b1')?.focus(); }
  const windowWords = $derived(model.window_ === '7d' ? 'last 7 days' : 'last 5 hours');
</script>

{#snippet empty(title: string, body: string)}<p class="sp-empty"><span class="serif">{title}</span><span class="ar-hint">{body}</span></p>{/snippet}
{#snippet pending()}
  {#if model.usageError}<LoadFailed message="Couldn't load spend." onRetry={() => app.boardId && model.load(app.boardId, model.window_)} />
  {:else}<SkeletonRows label="Loading spend…" rows={3} />{/if}
{/snippet}
{#snippet rows(items: Array<{ key: string; label: string; href?: string; cost: number }>)}
  {@const max = maxOf(items.map((i) => i.cost))}
  <table class="ar-tbl sp-tbl"><tbody>
    {#each items as it (it.key)}
      <tr class={it.key === app.boardId ? 'here' : undefined}>
        <td class="ag">{#if it.href}<a class="ttl" href={it.href}>{it.label}</a>{:else}{it.label}{/if}</td>
        <td><span class="sp-rb"><i class="sp-fill" style="--p: {pctOf(it.cost, max) / 100};"></i></span></td>
        <td class="m r">{usd(it.cost)}</td>
      </tr>
    {/each}
  </tbody></table>
{/snippet}

<!-- The shell owns the one main. -->
<div class="sp-main">
  <div class="sp-line">
    <a class="ar-lk quiet" href="/b/{app.boardId}"><LineIcon name="chev-left" size={16} />Back to the board</a>
    <span class="kick">Plan · spend, in detail</span>
    <span class="sp-seg" role="group" aria-label="Time window">
      <button aria-pressed={model.window_ === '7d'} type="button" onclick={() => (model.window_ = '7d')}>Last 7 days</button>
      <button aria-pressed={model.window_ === '5h'} type="button" onclick={() => (model.window_ = '5h')}>Last 5 hours</button>
    </span>
  </div>

  <div class="ar-hero sp-hero">
    <span class="big ink{model.spend === 0 ? ' z' : ''}"><span class="sr">Spend vs budget:</span>{u ? usd(model.spend) : '—'}</span>
    <div class="txt">
      <svelte:element this={viewport.phone ? 'h2' : 'h1'}>Agent spend</svelte:element>
      <p>{model.board?.name ?? ''} · what agents cost, by day, agent, board, model and card.</p>
      <div class="sp-budget">
        <span class="kick">Spend vs budget</span>
        <span class="sp-rb lg" role="img" aria-label="{fill}% of budget used"><i class="sp-fill" style="--p: {fill / 100};{model.overBudget ? ' background: var(--vk-color-signal);' : ''}"></i></span>
        <span class="ar-hint">{u ? budget.text : ''}{#if budget.setCap}<a class="ar-lk" href="#caps1" style="min-height: 0px;" onclick={setCap}>Set a cap</a>{/if}</span>
      </div>
    </div>
  </div>

  <section class="ar-sec" aria-labelledby="sp-f1">
    <div class="hd"><span class="no">01</span><h2 id="sp-f1">In figures</h2><span class="r">{windowWords}</span></div>
    <div class="ar-figs">
      <div><b class={!u || u.byCard.length === 0 ? 'z' : undefined}>{u ? avgPerCard(u.totalCostUsd, u.byCard.length) : '—'}</b><span>Average cost per card</span><span class="ar-hint">{u ? cardsWithSpend(u.byCard.length) : 'Loading spend…'}</span></div>
      <div><b class={!u || u.totalInputTokens + u.totalOutputTokens === 0 ? 'z' : undefined}>{u ? compactCount(u.totalInputTokens + u.totalOutputTokens) : '—'}</b><span>Tokens</span><span class="ar-hint">{u ? tokenPair(u.totalInputTokens, u.totalOutputTokens) : 'Loading spend…'}</span></div>
      <div><b class={!u || u.unpricedRecords === 0 ? 'z' : undefined}>{u ? String(u.unpricedRecords) : '—'}</b><span>Unpriced records</span><span class="ar-hint">Usage records without cost data</span></div>
    </div>
  </section>

  <section class="ar-sec" aria-labelledby="day-h1">
    <div class="hd"><span class="no">02</span><h2 id="day-h1">Spend by day</h2><span class="r">{dayRange(model.days.map((d) => d.day))} · {u ? busiestLine(model.days) : 'Loading spend…'}</span></div>
    <ol class="sp-days" role="img" aria-label={chartLabel(model.days)}>
      {#each model.days as d, i (d.day)}
        <li class={i === peak ? 'pk' : undefined}><span class={d.costUsd === 0 ? 'amt z' : 'amt'}>{usd(d.costUsd)}</span><span class="col"><i style="height: {barHeightStudio(d.costUsd, model.maxDay)}px;"></i></span><span class="day">{dayLabel(d.day)}</span></li>
      {/each}
    </ol>
  </section>

  <div class="sp-grid">
    <section class="ar-sec" aria-labelledby="sp-ag1">
      <div class="hd"><span class="no">03</span><h2 id="sp-ag1">By agent</h2></div>
      {#if !u}{@render pending()}{:else if u.byAgent.length === 0}{@render empty('No agent cost data yet.', 'Agents on this board have not reported cost in this window. When they do, each shows with its face, a bar and its total.')}
      {:else}{@render rows(u.byAgent.map((a) => ({ key: a.agentId, label: displayAgent(a.agentId, app.agents), cost: a.costUsd })))}{/if}
    </section>
    <section class="ar-sec" aria-labelledby="sp-bo1">
      <div class="hd"><span class="no">04</span><h2 id="sp-bo1">By board</h2><span class="r">all your boards</span></div>
      {#if !u || model.boardTotals === null}{@render pending()}{:else if model.boardTotals.every((b) => b.costUsd === 0)}{@render empty('No board recorded spend.', 'Your boards side by side, this one highlighted, once any of them records cost.')}
      {:else}{@render rows(model.boardTotals.map((b) => ({ key: b.id, label: b.name, cost: b.costUsd })))}{/if}
    </section>
    <section class="ar-sec" aria-labelledby="sp-mo1">
      <div class="hd"><span class="no">05</span><h2 id="sp-mo1">By model</h2></div>
      {#if !u}{@render pending()}{:else if u.byModel.length === 0}{@render empty('No model cost data yet.', 'Each model the agents used, with its total.')}
      {:else}{@render rows(u.byModel.map((m) => ({ key: m.model, label: m.model, cost: m.costUsd })))}{/if}
    </section>
    <div class="sp-wide">
      <section class="ar-sec" aria-labelledby="sp-ca1">
        <div class="hd"><span class="no">06</span><h2 id="sp-ca1">Top spenders · by card</h2></div>
        {#if !u}{@render pending()}{:else if u.byCard.length === 0}{@render empty('No card cost data yet.', 'The eight cards that cost the most, linked to the card.')}
        {:else}{@render rows([...u.byCard].sort((a, b) => b.costUsd - a.costUsd).slice(0, 8).map((c) => ({ key: c.cardId, label: model.cardTitle(c.cardId) ?? c.cardId, href: `/b/${app.boardId}/c/${c.cardId}`, cost: c.costUsd })))}{/if}
      </section>
    </div>
    <div class="sp-side">
      <BudgetCapsStudio suffix="1" no="07" />
      <section class="ar-sec" aria-labelledby="sp-next">
        <div class="hd"><span class="no">08</span><h2 id="sp-next">Coming next</h2></div>
        <p class="sp-note">Success rate, time in stage, throughput and gate rejections arrive with telemetry aggregation (tier 2).</p>
      </section>
    </div>
  </div>

  <BoardLogStudio events={model.events} error={model.eventsError} collapsedRows={8} fullLogHref="/b/{app.boardId}/operate/log" />
</div>
