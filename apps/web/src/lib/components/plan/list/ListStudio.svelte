<!-- apps/web/src/lib/components/plan/list/ListStudio.svelte -->
<script lang="ts">
  /** SP-List-Studio: quick filter, hero, ruled table; J/K select, ↵ open, M move, S sort, G group. */
  import { Face } from '@superjackfruit/vibekit';
  import { untrack } from 'svelte';
  import { viewport } from '$lib/viewport.svelte';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { emptyText, filterQuick, GROUP_CYCLE, GROUPS, groupNo, listCaption, nextInCycle, sortHint, STUDIO_SORT_CYCLE, studioFoot, studioHeadline, studioKicker, studioLede } from './list-model';
  import { ListUi } from './list-ui.svelte';
  import type { ListLayoutProps, ListRow, ListSortKey, ListTone, QuickFilter } from './types';
  import './list-studio.css';

  let p: ListLayoutProps = $props();
  const ui = untrack(() => p.ui) ?? new ListUi();
  const quick = $derived(ui.quick);
  const selected = $derived(ui.selected);

  const QUICK: Array<{ id: QuickFilter; label: string }> = [
    { id: 'all', label: 'All' }, { id: 'needs', label: 'Needs' }, { id: 'working', label: 'Working' }, { id: 'idle', label: 'Idle' }, { id: 'done', label: 'Done' },
  ];
  const COLS: Array<{ key: ListSortKey; width: string }> = [
    { key: 'priority', width: '56px' }, { key: 'title', width: '' }, { key: 'state', width: '140px' }, { key: 'agent', width: '132px' },
    { key: 'attempts', width: '48px' }, { key: 'age', width: '52px' }, { key: 'due', width: '112px' }, { key: 'cost', width: '56px' },
  ];
  const LABEL: Record<ListSortKey, string> = { priority: 'Pri', title: 'Card', state: 'State', agent: 'Agent', attempts: 'Att', age: 'Age', due: 'Due', cost: 'Cost' };
  const UNIT: Record<ListTone, string> = { needs: 'needs', working: 'working', queued: 'queued', done: 'done', closed: 'off' };

  const groups = $derived(filterQuick(p.groups, quick));
  const flat = $derived(groups.flatMap((g) => g.rows));
  const visible = $derived(flat.length);
  const hero = $derived(studioHeadline(visible, groups.length, p.stageCount, p.groupBy));
  const foot = $derived(studioFoot({ visible, groups: groups.length, groupBy: p.groupBy, empty: p.emptyStages.length, sort: p.sort, total: p.totalCostUsd, selected }));

  $effect(() => {
    if (selected !== null && selected >= visible) ui.selected = visible ? visible - 1 : null;
  });
  $effect(() => {
    if (selected !== null) document.querySelector('.ls-tbl tr.sel')?.scrollIntoView?.({ block: 'nearest' });
  });

  function pickRow(e: MouseEvent, r: ListRow): void {
    if ((e.target as Element).closest('a, button')) return;
    ui.selected = flat.indexOf(r);
  }

  function onkeydown(e: KeyboardEvent): void {
    const t = e.target;
    if (e.metaKey || e.ctrlKey || e.altKey || (t instanceof Element && t.closest('input, textarea, select, [contenteditable="true"]'))) return;
    const row = selected === null ? undefined : flat[selected];
    switch (e.key) {
      case 'j': case 'J': if (!visible) return; ui.selected = selected === null ? 0 : Math.min(visible - 1, selected + 1); break;
      case 'k': case 'K': if (!visible) return; ui.selected = selected === null ? 0 : Math.max(0, selected - 1); break;
      case 'Enter': if (!row) return; p.onOpen(row.s.id); break;
      case 'm': case 'M': if (!row) return; p.onOpenMoveDialog(row.s.id); break;
      case 's': case 'S': p.onSort(nextInCycle(STUDIO_SORT_CYCLE, p.sort.key)); break;
      case 'g': case 'G': p.onGroupBy(nextInCycle(GROUP_CYCLE, p.groupBy)); break;
      default: return;
    }
    e.preventDefault();
  }
</script>

<svelte:window {onkeydown} />

<div class="ls-main">
  <div class="ls-bar">
    <div class="ls-seg" role="group" aria-label="Quick filter">{#each QUICK as q (q.id)}<button type="button" aria-pressed={quick === q.id ? 'true' : 'false'} class:sig={q.id === 'needs' && p.quickCounts.needs > 0} onclick={() => { ui.quick = q.id; ui.selected = null; }}>{q.label} <span class="n">{p.quickCounts[q.id]}</span></button>{/each}</div>
    <span class="kick">Group</span>
    <div class="ls-seg" role="group" aria-label="Group by">{#each GROUPS as g (g.id)}<button type="button" aria-pressed={p.groupBy === g.id ? 'true' : 'false'} onclick={() => p.onGroupBy(g.id)}>{g.label}</button>{/each}</div>
    <div class="keys" aria-label="Keyboard"><span><span class="kbd">J</span><span class="kbd">K</span> row</span><span><span class="kbd">↵</span> open</span><span><span class="kbd">M</span> move</span><span><span class="kbd">S</span> sort</span><span><span class="kbd">G</span> group</span></div>
  </div>

  <div class="ls-hero">
    <span class="big" aria-hidden="true">{visible}</span>
    <div><span class="kick">{studioKicker(p.groupBy, quick)}</span><svelte:element this={viewport.phone ? 'h2' : 'h1'}><span class="sr">{hero.sr}</span>{hero.text}</svelte:element><p>{studioLede(p.sort, p.emptyStages)}</p></div>
  </div>

  {#if visible === 0}
    <div class="ls-foot"><span>{p.hasCards ? 'No cards match these filters.' : emptyText(p)}</span></div>
  {:else}
    <section class="ar-sec" aria-label="Cards">
      <table class="ar-tbl ls-tbl">
        <caption class="sr">{listCaption(p.boardName, p.groupBy, p.sort, true)}</caption>
        <thead><tr>{#each COLS as c (c.key)}{@const on = p.sort.key === c.key}<th scope="col" aria-sort={on ? (p.sort.ascending ? 'ascending' : 'descending') : undefined} style={c.width ? `width: ${c.width};` : undefined}><button class="sort" type="button" data-on={on ? 'true' : 'false'} onclick={() => p.onSort(c.key)}>{LABEL[c.key]}<LineIcon name="sort-studio" size={12} stroke={1.75} />{#if on}<span class="sr">, sorted {sortHint(p.sort)}</span>{/if}</button></th>{/each}<th scope="col" style="width: 176px;"><span class="sr">Actions</span></th></tr></thead>
        {#each groups as g, gi (g.key)}
          <tbody><tr class="g"><th colspan="9" scope="colgroup"><span class="in"><span class="no">{groupNo(g, gi, p.groupBy)}</span>{#if p.groupBy === 'stage'}<span class="band c{g.order + 1}"></span>{/if}<span class="nm">{g.label}</span><span class="ct">{g.rows.length}</span>{#if g.owner}<span class="own">{g.owner}</span>{/if}</span></th></tr>{#each g.rows as r (r.s.id)}{@const i = flat.indexOf(r)}<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions --><tr data-card-id={r.s.id} class:sel={selected === i} aria-current={selected === i ? 'true' : undefined} onclick={(e) => pickRow(e, r)}>
            <td data-label="Priority">{#if r.priorityText}<span class="ls-pri">{r.priorityText}</span>{:else}<span class="m" aria-label="No priority">—</span>{/if}</td>
            <td><a class="ttl" href={r.href}>{r.s.title}</a>{#if r.labelNames.length || r.moreLabels || r.blockedCount || r.askedBy}<div class="ar-facts">{#each r.labelNames as l (l)}<span>{l}</span>{/each}{#if r.moreLabels}<span title="{r.moreLabels} more label{r.moreLabels === 1 ? '' : 's'}">+{r.moreLabels}</span>{/if}{#if r.blockedCount}<span><LineIcon name="lock" size={12} stroke={1.75} />Blocked</span>{/if}{#if r.askedBy}<span><Face id={r.askedBy.name} label={r.askedBy.name} mood="working" size={14} src={r.askedBy.iconUrl ?? undefined} />asked by {r.askedBy.name}</span>{/if}</div>{/if}</td>
            <td data-label="State"><span class="ar-st" class:needs={r.state.needsYou}><span class="u {UNIT[r.state.tone]}"></span>{r.state.word}</span></td>
            <td data-label="Agent">{#if r.agent}<span class="ag"><Face id={r.agent.name} label={r.agent.name} mood={r.agent.mood} size={20} src={r.agent.iconUrl ?? undefined} />{r.agent.name}</span>{:else}<span class="m">{r.unclaimedWord}</span>{/if}</td>
            <td data-label="Attempts"><span class="m">{#if r.attemptsSignal}<span class="sigt">{r.attempts}</span>{:else}{r.attempts}{/if}</span></td>
            <td data-label="Age"><span class="m">{r.ageText ?? '—'}</span></td>
            <td data-label="Due">{#if r.dueSignal}<span class="ls-over"><LineIcon name="calendar" size={12} stroke={1.75} />{r.dueIso}<span class="sr">, overdue</span></span>{:else}<span class="m">{r.dueIso ?? '—'}</span>{/if}</td>
            <td data-label="Cost">{#if r.costSignal}<span class="ls-over">{r.costText}</span>{:else}<span class="m">{r.costText ?? '—'}</span>{/if}</td>
            <td><div class="ls-acts"><a class="ib" href={r.href}>Open <span class="kbd" aria-hidden="true">↵</span></a><button class="ib" type="button" aria-haspopup="dialog" onclick={() => p.onOpenMoveDialog(r.s.id)}>Move <span class="kbd" aria-hidden="true">M</span></button></div></td>
          </tr>{/each}</tbody>
        {/each}
      </table>
      <div class="ls-foot">{#each foot as f (f)}<span>{f}</span>{/each}</div>
    </section>
  {/if}
</div>
