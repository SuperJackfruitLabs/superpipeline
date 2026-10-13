<!-- apps/web/src/lib/components/plan/list/ListDaylight.svelte -->
<script lang="ts">
  /** SP-List-Daylight: one panel, one tbody per group, a Move menu on every row. */
  import { Button, Face, StateLabel } from '@superjackfruit/vibekit';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { untrack } from 'svelte';
  import RowMoveMenu from './RowMoveMenu.svelte';
  import { emptyText, listCaption, priClass, sortHint } from './list-model';
  import type { State } from '@superjackfruit/vibekit';
  import type { ListLayoutProps, ListSortKey, ListTone } from './types';
  import './list-daylight.css';

  import { ListUi } from './list-ui.svelte';

  let p: ListLayoutProps = $props();
  const ui = untrack(() => p.ui) ?? new ListUi();
  const COLS: Array<{ key: ListSortKey; label: string }> = [
    { key: 'priority', label: 'Priority' }, { key: 'title', label: 'Card' }, { key: 'state', label: 'State' },
    { key: 'agent', label: 'Agent' }, { key: 'due', label: 'Due' }, { key: 'cost', label: 'Cost' },
  ];
  const PILL: Record<ListTone, State> = { needs: 'needs', working: 'working', queued: 'resting', done: 'done', closed: 'resting' };
</script>

<div class="ls-dy"><div class="wrap">
  <div class="panel">
    {#if p.groups.length === 0}
      <p class="empty muted">{emptyText(p)}</p>
    {:else}
      <table>
        <caption class="vk-visually-hidden">{listCaption(p.boardName, p.groupBy, p.sort)}</caption>
        <thead><tr>{#each COLS as c (c.key)}{@const on = p.sort.key === c.key}<th scope="col" aria-sort={on ? (p.sort.ascending ? 'ascending' : 'descending') : undefined}><button class="sort" type="button" data-on={on ? 'true' : 'false'} onclick={() => p.onSort(c.key)}>{c.label}<LineIcon name={on ? (p.sort.ascending ? 'sort-asc' : 'sort-desc') : 'sort-off'} />{#if on}<span class="vk-visually-hidden">, sorted {sortHint(p.sort)}</span>{/if}</button></th>{/each}<th scope="col"><span class="vk-visually-hidden">Actions</span></th></tr></thead>
        {#each p.groups as g (g.key)}
          <tbody><tr class="g"><th colspan="7" scope="colgroup"><span class="g__name">{g.label}</span><span class="g__n">{g.rows.length}</span>{#if g.owner}<span class="g__own">{g.owner}</span>{/if}</th></tr>{#each g.rows as r (r.s.id)}<tr class="r" data-card-id={r.s.id}>
            <td style="width: 56px;" data-label="Priority">{#if r.priorityText}<span class={priClass(r)}>{r.priorityText}</span>{:else}<span class="muted" aria-label="No priority">—</span>{/if}</td>
            <td><a class="ttl" href={r.href}>{r.s.title}</a>{#if r.labelNames.length || r.moreLabels || r.blockedCount || r.askedBy}<div class="facts">{#each r.labelNames as l (l)}<span class="lab">{l}</span>{/each}{#if r.moreLabels}<span class="lab" title="{r.moreLabels} more label{r.moreLabels === 1 ? '' : 's'}">+{r.moreLabels}</span>{/if}{#if r.blockedCount}<span class="blk"><LineIcon name="blocked" size={14} />Blocked</span>{/if}{#if r.askedBy}<span class="asked"><Face id={r.askedBy.name} label={r.askedBy.name} mood="working" size={16} src={r.askedBy.iconUrl ?? undefined} />asked by {r.askedBy.name}</span>{/if}</div>{/if}</td>
            <td style="width: 170px;" data-label="State"><StateLabel state={PILL[r.state.tone]} label={r.state.word} /></td>
            <td style="width: 190px;" data-label="Agent">{#if r.agent}<div class="who"><Face id={r.agent.name} label={r.agent.name} mood={r.agent.mood} size={24} src={r.agent.iconUrl ?? undefined} /><span><b>{r.agent.name}</b><small>{r.agent.moodWord}</small></span></div>{:else}<div class="who"><span class="noface" aria-hidden="true" style="width: 24px; height: 24px;"></span><span class="muted">{r.unclaimedWord}</span></div>{/if}</td>
            <td style="width: 170px;" data-label="Due">{#if r.dueSignal}<span class="due--over"><LineIcon name="overdue" size={14} />Overdue · {r.dueHuman}</span>{:else if r.dueHuman}<span>{r.dueHuman}</span>{:else}<span class="muted">—</span>{/if}</td>
            <td style="width: 80px;" data-label="Cost">{#if r.costText}<span class:due--over={r.costSignal}>{r.costText}</span>{:else}<span class="muted" aria-label="No cost yet">—</span>{/if}</td>
            <td style="width: 200px;"><div class="acts"><Button variant="secondary" href={r.href}>Open</Button><RowMoveMenu card={{ id: r.s.id, title: r.s.title, currentStageKey: r.s.stageKey }} stages={p.stages} onMove={p.onMove} open={ui.moveOpen === r.s.id} onOpen={(o) => (ui.moveOpen = o ? r.s.id : null)} /></div></td>
          </tr>{/each}</tbody>
        {/each}
      </table>
    {/if}
  </div>
</div></div>
