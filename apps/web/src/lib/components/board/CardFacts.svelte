<script lang="ts">
  import type { CardSummary } from './card-summary';
  import { refLabel, safeHref, subStateClass, subStateLabel } from './ref-chip';
  import AgentFace from '$lib/components/AgentFace.svelte';

  /**
   * Every fact a tile shows, as a list, in the tile's order and under the tile's conditions. The
   * layouts that are not Daylight render this beside the title, so none of them can drop a fact.
   * `chips` borrows the tile's pill classes; `text` says the same words plainly.
   */
  let { s, tone = 'chips' }: { s: CardSummary; tone?: 'chips' | 'text' } = $props();
  const usd = (n: number) => `$${n.toFixed(2)}`;
  const sub = $derived(s.firstRef ? subStateLabel(s.firstRef) : null);
  const href = $derived(s.firstRef ? safeHref(s.firstRef.url) : null);
</script>

<ul class="card-facts flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" data-tone={tone} aria-label="Card facts">
  {#if s.priority > 0}<li class={s.priority === 1 ? 'text-signal-text font-semibold' : 'font-semibold'}><span aria-hidden="true">P{s.priority}</span><span class="sr-only">Priority {s.priority}</span></li>{/if}
  {#if s.live}<li class="text-success-text"><span class="live-dot" aria-hidden="true"></span> Agent working</li>{/if}
  {#if s.blocked}<li class={tone === 'chips' ? 'blk-pill' : 'text-signal-text'} title={s.blocked.tooltip}>{s.blocked.glyph} {s.blocked.label}</li>{/if}
  {#if s.children}<li class={tone === 'chips' ? 'child-pill' : ''} title="{s.children.open} of {s.children.total} sub-tasks still open">{s.children.open}/{s.children.total}</li>{/if}
  {#each s.labels as l (l.id)}<li class={tone === 'chips' ? 'lbl-pill' : ''} style={tone === 'chips' && l.colour ? `border-color:${l.colour}; color:${l.colour}` : undefined}>{l.name}</li>{/each}
  {#if s.moreLabels > 0}<li title="{s.moreLabels} more label{s.moreLabels === 1 ? '' : 's'}">+{s.moreLabels}</li>{/if}
  {#if s.firstRef}
    <li class={tone === 'chips' ? 'refchip' : ''}>
      {#if href}<a {href} target="_blank" rel="noopener noreferrer" title={s.firstRef.url} class="underline-offset-2 hover:underline">{refLabel(s.firstRef)}</a>{:else}{refLabel(s.firstRef)}{/if}
      {#if sub}<span class={tone === 'chips' ? subStateClass(sub) : 'text-muted-foreground'}>{sub}</span>{/if}
    </li>
  {/if}
  {#if s.queuedBy}
    <li class={tone === 'chips' ? 'queuedchip' : 'inline-flex items-center gap-1'} title="Queued by {s.queuedBy.name}, not by you">
      {#if s.queuedBy.agent}<AgentFace agentId={s.queuedBy.agent.id} name={s.queuedBy.name} iconUrl={s.queuedBy.agent.iconUrl} size={14} variant="portrait" />{/if}
      <span>asked by {s.queuedBy.name}</span>
    </li>
  {/if}
  {#if s.cost > 0}<li class={s.overBudget ? 'text-signal-text' : 'text-muted-foreground'} title="Agent cost on this card">{usd(s.cost)}</li>{/if}
  {#if s.costPct !== null && s.cardCap !== null}
    {#if tone === 'chips'}
      <!-- the meter sits inside the item: an <li> with a role of its own is not a list item to a screen reader -->
      <li class="costbar min-w-16"><span role="meter" class="block h-full" aria-valuemin="0" aria-valuemax="100" aria-valuenow={s.costPct} aria-label="Cost against the card cap" title="{usd(s.cost)} of the {usd(s.cardCap)} card cap"><span class="costbar-fill sp-fill {s.overBudget ? 'costbar-fill-over' : ''}" style="--p: {(s.overBudget ? 100 : s.costPct) / 100}"></span></span></li>
    {:else}
      <li title="{usd(s.cost)} of the {usd(s.cardCap)} card cap">{s.costPct}% of cap</li>
    {/if}
  {/if}
  {#if s.dueAt}<li class={s.overdue ? 'text-signal-text' : 'text-muted-foreground'} title={s.overdue ? `Due ${s.dueAt} — overdue` : `Due ${s.dueAt}`}>{s.overdue ? '⚠ ' : '· '}{s.dueAt.slice(0, 10)}</li>{/if}
</ul>
