<!-- apps/web/src/lib/components/plan/list/ListQuiet.svelte -->
<script lang="ts">
  /** SP-List-Quiet: a heading and a table per group; Group by and Sort by are plain selects. */
  import { Face } from '@superjackfruit/vibekit';
  import { viewport } from '$lib/viewport.svelte';
  import type { ListGroupBy } from '$lib/stores/app.svelte';
  import { emptyText, GROUPS, quietEmptyFoot, quietFacts, quietLede, quietSortOptions, quietState, sortHint } from './list-model';
  import type { ListLayoutProps, ListSortKey } from './types';
  import './list-quiet.css';

  let p: ListLayoutProps = $props();
  const COLS: Array<{ key: ListSortKey; label: string }> = [
    { key: 'priority', label: 'Priority' }, { key: 'title', label: 'Card' }, { key: 'state', label: 'State' },
    { key: 'agent', label: 'Agent' }, { key: 'due', label: 'Due' }, { key: 'cost', label: 'Cost' },
  ];
  const sorts = $derived(quietSortOptions(p.sort));
  function setSort(value: string): void {
    const o = sorts.find((x) => x.value === value);
    if (o) p.onSetSort(o.sort);
  }
</script>

<div class="ls-q"><div class="q"><div class="q__col">
  <svelte:element this={viewport.phone ? 'h2' : 'h1'}>{p.boardName}: list</svelte:element>
  <p class="lede">{quietLede(p.cardCount, p.needsCount)}</p>
  <div class="controls">
    <label class="lbl">Group by<select class="inp" value={p.groupBy} onchange={(e) => p.onGroupBy(e.currentTarget.value as ListGroupBy)}>{#each GROUPS as g (g.id)}<option value={g.id}>{g.label}</option>{/each}</select></label>
    <label class="lbl">Sort by<select class="inp" value={sorts.find((o) => o.selected)?.value} onchange={(e) => setSort(e.currentTarget.value)}>{#each sorts as o (o.value)}<option value={o.value}>{o.label}</option>{/each}</select></label>
  </div>
  {#if p.groups.length === 0}<p class="empty">{emptyText(p)}</p>{/if}
  {#each p.groups as g (g.key)}
    <h2>{g.label} ({g.rows.length})</h2>{#if g.owner}<p class="own">Worked by {g.owner}.</p>{/if}<table><caption class="vk-visually-hidden">{g.label}</caption><thead><tr>{#each COLS as c (c.key)}{@const on = p.sort.key === c.key}<th scope="col" aria-sort={on ? (p.sort.ascending ? 'ascending' : 'descending') : undefined}><button class="sort" type="button" data-on={on ? 'true' : 'false'} onclick={() => p.onSort(c.key)}>{c.label}{#if on} <span class="sorted">(sorted, {sortHint(p.sort)})</span>{/if}</button></th>{/each}<th scope="col">Actions</th></tr></thead><tbody>{#each g.rows as r (r.s.id)}{@const facts = quietFacts(r)}<tr data-card-id={r.s.id} class:needs={r.state.needsYou}>
      <td style="width: 7rem;" data-label="Priority">{r.priorityText ?? 'None'}</td>
      <td><a href={r.href}>{r.s.title}</a>{#if facts}<div class="facts">{facts}</div>{/if}</td>
      <td style="width: 11rem;" data-label="State">{#if r.state.needsYou}<span class="st--needs">{quietState(r.state)}</span>{:else}<span>{r.state.word}</span>{/if}</td>
      <td style="width: 11rem;" data-label="Agent">{#if r.agent}<div class="who"><Face id={r.agent.name} label={r.agent.name} mood={r.agent.mood} size={20} src={r.agent.iconUrl ?? undefined} />{r.agent.name}</div>{:else}<div class="who"><span class="noface" aria-hidden="true" style="width: 20px; height: 20px;"></span>{r.unclaimedWord}</div>{/if}</td>
      <td style="width: 10rem;" data-label="Due">{#if r.overdue && r.dueHuman}<strong>Overdue.</strong> Was due {r.dueHuman}.{:else if r.dueHuman}Due {r.dueHuman}.{:else}None{/if}</td>
      <td style="width: 5rem;" data-label="Cost">{#if r.costText}<span class:st--needs={r.costSignal}>{r.costText}</span>{:else}None{/if}</td>
      <td style="width: 12rem;"><div class="acts"><a href={r.href}>Open</a><button class="textbtn" type="button" aria-haspopup="dialog" onclick={() => p.onOpenMoveDialog(r.s.id)}>Move</button></div></td>
    </tr>{/each}</tbody></table>
  {/each}
  {#if p.emptyStages.length > 0}<p class="empty">{quietEmptyFoot(p.emptyStages)}</p>{/if}
</div></div></div>
