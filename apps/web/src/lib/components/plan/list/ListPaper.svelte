<!-- apps/web/src/lib/components/plan/list/ListPaper.svelte -->
<script lang="ts">
  /** SP-List-Paper: "The index". Move… opens the shared Move dialog. */
  import { Face } from '@superjackfruit/vibekit';
  import { viewport } from '$lib/viewport.svelte';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { emptyText, GROUPS, listCaption, paperFacts, paperFoot, paperGroupCount, paperMastLine, priClass, sortHint } from './list-model';
  import type { ListLayoutProps, ListSortKey } from './types';
  import './list-paper.css';

  let p: ListLayoutProps = $props();
  const COLS: Array<{ key: ListSortKey; label: string }> = [
    { key: 'priority', label: 'Pri' }, { key: 'title', label: 'Card' }, { key: 'state', label: 'State' },
    { key: 'agent', label: 'Agent' }, { key: 'due', label: 'Due' }, { key: 'cost', label: 'Cost' },
  ];
</script>

<div class="ls-pp"><div class="pp">
  <header class="mast">
    <div>
      <p class="mast__eyebrow">Superpipeline · Plan</p>
      <svelte:element this={viewport.phone ? 'h2' : 'h1'}>The index</svelte:element>
      <p class="mast__line">{paperMastLine(p.boardName, p.cardCount, p.needsCount)}</p>
    </div>
    <div class="tools">
      <span class="tlabel">Group by</span><div class="tabs" role="group" aria-label="Group by">{#each GROUPS as g (g.id)}<button type="button" aria-pressed={p.groupBy === g.id ? 'true' : 'false'} onclick={() => p.onGroupBy(g.id)}>{g.label}</button>{/each}</div>
    </div>
  </header>
  {#if p.groups.length === 0}
    <p class="foot">{emptyText(p)}</p>
  {:else}
    <table>
      <caption class="vk-visually-hidden">{listCaption(p.boardName, p.groupBy, p.sort)}</caption>
      <thead><tr>{#each COLS as c (c.key)}{@const on = p.sort.key === c.key}<th scope="col" aria-sort={on ? (p.sort.ascending ? 'ascending' : 'descending') : undefined}><button class="sort" type="button" data-on={on ? 'true' : 'false'} onclick={() => p.onSort(c.key)}>{c.label}{#if on}<LineIcon name={p.sort.ascending ? 'sort-asc' : 'sort-desc'} size={14} /><span class="vk-visually-hidden">, sorted {sortHint(p.sort)}</span>{/if}</button></th>{/each}<th scope="col"><span class="vk-visually-hidden">Actions</span></th></tr></thead>
      {#each p.groups as g (g.key)}
        <tbody><tr class="g"><th colspan="7" scope="colgroup"><span class="g__name">{g.label}</span><span class="g__n">{paperGroupCount(g.rows.length)}</span>{#if g.owner}<span class="g__own">{g.owner}</span>{/if}</th></tr>{#each g.rows as r (r.s.id)}{@const facts = paperFacts(r)}<tr data-card-id={r.s.id}>
          <td style="width: 52px;" data-label="Priority">{#if r.priorityText}<span class={priClass(r)}>{r.priorityText}</span>{:else}<span class="muted" aria-label="No priority">—</span>{/if}</td>
          <td><a class="ttl" href={r.href}>{r.s.title}</a>{#if facts || r.askedBy}<div class="facts">{facts}{#if r.askedBy}<span style="display: inline-flex; gap: 4px; align-items: center;"><Face id={r.askedBy.name} label={r.askedBy.name} mood="working" size={16} src={r.askedBy.iconUrl ?? undefined} />asked by {r.askedBy.name}</span>{/if}</div>{/if}</td>
          <td style="width: 160px;" data-label="State">{#if r.state.needsYou}<span class="state state--needs">{r.state.word}</span>{:else}<span class="state">{r.state.word}</span>{/if}</td>
          <td style="width: 180px;" data-label="Agent">{#if r.agent}<div class="who"><Face id={r.agent.name} label={r.agent.name} mood={r.agent.mood} size={24} src={r.agent.iconUrl ?? undefined} />{r.agent.name}</div>{:else}<div class="who muted"><span class="noface" aria-hidden="true" style="width: 24px; height: 24px;"></span>{r.unclaimedWord}</div>{/if}</td>
          <td style="width: 150px;" data-label="Due">{#if r.dueSignal}<span class="due--over">Overdue, {r.dueHuman}</span>{:else if r.dueHuman}<span>{r.dueHuman}</span>{:else}<span class="muted">—</span>{/if}</td>
          <td style="width: 70px;" data-label="Cost">{#if r.costText}<span class:due--over={r.costSignal}>{r.costText}</span>{:else}<span class="muted" aria-label="No cost yet">—</span>{/if}</td>
          <td style="width: 180px;"><div class="acts"><a href={r.href}>Open</a><button type="button" aria-haspopup="dialog" onclick={() => p.onOpenMoveDialog(r.s.id)}>Move…</button></div></td>
        </tr>{/each}</tbody>
      {/each}
    </table>
    <p class="foot">{paperFoot(p.sort, p.emptyStages)}</p>
  {/if}
</div></div>
